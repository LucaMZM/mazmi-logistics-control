import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/websocket/realtime.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import {
  OperationMapPoint,
  OperationsMapComponent,
} from '../../shared/components/operations-map.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { VolumeChartComponent } from '../../shared/components/volume-chart.component';
import { Dashboard } from '../../shared/models/models';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    MetricCardComponent,
    OperationsMapComponent,
    PageHeaderComponent,
    StatusChipComponent,
    VolumeChartComponent,
  ],
  template: `
    <app-page-header
      title="Operations overview"
      subtitle="Your network at a glance. Monitor workload, stock pressure and delivery exceptions."
    >
      @if (auth.canOperate()) {
        <a mat-flat-button color="primary" routerLink="/orders/new">New order</a>
      }
    </app-page-header>
    @if (loading()) {
      <app-loading-state />
    } @else if (loadError()) {
      <app-feedback-state
        kind="error"
        title="Dashboard unavailable"
        message="The operational summary could not be loaded. Check the connection and try again."
        actionLabel="Retry"
        (action)="retry()"
      />
    } @else if (dashboard(); as data) {
      <section class="metrics">
        <app-metric-card
          label="Orders today"
          [value]="data.ordersToday"
          detail="Created across all warehouses"
        />
        <app-metric-card
          label="Active shipments"
          [value]="data.activeShipments"
          tone="tracking"
          detail="In the delivery workflow"
        />
        <app-metric-card
          label="Delayed shipments"
          [value]="data.delayedShipments"
          tone="warning"
          detail="Deliveries requiring attention"
        />
        <app-metric-card
          label="Open incidents"
          [value]="data.openIncidents"
          tone="danger"
          detail="Awaiting resolution"
        />
      </section>
      <section class="primary-grid">
        <article class="section map-card">
          <header>
            <div>
              <h2>Network activity</h2>
              <p>{{ data.activeShipmentMapItems.length }} active locations · Simulated tracking</p>
            </div>
            <span class="live-dot">SIMULATED</span>
          </header>
          <div class="map-wrap">
            <app-operations-map [points]="mapPoints()" />
            @if (!mapPoints().length) {
              <div class="map-empty">No active shipments to display.</div>
            }
          </div>
        </article>
        <article class="section incidents">
          <header>
            <div>
              <h2>Recent incidents</h2>
              <p>Latest operational exceptions</p>
            </div>
            <a routerLink="/incidents">View all</a>
          </header>
          @for (incident of data.recentIncidents; track incident.id) {
            <a class="incident" [routerLink]="['/incidents', incident.id]"
              ><span class="severity" [attr.data-level]="incident.severity"></span>
              <div>
                <strong>{{ incident.title }}</strong
                ><small
                  >{{ incident.trackingNumber }} · {{ incident.openedAt | date: 'short' }}</small
                >
              </div>
              <app-status-chip [status]="incident.status"
            /></a>
          } @empty {
            <p class="empty">No recent incidents.</p>
          }
        </article>
      </section>
      <section class="secondary-grid">
        <article class="section">
          <header>
            <div>
              <h2>Orders — last 7 days</h2>
              <p>Daily order volume across all warehouses</p>
            </div>
          </header>
          <app-volume-chart [data]="data.orderVolumeLast7Days" />
        </article>
        <article class="section">
          <header>
            <div>
              <h2>Critical inventory</h2>
              <p>Available stock at or below reorder level</p>
            </div>
            <a routerLink="/inventory">Open inventory</a>
          </header>
          @if (data.criticalInventory.length) {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th class="numeric">Available</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of data.criticalInventory; track item.inventoryId) {
                    <tr>
                      <td>
                        <a [routerLink]="['/inventory', item.inventoryId]">{{ item.sku }}</a>
                      </td>
                      <td>{{ item.product }}</td>
                      <td>{{ item.warehouse }}</td>
                      <td class="numeric low">{{ item.available }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-feedback-state
              title="Inventory is within target"
              message="No stock level is currently at or below its reorder threshold."
            />
          }
        </article>
      </section>
    }
  `,
  styles: [
    `
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 18px;
      }
      .primary-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
        gap: 18px;
        margin-bottom: 18px;
      }
      .secondary-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
        gap: 18px;
        align-items: start;
      }
      .map-card {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .section {
        background: #fff;
        border: 1px solid #e2e8f0;
        min-width: 0;
      }
      .section > header {
        height: 68px;
        padding: 0 19px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #e2e8f0;
      }
      .section h2 {
        font-size: 14px;
        margin: 0;
      }
      .section header p {
        font-size: 11px;
        color: #64748b;
        margin: 4px 0 0;
      }
      .section header a {
        font-size: 11px;
        color: #1d4ed8;
        text-decoration: none;
        font-weight: 700;
      }
      .map-wrap {
        position: relative;
        height: 380px;
        flex: 1;
        min-height: 380px;
      }
      .map-wrap app-operations-map {
        display: block;
        height: 100%;
      }
      .map-empty {
        position: absolute;
        z-index: 500;
        inset: auto 16px 16px;
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
        background: rgb(255 255 255 / 94%);
        color: #475569;
        font-size: 11px;
        text-align: center;
      }
      .live-dot {
        font-size: 9px;
        color: #0e7490;
        border: 1px solid #a5f3fc;
        background: #ecfeff;
        padding: 4px 7px;
        letter-spacing: 0.1em;
      }
      .incident {
        display: grid;
        grid-template-columns: 5px 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 15px 17px;
        border-bottom: 1px solid #eef2f7;
        text-decoration: none;
        color: #0f172a;
      }
      .incident:hover {
        background: #f8fafc;
      }
      .severity {
        height: 32px;
        background: #d97706;
      }
      .severity[data-level='CRITICAL'] {
        background: #dc2626;
      }
      .severity[data-level='LOW'] {
        background: #16a34a;
      }
      .incident strong,
      .incident small {
        display: block;
      }
      .incident strong {
        font-size: 13px;
        line-height: 1.4;
      }
      .incident small {
        font-size: 11px;
        color: #64748b;
        margin-top: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      .numeric {
        text-align: right;
      }
      .low {
        color: #b45309;
        font-weight: 800;
      }
      .empty {
        padding: 24px;
        color: #64748b;
        font-size: 12px;
      }
      @media (max-width: 1150px) {
        .metrics {
          grid-template-columns: repeat(2, 1fr);
        }
        .primary-grid,
        .secondary-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .metrics {
          grid-template-columns: 1fr 1fr;
        }
        .map-wrap {
          height: 360px;
        }
      }
    `,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroy$ = new Subject<void>();
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly mapPoints = signal<OperationMapPoint[]>([]);
  ngOnInit(): void {
    this.load();
    this.realtime
      .watchDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load(false));
    this.realtime
      .watchConnected()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load(false));
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  retry(): void {
    this.load();
  }
  private load(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
      this.loadError.set(false);
    }
    this.api.dashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.mapPoints.set(
          data.activeShipmentMapItems.map((item) => ({
            id: item.id,
            latitude: item.latitude,
            longitude: item.longitude,
            label: `${item.trackingNumber} · ${item.progress}%`,
            kind: 'vehicle',
            health: item.deliveryHealth,
          })),
        );
        this.loadError.set(false);
        this.loading.set(false);
      },
      error: () => {
        if (!this.dashboard()) this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
