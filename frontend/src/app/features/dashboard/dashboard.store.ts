import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { auditTime, catchError, map, merge, of, Subject, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { OperationMapPoint } from '../../shared/components/operations-map.component';
import { Dashboard } from '../../shared/models/models';

export const DashboardStore = signalStore(
  withState({ dashboard: null as Dashboard | null, loading: true, loadError: false }),
  withComputed(({ dashboard }) => ({
    mapPoints: computed<OperationMapPoint[]>(() =>
      (dashboard()?.activeShipmentMapItems ?? []).map((item) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        label: `${item.trackingNumber} · ${item.progress}%`,
        kind: 'vehicle',
        health: item.deliveryHealth,
        shipment: item,
      })),
    ),
    riskShipments: computed(() =>
      (dashboard()?.activeShipmentMapItems ?? [])
        .filter((item) => item.deliveryHealth !== 'ON_TIME')
        .sort(
          (a, b) => Number(b.deliveryHealth === 'DELAYED') - Number(a.deliveryHealth === 'DELAYED'),
        )
        .slice(0, 3),
    ),
    openIncidents: computed(() => {
      const severity: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (dashboard()?.recentIncidents ?? [])
        .filter((item) => item.status === 'OPEN')
        .sort((a, b) => (severity[b.severity] ?? 0) - (severity[a.severity] ?? 0))
        .slice(0, 3);
    }),
  })),
  withMethods(
    (
      store,
      api = inject(ApiService),
      realtime = inject(RealtimeService),
      destroyRef = inject(DestroyRef),
    ) => {
      const requests = new Subject<void>();
      requests
        .pipe(
          switchMap(() =>
            api.dashboard().pipe(
              map((dashboard) => ({ dashboard, loadError: false })),
              catchError(() => of({ dashboard: store.dashboard(), loadError: true })),
            ),
          ),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((result) => patchState(store, { ...result, loading: false }));

      function refresh(): void {
        patchState(store, { loading: !store.dashboard(), loadError: false });
        requests.next();
      }
      // Batch bursts without postponing refresh indefinitely during continuous tracking.
      merge(realtime.watchDashboard(), realtime.watchConnected())
        .pipe(auditTime(250), takeUntilDestroyed(destroyRef))
        .subscribe(refresh);
      return { refresh };
    },
  ),
  withHooks({ onInit: (store) => store.refresh() }),
);
