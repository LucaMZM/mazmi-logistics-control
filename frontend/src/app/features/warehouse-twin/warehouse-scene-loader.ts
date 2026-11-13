import { InjectionToken } from '@angular/core';
import { SequenceSnapshot, WarehouseZone } from './warehouse-model';

export interface WarehouseScenePort {
  init(): void;
  dispose(): void;
  focus(zone: WarehouseZone, instant?: boolean): void;
  overview(): void;
  rotate(): void;
  zoom(direction: number): void;
  roof(visible: boolean): void;
  play(): boolean;
  pause(): void;
  reset(): void;
}
export interface WarehouseSceneEvents {
  select: (zone: WarehouseZone) => void;
  sequence: (state: SequenceSnapshot) => void;
  lost: () => void;
}
export type WarehouseSceneConstructor = new (
  host: HTMLElement,
  events: WarehouseSceneEvents,
) => WarehouseScenePort;
export const WAREHOUSE_SCENE_LOADER = new InjectionToken<() => Promise<WarehouseSceneConstructor>>(
  'Warehouse scene loader',
  {
    providedIn: 'root',
    factory: () => async () => (await import('./warehouse-scene')).WarehouseScene,
  },
);
