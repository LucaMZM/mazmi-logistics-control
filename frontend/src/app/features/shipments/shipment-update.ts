import { RealtimeUpdate, ShipmentDetail, ShipmentStatus } from '../../shared/models/models';

const STATUS_ORDER: Record<ShipmentStatus, number> = {
  CREATED: 0,
  ASSIGNED: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  CANCELLED: 3,
};

export function mergeShipmentRealtime(
  current: ShipmentDetail,
  update: RealtimeUpdate,
): ShipmentDetail {
  const events =
    update.latestEvent && !current.events.some((event) => event.id === update.latestEvent?.id)
      ? [...current.events, update.latestEvent].sort(
          (left, right) => Date.parse(left.eventTime) - Date.parse(right.eventTime),
        )
      : current.events;
  const olderStatus =
    (current.status === 'DELIVERED' || current.status === 'CANCELLED') &&
    update.status !== current.status;
  const olderProgress =
    current.status === 'IN_TRANSIT' &&
    update.status === 'IN_TRANSIT' &&
    update.progress < current.progress;
  const latestRecorded = current.events.at(-1);
  const olderEvent =
    update.latestEvent &&
    latestRecorded &&
    Date.parse(update.latestEvent.eventTime) < Date.parse(latestRecorded.eventTime);
  if (
    olderStatus ||
    (update.status !== 'CANCELLED' && STATUS_ORDER[update.status] < STATUS_ORDER[current.status]) ||
    (current.status === 'IN_TRANSIT' && update.status === 'CANCELLED') ||
    olderProgress ||
    olderEvent
  )
    return { ...current, events };
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
