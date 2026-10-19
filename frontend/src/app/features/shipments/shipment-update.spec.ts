import { RealtimeUpdate, ShipmentDetail } from '../../shared/models/models';
import { mergeShipmentRealtime } from './shipment-update';

describe('shipment realtime update', () => {
  const shipment = {
    id: 's1',
    trackingNumber: 'MZ-1',
    orderId: 'o1',
    orderNumber: 'ORD-1',
    status: 'IN_TRANSIT',
    deliveryHealth: 'ON_TIME',
    currentLatitude: 1,
    currentLongitude: 1,
    progress: 10,
    simulationActive: true,
    eta: null,
    departedAt: null,
    deliveredAt: null,
    driverId: null,
    driver: null,
    vehicleId: null,
    vehicle: null,
    warehouseLatitude: 0,
    warehouseLongitude: 0,
    destinationLatitude: 2,
    destinationLongitude: 2,
    events: [],
    openIncidents: [],
  } satisfies ShipmentDetail;

  it('moves the marker and appends a new checkpoint once', () => {
    const update = {
      id: 's1',
      status: 'IN_TRANSIT',
      deliveryHealth: 'AT_RISK',
      latitude: 1.5,
      longitude: 1.6,
      progress: 50,
      simulationActive: true,
      eta: null,
      latestEvent: {
        id: 'e1',
        type: 'CHECKPOINT',
        description: 'Simulated route checkpoint 50%',
        eventTime: new Date().toISOString(),
      },
    } satisfies RealtimeUpdate;
    const result = mergeShipmentRealtime(shipment, update);
    expect(result.currentLatitude).toBe(1.5);
    expect(result.progress).toBe(50);
    expect(result.events).toHaveLength(1);
    expect(mergeShipmentRealtime(result, update).events).toHaveLength(1);
  });

  it('does not move tracking backwards when an older frame arrives later', () => {
    const current: ShipmentDetail = {
      ...shipment,
      progress: 60,
      currentLatitude: 1.6,
      deliveryHealth: 'DELAYED',
      events: [
        {
          id: 'newer',
          type: 'CHECKPOINT',
          description: 'Newer checkpoint',
          eventTime: '2026-10-20T12:01:00Z',
        },
      ],
    };
    const result = mergeShipmentRealtime(current, {
      id: 's1',
      status: 'IN_TRANSIT',
      deliveryHealth: 'ON_TIME',
      latitude: 1.2,
      longitude: 1.2,
      progress: 30,
      simulationActive: true,
      eta: null,
      latestEvent: {
        id: 'older',
        type: 'CHECKPOINT',
        description: 'Older checkpoint',
        eventTime: '2026-10-20T12:00:00Z',
      },
    });
    expect(result.progress).toBe(60);
    expect(result.currentLatitude).toBe(1.6);
    expect(result.deliveryHealth).toBe('DELAYED');
    expect(result.events.map((event) => event.id)).toEqual(['older', 'newer']);
    const sameProgress = mergeShipmentRealtime(result, {
      id: 's1',
      status: 'IN_TRANSIT',
      deliveryHealth: 'ON_TIME',
      latitude: 1.2,
      longitude: 1.2,
      progress: 60,
      simulationActive: true,
      eta: null,
      latestEvent: {
        id: 'earliest',
        type: 'CHECKPOINT',
        description: 'Earliest checkpoint',
        eventTime: '2026-10-20T11:59:00Z',
      },
    });
    expect(sameProgress.deliveryHealth).toBe('DELAYED');
    expect(sameProgress.events.map((event) => event.id)).toEqual(['earliest', 'older', 'newer']);
  });

  it('does not reopen a delivered shipment after a delayed in-transit frame', () => {
    const result = mergeShipmentRealtime(
      { ...shipment, status: 'DELIVERED', progress: 100, simulationActive: false },
      {
        id: 's1',
        status: 'IN_TRANSIT',
        deliveryHealth: 'ON_TIME',
        latitude: 1.5,
        longitude: 1.5,
        progress: 92,
        simulationActive: true,
        eta: null,
        latestEvent: null,
      },
    );
    expect(result.status).toBe('DELIVERED');
    expect(result.progress).toBe(100);
    expect(result.simulationActive).toBe(false);
  });
});
