import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FleetTwinStore } from './fleet-twin.store';
import { vehicleRepresentation, plateLabel } from './vehicle-twin';
import { Vehicle } from '../../shared/models/models';
import { TwinAssets } from './twin-assets';
import { Group } from 'three';

const van: Vehicle = {
  id: 'v1',
  registrationPlate: 'MZ10DA',
  model: 'Demo van',
  vehicleType: 'VAN',
  capacityKg: 1200,
  status: 'AVAILABLE',
  active: true,
};
describe('Fleet Twin', () => {
  let store: InstanceType<typeof FleetTwinStore>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FleetTwinStore],
    });
    store = TestBed.inject(FleetTwinStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });
  it('binds selection and plate to the actual record', () => {
    store.load();
    http.expectOne('/api/v1/vehicles').flush([van]);
    expect(store.selected()).toEqual(van);
    expect(vehicleRepresentation(van).plate).toBe(van.registrationPlate);
    store.select('unknown');
    expect(store.selectedId()).toBe('v1');
  });
  it('uses an honest fallback for unknown vehicle types', () => {
    expect(vehicleRepresentation({ ...van, vehicleType: 'UNKNOWN' }).asset).toBeNull();
    expect(vehicleRepresentation(van).fidelity).toContain('Generic');
  });
  it('bounds labels without interpreting markup', () => {
    expect(plateLabel('MZ\n10')).toBe('MZ10');
    expect(plateLabel('<img src=x>')).toBe('<img src=x>');
    expect(plateLabel('a'.repeat(100))).toHaveLength(24);
  });
  it('cancels stale reads and keeps the last snapshot on failure', () => {
    store.load();
    const old = http.expectOne('/api/v1/vehicles');
    store.load();
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/v1/vehicles').flush([van]);
    store.load();
    http.expectOne('/api/v1/vehicles').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.selected()).toEqual(van);
    expect(store.error()).not.toBe('');
    expect(store.loading()).toBe(false);
    store.load();
    http.expectOne('/api/v1/vehicles').flush([]);
    expect(store.selected()).toBeUndefined();
    expect(store.error()).toBe('');
  });
  it('cancels requests when the local store is destroyed', () => {
    store.load();
    const pending = http.expectOne('/api/v1/vehicles');
    TestBed.resetTestingModule();
    expect(pending.cancelled).toBe(true);
  });
  it('reuses geometry and disposes scene-owned resources exactly once', () => {
    const catalog = new TwinAssets();
    const parent = new Group();
    const a = catalog.box(parent, [1, 1, 1], [0, 0, 0], '#ffffff');
    const b = catalog.box(parent, [1, 1, 1], [2, 0, 0], '#ffffff');
    expect(a.geometry).toBe(b.geometry);
    const geometry = vi.spyOn(a.geometry, 'dispose');
    const material = vi.spyOn(a.material, 'dispose');
    catalog.dispose();
    catalog.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
  });
  it('reports unavailable label canvases rather than silently creating blank plates', () => {
    const mock = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      expect(() => new TwinAssets().label(new Group(), 'MZ', 1, 1, [0, 0, 0])).toThrow(
        'Label canvas unavailable',
      );
    } finally {
      mock.mockRestore();
    }
  });
});
