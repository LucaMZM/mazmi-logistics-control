import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { Dashboard, RealtimeUpdate } from '../../shared/models/models';
import { DashboardStore } from './dashboard.store';

const summary: Dashboard = {
  ordersToday: 8,
  activeShipments: 4,
  delayedShipments: 0,
  openIncidents: 0,
  orderVolumeLast7Days: [],
  criticalInventory: [],
  recentIncidents: [],
  activeShipmentMapItems: [],
};

describe('DashboardStore', () => {
  let store: InstanceType<typeof DashboardStore>;
  let http: HttpTestingController;
  let updates: Subject<RealtimeUpdate>;
  let connections: Subject<void>;
  beforeEach(() => {
    vi.useFakeTimers();
    updates = new Subject();
    connections = new Subject();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardStore,
        {
          provide: RealtimeService,
          useValue: { watchDashboard: () => updates, watchConnected: () => connections },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(DashboardStore);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('loads the aggregate and derives map points', () => {
    expect(store.loading()).toBe(true);
    http.expectOne('/api/v1/dashboard').flush({
      ...summary,
      activeShipmentMapItems: [
        {
          id: 's1',
          trackingNumber: 'MZ-1',
          latitude: 39,
          longitude: -1,
          progress: 25,
          deliveryHealth: 'DELAYED',
        },
      ],
    });
    expect(store.loading()).toBe(false);
    expect(store.riskShipments()).toHaveLength(1);
    expect(store.mapPoints()[0]).toMatchObject({ id: 's1', kind: 'vehicle', health: 'DELAYED' });
  });

  it('cancels an obsolete read and groups reconnect bursts', () => {
    const previous = http.expectOne('/api/v1/dashboard');
    connections.next();
    connections.next();
    vi.advanceTimersByTime(249);
    http.expectNone('/api/v1/dashboard');
    vi.advanceTimersByTime(1);
    expect(previous.cancelled).toBe(true);
    http.expectOne('/api/v1/dashboard').flush(summary);
    expect(store.dashboard()?.ordersToday).toBe(8);
  });

  it('keeps the last snapshot on refresh failure and supports retry', () => {
    http.expectOne('/api/v1/dashboard').flush(summary);
    store.refresh();
    expect(store.loading()).toBe(false);
    http.expectOne('/api/v1/dashboard').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.dashboard()).toEqual(summary);
    expect(store.loadError()).toBe(true);
    store.refresh();
    http.expectOne('/api/v1/dashboard').flush({ ...summary, ordersToday: 9 });
    expect(store.loadError()).toBe(false);
    expect(store.dashboard()?.ordersToday).toBe(9);
  });

  it('exposes initial failure without inventing a snapshot', () => {
    http.expectOne('/api/v1/dashboard').flush({}, { status: 500, statusText: 'Error' });
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBe(true);
    expect(store.dashboard()).toBeNull();
  });

  it('cancels HTTP and scheduled refreshes when the local store is destroyed', () => {
    const pending = http.expectOne('/api/v1/dashboard');
    connections.next();
    TestBed.resetTestingModule();
    expect(pending.cancelled).toBe(true);
    expect(connections.observed).toBe(false);
    expect(updates.observed).toBe(false);
    vi.advanceTimersByTime(300);
    http.expectNone('/api/v1/dashboard');
  });
});
