import { InjectionToken } from '@angular/core';

export interface ScenePort {
  init(plate: string, color: string): void;
  dispose(): void;
  play(): boolean;
  pause(): void;
  focus(instant?: boolean): void;
  rotate(): void;
  reset(): void;
}
type SceneConstructor = new (
  host: HTMLElement,
  select: () => void,
  lost: () => void,
  stopped: () => void,
) => ScenePort;
export const SCENE_LOADER = new InjectionToken<() => Promise<SceneConstructor>>(
  'Fleet scene loader',
  {
    providedIn: 'root',
    factory: () => async () => (await import('./fleet-scene')).FleetScene,
  },
);
