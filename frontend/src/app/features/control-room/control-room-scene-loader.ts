import { InjectionToken } from '@angular/core';
import type { SceneDiagnostics } from '../digital-twin/scene-diagnostics';
import { ControlRoomSnapshot, ControlRoomStation } from './control-room.model';

export interface ControlRoomScenePort {
  init(snapshot: ControlRoomSnapshot): void;
  snapshotDiagnostics(): SceneDiagnostics | null;
  update(snapshot: ControlRoomSnapshot): void;
  focus(station: ControlRoomStation, instant?: boolean): void;
  overview(): void;
  rotate(): void;
  dispose(): void;
}

export interface ControlRoomSceneEvents {
  select: (station: ControlRoomStation) => void;
  lost: () => void;
}

export type ControlRoomSceneConstructor = new (
  host: HTMLElement,
  events: ControlRoomSceneEvents,
) => ControlRoomScenePort;

export const CONTROL_ROOM_SCENE_LOADER = new InjectionToken<
  () => Promise<ControlRoomSceneConstructor>
>('Control Room scene loader', {
  providedIn: 'root',
  factory: () => async () => (await import('./control-room-scene')).ControlRoomScene,
});
