import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { OrderStatus, PageResponse, OrderSummary } from '../../shared/models/models';

@Component({
  selector: 'app-orders-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Orders"
      subtitle="Create and manage the complete warehouse-to-delivery workflow."
    >
      @if (auth.canOperate()) {
        <a mat-flat-button color="primary" routerLink="/orders/new">New order</a>
      }
    </app-page-header>
    <section class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><mat-label>Search orders</mat-label
        ><input
          matInput
          [formControl]="search"
          placeholder="Order number or customer" /></mat-form-field
      ><mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><mat-label>Status</mat-label
        ><mat-select [formControl]="status"
          ><mat-option value="">All statuses</mat-option>
          @for (item of statuses; track item) {
            <mat-option [value]="item">{{ item.replaceAll('_', ' ') }}</mat-option>
          }
        </mat-select></mat-form-field
      >
    </section>
    <section class="table-card">
      <div class="list-summary">
        <strong>Order register</strong
        ><span>{{ result()?.totalElements ?? 0 }} matching orders</span
        ><button
          mat-button
          type="button"
          (click)="clearFilters()"
          [disabled]="!search.value && !status.value"
        >
          Clear filters
        </button>
      </div>
      @if (loading()) {
        <app-loading-state />
      } @else if (loadError()) {
        <app-feedback-state
          kind="error"
          title="Orders unavailable"
          message="The order list could not be loaded. Your current filters have been preserved."
          actionLabel="Retry"
          (action)="retry()"
        />
      } @else {
        <div class="table-wrap">
          <table class="responsive-table" aria-label="Orders">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th>Priority</th>
                <th class="numeric">Total</th>
                <th>Created</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              @for (order of result()?.content; track order.id) {
                <tr>
                  <td data-label="Order">
                    <a [routerLink]="['/orders', order.id]">{{ order.orderNumber }}</a>
                  </td>
                  <td data-label="Customer">{{ order.customer }}</td>
                  <td data-label="Warehouse">{{ order.warehouse }}</td>
                  <td data-label="Status"><app-status-chip [status]="order.status" /></td>
                  <td data-label="Priority"><app-status-chip [status]="order.priority" /></td>
                  <td data-label="Total" class="numeric">
                    {{ order.totalAmount | currency: 'EUR' }}
                  </td>
                  <td data-label="Created">{{ order.createdAt | date: 'mediumDate' }}</td>
                  <td data-label="Next step" data-wide class="next-step">
                    <span>{{ nextStep(order.status) }}</span
                    ><a [routerLink]="['/orders', order.id]">Open →</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!result()?.content?.length) {
            <app-feedback-state
              title="No orders found"
              message="Adjust the current filters or create a new draft order."
            />
          }
        </div>
        @if (result()?.totalElements) {
          <mat-paginator
            [length]="result()?.totalElements ?? 0"
            [pageIndex]="result()?.page ?? 0"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="page($event)"
          />
        }
      }
    </section>
  `,
  styles: [
    `
      .filters {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
      }
      .filters mat-form-field:first-child {
        width: min(420px, 60%);
      }
      .filters mat-form-field:last-child {
        width: 190px;
      }
      .table-card {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1050px;
      }
      .next-step {
        min-width: 145px;
      }
      .next-step span {
        display: block;
        color: var(--muted);
        font-size: 12px;
      }
      .next-step a {
        display: inline-block;
        margin-top: 2px;
        font-size: 12px;
      }
      @media (max-width: 650px) {
        .filters {
          flex-direction: column;
        }
        .filters mat-form-field {
          width: 100% !important;
        }
      }
    `,
  ],
})
export class OrdersPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  private request?: Subscription;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly result = signal<PageResponse<OrderSummary> | null>(null);
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly statuses: OrderStatus[] = [
    'DRAFT',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ];
  private pageIndex = 0;
  pageSize = 20;
  nextStep(status: OrderStatus): string {
    if (!this.auth.canOperate()) return 'View details';
    switch (status) {
      case 'DRAFT':
        return 'Review and confirm';
      case 'CONFIRMED':
        return 'Start preparation';
      case 'PREPARING':
        return 'Mark ready';
      case 'READY':
        return 'Assign shipment';
      case 'SHIPPED':
        return 'Track delivery';
      case 'DELIVERED':
        return 'Delivery complete';
      case 'CANCELLED':
        return 'Closed';
    }
  }
  ngOnInit(): void {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
      });
    this.status.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.pageIndex = 0;
      this.load();
    });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  page(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }
  retry(): void {
    this.load();
  }
  clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.status.setValue('', { emitEvent: false });
    this.pageIndex = 0;
    this.load();
  }
  private load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.request = this.api
      .orders({
        search: this.search.value,
        status: this.status.value,
        page: this.pageIndex,
        size: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}
