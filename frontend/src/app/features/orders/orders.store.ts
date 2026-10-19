import { DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { catchError, map, of, Subject, switchMap, timer } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { OrderStatus, OrderSummary, PageResponse } from '../../shared/models/models';

interface OrderQuery {
  search: string;
  status: OrderStatus | '';
  page: number;
  size: number;
}

interface OrdersState {
  query: OrderQuery;
  result: PageResponse<OrderSummary> | null;
  loading: boolean;
  loadError: boolean;
}

const initialState: OrdersState = {
  query: { search: '', status: '', page: 0, size: 20 },
  result: null,
  loading: true,
  loadError: false,
};

export const OrdersStore = signalStore(
  withState(initialState),
  withComputed(({ query, result }) => ({
    hasFilters: computed(() => Boolean(query().search || query().status)),
    totalElements: computed(() => result()?.totalElements ?? 0),
  })),
  withMethods((store, api = inject(ApiService), destroyRef = inject(DestroyRef)) => {
    const requests = new Subject<{ query: OrderQuery; debounce: boolean }>();

    requests
      .pipe(
        switchMap(({ query, debounce }) =>
          timer(debounce ? 300 : 0).pipe(
            switchMap(() =>
              api.orders(query).pipe(
                map((result) => ({ result, loadError: false })),
                catchError(() => of({ result: null, loadError: true })),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(({ result, loadError }) => {
        patchState(store, { result: result ?? store.result(), loadError, loading: false });
      });

    function load(query: OrderQuery, debounce = false): void {
      patchState(store, { query, loading: true, loadError: false });
      requests.next({ query, debounce });
    }

    return {
      load: () => load(store.query()),
      retry: () => load(store.query()),
      setSearch(search: string): void {
        const query = store.query();
        if (query.search !== search) load({ ...query, search, page: 0 }, true);
      },
      setStatus(status: OrderStatus | ''): void {
        const query = store.query();
        if (query.status !== status) load({ ...query, status, page: 0 });
      },
      setPage(page: number, size: number): void {
        const query = store.query();
        if (query.page !== page || query.size !== size) load({ ...query, page, size });
      },
      clearFilters(): void {
        const query = store.query();
        if (query.search || query.status || query.page) {
          load({ ...query, search: '', status: '', page: 0 });
        }
      },
    };
  }),
);
