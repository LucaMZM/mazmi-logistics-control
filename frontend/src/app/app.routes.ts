import { Routes } from '@angular/router';
import { adminGuard, authGuard, operatorGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./core/auth/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'orders/new',
        canActivate: [operatorGuard],
        loadComponent: () =>
          import('./features/orders/order-form.page').then((m) => m.OrderFormPage),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/orders/order-detail.page').then((m) => m.OrderDetailPage),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory.page').then((m) => m.InventoryPage),
      },
      {
        path: 'inventory/:id',
        loadComponent: () =>
          import('./features/inventory/inventory-detail.page').then((m) => m.InventoryDetailPage),
      },
      {
        path: 'shipments',
        loadComponent: () =>
          import('./features/shipments/shipments.page').then((m) => m.ShipmentsPage),
      },
      {
        path: 'shipments/:id',
        loadComponent: () =>
          import('./features/shipments/shipment-detail.page').then((m) => m.ShipmentDetailPage),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers.page').then((m) => m.CustomersPage),
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./features/customers/customer-detail.page').then((m) => m.CustomerDetailPage),
      },
      {
        path: 'fleet',
        loadComponent: () => import('./features/fleet/fleet.page').then((m) => m.FleetPage),
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import('./features/incidents/incidents.page').then((m) => m.IncidentsPage),
      },
      {
        path: 'incidents/:id',
        loadComponent: () =>
          import('./features/incidents/incident-detail.page').then((m) => m.IncidentDetailPage),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/users.page').then((m) => m.UsersPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
