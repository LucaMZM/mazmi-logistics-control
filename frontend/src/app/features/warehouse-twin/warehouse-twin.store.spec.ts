import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WarehouseTwinStore } from './warehouse-twin.store';

describe('Warehouse Twin real record boundaries', () => {
  let store: InstanceType<typeof WarehouseTwinStore>, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WarehouseTwinStore],
    });
    store = TestBed.inject(WarehouseTwinStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
  });
  function init() {
    store.load();
    http.expectOne('/api/v1/warehouses').flush([
      { id: 'w1', name: 'Warehouse one', code: 'W1', active: true },
      { id: 'w2', name: 'Warehouse two', code: 'W2', active: true },
    ]);
  }
  function orders(id: string) {
    http
      .expectOne(
        (r) =>
          r.url === '/api/v1/orders' &&
          r.params.get('warehouse') === id &&
          r.params.get('status') === 'CONFIRMED',
      )
      .flush({
        content: [{ id: 'o1', orderNumber: 'ORD-1', status: 'CONFIRMED', createdAt: '2026-11-01' }],
      });
    http
      .expectOne(
        (r) =>
          r.url === '/api/v1/orders' &&
          r.params.get('warehouse') === id &&
          r.params.get('status') === 'PREPARING',
      )
      .flush({ content: [] });
  }
  function stock(id: string) {
    http
      .expectOne((r) => r.url === '/api/v1/inventory' && r.params.get('warehouse') === id)
      .flush({
        content: [
          {
            id: 'i1',
            warehouseId: id,
            productId: 'p1',
            onHand: 12,
            reserved: 3,
            available: 9,
            reorderLevel: 10,
          },
        ],
        page: 0,
        totalPages: 1,
        totalElements: 1,
      });
  }
  it('loads warehouse-filtered records and computes only verified inventory', () => {
    init();
    expect(store.loading()).toBe(true);
    stock('w1');
    orders('w1');
    expect(store.warehouse()?.id).toBe('w1');
    expect(store.loading()).toBe(false);
    expect(store.metrics()).toEqual({ products: 1, available: 9, reserved: 3, critical: 1 });
    store.selectWarehouse('unknown');
    expect(store.warehouseId()).toBe('w1');
  });
  it('cancels obsolete warehouse requests and does not mix their totals', () => {
    init();
    const old = http.match(
      (r) => r.url.startsWith('/api/v1/inventory') || r.url === '/api/v1/orders',
    );
    store.selectWarehouse('w2');
    expect(old.every((r) => r.cancelled)).toBe(true);
    stock('w2');
    orders('w2');
    expect(store.warehouseId()).toBe('w2');
    expect(store.inventory().every((r) => r.warehouseId === 'w2')).toBe(true);
  });
  it('fetches following inventory pages before presenting complete totals', () => {
    init();
    http
      .expectOne((r) => r.url === '/api/v1/inventory' && r.params.get('page') === '0')
      .flush({
        content: [
          { warehouseId: 'w1', productId: 'p1', available: 4, reserved: 2, reorderLevel: 1 },
        ],
        page: 0,
        totalPages: 2,
        totalElements: 2,
      });
    http
      .expectOne((r) => r.url === '/api/v1/inventory' && r.params.get('page') === '1')
      .flush({
        content: [
          { warehouseId: 'w1', productId: 'p2', available: 7, reserved: 3, reorderLevel: 1 },
        ],
        page: 1,
        totalPages: 2,
        totalElements: 2,
      });
    orders('w1');
    expect(store.metrics().available).toBe(11);
    expect(store.partialInventory()).toBe(false);
  });
  it('keeps order access when inventory fails and retries without stale data', () => {
    init();
    http
      .expectOne((r) => r.url === '/api/v1/inventory')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    orders('w1');
    expect(store.inventoryError()).toContain('could not');
    expect(store.orders()).toHaveLength(1);
    store.selectWarehouse('w1');
    stock('w1');
    orders('w1');
    expect(store.inventoryError()).toBe('');
  });
  it('rejects foreign warehouse inventory and order details', () => {
    init();
    http
      .expectOne((r) => r.url === '/api/v1/inventory')
      .flush({ content: [{ warehouseId: 'w2' }], page: 0, totalPages: 1, totalElements: 1 });
    orders('w1');
    expect(store.inventoryError()).toBeTruthy();
    expect(store.inventory()).toEqual([]);
    store.selectOrder('o1');
    http
      .expectOne('/api/v1/orders/o1')
      .flush({ id: 'o1', warehouseId: 'w2', status: 'CONFIRMED', items: [{ productId: 'p1' }] });
    expect(store.order()).toBeNull();
    expect(store.orderError()).toContain('compatible');
  });
  it('verifies compatible orders and cancels detail loading when changing warehouses', () => {
    init();
    stock('w1');
    orders('w1');
    store.selectOrder('o1');
    http
      .expectOne('/api/v1/orders/o1')
      .flush({ id: 'o1', warehouseId: 'w1', status: 'CONFIRMED', items: [{ productId: 'p1' }] });
    expect(store.order()?.id).toBe('o1');
    store.selectOrder('o1');
    const pending = http.expectOne('/api/v1/orders/o1');
    store.selectWarehouse('w2');
    expect(pending.cancelled).toBe(true);
    expect(store.order()).toBeNull();
    stock('w2');
    orders('w2');
  });
  it('reports warehouse loading errors and cancels subscriptions on destruction', () => {
    store.load();
    http.expectOne('/api/v1/warehouses').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.error()).toBeTruthy();
    init();
    const pending = http.match((r) => r.url.startsWith('/api/v1/'));
    TestBed.resetTestingModule();
    expect(pending.every((r) => r.cancelled)).toBe(true);
  });
});
