import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plateLabel } from './vehicle-twin';

/** Scene-owned catalog. No remote models, external textures or commercial likenesses. */
export class TwinAssets {
  private readonly geometries = new Map<string, T.BufferGeometry>();
  private readonly materials = new Map<string, T.MeshStandardMaterial>();
  private readonly textures: T.Texture[] = [];
  box(
    parent: T.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    color: string,
    radius = 0.04,
  ) {
    const key = `${size.join(',')}:${radius}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new RoundedBoxGeometry(...size, 2, radius);
      this.geometries.set(key, geometry);
    }
    let material = this.materials.get(color);
    if (!material) {
      material = new T.MeshStandardMaterial({ color, roughness: 0.72 });
      this.materials.set(color, material);
    }
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  label(
    parent: T.Object3D,
    text: string,
    width: number,
    height: number,
    position: [number, number, number],
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Label canvas unavailable');
    ctx.fillStyle = '#f5f5ed';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#27343d';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plateLabel(text), 256, 64, 480);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    this.textures.push(texture);
    const material = new T.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    this.materials.set(`label-${this.textures.length}`, material);
    const geometry = new T.PlaneGeometry(width, height);
    this.geometries.set(`label-${this.textures.length}`, geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  van(plate: string, color: string) {
    const van = new T.Group();
    this.box(van, [1.9, 1.65, 3.1], [0, 1.45, -0.55], color, 0.16);
    this.box(van, [1.85, 1.35, 1.65], [0, 1.25, 1.55], color, 0.18);
    this.box(van, [1.8, 0.42, 0.8], [0, 0.9, 2.05], color, 0.12);
    const windshield = this.box(van, [1.58, 0.65, 0.08], [0, 1.58, 2.32], '#354c57');
    windshield.rotation.x = -0.16;
    for (const side of [-1, 1]) {
      this.box(van, [0.05, 0.63, 0.95], [side * 0.94, 1.58, 1.5], '#354c57');
      this.box(van, [0.2, 0.2, 0.28], [side * 1.09, 1.4, 2], '#30363d');
      this.box(van, [0.06, 0.07, 0.25], [side * 0.97, 1.1, 0.95], '#30363d');
      this.box(van, [0.04, 0.12, 3.7], [side * 0.97, 0.67, -0.1], '#485563');
      this.box(van, [0.38, 0.18, 0.08], [side * 0.63, 0.96, 2.48], '#f1e9cf');
      this.box(van, [0.16, 0.5, 0.06], [side * 0.78, 1.05, -2.13], '#a74135');
      for (const z of [-1.4, 1.5]) {
        const key = 'wheel';
        if (!this.geometries.has(key))
          this.geometries.set(key, new T.CylinderGeometry(0.43, 0.43, 0.22, 24));
        if (!this.materials.has(key))
          this.materials.set(
            key,
            new T.MeshStandardMaterial({ color: '#25292e', roughness: 0.95 }),
          );
        const wheel = new T.Mesh(this.geometries.get(key), this.materials.get(key));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.96, 0.43, z);
        wheel.castShadow = true;
        van.add(wheel);
        this.box(van, [0.025, 0.29, 0.29], [side * 1.08, 0.43, z], '#a4adb4', 0.12);
      }
    }
    this.box(van, [1.78, 0.16, 0.14], [0, 0.58, 2.44], '#30363d');
    this.box(van, [0.78, 0.21, 0.07], [0, 0.98, 2.48], '#30363d');
    this.label(van, plate, 0.9, 0.23, [0, 0.73, 2.53]);
    this.label(van, plate, 0.9, 0.23, [0, 0.73, -2.16]).rotation.y = Math.PI;
    this.box(van, [0.025, 1.4, 0.025], [0, 1.43, -2.12], '#77828a');
    return van;
  }
  yard() {
    const yard = new T.Group();
    this.box(yard, [24, 0.5, 20], [0, -0.3, 0], '#bec5c9', 0.3);
    this.box(yard, [22.8, 0.08, 18.8], [0, -0.01, 0], '#8c969e');
    this.box(yard, [22, 0.2, 1.4], [0, 0.1, -7.1], '#dce0df');
    this.box(yard, [15, 4, 4], [-1, 2, -6], '#d9dcd9', 0.08);
    this.box(yard, [15.4, 0.2, 4.4], [-1, 4.1, -6], '#4a5760');
    for (let x = -8; x < 6; x += 0.55)
      this.box(yard, [0.035, 3.6, 0.05], [x, 2, -3.97], '#b4bdc0', 0.01);
    for (const x of [-5, 0]) {
      this.box(yard, [3.1, 2.9, 0.18], [x, 1.5, -3.8], '#394750');
      for (let y = 0.3; y < 2.9; y += 0.22)
        this.box(yard, [2.7, 0.16, 0.1], [x, y, -3.67], '#74828a');
      this.box(yard, [3.4, 0.2, 1.2], [x, 0.15, -3.2], '#53616a');
      for (const dx of [-1.65, 1.65])
        this.box(yard, [0.13, 0.9, 0.13], [x + dx, 0.45, -2.8], '#c8a66b');
    }
    this.label(yard, 'MAZMI / FLEET LAB', 4.2, 1.05, [3.7, 2.65, -3.85]);
    for (const x of [-8.5, -5, -1.5, 2])
      this.box(yard, [0.07, 0.015, 5.8], [x, 0.05, 4], '#e5e6df', 0.005);
    this.box(yard, [10.5, 0.015, 0.07], [-3.25, 0.05, 6.9], '#e5e6df', 0.005);
    for (let z = -1; z < 8; z += 2) this.box(yard, [0.1, 0.02, 0.8], [5, 0.06, z], '#e5e6df');
    for (let i = 0; i < 3; i++) {
      this.box(yard, [1, 0.15, 1], [8, 0.1, -4 + i * 1.5], '#a88c66');
      this.box(yard, [0.85, 0.8, 0.85], [8, 0.58, -4 + i * 1.5], '#c4af8a');
    }
    for (const x of [-10, 10]) {
      this.box(yard, [0.12, 5, 0.12], [x, 2.5, -1], '#4a5760');
      this.box(yard, [0.65, 0.12, 0.5], [x, 5, -0.8], '#e5e6df');
    }
    return yard;
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.geometries.clear();
    this.materials.clear();
    this.textures.length = 0;
  }
}
