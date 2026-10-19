import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../core/services/api.service';
import { OrdersStore } from './orders.store';

describe('OrdersStore', () => {
  let store: InstanceType<typeof OrdersStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [OrdersStore, ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(OrdersStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });

  it('debounces search and cancels stale responses when filters change', async () => {
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    const stale = http.expectOne('/api/v1/orders?page=0&size=20');
    store.setSearch('North');
    expect(stale.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(299);
    http.expectNone((request) => request.url === '/api/v1/orders');
    store.setStatus('CONFIRMED');
    await vi.advanceTimersByTimeAsync(0);
    const current = http.expectOne((request) => request.url === '/api/v1/orders');
    expect(current.request.params.get('search')).toBe('North');
    expect(current.request.params.get('status')).toBe('CONFIRMED');
    expect(current.request.params.get('page')).toBe('0');
    current.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await vi.advanceTimersByTimeAsync(300);
    http.expectNone((request) => request.url === '/api/v1/orders');
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBe(false);
  });

  it('preserves page and filters on error and retries the same request', async () => {
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/v1/orders?page=0&size=20').flush({
      content: [],
      page: 0,
      size: 20,
      totalElements: 55,
      totalPages: 3,
    });
    store.setStatus('READY');
    await vi.advanceTimersByTimeAsync(0);
    http
      .expectOne((request) => request.params.get('status') === 'READY')
      .flush('failure', {
        status: 503,
        statusText: 'Unavailable',
      });
    expect(store.loadError()).toBe(true);
    expect(store.totalElements()).toBe(55);
    store.setPage(2, 10);
    await vi.advanceTimersByTimeAsync(0);
    const failed = http.expectOne((request) => request.params.get('page') === '2');
    expect(failed.request.params.get('status')).toBe('READY');
    expect(failed.request.params.get('size')).toBe('10');
    failed.flush('failure', { status: 503, statusText: 'Unavailable' });
    store.retry();
    await vi.advanceTimersByTimeAsync(0);
    const retry = http.expectOne((request) => request.params.get('page') === '2');
    expect(retry.request.params.get('status')).toBe('READY');
    retry.flush({ content: [], page: 2, size: 10, totalElements: 55, totalPages: 6 });
    expect(store.loadError()).toBe(false);
    expect(store.query().page).toBe(2);
  });

  it('clears both filters and resets pagination with one request', async () => {
    store.setSearch('North');
    store.setStatus('READY');
    await vi.advanceTimersByTimeAsync(0);
    http
      .expectOne((request) => request.params.get('status') === 'READY')
      .flush({
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      });
    store.setPage(1, 20);
    await vi.advanceTimersByTimeAsync(0);
    http
      .expectOne((request) => request.params.get('page') === '1')
      .flush({
        content: [],
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      });
    store.clearFilters();
    await vi.advanceTimersByTimeAsync(0);
    const cleared = http.expectOne((request) => request.url === '/api/v1/orders');
    expect(cleared.request.params.has('search')).toBe(false);
    expect(cleared.request.params.has('status')).toBe(false);
    expect(cleared.request.params.get('page')).toBe('0');
    cleared.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    expect(store.hasFilters()).toBe(false);
    expect(store.query().page).toBe(0);
  });

  it('cancels an in-flight request when the list is destroyed', async () => {
    store.load();
    await vi.advanceTimersByTimeAsync(0);
    const request = http.expectOne('/api/v1/orders?page=0&size=20');
    TestBed.resetTestingModule();
    expect(request.cancelled).toBe(true);
  });
});
