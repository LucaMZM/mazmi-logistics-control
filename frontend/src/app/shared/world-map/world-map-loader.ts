import { InjectionToken } from '@angular/core';
import { MapView, WorldPoint } from './world-map.model';

export interface WorldMapPort {
  update(points: WorldPoint[], route: [number, number][]): void;
  select(id: string | null, instant?: boolean): void;
  follow(id: string | null): void;
  overview(): void;
  view(): MapView;
  dispose(): void;
}
export interface WorldMapOptions {
  view?: MapView;
  style: string;
  select: (id: string, instant?: boolean) => void;
  unfollow: () => void;
  ready: () => void;
  error: () => void;
}
export type WorldMapFactory = (host: HTMLElement, options: WorldMapOptions) => WorldMapPort;
export const WORLD_MAP_LOADER = new InjectionToken<() => Promise<WorldMapFactory>>(
  'World map loader',
  {
    providedIn: 'root',
    factory: () => async () => (await import('./world-map-engine')).createWorldMap,
  },
);
export const WORLD_MAP_STYLE = new InjectionToken<string>('World map style', {
  providedIn: 'root',
  factory: () => 'https://tiles.openfreemap.org/styles/positron',
});
