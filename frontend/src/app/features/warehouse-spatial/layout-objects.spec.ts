import { Box3, Vector3 } from 'three';
import { TwinAssets } from '../digital-twin/twin-assets';
import { LAYOUT_KINDS, itemSize } from '../warehouse-editor/warehouse-layout.model';
import { buildLayoutObject, positionLayoutObject } from './layout-objects';
describe('Shared blueprint coordinates', () => {
  for (const kind of LAYOUT_KINDS)
    it(kind + ' stays within the validated footprint at each rotation', () => {
      const assets = new TwinAssets();
      const item = { id: 'test', kind, x: 10, z: 6, orientation: 0 };
      const object = buildLayoutObject(assets, item);
      const first = object.children[0];
      for (const orientation of [0, 90, 180, 270]) {
        const pose = { ...item, orientation };
        positionLayoutObject(object, pose);
        const bounds = new Box3().setFromObject(object);
        const size = itemSize(pose);
        expect(bounds.min.x).toBeGreaterThanOrEqual(item.x - size[0] / 2 - 0.001);
        expect(bounds.max.x).toBeLessThanOrEqual(item.x + size[0] / 2 + 0.001);
        expect(bounds.min.z).toBeGreaterThanOrEqual(item.z - size[1] / 2 - 0.001);
        expect(bounds.max.z).toBeLessThanOrEqual(item.z + size[1] / 2 + 0.001);
        expect(object.position).toEqual(new Vector3(item.x, 0.08, item.z));
        expect(object.children[0]).toBe(first);
      }
      assets.dispose();
    });
});
