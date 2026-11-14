import * as T from 'three';
import { TwinAssets } from '../digital-twin/twin-assets';
import { LayoutItem } from '../warehouse-editor/warehouse-layout.model';

export function positionLayoutObject(group: T.Group, item: LayoutItem) {
  group.position.set(item.x, 0.08, item.z);
  group.rotation.y = T.MathUtils.degToRad(item.orientation);
}

export function buildLayoutObject(assets: TwinAssets, item: LayoutItem) {
  const parent = new T.Group();
  parent.userData['layoutId'] = item.id;
  parent.userData['kind'] = item.kind;
  positionLayoutObject(parent, item);
  const box = assets.box.bind(assets);
  if (item.kind === 'RACK') {
    const color = '#677d8a';
    for (const x of [-1.52, 1.52]) {
      for (const z of [-0.72, 0.72]) {
        box(parent, [0.13, 4.2, 0.13], [x, 2.1, z], color);
      }
    }
    for (const y of [0.4, 1.65, 2.9]) {
      box(parent, [3.3, 0.14, 1.62], [0, y, 0], '#b69c75');
      for (const x of [-1.02, 0, 1.02]) {
        box(parent, [0.75, 0.62, 1.05], [x, y + 0.39, 0], '#cfbb99', 0.04);
      }
    }
    // Galvanised diagonal bracing on the short faces keeps the picking aisle open.
    for (const x of [-1.52, 1.52]) {
      for (const sign of [-1, 1]) {
        const brace = box(parent, [0.055, 2.03, 0.055], [x, 1.13, 0], '#86969c', 0.01);
        brace.rotation.x = sign * 0.78;
      }
    }
    box(parent, [3.4, 0.16, 1.9], [0, 4.26, 0], '#657a87');
  } else if (item.kind === 'DOCK') {
    box(parent, [3.7, 0.13, 2], [0, 0.09, 0], '#a3b1b7');
    for (const x of [-1.58, 1.58]) {
      box(parent, [0.18, 3.5, 0.25], [x, 1.75, 0], '#667984');
    }
    box(parent, [3.5, 0.21, 0.35], [0, 3.57, 0], '#667984');
    box(parent, [3.2, 2.7, 0.1], [0, 1.72, -0.7], '#9eafb9');
    for (let y = 0.55; y < 3; y += 0.43) {
      box(parent, [3.05, 0.05, 0.11], [0, y, -0.63], '#607785');
    }
    for (const x of [-1.58, 1.58]) {
      for (const y of [0.38, 0.76]) box(parent, [0.195, 0.14, 0.265], [x, y, 0], '#bc9c5d');
    }
    box(parent, [3, 0.15, 1], [0, 0.12, 1.25], '#768a94');
  } else if (item.kind === 'STAGING') {
    box(parent, [2.75, 0.05, 2.75], [0, 0.09, 0], '#a6bdb6');
    for (const x of [-0.65, 0.65]) {
      for (const z of [-0.6, 0.6]) {
        box(parent, [0.95, 0.13, 0.85], [x, 0.18, z], '#927f5f');
        box(parent, [0.84, 0.72, 0.74], [x, 0.64, z], '#c7b293');
      }
    }
  } else {
    box(parent, [3, 0.05, 2.2], [0, 0.09, 0], '#e1d6ba');
    box(parent, [2.65, 0.17, 1.18], [0, 1.2, 0], '#6d8590');
    for (const x of [-1.1, 1.1]) {
      box(parent, [0.15, 1.15, 0.22], [x, 0.62, 0], '#566c78');
    }
    for (const x of [-0.73, 0.65]) {
      box(parent, [0.92, 0.65, 0.7], [x, 1.63, 0], '#c6b093');
    }
  }
  return parent;
}
