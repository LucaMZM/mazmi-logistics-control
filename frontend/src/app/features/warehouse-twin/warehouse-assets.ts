import { sampleRoute, type LoadingLane } from '../warehouse-spatial/loading-lane';
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
  readonly carriage = new T.Group();
  readonly route = new T.Group();
  readonly pallet = new T.Group();
  readonly zones = new Map<WarehouseZone, T.Group>();
  private readonly instanced: T.InstancedMesh[] = [];
  constructor(layout: LayoutItem[], lane: LoadingLane | null) {
    const box = this.catalog.box.bind(this.catalog);
    box(this.root, [29, 0.55, 30], [0, -0.4, 3], '#b9c2c8', 0.3);
    box(this.root, [27, 0.08, 28], [0, -0.06, 3], '#cdd3d6');
    box(this.root, [25, 0.18, 17], [0, 0.04, -0.5], '#e6e8e5');
    // The dock apron is flush with the warehouse floor: no airborne crossing of a kerb.
    box(this.root, [25, 0.18, 8.8], [0, 0.04, 12.4], '#c3cacc');
    box(this.root, [25, 6, 0.25], [0, 3, -9], '#dce1df');
    box(this.root, [0.25, 1.2, 17], [-12.5, 0.6, -0.5], '#e0e3e2');
    box(this.root, [0.25, 1.2, 17], [12.5, 0.6, -0.5], '#e0e3e2');
    for (const x of [-12.5, 0, 12.5]) {
      for (const z of [-9, 7.5]) box(this.root, [0.24, 6.4, 0.24], [x, 3.2, z], '#7c8b94');
      box(this.roof, [0.2, 0.25, 17], [x, 6.4, -0.5], '#87959c');
    }
    box(this.roof, [25.6, 0.22, 17.6], [0, 6.7, -0.5], '#bbc5c9');
    for (const x of [-7, 5]) box(this.roof, [3, 0.08, 14], [x, 6.86, -0.5], '#e5eeee');
    // Clerestory glazing, low wall protection and flush concrete expansion joints.
    for (const x of [-9, -6, -3, 3, 6, 9]) {
      box(this.root, [2.76, 0.94, 0.12], [x, 5.55, -8.8], '#a9babe');
      box(this.root, [2.86, 0.075, 0.17], [x, 5.04, -8.75], '#75868b');
    }
    box(this.root, [24.5, 0.32, 0.12], [0, 0.69, -8.78], '#879293');
    for (const x of [-9, -3, 3, 9])
      box(this.root, [0.025, 0.009, 16.5], [x, 0.133, -0.45], '#b7bfbc', 0.002);
    for (const z of [-5, 1, 7])
      box(this.root, [24.8, 0.009, 0.025], [0, 0.133, z], '#b7bfbc', 0.002);
    this.roof.visible = false;
    this.root.add(this.roof);
    this.catalog.label(this.root, 'MAZMI / DISTRIBUTION', 7, 1.1, [0, 4.6, -8.83]);
    for (const id of ['receiving', 'racks', 'picking', 'dispatch'] as const) {
      const zone = new T.Group();
      zone.userData['zone'] = id;
      this.zones.set(id, zone);
      this.root.add(zone);
    }

    const mapping = {
      RACK: 'racks',
      DOCK: 'dispatch',
      STAGING: 'receiving',
      PICKING: 'picking',
    } as const;
    for (const item of layout)
      this.zones.get(mapping[item.kind])!.add(buildLayoutObject(this.catalog, item));
    // Batch repeated shelf beams, cartons and dock hardware per selectable zone.
    for (const zone of this.zones.values()) this.batch(zone);

    if (lane) {
      const van = this.catalog.van('VISUAL', '#dce1e4', true);
      van.position.set(lane.van.x, 0.12, lane.van.z);
      this.buildRoute(lane);
      this.root.add(this.route);
      for (const side of [-1, 1])
        box(this.root, [0.09, 0.018, 5.4], [lane.van.x + side * 1.5, 0.14, lane.van.z], '#f4f3eb');
      this.zones.get('dispatch')!.add(van);
      this.buildForklift();
      this.palletStack(this.pallet, [0, 0, 0]);
      box(this.pallet, [1.05, 0.85, 1.05], [0, 0.62, 0], '#bda989');
      box(this.pallet, [0.075, 0.86, 1.06], [0, 0.62, 0], '#e0d5bf');
      this.root.add(this.forklift, this.pallet);
    }
  }
  private batch(zone: T.Group) {
    zone.updateMatrixWorld(true);
    const batches = new Map<string, T.Mesh[]>();
    zone.traverse((obj) => {
      if (!(obj instanceof T.Mesh) || Array.isArray(obj.material)) return;
      const key = obj.geometry.uuid + obj.material.uuid;
      const group = batches.get(key) ?? [];
      group.push(obj);
      batches.set(key, group);
    });
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const first = meshes[0],
        batch = new T.InstancedMesh(first.geometry, first.material, meshes.length);
      meshes.forEach((mesh, i) => {
        batch.setMatrixAt(i, mesh.matrixWorld);
        mesh.removeFromParent();
      });
      batch.castShadow = true;
      batch.receiveShadow = true;
      zone.add(batch);
      this.instanced.push(batch);
    }
  }
  private buildRoute(lane: LoadingLane) {
    const mark = this.catalog.box(new T.Group(), [0.16, 0.012, 0.56], [0, 0, 0], '#53776f', 0.006);
    const count = Math.max(1, Math.floor(lane.length)),
      marks = new T.InstancedMesh(mark.geometry, mark.material, count);
    const transform = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const p = sampleRoute(lane, (i + 0.5) / count);
      transform.position.set(p.x, 0.155, p.z);
      transform.rotation.y = p.yaw;
      transform.updateMatrix();
      marks.setMatrixAt(i, transform.matrix);
    }
    this.route.add(marks);
    this.instanced.push(marks);
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
      for (const z of [-0.75, 0.65]) this.catalog.tyre(g, [x, 0.34, z], 0.34, 0.28);
      box(g, [0.08, 1.8, 0.08], [x, 1.7, -0.75], '#465762');
      box(g, [0.1, 2, 0.1], [x, 1.8, 0.7], '#465762');
      box(this.carriage, [0.12, 0.08, 1.5], [x * 0.42, 0.1, 1.4], '#485760');
      box(this.carriage, [0.1, 0.88, 0.13], [x * 0.42, 0.5, 0.75], '#495761');
      box(g, [0.065, 1.7, 0.08], [x * 0.72, 1.16, 0.78], '#b8c0c2');
      box(g, [0.18, 0.13, 0.14], [x, 2.55, 0.82], '#e7dec2');
      for (const z of [-0.75, 0.65])
        box(g, [0.035, 0.28, 0.28], [x * 1.22, 0.37, z], '#a3a9a5', 0.12);
    }
    box(g, [1.5, 0.12, 1.8], [0, 2.65, 0], '#6e7c84');
    box(g, [1.4, 0.15, 0.15], [0, 0.5, 0.8], '#52616a');
    for (const y of [0.32, 0.65, 0.91])
      box(this.carriage, [1.28, 0.065, 0.12], [0, y, 0.75], '#57646a');
    box(g, [0.17, 0.4, 0.17], [0.28, 1.32, 0.3], '#515f65');
    box(g, [1.1, 0.08, 0.12], [0, 1.03, -1.22], '#d7c499');
    g.add(this.carriage);
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
