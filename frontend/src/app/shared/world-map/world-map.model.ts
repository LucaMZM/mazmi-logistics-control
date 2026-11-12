import { MapItem } from '../models/models';

export interface MapView {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface WorldPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind?: 'origin' | 'destination' | 'vehicle';
  health?: string;
  shipment?: MapItem;
}

export function validPosition(point: { latitude: number; longitude: number }): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 85.05112878 &&
    Math.abs(point.longitude) <= 180
  );
}

export function representation(point: WorldPoint): string {
  const s = point.shipment;
  if (!s?.vehicleId) return 'Vehicle not assigned';
  if (s.vehicleType !== 'VAN') return `${s.vehicleType ?? 'Unknown type'} · map marker`;
  return 'Generic original van · neutral display colour';
}

export function hasVan(point: WorldPoint): boolean {
  return !!(
    point.shipment?.vehicleId &&
    point.shipment.registrationPlate &&
    point.shipment.vehicleType === 'VAN'
  );
}

/** No routing: interpolate observed simulated samples, never infer roads or GPS. */
export class MotionTrack {
  point: WorldPoint;
  private from: [number, number];
  private to: [number, number];
  private started = 0;
  private duration = 0;
  private angleFrom = 0;
  private angleTo = 0;
  constructor(point: WorldPoint) {
    this.point = point;
    this.from = this.to = [point.longitude, point.latitude];
  }
  sample(now: number) {
    const t = this.duration ? Math.min(1, Math.max(0, (now - this.started) / this.duration)) : 1;
    const angleDelta = Math.atan2(
      Math.sin(this.angleTo - this.angleFrom),
      Math.cos(this.angleTo - this.angleFrom),
    );
    return {
      longitude: this.from[0] + (this.to[0] - this.from[0]) * t,
      latitude: this.from[1] + (this.to[1] - this.from[1]) * t,
      angle: this.angleFrom + angleDelta * t,
      moving: t < 1,
    };
  }
  update(next: WorldPoint, now: number, reduced: boolean): boolean {
    if (next.id !== this.point.id || !validPosition(next)) return false;
    const old = this.point.shipment,
      fresh = next.shipment;
    if (
      old &&
      fresh &&
      (fresh.progress < old.progress ||
        ((old.status === 'DELIVERED' || old.status === 'CANCELLED') &&
          fresh.status !== old.status) ||
        (old.updatedAt &&
          fresh.updatedAt &&
          Date.parse(fresh.updatedAt) < Date.parse(old.updatedAt)))
    )
      return false;
    const current = this.sample(now);
    this.point = next;
    // A repeated HTTP snapshot must not restart an interpolation already in flight.
    if (
      next.longitude === this.to[0] &&
      next.latitude === this.to[1] &&
      fresh?.simulationActive &&
      !reduced
    )
      return true;
    this.from = [current.longitude, current.latitude];
    this.to = [next.longitude, next.latitude];
    const east = (next.longitude - current.longitude) * Math.cos((next.latitude * Math.PI) / 180);
    const north = next.latitude - current.latitude;
    const distance = Math.hypot(east, north) * 111320;
    this.angleFrom = current.angle;
    this.angleTo = distance > 0.05 ? Math.atan2(east, north) : current.angle;
    this.duration =
      !reduced &&
      fresh?.simulationActive &&
      fresh.status === 'IN_TRANSIT' &&
      distance > 0.05 &&
      distance < 25000
        ? 900
        : 0;
    this.started = now;
    return true;
  }
  stop() {
    this.duration = 0;
  }
}
