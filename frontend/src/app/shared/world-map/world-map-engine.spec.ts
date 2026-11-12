const fake = vi.hoisted(() => ({
  remove: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn<(event: string, handler: () => void) => void>(),
}));
vi.mock('maplibre-gl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('maplibre-gl')>();
  return {
    ...actual,
    setWorkerUrl: vi.fn(),
    setWorkerCount: vi.fn(),
    NavigationControl: class {},
    Map: class {
      on = fake.on;
      remove = fake.remove;
      addControl = vi.fn();
      scrollZoom = { disable: vi.fn() };
    },
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe('Geographic engine boundary', () => {
  it('uses longitude/latitude order and metre scale from MapLibre Mercator', async () => {
    const { geographicPosition } = await import('./world-map-engine');
    const origin = geographicPosition(0, 0);
    expect(origin.x).toBeCloseTo(0.5);
    expect(origin.y).toBeCloseTo(0.5);
    const east = geographicPosition(1, 0),
      north = geographicPosition(0, 1);
    expect(east.x).toBeGreaterThan(origin.x);
    expect(north.y).toBeLessThan(origin.y);
    const valencia = geographicPosition(-0.3763, 39.4699);
    expect(valencia.toLngLat().lng).toBeCloseTo(-0.3763);
    expect(valencia.toLngLat().lat).toBeCloseTo(39.4699);
    expect(valencia.meterInMercatorCoordinateUnits()).toBeGreaterThan(
      origin.meterInMercatorCoordinateUnits(),
    );
  });
  it('releases map, observer, media listener, visibility listener and loading timeout exactly once', async () => {
    const { createWorldMap } = await import('./world-map-engine');
    vi.useFakeTimers();
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = fake.observe;
        disconnect = fake.disconnect;
      },
    );
    const removed = vi.spyOn(document, 'removeEventListener');
    const error = vi.fn();
    const map = createWorldMap(document.createElement('div'), {
      style: 'https://example.test/style.json',
      select: vi.fn(),
      unfollow: vi.fn(),
      ready: vi.fn(),
      error,
    });
    map.dispose();
    map.dispose();
    vi.runAllTimers();
    expect(fake.remove).toHaveBeenCalledOnce();
    expect(fake.disconnect).toHaveBeenCalledOnce();
    expect(media.removeEventListener).toHaveBeenCalledOnce();
    expect(removed).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(error).not.toHaveBeenCalled();
    removed.mockRestore();
  });
});
