import { itemSize, type LayoutItem } from '../warehouse-editor/warehouse-layout.model';

export interface LoadingLane {
  x: number;
  start: number;
  stop: number;
  van: number;
}

// Certify a straight passage alongside an outward-facing dock. The envelope
// includes the forks and carried pallet, not merely the vehicle centre.
export function loadingLane(items: LayoutItem[]): LoadingLane | null {
  for (const dock of items.filter((o) => o.kind === 'DOCK' && o.orientation === 0)) {
    for (const stage of items.filter((o) => o.kind === 'STAGING')) {
      for (const x of [dock.x - 3.8, dock.x + 3.8]) {
        const start = stage.z - 2,
          stop = dock.z + 1.7,
          van = stop + 4.2;
        if (
          Math.abs(x) > 10 ||
          Math.abs(stage.x - x) > 5 ||
          stop - start < 4 ||
          start - 1.4 < -8.7 ||
          van + 2.6 > 16.8
        )
          continue;
        if (Math.abs(x) < 1.6 && start < 9 && van > 6) continue; // centre column on cutaway frontage
        if (
          items.some((o) => {
            const [width, depth] = itemSize(o);
            return (
              Math.abs(o.x - x) < width / 2 + 1.4 &&
              o.z + depth / 2 > start - 1.4 &&
              o.z - depth / 2 < van + 2.6
            );
          })
        )
          continue;
        return { x, start, stop, van };
      }
    }
  }
  return null;
}
