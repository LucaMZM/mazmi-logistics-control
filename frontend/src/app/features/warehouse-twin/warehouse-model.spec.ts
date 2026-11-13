import * as T from 'three';
import { WarehouseSequence } from './warehouse-model';
import { WarehouseAssets } from './warehouse-assets';

describe('Warehouse visual sequence', () => {
  it('runs all phases, pauses, resumes and resets deterministically', () => {
    const clock = new WarehouseSequence();
    expect(clock.advance(5).elapsed).toBe(0);
    clock.play();
    expect(clock.advance(3).phase).toBe('Collecting pallet');
    clock.pause();
    expect(clock.advance(9).elapsed).toBe(3);
    clock.play();
    expect(clock.advance(5).phase).toBe('Moving to dock');
    expect(clock.advance(8).phase).toBe('Approaching dock');
    expect(clock.advance(4).phase).toBe('Loading van');
    expect(clock.advance(10)).toEqual({
      elapsed: 24,
      progress: 100,
      phase: 'Complete',
      running: false,
    });
    clock.play();
    expect(clock.snapshot().elapsed).toBe(0);
    clock.advance(2);
    clock.reset();
    expect(clock.snapshot().running).toBe(false);
    expect(clock.snapshot().progress).toBe(0);
  });
  it('ignores invalid time values without mutating domain objects', () => {
    const clock = new WarehouseSequence();
    clock.play();
    clock.advance(-1);
    clock.advance(NaN);
    expect(clock.snapshot().elapsed).toBe(0);
  });
});
describe('Warehouse resource catalog', () => {
  it('uses deterministic zones and disposes shared geometry/materials only once', () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')!;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({ fillRect: vi.fn(), fillText: vi.fn() }),
    });
    let assets: WarehouseAssets;
    try {
      assets = new WarehouseAssets();
    } finally {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', descriptor);
    }
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    assets.root.traverse((object) => {
      if (object instanceof T.Mesh) {
        geometries.add(object.geometry);
        for (const m of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(m);
      }
    });
    const spies = [
      ...[...geometries].map((g) => vi.spyOn(g, 'dispose')),
      ...[...materials].map((m) => vi.spyOn(m, 'dispose')),
    ];
    expect([...assets.zones.keys()]).toEqual(['receiving', 'racks', 'picking', 'dispatch']);
    expect(assets.roof.visible).toBe(false);
    expect(
      assets.zones.get('racks')?.children.some((child) => child instanceof T.InstancedMesh),
    ).toBe(true);
    assets.dispose();
    assets.dispose();
    expect(assets.root.children).toHaveLength(0);
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
    vi.restoreAllMocks();
  });
});
