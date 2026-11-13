export const LAYOUT_KINDS = ['RACK', 'DOCK', 'STAGING', 'PICKING'] as const;
export type LayoutKind = (typeof LAYOUT_KINDS)[number];

export interface LayoutItem {
  id: string;
  kind: LayoutKind;
  x: number;
  z: number;
  orientation: number;
}

export interface WarehouseVisualLayout {
  warehouseId: string;
  revision: number;
  saved: boolean;
  items: LayoutItem[];
}

export const LAYOUT_LIMIT = 60;

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  RACK: 'Storage rack',
  DOCK: 'Dispatch dock',
  STAGING: 'Receiving / staging',
  PICKING: 'Picking station',
};

export function itemSize(item: LayoutItem): [number, number] {
  const base: [number, number] =
    item.kind === 'RACK'
      ? [3.4, 1.8]
      : item.kind === 'DOCK'
        ? [3.6, 1.8]
        : item.kind === 'STAGING'
          ? [2.8, 2.8]
          : [3, 2.2];
  return item.orientation === 90 || item.orientation === 270 ? [base[1], base[0]] : base;
}

export function validLayout(items: LayoutItem[]): boolean {
  if (items.length > LAYOUT_LIMIT) return false;
  const ids = new Set<string>();
  for (const item of items) {
    if (
      !item ||
      !/^[a-zA-Z0-9_-]{1,40}$/.test(item.id) ||
      ids.has(item.id) ||
      !LAYOUT_KINDS.includes(item.kind) ||
      !Number.isInteger(item.x) ||
      !Number.isInteger(item.z) ||
      item.x < -10 ||
      item.x > 10 ||
      item.z < -6 ||
      item.z > 6 ||
      ![0, 90, 180, 270].includes(item.orientation) ||
      (item.kind === 'DOCK' && item.z < 4)
    ) return false;
    ids.add(item.id);
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const [aw, ad] = itemSize(a);
      const [bw, bd] = itemSize(b);
      if (Math.abs(a.x - b.x) < (aw + bw) / 2 + 0.25 &&
          Math.abs(a.z - b.z) < (ad + bd) / 2 + 0.25) return false;
    }
  }
  return true;
}

/** An unsaved starter blueprint; never reported as an observed inventory location. */
export function starterLayout(): LayoutItem[] {
  return [
    { id: 'rack-1', kind: 'RACK', x: -7, z: -3, orientation: 0 },
    { id: 'rack-2', kind: 'RACK', x: 0, z: -3, orientation: 0 },
    { id: 'rack-3', kind: 'RACK', x: 7, z: -3, orientation: 0 },
    { id: 'receiving-1', kind: 'STAGING', x: -7, z: 3, orientation: 0 },
    { id: 'picking-1', kind: 'PICKING', x: 0, z: 3, orientation: 0 },
    { id: 'dock-1', kind: 'DOCK', x: 7, z: 5, orientation: 0 },
  ];
}

export function relocate(items: LayoutItem[], id: string, x: number, z: number): LayoutItem[] | null {
  const moved = items.map((item) => item.id === id ? { ...item, x, z } : item);
  return validLayout(moved) ? moved : null;
}

export function rotateItem(items: LayoutItem[], id: string): LayoutItem[] | null {
  const rotated = items.map((item) =>
    item.id === id ? { ...item, orientation: (item.orientation + 90) % 360 } : item,
  );
  return validLayout(rotated) ? rotated : null;
}

export function addItem(items: LayoutItem[], kind: LayoutKind): LayoutItem[] | null {
  if (items.length >= LAYOUT_LIMIT) return null;
  let number = 1;
  while (items.some((item) => item.id === `${kind.toLowerCase()}-${number}`)) number++;
  const id = `${kind.toLowerCase()}-${number}`;
  for (const z of kind === 'DOCK' ? [4, 5, 6] : [-5, -3, -1, 1, 3, 5]) {
    for (let x = -9; x <= 9; x++) {
      const next = [...items, { id, kind, x, z, orientation: 0 }];
      if (validLayout(next)) return next;
    }
  }
  return null;
}
