import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { catchError, forkJoin, map, of, Subject, switchMap, timer } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  DeliveryHealth,
  Driver,
  PageResponse,
  ShipmentStatus,
  ShipmentSummary,
  Vehicle,
} from '../../shared/models/models';

interface ShipmentQuery {
  search: string;
  status: ShipmentStatus | '';
  deliveryHealth: DeliveryHealth | '';
  driver: string;
  vehicle: string;
  page: number;
  size: number;
}

interface ShipmentsState {
  query: ShipmentQuery;
  result: PageResponse<ShipmentSummary> | null;
  loading: boolean;
  loadError: boolean;
  drivers: Driver[];
  vehicles: Vehicle[];
  lookupsLoading: boolean;
  lookupsError: boolean;
}

const initialState: ShipmentsState = {
  query: {
    search: '',
    status: '',
    deliveryHealth: '',
    driver: '',
    vehicle: '',
    page: 0,
    size: 20,
  },
  result: null,
  loading: true,
  loadError: false,
  drivers: [],
  vehicles: [],
  lookupsLoading: false,
  lookupsError: false,
};

export const ShipmentsStore = signalStore(
  withState(initialState),
  withComputed(({ query, result }) => ({
    shipments: computed(() => result()?.content ?? []),
    total: computed(() => result()?.totalElements ?? 0),
    filtersActive: computed(() => {
      const { search, status, deliveryHealth, driver, vehicle } = query();
      return Boolean(search || status || deliveryHealth || driver || vehicle);
    }),
  })),
  withMethods((store, api = inject(ApiService), destroyRef = inject(DestroyRef)) => {
    const requests = new Subject<{ query: ShipmentQuery; debounce: boolean }>();

    requests
      .pipe(
        switchMap(({ query, debounce }) =>
          timer(debounce ? 250 : 0).pipe(
            switchMap(() =>
              api.shipments(query).pipe(
                map((result) => ({ result, loadError: false })),
                catchError(() => of({ result: null, loadError: true })),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ result, loadError }) => {
        patchState(store, { result: result ?? store.result(), loading: false, loadError });
      });

    function load(query: ShipmentQuery, debounce = false): void {
      patchState(store, { query, loading: true, loadError: false });
      requests.next({ query, debounce });
    }

    function setFilter<
      K extends keyof Pick<
        ShipmentQuery,
        'search' | 'status' | 'deliveryHealth' | 'driver' | 'vehicle'
      >,
    >(key: K, value: ShipmentQuery[K]): void {
      const query = store.query();
      if (query[key] !== value) load({ ...query, [key]: value, page: 0 }, key === 'search');
    }

    return {
      load: () => load(store.query()),
      retry: () => load(store.query()),
      setSearch: (value: string) => setFilter('search', value),
      setStatus: (value: ShipmentStatus | '') => setFilter('status', value),
      setDeliveryHealth: (value: DeliveryHealth | '') => setFilter('deliveryHealth', value),
      setDriver: (value: string) => setFilter('driver', value),
      setVehicle: (value: string) => setFilter('vehicle', value),
      setPage(page: number, size: number): void {
        const query = store.query();
        if (query.page !== page || query.size !== size) load({ ...query, page, size });
      },
      clearFilters(): void {
        const query = store.query();
        if (store.filtersActive() || query.page) {
          load({
            ...query,
            search: '',
            status: '',
            deliveryHealth: '',
            driver: '',
            vehicle: '',
            page: 0,
          });
        }
      },
      loadLookups(): void {
        if (store.lookupsLoading()) return;
        patchState(store, { lookupsLoading: true, lookupsError: false });
        forkJoin({ drivers: api.drivers(), vehicles: api.vehicles() })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: ({ drivers, vehicles }) =>
              patchState(store, { drivers, vehicles, lookupsLoading: false }),
            error: () => patchState(store, { lookupsLoading: false, lookupsError: true }),
          });
      },
    };
  }),
);
