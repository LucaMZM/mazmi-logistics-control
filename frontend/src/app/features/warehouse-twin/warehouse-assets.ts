import { loadingLane } from '../warehouse-spatial/loading-lane';
import { buildLayoutObject } from '../warehouse-spatial/layout-objects';
import type { LayoutItem } from '../warehouse-editor/warehouse-layout.model';
import * as T from 'three';
import { TwinAssets } from '../digital-twin/twin-assets';
import { WarehouseZone } from './warehouse-model';

/** Deterministic illustration. These coordinates are not warehouse/bin records. */
export class WarehouseAssets {
  private disposed = false;
  readonly catalog = new TwinAssets();
  readonly root = new T.Group();
  readonly roof = new T.Group();
  readonly forklift = new T.Group();
  readonly pallet = new T.Group();
  readonly zones = new Map<WarehouseZone, T.Group>();
  private readonly instanced: T.InstancedMesh[] = [];
  constructor(layout?: LayoutItem[]) {
    const box = this.catalog.box.bind(this.catalog);
    box(this.root, [29, 0.55, 30], [0, -0.4, 3], '#b9c2c8', 0.3);
    box(this.root, [27, 0.08, 28], [0, -0.06, 3], '#cdd3d6');
    box(this.root, [25, 0.18, 17], [0, 0.04, -0.5], '#e6e8e5');
    box(this.root, [25, 6, 0.25], [0, 3, -9], '#dce1df');
    box(this.root, [0.25, 1.2, 17], [-12.5, 0.6, -0.5], '#e0e3e2');
    box(this.root, [0.25, 1.2, 17], [12.5, 0.6, -0.5], '#e0e3e2');
    for (const x of [-12.5, 0, 12.5]) {
      for (const z of [-9, 7.5]) box(this.root, [0.24, 6.4, 0.24], [x, 3.2, z], '#7c8b94');
      box(this.roof, [0.2, 0.25, 17], [x, 6.4, -0.5], '#87959c');
    }
    box(this.roof, [25.6, 0.22, 17.6], [0, 6.7, -0.5], '#bbc5c9');
    for (const x of [-7, 5]) box(this.roof, [3, 0.08, 14], [x, 6.86, -0.5], '#e5eeee');
    this.roof.visible = false;
    this.root.add(this.roof);
    this.catalog.label(this.root, 'MAZMI / DISTRIBUTION', 7, 1.1, [0, 4.6, -8.83]);
    for (const id of ['receiving', 'racks', 'picking', 'dispatch'] as const) {
      const zone = new T.Group();
      zone.userData['zone'] = id;
      this.zones.set(id, zone);
      this.root.add(zone);
    }
    if (layout) {
      const mapping = {
        RACK: 'racks',
        DOCK: 'dispatch',
        STAGING: 'receiving',
        PICKING: 'picking',
      } as const;
      for (const item of layout)
        this.zones.get(mapping[item.kind])!.add(buildLayoutObject(this.catalog, item));
      const lane = loadingLane(layout);
      if (lane) {
        const van = this.catalog.van('VISUAL', '#dce1e4');
        van.position.set(lane.x, 0.12, lane.van);
        this.zones.get('dispatch')!.add(van);
        this.buildForklift();
        this.palletStack(this.pallet, [0, 0, 0]);
        box(this.pallet, [1.05, 0.85, 1.05], [0, 0.62, 0], '#bda989');
        this.root.add(this.forklift, this.pallet);
      }
      return;
    }
    const racks = this.zones.get('racks')!;
    const cartons: T.Vector3[] = [];
    for (const [column, x] of [-8, 0, 8].entries()) {
      for (const z of [-6, -1.5]) {
        const levels = column === 0 ? 4 : 3;
        for (const dx of [-2, 2])
          for (const dz of [-0.9, 0.9])
            box(racks, [0.12, levels * 1.2, 0.12], [x + dx, levels * 0.6, z + dz], '#556975');
        for (let level = 0; level < levels; level++) {
          const y = 0.3 + level * 1.2;
          box(racks, [4.2, 0.12, 2], [x, y, z], '#9a875f');
          for (const dz of [-1, 1]) box(racks, [4.2, 0.14, 0.1], [x, y + 0.1, z + dz], '#ba9a63');
          for (const dx of [-1.35, -0.4, 0.55, 1.45])
            cartons.push(new T.Vector3(x + dx, y + 0.46, z));
        }
      }
    }
    // Repeated cartons share one draw call; quantities are illustrative, not stock counts.
    const template = box(new T.Group(), [0.76, 0.72, 1.1], [0, 0, 0], '#bda989', 0.03);
    const stock = new T.InstancedMesh(template.geometry, template.material, cartons.length);
    cartons.forEach((position, i) =>
      stock.setMatrixAt(i, new T.Matrix4().makeTranslation(position)),
    );
    stock.castShadow = true;
    stock.receiveShadow = true;
    racks.add(stock);
    this.instanced.push(stock);
    const receiving = this.zones.get('receiving')!;
    box(receiving, [5, 0.035, 4], [-8, 0.16, 5], '#c2cdc9');
    for (const x of [-9.4, -7.7]) {
      this.palletStack(receiving, [x, 0.2, 5]);
      box(receiving, [1.15, 1, 1.1], [x, 0.9, 5], '#bfae91');
    }
    const picking = this.zones.get('picking')!;
    box(picking, [5, 0.035, 3.5], [0, 0.16, 4.6], '#d9d1bd');
    box(picking, [3.5, 0.12, 1.2], [0, 1, 5], '#697c86');
    for (const x of [-1.4, 1.4]) box(picking, [0.1, 0.9, 1], [x, 0.5, 5], '#556975');
    box(picking, [0.8, 0.55, 0.7], [0.7, 1.35, 5], '#bda989');
    const dispatch = this.zones.get('dispatch')!;
    box(dispatch, [5, 0.035, 4], [7, 0.16, 5], '#c6ced3');
    for (const x of [-8, 5]) {
      for (const dx of [-2, 2]) box(dispatch, [0.3, 4, 0.3], [x + dx, 2, 7.5], '#6b7c86');
      box(dispatch, [4.3, 0.4, 0.45], [x, 4.1, 7.5], '#70828c');
      box(dispatch, [4.2, 0.3, 1], [x, 0.15, 7.7], '#8a989d');
      for (const dx of [-2.25, 2.25])
        box(dispatch, [0.13, 0.9, 0.13], [x + dx, 0.5, 8.5], '#b79a62');
    }
    const van = this.catalog.van('VISUAL', '#dce1e4');
    van.position.set(5, 0.12, 11);
    dispatch.add(van);
    // An illustrative open cargo aperture, not a modification of the shared fleet asset.
    box(dispatch, [1.55, 1.35, 0.04], [5, 1.55, 8.82], '#394952');
    for (const side of [-1, 1]) {
      const door = box(dispatch, [0.78, 1.4, 0.08], [5 + side * 1.13, 1.55, 8.5], '#dce1e4');
      door.rotation.y = (side * Math.PI) / 3;
    }
    for (const x of [2.7, 7.3]) box(this.root, [0.08, 0.02, 6], [x, 0.03, 11.3], '#f2f2eb', 0.005);
    for (let x = -11; x <= 10; x += 2)
      box(this.root, [0.8, 0.02, 0.1], [x, 0.03, 15], '#f2f2eb', 0.005);
    for (const [text, x] of [
      ['RECEIVING', -8],
      ['PICKING', 0],
      ['DISPATCH', 8],
    ] as const) {
      const sign = this.catalog.label(this.root, text, 3, 0.65, [x, 0.2, 7]);
      sign.rotation.x = -Math.PI / 2;
    }
    this.palletStack(this.pallet, [0, 0, 0]);
    box(this.pallet, [1.05, 0.85, 1.05], [0, 0.62, 0], '#bda989');
    box(this.pallet, [0.06, 0.85, 1.06], [0, 0.62, 0], '#d6c7ac');
    this.root.add(this.pallet);
    this.buildForklift();
    this.root.add(this.forklift);
  }
  private palletStack(group: T.Group, position: [number, number, number]) {
    const [x, y, z] = position;
    for (const dx of [-0.45, 0, 0.45])
      this.catalog.box(group, [0.12, 0.15, 1.3], [x + dx, y + 0.08, z], '#948163', 0.01);
    for (const dz of [-0.5, -0.25, 0, 0.25, 0.5])
      this.catalog.box(group, [1.2, 0.06, 0.16], [x, y + 0.18, z + dz], '#b39d79', 0.01);
  }
  private buildForklift() {
    const box = this.catalog.box.bind(this.catalog),
      g = this.forklift;
    box(g, [1.35, 0.8, 1.7], [0, 0.75, -0.15], '#ac925f', 0.15);
    box(g, [1.3, 0.5, 0.5], [0, 0.75, -1], '#647783', 0.12);
    box(g, [0.65, 0.15, 0.6], [0, 1.2, -0.15], '#36454e');
    box(g, [0.65, 0.5, 0.12], [0, 1.45, -0.4], '#36454e');
    for (const x of [-0.62, 0.62]) {
      for (const z of [-0.75, 0.65]) box(g, [0.28, 0.65, 0.65], [x, 0.37, z], '#303a42', 0.2);
      box(g, [0.08, 1.8, 0.08], [x, 1.7, -0.75], '#465762');
      box(g, [0.1, 2, 0.1], [x, 1.8, 0.7], '#465762');
      box(g, [0.12, 0.1, 1.5], [x, 0.33, 1.4], '#5c6d78');
    }
    box(g, [1.5, 0.12, 1.8], [0, 2.65, 0], '#6e7c84');
    box(g, [1.4, 0.15, 0.15], [0, 0.5, 0.8], '#52616a');
    g.userData['zone'] = 'picking';
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.instanced.forEach((mesh) => mesh.dispose());
    this.catalog.dispose();
    this.root.clear();
  }
}
