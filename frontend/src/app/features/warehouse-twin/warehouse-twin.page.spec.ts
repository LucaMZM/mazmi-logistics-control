import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WarehouseTwinPage } from './warehouse-twin.page';
import { WAREHOUSE_SCENE_LOADER } from './warehouse-scene-loader';

const engine = {
  init: vi.fn(),
  dispose: vi.fn(),
  focus: vi.fn(),
  reset: vi.fn(),
  play: vi.fn(() => true),
};
class FakeScene {
  init = engine.init;
  dispose = engine.dispose;
  focus = engine.focus;
  reset = engine.reset;
  play = engine.play;
  pause = vi.fn();
  overview = vi.fn();
  rotate = vi.fn();
  zoom = vi.fn();
  roof = vi.fn();
}
describe('Warehouse page fallback and lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WAREHOUSE_SCENE_LOADER, useValue: async () => FakeScene },
      ],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  function setup() {
    const fixture = TestBed.createComponent(WarehouseTwinPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/warehouses')
      .flush([{ id: 'w1', code: 'REAL', name: 'Real warehouse', active: true }]);
    http
      .expectOne((r) => r.url === '/api/v1/inventory')
      .flush({ content: [], totalElements: 0, totalPages: 0, page: 0 });
    http.match((r) => r.url === '/api/v1/orders').forEach((r) => r.flush({ content: [] }));
    fixture.detectChanges();
    return fixture;
  }
  it('keeps the engine lazy, selects zones accessibly and cleans up on navigation', async () => {
    const fixture = setup();
    expect(engine.init).not.toHaveBeenCalled();
    await fixture.componentInstance.openScene();
    fixture.componentInstance.focus('racks', new MouseEvent('click', { detail: 0 }));
    expect(engine.focus).toHaveBeenCalledWith('racks', true);
    expect(fixture.componentInstance.selectedZone()).toBe('racks');
    fixture.destroy();
    expect(engine.dispose).toHaveBeenCalledOnce();
  });
  it('ignores late scene loads after destruction', async () => {
    const fixture = setup();
    const pending = fixture.componentInstance.openScene();
    fixture.destroy();
    await pending;
    expect(engine.init).not.toHaveBeenCalled();
  });
  it('preserves real warehouse records when WebGL fails and allows retry', async () => {
    const fixture = setup();
    engine.init.mockImplementationOnce(() => {
      throw new Error('No WebGL');
    });
    await fixture.componentInstance.openScene();
    expect(fixture.componentInstance.sceneError()).toContain('unavailable');
    expect(fixture.componentInstance.store.warehouse()?.code).toBe('REAL');
    await fixture.componentInstance.openScene();
    expect(fixture.componentInstance.ready()).toBe(true);
    fixture.destroy();
  });
  it('cannot play a sequence without a verified order', async () => {
    const fixture = setup();
    await fixture.componentInstance.openScene();
    fixture.componentInstance.toggleSequence();
    expect(engine.play).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
