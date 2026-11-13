import { Dashboard } from '../../shared/models/models';
import { CONTROL_ROOM_STATIONS, controlRoomSnapshot, metricLabel } from './control-room.model';

describe('Control Room operational adapter', () => {
  it('does not invent metrics while data is unavailable', () => {
    expect(controlRoomSnapshot(null)).toEqual({
      activeShipments: null,
      delayedShipments: null,
      openIncidents: null,
      criticalPositions: null,
    });
    expect(metricLabel(null)).toBe('—');
  });

  it('uses verified dashboard values and critical inventory positions', () => {
    const dashboard = {
      activeShipments: 8,
      delayedShipments: 2,
      openIncidents: 3,
      criticalInventory: [{ id: 'a' }, { id: 'b' }],
    } as unknown as Dashboard;
    expect(controlRoomSnapshot(dashboard)).toEqual({
      activeShipments: 8,
      delayedShipments: 2,
      openIncidents: 3,
      criticalPositions: 2,
    });
    expect(metricLabel(0)).toBe('0');
  });

  it('links every station to an existing feature', () => {
    expect(CONTROL_ROOM_STATIONS.map((station) => station.path)).toEqual([
      '/dashboard',
      '/digital-twin',
      '/warehouse-twin',
    ]);
  });
});
