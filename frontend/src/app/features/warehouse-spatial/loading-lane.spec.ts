import { loadingLane } from './loading-lane';
import type { LayoutItem } from '../warehouse-editor/warehouse-layout.model';
const pair: LayoutItem[] = [
  { id: 's', kind: 'STAGING', x: 8, z: -3, orientation: 0 },
  { id: 'd', kind: 'DOCK', x: 8, z: 5, orientation: 0 },
];
describe('Illustrative loading corridor', () => {
  it('selects a clear aisle and keeps van and forklift on different footprints', () => {
    const lane = loadingLane(pair)!;
    expect(lane.x).toBe(4.2);
    expect(lane.van - lane.stop).toBeGreaterThan(4);
  });
  it('rejects a rack in the aisle and inward facing docks', () => {
    expect(
      loadingLane([...pair, { id: 'r', kind: 'RACK', x: 4, z: 0, orientation: 90 }]),
    ).toBeNull();
    expect(loadingLane([pair[0], { ...pair[1], orientation: 180 }])).toBeNull();
  });
});
