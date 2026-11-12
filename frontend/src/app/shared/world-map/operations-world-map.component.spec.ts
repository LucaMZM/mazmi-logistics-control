import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { OperationsWorldMapComponent } from './operations-world-map.component';
import { WORLD_MAP_LOADER, WorldMapFactory, WorldMapOptions } from './world-map-loader';

function setup(loader?: () => Promise<WorldMapFactory>) {
  const port = {
    update: vi.fn(),
    select: vi.fn(),
    follow: vi.fn(),
    overview: vi.fn(),
    dispose: vi.fn(),
    view: vi.fn(() => ({ latitude: 40, longitude: -3, zoom: 12 })),
  };
  let options: WorldMapOptions;
  const factory = vi.fn((_host: HTMLElement, o: WorldMapOptions) => {
    options = o;
    return port;
  });
  const load = loader ?? vi.fn(async () => factory);
  TestBed.configureTestingModule({ providers: [{ provide: WORLD_MAP_LOADER, useValue: load }] });
  const component = TestBed.runInInjectionContext(() => new OperationsWorldMapComponent());
  component.host = { nativeElement: document.createElement('div') };
  return { component, port, load, options: () => options };
}
describe('World map lifecycle', () => {
  it('loads no 3D engine in 2D and preserves camera on switching back', async () => {
    const { component: c, port, load, options } = setup();
    expect(load).not.toHaveBeenCalled();
    await c.mode3d();
    options().ready();
    expect(c.loading()).toBe(false);
    c.mode2d();
    expect(port.dispose).toHaveBeenCalledOnce();
    expect(c.view?.zoom).toBe(12);
    c.ngOnDestroy();
  });
  it('ignores late imports after switching mode or leaving the route', async () => {
    let resolve!: (f: WorldMapFactory) => void;
    const { component: c } = setup(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const pending = c.mode3d();
    c.mode2d();
    const create = vi.fn();
    resolve(create);
    await pending;
    expect(create).not.toHaveBeenCalled();
    const next = c.mode3d();
    c.ngOnDestroy();
    resolve(create);
    await next;
    expect(create).not.toHaveBeenCalled();
  });
  it('exposes recoverable failure and supports retry', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(() => ({ update: vi.fn(), dispose: vi.fn() }));
    const { component: c } = setup(load);
    await c.mode3d();
    expect(c.error()).toBe(true);
    await c.mode3d();
    expect(c.error()).toBe(false);
    c.ngOnDestroy();
  });
  it('selects by shipment identity, cancels follow on gestures and clears selection on route change', async () => {
    const { component: c, port, options } = setup();
    c.points = [{ id: 'shipment', kind: 'vehicle', label: 'MLC', latitude: 40, longitude: -3 }];
    c.ngOnChanges();
    await c.mode3d();
    c.choose('shipment');
    c.toggleFollow();
    expect(port.follow).toHaveBeenLastCalledWith('shipment');
    options().unfollow();
    expect(c.following()).toBe(false);
    c.points = [];
    c.ngOnChanges();
    expect(c.selectedId()).toBe(null);
    expect(port.follow).toHaveBeenLastCalledWith(null);
    c.ngOnDestroy();
  });
});
