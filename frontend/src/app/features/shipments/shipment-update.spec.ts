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
});
