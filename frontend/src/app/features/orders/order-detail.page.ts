import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { OrderDetail, OrderStatus } from '../../shared/models/models';

@Component({
  selector: 'app-order-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    @if (loading()) {
      <app-loading-state />
    } @else if (loadError()) {
      <app-feedback-state
        kind="error"
        title="Order unavailable"
        message="This order could not be loaded. It may have changed or the connection may be unavailable."
        actionLabel="Retry"
        (action)="load()"
      />
    } @else if (order(); as item) {
      <app-page-header
        eyebrow="Order"
        [title]="item.orderNumber"
        [subtitle]="item.customer + ' · ' + item.warehouse"
      >
        <app-status-chip [status]="item.status" /><app-status-chip [status]="item.priority" />
        @if (auth.canOperate()) {
          @if (item.status === 'DRAFT') {
            <button mat-flat-button color="primary" (click)="action('confirm')">
              Confirm order
            </button>
          }
          @if (item.status === 'CONFIRMED') {
            <button mat-flat-button color="primary" (click)="action('start-preparation')">
              Start preparation
            </button>
          }
          @if (item.status === 'PREPARING') {
            <button mat-flat-button color="primary" (click)="action('mark-ready')">
              Mark as ready
            </button>
          }
          @if (canCancel(item.status)) {
            <button mat-stroked-button color="warn" (click)="cancel()">Cancel</button>
          }
        }
        @if (item.shipmentId) {
          <a mat-stroked-button [routerLink]="['/shipments', item.shipmentId]">View shipment</a>
        }
      </app-page-header>
      <section class="summary-grid">
        <article class="section overview">
          <h2>Order summary</h2>
          <div class="details">
            <dl>
              <dt>Customer</dt>
              <dd>{{ item.customer }}</dd>
              <dt>Warehouse</dt>
              <dd>{{ item.warehouse }}</dd>
              <dt>Created by</dt>
              <dd>{{ item.createdBy }}</dd>
              <dt>Created</dt>
              <dd>{{ item.createdAt | date: 'medium' }}</dd>
            </dl>
            <dl>
              <dt>Shipping destination</dt>
              <dd>{{ item.shippingName }}</dd>
              <dt>Address</dt>
              <dd>
                {{ item.shippingAddress }}<br />{{ item.shippingPostalCode }}
                {{ item.shippingCity }}, {{ item.shippingCountry }}
              </dd>
              <dt>Total</dt>
              <dd class="total">{{ item.totalAmount | currency: 'EUR' }}</dd>
            </dl>
          </div>
        </article>
        <article class="section progress">
          <h2>Workflow progression</h2>
          <ol>
            @for (state of flow; track state; let index = $index) {
              <li
                [class.complete]="reached(item.status, state)"
                [class.current]="item.status === state"
              >
                <i>{{ index + 1 }}</i
                ><span>{{ state.replaceAll('_', ' ') }}</span>
              </li>
            }
          </ol>
        </article>
      </section>
      <section class="section items">
        <h2>Order items</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th class="numeric">Quantity</th>
                <th class="numeric">Unit price</th>
                <th class="numeric">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              @for (line of item.items; track line.productId) {
                <tr>
                  <td>{{ line.sku }}</td>
                  <td>{{ line.product }}</td>
                  <td class="numeric">{{ line.quantity }}</td>
                  <td class="numeric">{{ line.unitPrice | currency: 'EUR' }}</td>
                  <td class="numeric">
                    <strong>{{ line.subtotal | currency: 'EUR' }}</strong>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <app-feedback-state
                      title="No order items"
                      message="This draft does not contain any products yet."
                    />
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">Order total</td>
                <td class="numeric">{{ item.totalAmount | currency: 'EUR' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .summary-grid {
        display: grid;
        grid-template-columns: 1.7fr 1fr;
        gap: 18px;
        margin-bottom: 18px;
      }
      .section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .section h2 {
        font-size: 13px;
        margin: 0;
        padding: 17px 19px;
        border-bottom: 1px solid #e2e8f0;
      }
      .details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        padding: 22px;
      }
      dl {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 13px;
        margin: 0;
      }
      dt {
        color: #64748b;
        font-size: 11px;
      }
      dd {
        font-size: 12px;
        margin: 0;
        line-height: 1.5;
      }
      .total {
        font-size: 20px;
        font-weight: 800;
      }
      .progress ol {
        list-style: none;
        margin: 0;
        padding: 20px;
      }
      .progress li {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
        position: relative;
        padding-bottom: 18px;
      }
      .progress li:not(:last-child):after {
        content: '';
        position: absolute;
        left: 11px;
        top: 24px;
        height: 18px;
        border-left: 1px solid #cbd5e1;
      }
      .progress i {
        width: 23px;
        height: 23px;
        border: 1px solid #cbd5e1;
        display: grid;
        place-items: center;
        font-style: normal;
        font-size: 9px;
      }
      .progress .complete {
        color: #15803d;
      }
      .progress .complete i {
        background: #16a34a;
        color: #fff;
        border-color: #16a34a;
      }
      .progress .current {
        color: #1d4ed8;
      }
      .progress .current i {
        border-color: #1d4ed8;
        background: #eff6ff;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        min-width: 650px;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 13px 17px;
        text-align: left;
        border-bottom: 1px solid #eef2f7;
        font-size: 12px;
      }
      th {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        background: #f8fafc;
        color: #64748b;
      }
      .numeric {
        text-align: right;
      }
      tfoot td {
        font-size: 14px;
        font-weight: 800;
        background: #f8fafc;
      }
      @media (max-width: 900px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
        .details {
          grid-template-columns: 1fr;
        }
        dl {
          grid-template-columns: 110px 1fr;
        }
      }
    `,
  ],
})
export class OrderDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly order = signal<OrderDetail | null>(null);
  readonly flow: OrderStatus[] = [
    'DRAFT',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SHIPPED',
    'DELIVERED',
  ];
  private id = '';
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }
  action(action: string): void {
    this.api.orderAction(this.id, action).subscribe((order) => {
      this.order.set(order);
      this.snackBar.open('Order workflow updated.', 'Dismiss', { duration: 2500 });
    });
  }
  cancel(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Cancel order',
          message:
            'Reserved stock will be released and any shipment waiting to depart will be cancelled.',
          confirmLabel: 'Cancel order',
          danger: true,
        },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.orderAction(this.id, 'cancel')),
      )
      .subscribe((order) => {
        this.order.set(order);
        this.snackBar.open('Order cancelled and reservations released.', 'Dismiss', {
          duration: 3000,
        });
      });
  }
  canCancel(status: OrderStatus): boolean {
    return !['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status);
  }
  reached(current: OrderStatus, state: OrderStatus): boolean {
    if (current === 'CANCELLED') return false;
    return this.flow.indexOf(current) >= this.flow.indexOf(state);
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.order(this.id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
