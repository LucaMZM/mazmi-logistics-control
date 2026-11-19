import type { IconName } from '../../shared/components/icon.component';
export interface NavigationLink {
  path: string;
  label: string;
  icon: IconName;
  access?: 'operate' | 'admin';
}
export interface NavigationGroup {
  label: string;
  icon: IconName;
  links: NavigationLink[];
}
export const workspaceNavigation: NavigationGroup[] = [
  {
    label: 'Overview',
    icon: 'overview',
    links: [{ path: '/dashboard', label: 'Overview', icon: 'overview' }],
  },
  {
    label: 'Operations',
    icon: 'shipments',
    links: [
      { path: '/orders', label: 'Orders', icon: 'orders' },
      { path: '/shipments', label: 'Shipments', icon: 'shipments' },
      { path: '/incidents', label: 'Incidents', icon: 'incidents' },
      { path: '/customers', label: 'Customers', icon: 'customers' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'inventory',
    links: [{ path: '/inventory', label: 'Inventory', icon: 'inventory' }],
  },
  { label: 'Fleet', icon: 'fleet', links: [{ path: '/fleet', label: 'Fleet', icon: 'fleet' }] },
  {
    label: 'Digital spaces',
    icon: 'twin',
    links: [
      { path: '/digital-twin', label: 'Fleet Twin', icon: 'twin' },
      { path: '/warehouse-twin', label: 'Warehouse Twin', icon: 'warehouse' },
      { path: '/warehouse-editor', label: 'Warehouse Editor', icon: 'editor', access: 'operate' },
      { path: '/control-room', label: 'Control Room', icon: 'room' },
    ],
  },
  {
    label: 'Users',
    icon: 'users',
    links: [{ path: '/admin/users', label: 'Users', icon: 'users', access: 'admin' }],
  },
];
