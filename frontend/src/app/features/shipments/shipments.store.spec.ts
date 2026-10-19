import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../core/services/api.service';
import { ShipmentsStore } from './shipments.store';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

describe('ShipmentsStore', () => {
  let store: InstanceType<typeof ShipmentsStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [ShipmentsStore, ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ShipmentsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });

  it('loads the list and fleet filter options independently', async () => {
    expect(store.loading()).toBe(true);
    store.load();
    store.loadLookups();
    await vi.advanceTimersByTimeAsync(0);
    const list = http.expectOne('/api/v1/shipments?page=0&size=20');
    const drivers = http.expectOne('/api/v1/drivers');
    const vehicles = http.expectOne('/api/v1/vehicles');
    list.flush({ ...emptyPage, totalElements: 4 });
    drivers.flush([{ id: 'driver-1', fullName: 'Demo Driver' }]);
    vehicles.flush([{ id: 'vehicle-1', registrationPlate: 'DEMO-1' }]);
    expect(store.total()).toBe(4);
    expect(store.drivers()).toHaveLength(1);
    expect(store.vehicles()).toHaveLength(1);
    expect(store.lookupsLoading()).toBe(false);
    expect(store.loading()).toBe(false);
  });

  it('cancels an obsolete request and combines current filters without duplicate search', async () => {
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    const stale = http.expectOne('/api/v1/shipments?page=0&size=20');
    store.setSearch('MZ-2026');
    expect(stale.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(249);
    http.expectNone((request) => request.url === '/api/v1/shipments');
    store.setStatus('IN_TRANSIT');
    store.setDeliveryHealth('DELAYED');
    await vi.advanceTimersByTimeAsync(0);
    const current = http.expectOne((request) => request.url === '/api/v1/shipments');
    expect(current.request.params.get('search')).toBe('MZ-2026');
    expect(current.request.params.get('status')).toBe('IN_TRANSIT');
    expect(current.request.params.get('deliveryHealth')).toBe('DELAYED');
    expect(current.request.params.get('page')).toBe('0');
    current.flush(emptyPage);
    await vi.advanceTimersByTimeAsync(250);
    http.expectNone((request) => request.url === '/api/v1/shipments');
    expect(store.filtersActive()).toBe(true);
  });

  it('resets pagination on filter changes and clears all filters with one request', async () => {
    store.setPage(2, 10);
    await vi.advanceTimersByTimeAsync(0);
    http
      .expectOne((request) => request.params.get('page') === '2')
      .flush({
        ...emptyPage,
        page: 2,
        size: 10,
      });
    store.setDriver('driver-1');
    await vi.advanceTimersByTimeAsync(0);
    const filtered = http.expectOne((request) => request.params.get('driver') === 'driver-1');
    expect(filtered.request.params.get('page')).toBe('0');
    filtered.flush(emptyPage);
    store.setVehicle('vehicle-1');
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne((request) => request.params.get('vehicle') === 'vehicle-1').flush(emptyPage);
    store.clearFilters();
    await vi.advanceTimersByTimeAsync(0);
    const cleared = http.expectOne((request) => request.url === '/api/v1/shipments');
    expect(cleared.request.params.has('driver')).toBe(false);
    expect(cleared.request.params.has('vehicle')).toBe(false);
    expect(cleared.request.params.get('page')).toBe('0');
    cleared.flush(emptyPage);
    expect(store.filtersActive()).toBe(false);
  });

  it('preserves the last valid result on error and retries the same query', async () => {
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/v1/shipments?page=0&size=20').flush({
      ...emptyPage,
      totalElements: 8,
    });
    store.setStatus('ASSIGNED');
    await vi.advanceTimersByTimeAsync(0);
    http
      .expectOne((request) => request.params.get('status') === 'ASSIGNED')
      .flush('failure', {
        status: 503,
        statusText: 'Unavailable',
      });
    expect(store.loadError()).toBe(true);
    expect(store.total()).toBe(8);
    store.retry();
    await vi.advanceTimersByTimeAsync(0);
    const retry = http.expectOne((request) => request.params.get('status') === 'ASSIGNED');
    retry.flush(emptyPage);
    expect(store.loadError()).toBe(false);
  });

  it('reports fleet lookup errors, allows retry, and cancels work on destroy', async () => {
    store.loadLookups();
    const firstVehicles = http.expectOne('/api/v1/vehicles');
    http.expectOne('/api/v1/drivers').flush('failure', {
      status: 503,
      statusText: 'Unavailable',
    });
    expect(firstVehicles.cancelled).toBe(true);
    expect(store.lookupsError()).toBe(true);
    store.loadLookups();
    const drivers = http.expectOne('/api/v1/drivers');
    const vehicles = http.expectOne('/api/v1/vehicles');
    drivers.flush([]);
    vehicles.flush([]);
    expect(store.lookupsError()).toBe(false);
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    const list = http.expectOne('/api/v1/shipments?page=0&size=20');
    TestBed.resetTestingModule();
    expect(list.cancelled).toBe(true);
  });
});
