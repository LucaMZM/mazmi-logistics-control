import { planLoading, sampleRoute } from './loading-lane';
import {
  itemSize,
  starterLayout,
  validLayout,
  type LayoutItem,
} from '../warehouse-editor/warehouse-layout.model';

const item = (
  id: string,
  kind: LayoutItem['kind'],
  x: number,
  z: number,
  orientation = 0,
): LayoutItem => ({ id, kind, x, z, orientation });
const pair = [item('s', 'STAGING', 8, -3), item('d', 'DOCK', 8, 5)];
describe('Loaded forklift navigation', () => {
  it('keeps a direct path when a straight aisle is clear', () => {
    const lane = planLoading(pair).lane!;
    expect(lane.length).toBeCloseTo(10);
    expect(sampleRoute(lane, 0)).toEqual({ x: 4, z: -3, yaw: 0 });
    expect(sampleRoute(lane, 1)).toEqual({ x: 4, z: 7, yaw: 0 });
    expect(lane.van).toEqual({ x: 4, z: 12 });
  });
  it('replans after relocating a rack and never changes the blueprint', () => {
    const open = [{ ...pair[0], x: 4, z: -5 }, pair[1], item('r', 'RACK', -6, 1, 90)];
    const obstructed = open.map((o) => (o.id === 'r' ? { ...o, x: 4 } : o));
    const snapshot = structuredClone(obstructed);
    expect(validLayout(obstructed)).toBe(true);
    const before = planLoading(open).lane!,
      after = planLoading(obstructed).lane!;
    expect(after.path).not.toEqual(before.path);
    expect(after.path.some((p) => Math.abs(Math.sin(p.yaw)) > 0.5)).toBe(true);
    expect(obstructed).toEqual(snapshot);
    expect(planLoading(obstructed).lane).toEqual(after);
  });
  it('keeps loaded corners and tines clear throughout turns, including the frontage column', () => {
    const layout = starterLayout(),
      lane = planLoading(layout).lane!;
    const obstacles = layout
      .map((o) => ({ x: o.x, z: o.z, size: itemSize(o) }))
      .concat([{ x: 0, z: 7.5, size: [0.24, 0.24] }]);
    // Independent dense sampling of the rendered pose, not a call to the planner collision predicate.
    for (let i = 0; i <= 500; i++) {
      const p = sampleRoute(lane, i / 500),
        c = Math.cos(p.yaw),
        s = Math.sin(p.yaw);
      for (const u of [-0.78, 0, 0.78])
        for (const v of [-1.26, 0, 1, 2.16]) {
          const x = p.x + u * c + v * s,
            z = p.z - u * s + v * c;
          if (
            Math.abs(x) >= 12.375 ||
            z <= -8.875 ||
            z >= 16.8 ||
            obstacles.some(
              (o) => Math.abs(x - o.x) < o.size[0] / 2 && Math.abs(z - o.z) < o.size[1] / 2,
            )
          )
            throw Error('Occupied footprint at sample ' + i);
        }
      if (i) {
        const prev = sampleRoute(lane, (i - 1) / 500);
        const dy = p.yaw - prev.yaw;
        expect(Math.abs(Math.atan2(Math.sin(dy), Math.cos(dy)))).toBeLessThanOrEqual(
          lane.length / 500 / 1.99,
        );
      }
    }
  });
  it('explains absent endpoints and never substitutes an unrelated default path', () => {
    expect(planLoading([]).reason).toMatch(/staging/);
    expect(planLoading([pair[0], { ...pair[1], orientation: 180 }]).reason).toMatch(/dock/);
  });
  it('reports insufficient pickup room even where a point could fit', () => {
    const ring = [
      item('s', 'STAGING', 0, 0),
      pair[1],
      item('l', 'RACK', -4, 1),
      item('r', 'RACK', 4, 1),
      item('f', 'PICKING', 0, 5),
      item('b', 'RACK', 0, -5),
    ];
    expect(validLayout(ring)).toBe(true);
    expect(planLoading(ring)).toEqual({ lane: null, reason: expect.stringContaining('pickup') });
  });
});
