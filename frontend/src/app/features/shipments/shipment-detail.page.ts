import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import {
  OperationMapPoint,
  OperationsMapComponent,
} from '../../shared/components/operations-map.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { IncidentType, ShipmentDetail } from '../../shared/models/models';
import { ShipmentDetailStore } from './shipment-detail.store';

@Component({
  selector: 'app-shipment-detail-page',
  providers: [ShipmentDetailStore],
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    OperationsMapComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    @if (loading()) {
      <app-loading-state />
    } @else if (loadError()) {
      <app-feedback-state
        kind="error"
        title="Shipment unavailable"
        message="Tracking, assignment and event data could not be loaded."
        actionLabel="Retry"
        (action)="load()"
      />
    } @else if (shipment(); as item) {
      <app-page-header
        eyebrow="Shipments"
        backLink="/shipments"
        [title]="item.trackingNumber"
        subtitle="Simulated tracking · positions are not real GPS data"
        ><app-status-chip [status]="item.status" /><app-status-chip [status]="item.deliveryHealth"
      /></app-page-header>
      <div class="tracking-strip" role="status">
        <span
          ><i [class.active]="item.simulationActive"></i
          >{{
            item.status === 'DELIVERED'
              ? 'Delivery complete'
              : item.status === 'CANCELLED'
                ? 'Shipment cancelled'
                : item.status === 'CREATED'
                  ? 'Awaiting fleet assignment'
                  : item.status === 'ASSIGNED'
                    ? 'Ready for departure'
                    : item.simulationActive
                      ? 'Simulation running'
                      : 'Simulation paused'
          }}</span
        >
        <span class="position-label"
          >Simulated position · {{ item.currentLatitude | number: '1.4-4' }},
          {{ item.currentLongitude | number: '1.4-4' }}</span
        >
        @if (pending()) {
          <strong>Updating shipment…</strong>
        }
        <a routerLink="/shipments">All shipments</a>
      </div>
      <section class="hero">
        <article class="map-panel">
          <div class="map-label"><span></span>Simulated tracking</div>
          <app-operations-map [points]="mapPoints()" [route]="routePoints()" />
        </article>
        <aside class="summary">
          <header>
            <div>
              <span>Shipment summary</span><strong>{{ item.orderNumber }}</strong>
            </div>
            <a [routerLink]="['/orders', item.orderId]">Open order</a>
          </header>
          <dl>
            <dt>Delivery health</dt>
            <dd><app-status-chip [status]="item.deliveryHealth" /></dd>
            <dt>Driver</dt>
            <dd>{{ item.driver || 'Not assigned' }}</dd>
            <dt>Vehicle</dt>
            <dd>{{ item.vehicle || 'Not assigned' }}</dd>
            <dt>Departed</dt>
            <dd>{{ item.departedAt ? (item.departedAt | date: 'short') : 'Not departed' }}</dd>
            <dt>Estimated delivery</dt>
            <dd>{{ item.eta ? (item.eta | date: 'short') : 'Pending' }}</dd>
          </dl>
          <div class="progress-head">
            <span>Route progress</span><strong>{{ item.progress }}%</strong>
          </div>
          <div
            class="progress"
            role="progressbar"
            aria-label="Route progress"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="item.progress"
          >
            <span [style.width.%]="item.progress"></span>
          </div>
          @if (auth.canOperate()) {
            <fieldset class="controls" [disabled]="pending()">
              <legend class="sr-only">Shipment actions</legend>
              <div class="controls-heading">
                <strong>Operational controls</strong
                ><span>Actions follow the current shipment state.</span>
              </div>
              @if (item.status === 'CREATED') {
                <mat-form-field appearance="outline"
                  ><mat-label>Driver</mat-label
                  ><mat-select [formControl]="driver"
                    ><mat-option value="">Select driver</mat-option>
                    @for (option of availableDrivers(); track option.id) {
                      <mat-option [value]="option.id"
                        >{{ option.employeeCode }} · {{ option.fullName }}</mat-option
                      >
                    }
                  </mat-select></mat-form-field
                ><mat-form-field appearance="outline"
                  ><mat-label>Vehicle</mat-label
                  ><mat-select [formControl]="vehicle"
                    ><mat-option value="">Select vehicle</mat-option>
                    @for (option of availableVehicles(); track option.id) {
                      <mat-option [value]="option.id"
                        >{{ option.registrationPlate }} · {{ option.capacityKg }} kg</mat-option
                      >
                    }
                  </mat-select></mat-form-field
                >
                @if (!availableDrivers().length || !availableVehicles().length) {
                  <p class="availability-note" role="status">
                    @if (!availableDrivers().length && !availableVehicles().length) {
                      No available driver or vehicle can be assigned.
                    } @else if (!availableDrivers().length) {
                      No driver is currently available.
                    } @else {
                      No vehicle is currently available.
                    }
                  </p>
                }
                <button
                  mat-flat-button
                  color="primary"
                  [disabled]="pending() || !driver.value || !vehicle.value"
                  (click)="assign()"
                >
                  Assign shipment
                </button>
              }
              @if (item.status === 'ASSIGNED') {
                <button
                  mat-flat-button
                  color="primary"
                  [disabled]="pending()"
                  (click)="shipmentAction('start')"
                >
                  Start shipment
                </button>
              }
              @if (item.status === 'IN_TRANSIT') {
                <button
                  mat-flat-button
                  color="primary"
                  [disabled]="pending()"
                  (click)="simulation(item.simulationActive ? 'pause' : 'start')"
                >
                  {{ item.simulationActive ? 'Pause simulation' : 'Start simulation' }}</button
                ><mat-form-field appearance="outline"
                  ><mat-label>Incident type</mat-label
                  ><mat-select [formControl]="incidentType"
                    ><mat-option value="TRAFFIC">Traffic</mat-option
                    ><mat-option value="VEHICLE">Vehicle issue</mat-option
                    ><mat-option value="WEATHER">Weather</mat-option
                    ><mat-option value="ADDRESS">Address issue</mat-option></mat-select
                  ></mat-form-field
                ><button
                  mat-stroked-button
                  color="warn"
                  [disabled]="pending()"
                  (click)="simulateIncident()"
                >
                  Simulate incident</button
                ><button mat-stroked-button [disabled]="pending()" (click)="deliver()">
                  Deliver manually
                </button>
              }
            </fieldset>
          }
        </aside>
      </section>
      <section class="lower">
        <article class="timeline">
          <header>
            <h2>Tracking timeline</h2>
            <span>{{ item.events.length }} operational events</span>
          </header>
          <ol>
            @for (event of item.events; track event.id) {
              <li>
                <i [attr.data-type]="event.type"></i>
                <div>
                  <strong>{{ event.type.replaceAll('_', ' ') }}</strong>
                  <p>{{ event.description }}</p>
                  <span>{{ event.eventTime | date: 'medium' }}</span>
                </div>
              </li>
            } @empty {
              <li class="timeline-empty">No tracking events have been recorded yet.</li>
            }
          </ol>
        </article>
        <aside class="incidents">
          <header>
            <h2>Open incidents</h2>
            <span>{{ item.openIncidents.length }}</span>
          </header>
          @for (incident of item.openIncidents; track incident.id) {
            <a [routerLink]="['/incidents', incident.id]"
              ><div>
                <app-status-chip [status]="incident.severity" /><strong>{{
                  incident.title
                }}</strong>
                <p>{{ incident.description }}</p>
              </div>
              <span>{{ incident.openedAt | date: 'short' }}</span></a
            >
          } @empty {
            <div class="empty">No open incidents for this shipment.</div>
          }
        </aside>
      </section>
    }
  `,
  styles: [
    `
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(330px, 370px);
        gap: 18px;
        margin-bottom: 18px;
      }
      .map-panel,
      .summary,
      .timeline,
      .incidents {
        background: #fff;
        border: 1px solid #e2e8f0;
        min-width: 0;
      }
      .map-panel {
        position: relative;
        min-height: 510px;
        height: 100%;
      }
      .map-panel app-operations-map {
        display: block;
        height: 100%;
      }
      .map-label {
        position: absolute;
        z-index: 500;
        left: 15px;
        top: 15px;
        background: rgb(255 255 255 / 94%);
        backdrop-filter: blur(8px);
        border: 1px solid #e2e8f0;
        padding: 7px 10px;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        gap: 7px;
        align-items: center;
      }
      .map-label span {
        width: 14px;
        border-top: 2px dashed #0891b2;
      }
      .summary header,
      .timeline header,
      .incidents header {
        height: 68px;
        border-bottom: 1px solid #e2e8f0;
        padding: 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .summary header span,
      .summary header strong {
        display: block;
      }
      .summary header span {
        font-size: 11px;
        color: var(--muted);
      }
      .summary header strong {
        font-size: 15px;
        margin-top: 4px;
      }
      .summary header a {
        font-size: 12px;
        color: var(--accent);
        text-decoration: none;
        font-weight: 700;
      }
      .summary dl {
        display: grid;
        grid-template-columns: 122px 1fr;
        gap: 15px;
        margin: 0;
        padding: 21px 18px;
        border-bottom: 1px solid #e2e8f0;
      }
      .summary dt {
        font-size: 12px;
        color: var(--muted);
      }
      .summary dd {
        font-size: 13px;
        margin: 0;
      }
      .progress-head {
        display: flex;
        justify-content: space-between;
        padding: 18px 18px 8px;
        font-size: 12px;
      }
      .progress {
        height: 7px;
        background: #e2e8f0;
        margin: 0 18px 20px;
      }
      .progress span {
        display: block;
        height: 100%;
        background: #0891b2;
        transition: width 0.4s;
      }
      .controls {
        border: 0;
        margin: 0;
        min-width: 0;
        border-top: 1px solid #e2e8f0;
        padding: 18px;
        display: grid;
        gap: 10px;
      }
      .controls mat-form-field {
        width: 100%;
      }
      .controls-heading {
        display: grid;
        gap: 2px;
        margin-bottom: 3px;
      }
      .controls-heading strong {
        font-size: 13px;
      }
      .controls-heading span {
        color: var(--muted);
        font-size: 11px;
      }
      .availability-note {
        margin: -3px 0 3px;
        color: #92400e;
        font-size: 10px;
        line-height: 1.5;
      }
      .lower {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 18px;
        align-items: start;
      }
      .incidents {
        overflow: hidden;
      }
      .timeline ol {
        max-height: 540px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .timeline header h2,
      .incidents header h2 {
        font-size: 13px;
        margin: 0;
      }
      .timeline header span,
      .incidents header > span {
        font-size: 10px;
        color: #64748b;
      }
      .timeline ol {
        list-style: none;
        margin: 0;
        padding: 22px;
      }
      .timeline li {
        display: grid;
        grid-template-columns: 14px 1fr;
        gap: 14px;
        padding-bottom: 22px;
        position: relative;
      }
      .timeline .timeline-empty {
        display: block;
        padding: 16px 0;
        color: #64748b;
        font-size: 11px;
      }
      .timeline li:not(:last-child):before {
        content: '';
        position: absolute;
        left: 6px;
        top: 15px;
        bottom: 0;
        border-left: 1px solid #cbd5e1;
      }
      .timeline i {
        width: 13px;
        height: 13px;
        border: 3px solid #fff;
        background: #0891b2;
        box-shadow: 0 0 0 1px #0891b2;
        border-radius: 50%;
        z-index: 1;
      }
      .timeline i[data-type='DELAYED'],
      .timeline i[data-type='INCIDENT'] {
        background: #dc2626;
        box-shadow: 0 0 0 1px #dc2626;
      }
      .timeline strong {
        font-size: 12px;
      }
      .timeline p {
        font-size: 13px;
        color: #475569;
        margin: 5px 0;
      }
      .timeline div > span {
        font-size: 11px;
        color: #64748b;
      }
      .incidents > a {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 17px;
        border-bottom: 1px solid #eef2f7;
        text-decoration: none;
        color: #0f172a;
      }
      .incidents > a strong {
        font-size: 11px;
        margin-left: 8px;
      }
      .incidents > a p {
        font-size: 10px;
        color: #64748b;
        margin: 8px 0 0;
      }
      .incidents > a > span {
        font-size: 9px;
        color: #94a3b8;
        white-space: nowrap;
      }
      .empty {
        padding: 35px;
        color: #64748b;
        font-size: 13px;
      }
      .tracking-strip {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        padding: 12px 16px;
        background: #edf4f7;
        border: 1px solid #d5e5ed;
        margin-bottom: 18px;
        font-size: 12px;
        color: #375a6d;
      }
      .tracking-strip span:first-child {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .tracking-strip .position-label {
        font-variant-numeric: tabular-nums;
      }
      .tracking-strip i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #738796;
      }
      .tracking-strip i.active {
        background: #178260;
        box-shadow: 0 0 0 4px #17826012;
      }
      .tracking-strip a {
        margin-left: auto;
        color: #176b87;
        font-weight: 600;
      }
      @media (max-width: 1050px) {
        .hero,
        .lower {
          grid-template-columns: 1fr;
        }
        .map-panel {
          height: 480px;
        }
      }
      @media (max-width: 600px) {
        .map-panel {
          height: 390px;
        }
      }
    `,
  ],
})
export class ShipmentDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(ShipmentDetailStore);
  readonly loading = this.store.loading;
  readonly pending = signal(false);
  readonly loadError = this.store.loadError;
  readonly shipment = this.store.shipment;
  readonly driver = new FormControl('', { nonNullable: true });
  readonly vehicle = new FormControl('', { nonNullable: true });
  readonly incidentType = new FormControl<IncidentType>('TRAFFIC', { nonNullable: true });
  readonly availableDrivers = computed(() =>
    this.store.drivers().filter((item) => item.active && item.status === 'AVAILABLE'),
  );
  readonly availableVehicles = computed(() =>
    this.store.vehicles().filter((item) => item.active && item.status === 'AVAILABLE'),
  );
  readonly mapPoints = computed<OperationMapPoint[]>(() => {
    const item = this.shipment();
    if (!item) return [];
    return [
      {
        id: 'warehouse',
        latitude: item.warehouseLatitude,
        longitude: item.warehouseLongitude,
        label: 'Warehouse origin',
        kind: 'origin',
      },
      {
        id: 'destination',
        latitude: item.destinationLatitude,
        longitude: item.destinationLongitude,
        label: 'Delivery destination',
        kind: 'destination',
      },
      {
        id: item.id,
        latitude: item.currentLatitude,
        longitude: item.currentLongitude,
        label: `${item.trackingNumber} · ${item.progress}%`,
        kind: 'vehicle',
        health: item.deliveryHealth,
      },
    ];
  });
  readonly routePoints = computed<Array<[number, number]>>(() => {
    const item = this.shipment();
    if (!item) return [];
    const midLat =
      (item.warehouseLatitude + item.destinationLatitude) / 2 +
      (item.destinationLongitude - item.warehouseLongitude) * 0.08;
    const midLon =
      (item.warehouseLongitude + item.destinationLongitude) / 2 -
      (item.destinationLatitude - item.warehouseLatitude) * 0.08;
    return [
      [item.warehouseLatitude, item.warehouseLongitude],
      [midLat, midLon],
      [item.destinationLatitude, item.destinationLongitude],
    ];
  });
  private actionSequence = 0;
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.actionSequence++;
        this.pending.set(false);
        this.driver.setValue('', { emitEvent: false });
        this.vehicle.setValue('', { emitEvent: false });
        this.store.open(id);
      });
  }
  assign(): void {
    if (!this.driver.value || !this.vehicle.value) return;
    const context = this.beginAction();
    if (!context) return;
    this.api
      .assignShipment(context.id, { driverId: this.driver.value, vehicleId: this.vehicle.value })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishAction(context)),
      )
      .subscribe({
        next: (item) => this.acceptAction(context, item, 'Shipment updated.'),
        error: () => {},
      });
  }
  shipmentAction(action: 'start' | 'deliver' | 'cancel'): void {
    const context = this.beginAction();
    if (!context) return;
    this.api
      .shipmentAction(context.id, action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishAction(context)),
      )
      .subscribe({
        next: (item) => this.acceptAction(context, item, 'Shipment updated.'),
        error: () => {},
      });
  }
  simulation(action: 'start' | 'pause'): void {
    const context = this.beginAction();
    if (!context) return;
    this.api
      .simulationAction(context.id, action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishAction(context)),
      )
      .subscribe({
        next: (item) => {
          if (!this.isCurrentAction(context)) return;
          this.store.acceptAction(context.id, context.revision, item);
          this.snackBar.open(
            `Demo simulation ${action === 'start' ? 'started' : 'paused'}.`,
            'Dismiss',
            { duration: 2200 },
          );
        },
        error: () => {},
      });
  }
  simulateIncident(): void {
    const context = this.beginAction();
    if (!context) return;
    this.api
      .simulationAction(context.id, 'incident', { type: this.incidentType.value })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishAction(context)),
      )
      .subscribe({
        next: () => {
          if (!this.isCurrentAction(context)) return;
          this.snackBar.open('Demo incident opened.', 'Dismiss', { duration: 2500 });
          this.store.refresh();
        },
        error: () => {},
      });
  }
  deliver(): void {
    if (this.pending()) return;
    const id = this.store.id();
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Confirm delivery',
          message: 'This completes the order and releases the assigned driver and vehicle.',
          confirmLabel: 'Mark delivered',
        },
      })
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.store.id() !== id) return;
        const context = this.beginAction();
        if (!context) return;
        this.api
          .shipmentAction(context.id, 'deliver')
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.finishAction(context)),
          )
          .subscribe({
            next: (item) =>
              this.acceptAction(context, item, 'Delivery confirmed. Fleet resources released.'),
            error: () => {},
          });
      });
  }
  load(): void {
    this.store.load();
  }
  private beginAction(): { id: string; sequence: number; revision: number } | null {
    const id = this.store.id();
    if (!id || this.pending()) return null;
    this.pending.set(true);
    return { id, sequence: ++this.actionSequence, revision: this.store.beginAction() };
  }
  private isCurrentAction(context: { id: string; sequence: number }): boolean {
    return this.store.id() === context.id && this.actionSequence === context.sequence;
  }
  private finishAction(context: { id: string; sequence: number; revision: number }): void {
    this.store.finishAction(context.id, context.revision);
    if (this.isCurrentAction(context)) this.pending.set(false);
  }
  private acceptAction(
    context: { id: string; sequence: number; revision: number },
    item: ShipmentDetail,
    message: string,
  ): void {
    if (!this.isCurrentAction(context)) return;
    this.store.acceptAction(context.id, context.revision, item);
    this.snackBar.open(message, 'Dismiss', { duration: 2500 });
  }
}
