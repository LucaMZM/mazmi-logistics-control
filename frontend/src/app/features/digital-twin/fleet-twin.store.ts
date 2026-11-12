import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Vehicle } from '../../shared/models/models';

export const FleetTwinStore = signalStore(
  withState({ vehicles: [] as Vehicle[], selectedId: '', loading: false, error: '' }),
  withComputed((s) => ({
    selected: computed(() => s.vehicles().find((v) => v.id === s.selectedId())),
  })),
  withMethods((s, api = inject(ApiService)) => ({
    select(id: string) {
      if (s.vehicles().some((v) => v.id === id)) patchState(s, { selectedId: id });
    },
    load: rxMethod<void>(
      pipe(
        tap(() => patchState(s, { loading: true, error: '' })),
        switchMap(() =>
          api.vehicles().pipe(
            tap((vehicles) =>
              patchState(s, {
                vehicles,
                loading: false,
                selectedId: vehicles.some((v) => v.id === s.selectedId())
                  ? s.selectedId()
                  : ((vehicles.find((v) => v.vehicleType === 'VAN') ?? vehicles[0])?.id ?? ''),
              }),
            ),
            catchError(() => {
              patchState(s, {
                loading: false,
                error: 'Fleet could not be refreshed. Retry to load the latest records.',
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
  })),
);
