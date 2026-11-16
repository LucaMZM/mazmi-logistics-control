import { itemSize, type LayoutItem } from '../warehouse-editor/warehouse-layout.model';

interface Point {
  x: number;
  z: number;
}
export interface Pose extends Point {
  yaw: number;
}
interface State extends Point {
  h: number;
}
interface Rect extends Point {
  w: number;
  d: number;
}
interface Step extends Pose {
  distance: number;
}
export interface LoadingLane {
  path: Step[];
  length: number;
  van: Point;
}
export type Navigation = { lane: LoadingLane; reason: null } | { lane: null; reason: string };

// Local bounding rectangle includes wheels, counterweight, fork tips and pallet.
// A sample is at most 0.10 units of travel and 2.82° from the nearest
// checked pose. Padding covers that travel plus rotation of the outer tine.
const halfWidth = 0.78 + 0.23,
  halfDepth = (2.16 + 1.26) / 2 + 0.23,
  offset = (2.16 - 1.26) / 2;
const radius = 2,
  quarter = Math.PI / 2;
const dirs = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;
const key = (s: State) => ((s.x + 13) * 32 + s.z + 10) * 4 + s.h;
const rects = (items: LayoutItem[]): Rect[] => [
  { x: 0, z: 7.5, w: 0.24, d: 0.24 },
  ...items.map((o) => {
    const [w, d] = itemSize(o);
    return { x: o.x, z: o.z, w, d };
  }),
];
function clear(p: Pose, obstacles: Rect[]) {
  const sn = Math.sin(p.yaw),
    cs = Math.cos(p.yaw),
    ax = Math.abs(cs),
    az = Math.abs(sn);
  const cx = p.x + offset * sn,
    cz = p.z + offset * cs;
  const ex = ax * halfWidth + az * halfDepth,
    ez = az * halfWidth + ax * halfDepth;
  if (Math.abs(cx) + ex >= 12.375 || cz - ez <= -8.875 || cz + ez >= 16.8) return false;
  // Separating axes of the vehicle and each axis-aligned layout footprint.
  return obstacles.every((o) => {
    const dx = o.x - cx,
      dz = o.z - cz,
      w = o.w / 2,
      d = o.d / 2;
    return (
      Math.abs(dx) > ex + w ||
      Math.abs(dz) > ez + d ||
      Math.abs(dx * cs - dz * sn) > halfWidth + w * ax + d * az ||
      Math.abs(dx * sn + dz * cs) > halfDepth + w * az + d * ax
    );
  });
}

