import { Dashboard } from '../../shared/models/models';

export const CONTROL_ROOM_STATIONS = [
  {
    id: 'operations',
    label: 'Operations wall',
    description: 'Shipments, delays and incident monitoring',
    path: '/dashboard',
    action: 'Open command center',
  },
  {
    id: 'fleet',
    label: 'Fleet console',
    description: 'Fleet visualisation and simulated tracking',
    path: '/digital-twin',
    action: 'Explore Fleet Twin',
  },
  {
    id: 'warehouse',
    label: 'Warehouse console',
    description: 'Inventory pressure and warehouse operations',
    path: '/warehouse-twin',
    action: 'Explore Warehouse Twin',
  },
] as const;

export type ControlRoomStation = (typeof CONTROL_ROOM_STATIONS)[number]['id'];

export interface ControlRoomSnapshot {
  activeShipments: number | null;
  delayedShipments: number | null;
  openIncidents: number | null;
  criticalPositions: number | null;
}

export function controlRoomSnapshot(dashboard: Dashboard | null): ControlRoomSnapshot {
  if (!dashboard)
    return {
      activeShipments: null,
      delayedShipments: null,
      openIncidents: null,
      criticalPositions: null,
    };
  return {
    activeShipments: dashboard.activeShipments,
    delayedShipments: dashboard.delayedShipments,
    openIncidents: dashboard.openIncidents,
    criticalPositions: dashboard.criticalInventory.length,
  };
}

export function metricLabel(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-GB');
}
