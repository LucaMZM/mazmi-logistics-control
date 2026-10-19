import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { Driver, RealtimeUpdate, ShipmentDetail, Vehicle } from '../../shared/models/models';
import { mergeShipmentRealtime } from './shipment-update';

interface ShipmentDetailState {
  id: string;
  shipment: ShipmentDetail | null;
  drivers: Driver[];
  vehicles: Vehicle[];
  loading: boolean;
  loadError: boolean;
}

const initialState: ShipmentDetailState = {
  id: '',
  shipment: null,
  drivers: [],
  vehicles: [],
  loading: true,
  loadError: false,
};

export const ShipmentDetailStore = signalStore(
  withState(initialState),
  withMethods(
    (
      store,
      api = inject(ApiService),
      realtime = inject(RealtimeService),
      destroyRef = inject(DestroyRef),
    ) => {
      let fullLoad: Subscription | undefined;
      let refreshLoad: Subscription | undefined;
      let shipmentUpdates: Subscription | undefined;
      let revision = 0;
      let nextRead = 0;
      let latestAppliedRead = 0;
      let changes: Array<
        | { revision: number; kind: 'realtime'; value: RealtimeUpdate }
        | { revision: number; kind: 'action'; value: ShipmentDetail }
      > = [];

      function reconcile(snapshot: ShipmentDetail, startedAt: number): ShipmentDetail {
        return changes
          .filter((entry) => entry.revision > startedAt)
          .reduce(
            (current, entry) =>
              entry.kind === 'action' ? entry.value : mergeShipmentRealtime(current, entry.value),
            snapshot,
          );
      }

      function refresh(startedAt = revision): void {
        const id = store.id();
        if (!id) return;
        refreshLoad?.unsubscribe();
        const read = ++nextRead;
        refreshLoad = api
          .shipment(id)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (snapshot) => {
              if (store.id() !== id || read < latestAppliedRead) return;
              latestAppliedRead = read;
              patchState(store, { shipment: reconcile(snapshot, startedAt) });
            },
            error: () => {},
          });
      }

      function load(): void {
        const id = store.id();
        if (!id) return;
        fullLoad?.unsubscribe();
        patchState(store, { loading: true, loadError: false });
        const startedAt = revision;
        const read = ++nextRead;
        fullLoad = forkJoin({
          shipment: api.shipment(id),
          drivers: api.drivers(),
          vehicles: api.vehicles(),
        })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: ({ shipment, drivers, vehicles }) => {
              if (store.id() !== id) return;
              patchState(store, {
                shipment:
                  read >= latestAppliedRead ? reconcile(shipment, startedAt) : store.shipment(),
                drivers,
                vehicles,
                loading: false,
              });
              latestAppliedRead = Math.max(latestAppliedRead, read);
            },
            error: () => {
              if (store.id() === id) patchState(store, { loading: false, loadError: true });
            },
          });
      }

      realtime
        .watchConnected()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe(() => refresh());

      destroyRef.onDestroy(() => {
        fullLoad?.unsubscribe();
        refreshLoad?.unsubscribe();
        shipmentUpdates?.unsubscribe();
      });

      return {
        open(id: string): void {
          if (store.id() === id) return;
          fullLoad?.unsubscribe();
          refreshLoad?.unsubscribe();
          shipmentUpdates?.unsubscribe();
          revision = 0;
          nextRead = 0;
          latestAppliedRead = 0;
          changes = [];
          patchState(store, { ...initialState, id });
          shipmentUpdates = realtime
            .watchShipment(id)
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe((update) => {
              if (update.id !== store.id()) return;
              const beforeUpdate = revision;
              changes.push({ revision: ++revision, kind: 'realtime', value: update });
              const current = store.shipment();
              if (current) patchState(store, { shipment: mergeShipmentRealtime(current, update) });
              if (
                update.status === 'DELIVERED' ||
                update.latestEvent?.type === 'INCIDENT' ||
                update.latestEvent?.type === 'RESUMED'
              )
                refresh(beforeUpdate);
            });
          load();
        },
        load,
        refresh,
        revision: () => revision,
        acceptAction(id: string, startedAt: number, shipment: ShipmentDetail): void {
          if (store.id() !== id) return;
          const current = reconcile(shipment, startedAt);
          changes.push({ revision: ++revision, kind: 'action', value: current });
          patchState(store, { shipment: current });
        },
      };
    },
  ),
);