// Heading lattice: a forward metre or a tangent 90-degree arc. No pivot,
// diagonal corner cutting or post-search smoothing through an obstacle.
function template(h: number, turn: number): Pose[] {
  const yaw = h * quarter,
    [dx, dz] = dirs[h],
    n = turn ? 16 : 5;
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n,
      a = yaw + turn * quarter * t;
    return {
      x: turn ? radius * turn * (Math.cos(yaw) - Math.cos(a)) : dx * t,
      z: turn ? radius * turn * (Math.sin(a) - Math.sin(yaw)) : dz * t,
      yaw: a,
    };
  });
}
const templates = dirs.map((_, h) => [-1, 0, 1].map((turn) => template(h, turn)));
function primitive(s: State, turn: number) {
  return templates[s.h][turn + 1].map((p) => ({ x: p.x + s.x, z: p.z + s.z, yaw: p.yaw }));
}
interface Node {
  s: State;
  cost: number;
  score: number;
  parent?: Node;
  turn?: number;
}
function search(starts: State[], goal: State, obs: Rect[]): Step[] | null {
  const frontier: Node[] = [],
    best = new Map<number, number>();
  const push = (s: State, cost: number, parent?: Node, turn?: number) => {
    const id = key(s);
    if (cost >= (best.get(id) ?? Infinity) - 1e-8) return;
    best.set(id, cost);
    const node = { s, cost, score: cost + Math.hypot(goal.x - s.x, goal.z - s.z), parent, turn };
    let lo = 0,
      hi = frontier.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (frontier[mid].score > node.score) lo = mid + 1;
      else hi = mid;
    }
    frontier.splice(lo, 0, node);
  };
  starts
    .filter((s) => key(s) !== key(goal) && clear({ ...s, yaw: s.h * quarter }, obs))
    .forEach((s) => push(s, 0));
  while (frontier.length) {
    const node = frontier.pop()!;
    if (node.cost !== best.get(key(node.s))) continue;
    if (key(node.s) === key(goal)) {
      const chain: Node[] = [];
      let first = node;
      while (first.parent) {
        chain.push(first);
        first = first.parent;
      }
      const points: Step[] = [{ ...first.s, yaw: first.s.h * quarter, distance: 0 }];
      for (const step of chain.reverse())
        for (const p of primitive(step.parent!.s, step.turn!)) {
          const last = points[points.length - 1];
          points.push({ ...p, distance: last.distance + Math.hypot(p.x - last.x, p.z - last.z) });
        }
      return points.length > 1 ? points : null;
    }
    for (const turn of [0, -1, 1]) {
      const samples = primitive(node.s, turn);
      if (!samples.every((p) => clear(p, obs))) continue;
      const end = samples[samples.length - 1];
      push(
        { x: Math.round(end.x), z: Math.round(end.z), h: (node.s.h + turn + 4) % 4 },
        node.cost + (turn ? radius * quarter : 1),
        node,
        turn,
      );
    }
  }
  return null;
}
export function planLoading(items: LayoutItem[]): Navigation {
  const stages = items.filter((i) => i.kind === 'STAGING'),
    docks = items.filter((i) => i.kind === 'DOCK' && i.orientation === 0);
  if (!stages.length)
    return { lane: null, reason: 'Add a receiving / staging area to provide a pickup point.' };
  if (!docks.length) return { lane: null, reason: 'Add a dispatch dock facing the yard (0°).' };
  const obstacles = rects(items);
  const starts = stages.flatMap((s) => [
    { x: s.x - 4, z: s.z, h: 0 },
    { x: s.x + 4, z: s.z, h: 0 },
    { x: s.x, z: s.z + 4, h: 0 },
    { x: s.x, z: s.z - 4, h: 2 },
  ]);
  if (!starts.some((s) => clear({ ...s, yaw: s.h * quarter }, obstacles)))
    return { lane: null, reason: 'Staging has no clear pickup approach for the loaded forks.' };
  for (const d of docks)
    for (const x of [d.x - 4, d.x + 4, d.x - 5, d.x + 5]) {
      const goal = { x, z: d.z + 2, h: 0 },
        van = { x, z: goal.z + 5 };
      if (Math.abs(x) + 1.25 > 12.375 || van.z + 2.6 > 16.8) continue;
      const body = { x, z: van.z, w: 2.5, d: 5.16 };
      if (
        obstacles.some(
          (o) =>
            Math.abs(o.x - x) < (o.w + body.w) / 2 + 0.12 &&
            Math.abs(o.z - body.z) < (o.d + body.d) / 2 + 0.12,
        )
      )
        continue;
      // The final straight insertion uses the van's open rear; verify the
      // whole stroke against everything else before admitting this goal.
      if (
        !Array.from({ length: 11 }, (_, i) => ({ x, z: goal.z + i * 0.19, yaw: 0 })).every((p) =>
          clear(p, obstacles),
        )
      )
        continue;
      const path = search(starts, goal, [...obstacles, body]);
      if (path)
        return { lane: { path, length: path[path.length - 1].distance, van }, reason: null };
    }
  return {
    lane: null,
    reason: 'No clear turn or loading approach. Widen the aisle or move the staging area or dock.',
  };
}
export function sampleRoute(lane: LoadingLane, fraction: number): Pose {
  const path = lane.path,
    distance = Math.max(0, Math.min(1, fraction)) * lane.length;
  let lo = 0,
    hi = path.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >>> 1;
    if (path[mid].distance < distance) lo = mid;
    else hi = mid;
  }
  const a = path[lo],
    b = path[hi],
    t = (distance - a.distance) / (b.distance - a.distance);
  const delta = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: a.yaw + delta * t };
}
