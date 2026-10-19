import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { RealtimeUpdate, ShipmentDetail } from '../../shared/models/models';
import { ShipmentDetailStore } from './shipment-detail.store';

const shipment = (id: string, progress = 10): ShipmentDetail => ({
  id,
  trackingNumber: `MZ-${id}`,
  orderId: `order-${id}`,
  orderNumber: `ORD-${id}`,
  status: 'IN_TRANSIT',
  deliveryHealth: 'ON_TIME',
  currentLatitude: 40,
  currentLongitude: -3,
  progress,
  simulationActive: true,
  eta: null,
  departedAt: null,
  deliveredAt: null,
  warehouseLatitude: 39,
  warehouseLongitude: -4,
  destinationLatitude: 41,
  destinationLongitude: -2,
  driverId: null,
  driver: null,
  vehicleId: null,
  vehicle: null,
  events: [],
  openIncidents: [],
});

const update = (id: string, progress: number): RealtimeUpdate => ({
  id,
  status: 'IN_TRANSIT',
  deliveryHealth: 'AT_RISK',
  latitude: 40.5,
  longitude: -2.5,
  progress,
  simulationActive: true,
  eta: null,
  latestEvent: null,
});

describe('ShipmentDetailStore', () => {
  let store: InstanceType<typeof ShipmentDetailStore>;
  let http: HttpTestingController;
  const connected = new Subject<void>();
  const topics = new Map<string, Subject<RealtimeUpdate>>();
  const realtime = {
    watchConnected: () => connected.asObservable(),
    watchShipment: (id: string) => {
      const topic = new Subject<RealtimeUpdate>();
      topics.set(id, topic);
      return topic.asObservable();
    },
  };

  beforeEach(() => {
    topics.clear();
    TestBed.configureTestingModule({
      providers: [
        ShipmentDetailStore,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: realtime },
      ],
    });
    store = TestBed.inject(ShipmentDetailStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  function finishLoad(id: string, progress = 10): void {
    http.expectOne(`/api/v1/shipments/${id}`).flush(shipment(id, progress));
    http.expectOne('/api/v1/drivers').flush([]);
    http.expectOne('/api/v1/vehicles').flush([]);
  }

  it('loads the requested shipment and switches topics when the route ID changes', () => {
    store.open('a');
    const oldRequest = http.expectOne('/api/v1/shipments/a');
    const oldDrivers = http.expectOne('/api/v1/drivers');
    const oldVehicles = http.expectOne('/api/v1/vehicles');
    const oldTopic = topics.get('a');
    store.open('b');
    expect(oldRequest.cancelled).toBe(true);
    expect(oldDrivers.cancelled).toBe(true);
    expect(oldVehicles.cancelled).toBe(true);
    expect(oldTopic?.observed).toBe(false);
    finishLoad('b');
    oldTopic?.next(update('a', 99));
    expect(store.shipment()?.id).toBe('b');
    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBe(false);
  });

  it('keeps WebSocket updates that arrive while the initial request is pending', () => {
    store.open('a');
    topics.get('a')?.next(update('a', 55));
    finishLoad('a');
    expect(store.shipment()?.progress).toBe(55);
    expect(store.shipment()?.currentLatitude).toBe(40.5);
  });

  it('does not let an older refresh overwrite a newer WebSocket update', () => {
    store.open('a');
    finishLoad('a');
    store.refresh();
    const stale = http.expectOne('/api/v1/shipments/a');
    topics.get('a')?.next(update('a', 60));
    stale.flush(shipment('a', 10));
    expect(store.shipment()?.progress).toBe(60);
  });

  it('keeps a newer refresh when an older full load finishes later', () => {
    store.open('a');
    const old = http.expectOne('/api/v1/shipments/a');
    const drivers = http.expectOne('/api/v1/drivers');
    const vehicles = http.expectOne('/api/v1/vehicles');
    connected.next();
    http.expectOne('/api/v1/shipments/a').flush(shipment('a', 50));
    old.flush(shipment('a', 10));
    drivers.flush([]);
    vehicles.flush([]);
    expect(store.shipment()?.progress).toBe(50);
  });

  it('keeps an action response ahead of a stale refresh and cleans up on destroy', () => {
    store.open('a');
    finishLoad('a');
    store.refresh();
    const stale = http.expectOne('/api/v1/shipments/a');
    const startedAt = store.beginAction();
    store.acceptAction('a', startedAt, shipment('a', 70));
    store.finishAction('a', startedAt);
    stale.flush(shipment('a', 10));
    expect(store.shipment()?.progress).toBe(70);
    store.refresh();
    const pending = http.expectOne('/api/v1/shipments/a');
    TestBed.resetTestingModule();
    expect(pending.cancelled).toBe(true);
    expect(topics.get('a')?.observed).toBe(false);
  });

  it('ignores an action response from the previous route', () => {
    store.open('a');
    finishLoad('a');
    const startedAt = store.beginAction();
    store.open('b');
    finishLoad('b');
    store.acceptAction('a', startedAt, shipment('a', 90));
    expect(store.shipment()?.id).toBe('b');
    expect(store.shipment()?.progress).toBe(10);
  });

  it('keeps only changes needed by an in-flight action and reconciles its late response', () => {
    store.open('a');
    finishLoad('a');
    for (let progress = 11; progress < 40; progress++) topics.get('a')?.next(update('a', progress));
    const startedAt = store.beginAction();
    store.refresh();
    const stale = http.expectOne('/api/v1/shipments/a');
    topics.get('a')?.next(update('a', 60));
    stale.flush(shipment('a', 10));
    store.acceptAction('a', startedAt, shipment('a', 15));
    store.finishAction('a', startedAt);
    expect(store.shipment()?.progress).toBe(60);
    store.refresh();
    http.expectOne('/api/v1/shipments/a').flush(shipment('a', 65));
    expect(store.shipment()?.progress).toBe(65);
  });

  it('refreshes incident details after an incident event from another operator', () => {
    store.open('a');
    finishLoad('a');
    topics.get('a')?.next({
      ...update('a', 30),
      latestEvent: {
        id: 'event-1',
        type: 'INCIDENT',
        description: 'Traffic incident',
        eventTime: '2026-10-20T12:00:00Z',
      },
    });
    const refresh = http.expectOne('/api/v1/shipments/a');
    refresh.flush({
      ...shipment('a', 10),
      openIncidents: [
        {
          id: 'incident-1',
          type: 'TRAFFIC',
          severity: 'HIGH',
          title: 'Traffic incident',
          description: 'Route delayed',
          openedAt: '2026-10-20T12:00:00Z',
        },
      ],
    });
    expect(store.shipment()?.progress).toBe(30);
    expect(store.shipment()?.openIncidents).toHaveLength(1);
    expect(store.shipment()?.events.map((event) => event.id)).toContain('event-1');
  });
});
