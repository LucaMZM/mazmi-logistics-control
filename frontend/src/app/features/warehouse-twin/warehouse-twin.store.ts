import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  catchError,
  expand,
  forkJoin,
  map,
  of,
  pipe,
  reduce,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Inventory, OrderDetail, OrderSummary, Warehouse } from '../../shared/models/models';
import { compatibleOrder, inventoryMetrics } from './warehouse-model';

export const WarehouseTwinStore = signalStore(
  withState({
    warehouses: [] as Warehouse[],
    warehouseId: '',
    inventory: [] as Inventory[],
    inventoryTotal: 0,
    orders: [] as OrderSummary[],
    order: null as OrderDetail | null,
    loading: false,
    recordsLoading: false,
    orderLoading: false,
    error: '',
    inventoryError: '',
    ordersError: '',
    orderError: '',
  }),
  withComputed((s) => ({
    warehouse: computed(() => s.warehouses().find((w) => w.id === s.warehouseId())),
    metrics: computed(() => inventoryMetrics(s.inventory(), s.warehouseId())),
    partialInventory: computed(() => s.inventory().length < s.inventoryTotal()),
  })),
  withMethods((s, api = inject(ApiService)) => {
    const loadOrder = rxMethod<string | null>(
      pipe(
        tap(() => patchState(s, { order: null, orderLoading: true, orderError: '' })),
        switchMap((id) => {
          if (!id) {
            patchState(s, { orderLoading: false });
            return EMPTY;
          }
          const warehouseId = s.warehouseId();
          return api.order(id).pipe(
            switchMap((order) =>
              compatibleOrder(order, warehouseId)
                ? of(order)
                : throwError(() => new Error('Incompatible order')),
            ),
            tap((order) => patchState(s, { order, orderLoading: false })),
            catchError(() => {
              patchState(s, {
                orderLoading: false,
                orderError: 'Order unavailable or no longer compatible with this warehouse.',
              });
              return EMPTY;
            }),
          );
        }),
      ),
    );
    const loadWarehouse = rxMethod<string>(
      pipe(
        tap((id) => {
          loadOrder(null);
          patchState(s, {
            warehouseId: id,
            inventory: [],
            inventoryTotal: 0,
            orders: [],
            loading: true,
            inventoryError: '',
            ordersError: '',
          });
        }),
        switchMap((id) =>
          forkJoin({
            stock: api.inventory({ warehouse: id, size: 100, page: 0 }).pipe(
              // Bound memory and requests. A truncated collection is labelled, never called a total.
              expand((page) =>
                page.page + 1 < page.totalPages && page.page < 19
                  ? api.inventory({ warehouse: id, size: 100, page: page.page + 1 })
                  : EMPTY,
              ),
              reduce(
                (acc, page) => ({
                  rows: [...acc.rows, ...page.content],
                  total: page.totalElements,
                }),
                { rows: [] as Inventory[], total: 0 },
              ),
              switchMap((stock) =>
                stock.rows.every((row) => row.warehouseId === id)
                  ? of({ ...stock, error: '' })
                  : throwError(() => new Error('Warehouse mismatch')),
              ),
              catchError(() =>
                of({
                  rows: [] as Inventory[],
                  total: 0,
                  error: 'Inventory could not be loaded. Refresh to retry.',
                }),
              ),
            ),
            orders: forkJoin([
              api.orders({ warehouse: id, status: 'CONFIRMED', size: 20 }),
              api.orders({ warehouse: id, status: 'PREPARING', size: 20 }),
            ]).pipe(
              map((pages) => ({
                rows: pages
                  .flatMap((p) => p.content)
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                error: '',
              })),
              catchError(() =>
                of({
                  rows: [] as OrderSummary[],
                  error: 'Compatible orders could not be loaded. Refresh to retry.',
                }),
              ),
            ),
          }).pipe(
            tap(({ stock, orders }) =>
              patchState(s, {
                inventory: stock.rows,
                inventoryTotal: stock.total,
                inventoryError: stock.error,
                orders: orders.rows,
                ordersError: orders.error,
                loading: false,
              }),
            ),
          ),
        ),
      ),
    );
    const load = rxMethod<void>(
      pipe(
        tap(() => patchState(s, { recordsLoading: true, error: '' })),
        switchMap(() =>
          api.warehouses().pipe(
            tap((warehouses) => {
              patchState(s, { warehouses, recordsLoading: false });
              const selected =
                warehouses.find((w) => w.id === s.warehouseId()) ??
                warehouses.find((w) => w.active) ??
                warehouses[0];
              if (selected) loadWarehouse(selected.id);
              else {
                loadOrder(null);
                patchState(s, {
                  warehouseId: '',
                  inventory: [],
                  inventoryTotal: 0,
                  orders: [],
                  loading: false,
                });
              }
            }),
            catchError(() => {
              patchState(s, {
                recordsLoading: false,
                error: 'Warehouses could not be loaded. Retry to access records.',
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    );
    return {
      load,
      selectWarehouse(id: string) {
        if (s.warehouses().some((w) => w.id === id)) loadWarehouse(id);
      },
      selectOrder(id: string) {
        if (!id || s.orders().some((o) => o.id === id)) loadOrder(id || null);
      },
    };
  }),
);
