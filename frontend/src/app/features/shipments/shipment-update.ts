import { RealtimeUpdate, ShipmentDetail } from '../../shared/models/models';

export function mergeShipmentRealtime(
  current: ShipmentDetail,
  update: RealtimeUpdate,
): ShipmentDetail {
  const events =
    update.latestEvent && !current.events.some((event) => event.id === update.latestEvent?.id)
      ? [...current.events, update.latestEvent]
      : current.events;
  return {
    ...current,
    status: update.status,
    deliveryHealth: update.deliveryHealth,
    currentLatitude: update.latitude,
    currentLongitude: update.longitude,
    progress: update.progress,
    simulationActive: update.simulationActive,
    eta: update.eta,
    events,
  };
}
