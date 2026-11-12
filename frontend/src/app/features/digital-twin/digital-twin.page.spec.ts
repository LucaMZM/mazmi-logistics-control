import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DigitalTwinPage } from './digital-twin.page';
import { SCENE_LOADER } from './scene-loader';

const engine = {
  init: vi.fn(),
  dispose: vi.fn(),
  play: vi.fn(() => true),
  pause: vi.fn(),
};
class FakeScene {
  init = engine.init;
  dispose = engine.dispose;
  play = engine.play;
  pause = engine.pause;
  focus = vi.fn();
  rotate = vi.fn();
  reset = vi.fn();
}

describe('DigitalTwinPage lifecycle', () => {
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
        { provide: SCENE_LOADER, useValue: async () => FakeScene },
      ],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  function setup() {
    const fixture = TestBed.createComponent(DigitalTwinPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/vehicles')
      .flush([
        {
          id: 'v1',
          registrationPlate: 'REAL-1',
          model: 'Demo',
          vehicleType: 'VAN',
          capacityKg: 1200,
          status: 'AVAILABLE',
          active: true,
        },
        {
          id: 'v2',
          registrationPlate: 'TRUCK-2',
          model: 'Truck',
          vehicleType: 'TRUCK',
          capacityKg: 5000,
          status: 'AVAILABLE',
          active: true,
        },
      ]);
    return fixture;
  }
  it('passes real plate to the renderer and disposes on navigation', async () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.querySelector('select').value).toBe('v1');
    await fixture.componentInstance.openScene();
    expect(engine.init).toHaveBeenCalledWith('REAL-1', '#dce1e4');
    expect(fixture.componentInstance.ready()).toBe(true);
    fixture.destroy();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });
  it('ignores a delayed engine import after destruction', async () => {
    const fixture = setup();
    const pending = fixture.componentInstance.openScene();
    fixture.destroy();
    await pending;
    expect(engine.init).not.toHaveBeenCalled();
  });
  it('exposes renderer failure and permits retry without losing the record', async () => {
    const fixture = setup();
    engine.init.mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });
    await fixture.componentInstance.openScene();
    expect(fixture.componentInstance.sceneError()).toContain('unavailable');
    expect(fixture.componentInstance.store.selected()?.registrationPlate).toBe('REAL-1');
    await fixture.componentInstance.openScene();
    expect(fixture.componentInstance.ready()).toBe(true);
    expect(fixture.componentInstance.sceneError()).toBe('');
  });
  it('invalidates the visual snapshot before refreshing records', async () => {
    const fixture = setup();
    await fixture.componentInstance.openScene();
    fixture.componentInstance.refresh();
    expect(engine.dispose).toHaveBeenCalled();
    expect(fixture.componentInstance.ready()).toBe(false);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/vehicles').flush([]);
    expect(fixture.componentInstance.store.selected()).toBeUndefined();
  });
});
