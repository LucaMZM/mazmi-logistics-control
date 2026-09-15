import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  startWith,
  Subject,
  Subscription,
  takeUntil,
} from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Driver, ShipmentSummary, Vehicle } from '../../shared/models/models';

@Component({
  selector: 'app-shipments-page',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatPaginatorModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `<app-page-header
      title="Shipments"
      subtitle="Assignment, dispatch and simulated delivery tracking."
    />
    <section class="filters" aria-label="Shipment filters">
      <mat-form-field appearance="outline">
        <mat-label>Tracking or order</mat-label>
        <input matInput [formControl]="search" placeholder="Search…" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [formControl]="status">
          <mat-option value="">All</mat-option>
          @for (option of statuses; track option) {
            <mat-option [value]="option">{{ option }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Delivery health</mat-label>
        <mat-select [formControl]="deliveryHealth">
          <mat-option value="">All</mat-option>
          @for (option of healthOptions; track option) {
            <mat-option [value]="option">{{ option }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Driver</mat-label>
        <mat-select [formControl]="driver">
          <mat-option value="">All</mat-option>
          @for (option of drivers(); track option.id) {
            <mat-option [value]="option.id">{{ option.fullName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Vehicle</mat-label>
        <mat-select [formControl]="vehicle">
          <mat-option value="">All</mat-option>
          @for (option of vehicles(); track option.id) {
            <mat-option [value]="option.id">{{ option.registrationPlate }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </section>
    <section class="table-card">
      <div class="list-summary">
        <strong>Shipment register</strong><span>{{ total() }} matching shipments</span
        ><button mat-button (click)="clearFilters()">Clear filters</button>
      </div>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Shipments unavailable"
          message="The shipment list could not be loaded. The current filters have been preserved."
          actionLabel="Retry"
          (action)="retry()"
        />
      } @else {
        @if (shipments().length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Delivery health</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Progress</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                @for (item of shipments(); track item.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/shipments', item.id]">{{ item.trackingNumber }}</a>
                    </td>
                    <td>{{ item.orderNumber }}</td>
                    <td><app-status-chip [status]="item.status" /></td>
                    <td><app-status-chip [status]="item.deliveryHealth" /></td>
                    <td>{{ item.driver || 'Unassigned' }}</td>
                    <td>{{ item.vehicle || 'Unassigned' }}</td>
                    <td>
                      <div
                        class="progress"
                        role="progressbar"
                        aria-label="Shipment progress"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        [attr.aria-valuenow]="item.progress"
                      >
                        <span [style.width.%]="item.progress"></span>
                      </div>
                      <small>{{ item.progress }}%</small>
                    </td>
                    <td>{{ item.eta ? (item.eta | date: 'short') : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-feedback-state
            title="No shipments found"
            message="No shipment matches the current filters."
          />
        }
        @if (total()) {
          <mat-paginator
            [length]="total()"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="page($event)"
            aria-label="Shipment pages"
          />
        }
      }
    </section>`,
  styles: [
    `
      .table-card {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .filters {
        display: grid;
        grid-template-columns: minmax(220px, 1.5fr) repeat(4, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .filters mat-form-field {
        width: 100%;
      }
      table {
        width: 100%;
        min-width: 1000px;
        border-collapse: collapse;
      }
      .progress {
        display: inline-block;
        width: 80px;
        height: 5px;
        background: #e2e8f0;
        margin-right: 7px;
        vertical-align: middle;
      }
      .progress span {
        display: block;
        height: 100%;
        background: #0891b2;
      }
      small {
        color: #64748b;
      }
      @media (max-width: 1100px) {
        .filters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ShipmentsPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly shipments = signal<ShipmentSummary[]>([]);
  readonly total = signal(0);
  pageIndex = 0;
  pageSize = 20;
  readonly drivers = signal<Driver[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly statuses = ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
  readonly healthOptions = ['ON_TIME', 'AT_RISK', 'DELAYED'];
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly deliveryHealth = new FormControl('', { nonNullable: true });
  readonly driver = new FormControl('', { nonNullable: true });
  readonly vehicle = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.api
      .drivers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((drivers) => this.drivers.set(drivers));
    this.api
      .vehicles()
      .pipe(takeUntil(this.destroy$))
      .subscribe((vehicles) => this.vehicles.set(vehicles));
    combineLatest([
      this.search.valueChanges.pipe(startWith(''), debounceTime(250), distinctUntilChanged()),
      this.status.valueChanges.pipe(startWith(''), distinctUntilChanged()),
      this.deliveryHealth.valueChanges.pipe(startWith(''), distinctUntilChanged()),
      this.driver.valueChanges.pipe(startWith(''), distinctUntilChanged()),
      this.vehicle.valueChanges.pipe(startWith(''), distinctUntilChanged()),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([search, status, deliveryHealth, driver, vehicle]) => {
        this.pageIndex = 0;
        this.load({ search, status, deliveryHealth, driver, vehicle });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  retry(): void {
    this.load({
      search: this.search.value,
      status: this.status.value,
      deliveryHealth: this.deliveryHealth.value,
      driver: this.driver.value,
      vehicle: this.vehicle.value,
    });
  }
  page(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.retry();
  }
  clearFilters(): void {
    for (const control of [
      this.search,
      this.status,
      this.deliveryHealth,
      this.driver,
      this.vehicle,
    ])
      control.setValue('');
  }

  private load(filters: Record<string, string>): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.request = this.api
      .shipments({ page: this.pageIndex, size: this.pageSize, ...filters })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.total.set(result.totalElements);
          this.shipments.set(result.content);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}
