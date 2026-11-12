import { describe, expect, it } from 'vitest';
import { MotionTrack, WorldPoint, hasVan, representation, validPosition } from './world-map.model';

const point = (progress = 0, longitude = -3): WorldPoint => ({
  id: 'shipment-1',
  latitude: 40,
  longitude,
  kind: 'vehicle',
  label: 'Shipment',
  shipment: {
    id: 'shipment-1',
    trackingNumber: 'MLC-1',
    latitude: 40,
    longitude,
    progress,
    deliveryHealth: 'ON_TIME',
    status: 'IN_TRANSIT',
    simulationActive: true,
    vehicleId: 'vehicle-2',
    registrationPlate: 'DEMO 01',
    vehicleType: 'VAN',
  },
});
describe('World map identity and motion', () => {
  it('never treats a shipment ID as a vehicle ID or infers a van from a label', () => {
    expect(hasVan(point())).toBe(true);
    const unknown = { ...point(), shipment: { ...point().shipment!, vehicleId: null } };
    expect(hasVan(unknown)).toBe(false);
    expect(representation(unknown)).toBe('Vehicle not assigned');
    expect(hasVan({ ...point(), shipment: { ...point().shipment!, vehicleType: 'TRUCK' } })).toBe(
      false,
    );
  });
  it('rejects missing, infinite and out-of-Mercator positions', () => {
    expect(validPosition(point())).toBe(true);
    for (const latitude of [NaN, Infinity, 90])
      expect(validPosition({ ...point(), latitude })).toBe(false);
    expect(validPosition({ ...point(), longitude: 181 })).toBe(false);
  });
  it('interpolates from the visible position and turns through the shortest angle', () => {
    const track = new MotionTrack(point());
    track.update(point(1, -2.99), 0, false);
    expect(track.sample(450).longitude).toBeCloseTo(-2.995);
    expect(track.sample(450).angle).toBeCloseTo(Math.PI / 4);
    track.update(point(2, -2.98), 450, false);
    expect(track.sample(450).longitude).toBeCloseTo(-2.995);
    expect(track.sample(1350).longitude).toBe(-2.98);
    expect(track.sample(1350).moving).toBe(false);
  });
  it('rejects old progress, old timestamps and updates for another route', () => {
    const p = point(5);
    p.shipment!.updatedAt = '2026-01-02T00:00:00Z';
    const track = new MotionTrack(p);
    expect(track.update(point(4), 0, false)).toBe(false);
    expect(track.update({ ...point(6), id: 'other' }, 0, false)).toBe(false);
    const old = point(6);
    old.shipment!.updatedAt = '2026-01-01T00:00:00Z';
    expect(track.update(old, 0, false)).toBe(false);
  });
  it('does not restart identical samples and stops on pause, delivery and reduced motion', () => {
    const track = new MotionTrack(point());
    const next = point(1, -2.99);
    track.update(next, 0, false);
    track.update(next, 450, false);
    expect(track.sample(900).moving).toBe(false);
    track.update(point(2, -2.98), 900, false);
    track.update(
      { ...point(2, -2.98), shipment: { ...point(2).shipment!, simulationActive: false } },
      1000,
      false,
    );
    expect(track.sample(1000).moving).toBe(false);
    track.update(point(3, -2.97), 1100, true);
    expect(track.sample(1100).longitude).toBe(-2.97);
    track.update(
      {
        ...point(100, -2.9),
        shipment: { ...point(100).shipment!, status: 'DELIVERED', simulationActive: false },
      },
      1200,
      false,
    );
    expect(track.sample(1200).moving).toBe(false);
    expect(track.update(point(100, -2.8), 1300, false)).toBe(false);
  });
  it('snaps large jumps and can cancel visual movement without changing business state', () => {
    const track = new MotionTrack(point());
    track.update(point(1, 20), 0, false);
    expect(track.sample(0).longitude).toBe(20);
    track.update(point(2, 20.01), 100, false);
    track.stop();
    expect(track.sample(100).moving).toBe(false);
    expect(track.point.shipment?.simulationActive).toBe(true);
  });
});
