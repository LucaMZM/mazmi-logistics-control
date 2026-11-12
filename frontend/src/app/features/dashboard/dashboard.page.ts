import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { OperationsMapComponent } from '../../shared/components/operations-map.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { VolumeChartComponent } from '../../shared/components/volume-chart.component';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardStore],
  imports: [
    RouterLink,
    MatButtonModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    OperationsMapComponent,
    PageHeaderComponent,
    VolumeChartComponent,
  ],
  template: `
    <app-page-header
      title="Operations command center"
      subtitle="Exceptions, active routes and stock pressure in one operational view."
    >
      @if (auth.canOperate()) {
        <a mat-flat-button color="primary" routerLink="/orders/new">New order</a>
      }
    </app-page-header>
    @if (loading()) {
      <app-loading-state />
    } @else if (loadError() && !dashboard()) {
      <app-feedback-state
        kind="error"
        title="Dashboard unavailable"
        message="The operational summary could not be loaded. Check the connection and try again."
        actionLabel="Retry"
        (action)="retry()"
      />
    } @else if (dashboard(); as data) {
      @if (loadError()) {
        <div class="refresh-warning" role="status">
          <span>Live summary could not refresh. Showing the last successful update.</span>
          <button mat-button (click)="retry()">Retry</button>
        </div>
      }
      <section class="pulse" aria-label="Operational pulse">
        <a routerLink="/orders"
          ><span>Orders today</span><strong>{{ data.ordersToday }}</strong
          ><small>Open register →</small></a
        >
        <a routerLink="/shipments"
          ><span>Active shipments</span><strong>{{ data.activeShipments }}</strong
          ><small>View routes →</small></a
        >
        <a routerLink="/shipments" [class.attention-metric]="data.delayedShipments > 0"
          ><span>Delayed shipments</span><strong>{{ data.delayedShipments }}</strong
          ><small>Review deliveries →</small></a
        >
        <a routerLink="/incidents" [class.attention-metric]="data.openIncidents > 0"
          ><span>Open incidents</span><strong>{{ data.openIncidents }}</strong
          ><small>Resolve exceptions →</small></a
        >
      </section>
      <section class="primary-grid">
        <article class="section attention-board">
          <header>
            <div>
              <h2>Needs attention</h2>
              <p>Delivery risk and highest-severity open incidents</p>
            </div>
          </header>
          @for (item of riskShipments(); track item.id) {
            <a class="attention-row" [routerLink]="['/shipments', item.id]">
              <span class="signal signal-route">ROUTE</span>
              <span
                ><strong>{{ item.trackingNumber }}</strong
                ><small
                  >{{ item.deliveryHealth.replaceAll('_', ' ') }} · {{ item.progress }}%
                  complete</small
                ></span
              >
              <span aria-hidden="true">→</span>
            </a>
          }
          @for (incident of openIncidents(); track incident.id) {
            <a class="attention-row" [routerLink]="['/incidents', incident.id]">
              <span class="signal signal-incident">ISSUE</span>
              <span
                ><strong>{{ incident.title }}</strong
                ><small>{{ incident.trackingNumber }} · {{ incident.severity }}</small></span
              >
              <span aria-hidden="true">→</span>
            </a>
          }
          @if (data.criticalInventory.length) {
            <a class="stock-alert" routerLink="/inventory">
              <strong>{{ data.criticalInventory.length }} stock positions at reorder level</strong>
              <span>Review availability below</span>
            </a>
          }
          @if (
            !riskShipments().length && !openIncidents().length && !data.criticalInventory.length
          ) {
            @if (data.delayedShipments || data.openIncidents) {
              <div class="attention-clear">
                <strong>More exceptions to review</strong
                ><span>Open the shipment and incident registers for the full list.</span>
              </div>
            } @else {
              <div class="attention-clear">
                <strong>No exceptions need action</strong
                ><span>Routes and stock are within their current thresholds.</span>
              </div>
            }
          }
          <a class="board-footer" routerLink="/shipments">Review all shipments →</a>
        </article>
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
      .refresh-warning {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 16px;
        margin-bottom: 16px;
        background: #fff6e7;
        border: 1px solid #e7ceaa;
        color: #854715;
        font-size: 13px;
      }
      .stock-alert {
        display: grid;
        gap: 3px;
        padding: 13px 18px;
        color: #854715;
        background: #fffaf2;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        font-size: 12px;
      }
      .stock-alert span {
        color: var(--muted);
      }
      .pulse {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #fff;
        overflow: hidden;
        margin-bottom: 18px;
      }
      .pulse a {
        display: grid;
        grid-template-columns: 1fr auto;
        align-content: center;
        gap: 2px 10px;
        min-height: 104px;
        padding: 16px 20px;
        color: var(--ink);
        text-decoration: none;
        border-right: 1px solid var(--line);
        transition: background-color 140ms ease;
      }
      .pulse a:last-child {
        border-right: 0;
      }
      .pulse a:hover,
      .pulse a:focus-visible {
        background: #eef6f5;
      }
      .pulse a.attention-metric {
        background: #fffbf6;
      }
      .pulse a.attention-metric:hover {
        background: #fff2df;
      }
      .pulse span {
        font-size: 13px;
        font-weight: 650;
        color: var(--muted);
      }
      .pulse strong {
        grid-column: 2;
        grid-row: 1 / 3;
        align-self: center;
        font-size: 31px;
        letter-spacing: -0.04em;
        line-height: 1;
      }
      .pulse .attention-metric strong {
        color: #a74f1b;
      }
      .pulse small {
        font-size: 12px;
        color: var(--accent);
        font-weight: 650;
      }
      .primary-grid {
        display: grid;
        grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1.5fr);
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
      .attention-board {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .attention-row {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 11px 18px;
        border-bottom: 1px solid var(--line);
        color: var(--ink);
        text-decoration: none;
        transition: background-color 140ms ease;
      }
      .attention-row:hover,
      .attention-row:focus-visible {
        background: #f3f8f7;
      }
      .attention-row > span:last-child {
        color: var(--accent);
        font-size: 18px;
      }
      .attention-row strong,
      .attention-row small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .attention-row strong {
        font-size: 13px;
        white-space: nowrap;
      }
      .attention-row small {
        margin-top: 3px;
        font-size: 12px;
        color: var(--muted);
      }
      .signal {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .signal-route {
        color: #a34b24;
      }
      .signal-incident {
        color: #b03735;
      }
      .signal-stock {
        color: #956118;
      }
      .attention-clear {
        display: grid;
        gap: 5px;
        padding: 28px 20px;
        font-size: 13px;
      }
      .attention-clear span {
        color: var(--muted);
      }
      .board-footer {
        margin-top: auto;
        padding: 15px 18px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
      }
      .board-footer:hover {
        text-decoration: underline;
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
        height: 420px;
        flex: 1;
        min-height: 420px;
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
        .pulse {
          grid-template-columns: repeat(2, 1fr);
        }
        .pulse a:nth-child(2) {
          border-right: 0;
        }
        .pulse a:nth-child(-n + 2) {
          border-bottom: 1px solid var(--line);
        }
        .primary-grid,
        .secondary-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .pulse a {
          padding: 13px;
          min-height: 86px;
        }
        .pulse strong {
          font-size: 25px;
        }
        .map-wrap {
          height: 360px;
          min-height: 360px;
        }
      }
    `,
  ],
})
export class DashboardPage {
  readonly auth = inject(AuthService);
  private readonly store = inject(DashboardStore);
  readonly loading = this.store.loading;
  readonly loadError = this.store.loadError;
  readonly dashboard = this.store.dashboard;
  readonly mapPoints = this.store.mapPoints;
  readonly riskShipments = this.store.riskShipments;
  readonly openIncidents = this.store.openIncidents;
  retry(): void {
    this.store.refresh();
  }
}
