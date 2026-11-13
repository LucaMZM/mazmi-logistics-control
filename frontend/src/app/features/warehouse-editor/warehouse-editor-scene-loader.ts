import { InjectionToken } from '@angular/core';
import { LayoutItem } from './warehouse-layout.model';

export interface WarehouseEditorScenePort {
  init(items: LayoutItem[]): void;
  update(items: LayoutItem[]): void;
  select(id: string | null): void;
  overview(): void;
  rotate(): void;
  dispose(): void;
}

export interface WarehouseEditorEvents {
  select: (id: string) => void;
  move: (id: string, x: number, z: number) => void;
  lost: () => void;
}

export type WarehouseEditorSceneConstructor = new (
  host: HTMLElement,
  events: WarehouseEditorEvents,
) => WarehouseEditorScenePort;

export const WAREHOUSE_EDITOR_SCENE_LOADER = new InjectionToken<
  () => Promise<WarehouseEditorSceneConstructor>
>('Warehouse Editor Three.js lazy loader', {
  providedIn: 'root',
  factory: () => async () => (await import('./warehouse-editor-scene')).WarehouseEditorScene,
});
