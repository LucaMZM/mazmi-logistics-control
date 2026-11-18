export interface NavigationLink {
  path: string;
  label: string;
  access?: 'operate' | 'admin';
}
export interface NavigationGroup {
  label: string;
  links: NavigationLink[];
}
export const workspaceNavigation: NavigationGroup[] = [
  { label: 'Overview', links: [{ path: '/dashboard', label: 'Dashboard' }] },
  {
    label: 'Operations',
    links: [
      { path: '/orders', label: 'Orders' },
      { path: '/shipments', label: 'Shipments' },
      { path: '/incidents', label: 'Incidents' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { path: '/inventory', label: 'Inventory' },
      { path: '/fleet', label: 'Fleet' },
      { path: '/customers', label: 'Customers' },
    ],
  },
  {
    label: 'Digital spaces',
    links: [
      { path: '/digital-twin', label: 'Fleet Twin' },
      { path: '/warehouse-twin', label: 'Warehouse Twin' },
      { path: '/warehouse-editor', label: 'Warehouse Editor', access: 'operate' },
      { path: '/control-room', label: 'Control Room' },
    ],
  },
  { label: 'Administration', links: [{ path: '/admin/users', label: 'Users', access: 'admin' }] },
];
