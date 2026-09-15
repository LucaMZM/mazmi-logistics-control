import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Customer, OrderSummary } from '../../shared/models/models';

@Component({
  selector: 'app-customer-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    FeedbackStateComponent,
    LoadingStateComponent,
    MetricCardComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `@if (loading()) {
      <app-loading-state />
    } @else if (loadError()) {
      <app-feedback-state
        kind="error"
        title="Customer unavailable"
        message="The customer profile and order history could not be loaded."
        actionLabel="Retry"
        (action)="load()"
      />
    } @else if (customer(); as item) {
      <app-page-header
        eyebrow="Customers"
        backLink="/customers"
        [title]="item.companyName"
        [subtitle]="item.code"
        ><app-status-chip [status]="item.active ? 'AVAILABLE' : 'INACTIVE'"
      /></app-page-header>
      <section class="profile">
        <dl>
          <dt>Contact</dt>
          <dd>{{ item.contactName }}</dd>
          <dt>Email</dt>
          <dd>{{ item.email }}</dd>
          <dt>Phone</dt>
          <dd>{{ item.phone }}</dd>
        </dl>
        <dl>
          <dt>Address</dt>
          <dd>
            {{ item.address }}<br />{{ item.postalCode }} {{ item.city }}<br />{{ item.country }}
          </dd>
          <dt>Coordinates</dt>
          <dd>{{ item.latitude }}, {{ item.longitude }}</dd>
        </dl>
      </section>
      <section class="metrics">
        <app-metric-card label="Total orders" [value]="orders().length" /><app-metric-card
          label="Active orders"
          [value]="activeOrders()"
          tone="tracking"
        /><app-metric-card label="Delivered orders" [value]="deliveredOrders()" />
      </section>
      <section class="history">
        <h2>Order history</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/orders', order.id]">{{ order.orderNumber }}</a>
                  </td>
                  <td><app-status-chip [status]="order.status" /></td>
                  <td>{{ order.priority }}</td>
                  <td>{{ order.totalAmount | currency: 'EUR' }}</td>
                  <td>{{ order.createdAt | date: 'mediumDate' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <app-feedback-state
                      title="No order history"
                      message="This customer does not have any orders yet."
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }`,
  styles: [
    `
      .profile {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 35px;
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 23px;
        margin-bottom: 16px;
      }
      .profile dl {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 12px;
        margin: 0;
      }
      .profile dt {
        font-size: 10px;
        color: #64748b;
      }
      .profile dd {
        font-size: 11px;
        margin: 0;
        line-height: 1.6;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 16px;
      }
      .history {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .history h2 {
        font-size: 13px;
        padding: 17px 19px;
        margin: 0;
        border-bottom: 1px solid #e2e8f0;
      }
      table {
        width: 100%;
        min-width: 650px;
        border-collapse: collapse;
      }
      @media (max-width: 700px) {
        .profile {
          grid-template-columns: 1fr;
        }
        .metrics {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CustomerDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly customer = signal<Customer | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  private id = '';
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      customer: this.api.customer(this.id),
      orders: this.api.orders({ customer: this.id, size: 100 }),
    }).subscribe({
      next: ({ customer, orders }) => {
        this.customer.set(customer);
        this.orders.set(orders.content);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
  activeOrders(): number {
    return this.orders().filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status))
      .length;
  }
  deliveredOrders(): number {
    return this.orders().filter((order) => order.status === 'DELIVERED').length;
  }
}
