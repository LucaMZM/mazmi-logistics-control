import { computed } from '@angular/core';
import { loadingLane } from '../warehouse-spatial/loading-lane';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {
  validLayout,
  type WarehouseVisualLayout,
} from '../warehouse-editor/warehouse-layout.model';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DecimalPipe } from '@angular/common';
import { WarehouseTwinStore } from './warehouse-twin.store';
import { WAREHOUSE_ZONES, WarehouseZone, SequenceSnapshot } from './warehouse-model';
import { WAREHOUSE_SCENE_LOADER, WarehouseScenePort } from './warehouse-scene-loader';

@Component({
  selector: 'app-warehouse-twin-page',
  imports: [RouterLink, DecimalPipe],
  providers: [WarehouseTwinStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="warehouse-header">
      <div>
        <p>MAZMI Digital Twin</p>
        <h1>Warehouse Twin</h1>
        <p>Real warehouse records. An illustrative logistics environment.</p>
      </div>
      <button
        class="primary"
        (click)="openScene()"
        [disabled]="!store.warehouse() || sceneLoading()"
      >
        Open 3D warehouse
      </button>
    </header>
    <div class="warehouse-selector">
      <label
        >Warehouse
        <select
          aria-label="Warehouse"
          [value]="store.warehouseId()"
          (change)="chooseWarehouse($event)"
        >
          @for (w of store.warehouses(); track w.id) {
            <option [value]="w.id">{{ w.code }} · {{ w.name }}</option>
          }
        </select>
      </label>
      <button (click)="refresh()" [disabled]="store.recordsLoading() || store.loading()">
        Refresh records
      </button>
      <a routerLink="/inventory">Open inventory</a>
      @if (auth.canOperate()) {
        <a routerLink="/warehouse-editor" [queryParams]="{ warehouse: store.warehouseId() }"
          >Edit 3D layout</a
        >
      }
    </div>
    @if (store.recordsLoading()) {
      <p role="status">Loading warehouses…</p>
    }
    @if (store.error()) {
      <p class="notice" role="alert">{{ store.error() }}</p>
    }
    @if (!store.recordsLoading() && !store.error() && !store.warehouses().length) {
      <p>No warehouses registered.</p>
    }
    @if (store.warehouse(); as w) {
      <div class="warehouse-metrics" aria-label="Verified warehouse inventory">
        <div>
          <span>Warehouse</span><strong>{{ w.code }}</strong>
        </div>
        @if (store.loading()) {
          <p role="status">Loading inventory and orders…</p>
        } @else if (store.inventoryError()) {
          <p role="alert">{{ store.inventoryError() }}</p>
        } @else {
          <div>
            <span>Available units</span><strong>{{ store.metrics().available | number }}</strong>
          </div>
          <div>
            <span>Reserved units</span><strong>{{ store.metrics().reserved | number }}</strong>
          </div>
          <div>
            <span>Products</span><strong>{{ store.metrics().products }}</strong>
          </div>
          <div>
            <span>Critical positions</span><strong>{{ store.metrics().critical }}</strong>
          </div>
        }
      </div>
      @if (store.partialInventory()) {
        <p class="notice">
          Loaded {{ store.inventory().length }} of {{ store.inventoryTotal() }} inventory positions.
          Metrics cover the loaded positions only.
        </p>
      }
    }
    <div class="warehouse-layout">
      <section class="warehouse-world" aria-label="Interactive warehouse illustration">
        <div #host class="warehouse-scene"></div>
        <div class="warehouse-caption">
          <strong>{{ store.warehouse()?.name ?? 'Warehouse environment' }}</strong
          ><span
            >{{
              blueprint()
                ? 'Saved blueprint · Revision ' + blueprint()!.revision
                : 'Illustrative layout'
            }}
            · No recorded shelf or pallet locations</span
          >
        </div>
        @if (sceneLoading()) {
          <p class="scene-notice" role="status">Preparing the warehouse…</p>
        }
        @if (sceneError()) {
          <div class="scene-notice" role="alert">
            <p>{{ sceneError() }}</p>
            <button (click)="openScene()">Retry 3D warehouse</button>
          </div>
        }
        @if (!ready() && !sceneLoading() && !sceneError()) {
          <div class="scene-notice">
            <strong>Explore the warehouse</strong>
            <p>
              Choose a warehouse and open its 3D illustration. Verified inventory remains available
              below without WebGL.
            </p>
          </div>
        }
        <div class="warehouse-controls" aria-label="Warehouse camera controls">
          <button (click)="overview()" [disabled]="!ready()">Overview</button>
          <button (click)="scene?.rotate()" [disabled]="!ready()">Rotate</button>
          <button (click)="scene?.zoom(1)" [disabled]="!ready()" aria-label="Zoom in">+</button>
          <button (click)="scene?.zoom(-1)" [disabled]="!ready()" aria-label="Zoom out">−</button>
          <button (click)="toggleRoof()" [disabled]="!ready()" [attr.aria-pressed]="roofVisible()">
            {{ roofVisible() ? 'Hide roof' : 'Show roof' }}
          </button>
        </div>
      </section>
      <aside class="warehouse-panel">
        <h2>Explore the space</h2>
        <p>Illustrative zones</p>
        <div class="warehouse-zones" aria-label="Select a warehouse zone">
          @for (zone of zones; track zone.id) {
            <button
              [attr.aria-pressed]="selectedZone() === zone.id"
              (click)="focus(zone.id, $event)"
              [disabled]="!ready() || !hasZone(zone.id)"
            >
              {{ zone.name }}
            </button>
          }
        </div>
        @for (zone of zones; track zone.id) {
          @if (selectedZone() === zone.id) {
            <p class="zone-description">{{ zone.description }}</p>
          }
        }
        <div class="sequence-panel">
          <h2>Preparation sequence</h2>
          <p>Visual demonstration only. No stock or order changes.</p>
          @if (store.ordersError()) {
            <p role="alert">{{ store.ordersError() }}</p>
          }
          <label
            >Compatible order
            <select
              aria-label="Compatible order"
              [value]="store.order()?.id ?? ''"
              (change)="chooseOrder($event)"
              [disabled]="store.loading()"
            >
              <option value="">Select a real order</option>
              @for (order of store.orders(); track order.id) {
                <option [value]="order.id">{{ order.orderNumber }} · {{ order.status }}</option>
              }
            </select>
          </label>
          @if (!store.loading() && !store.ordersError() && !store.orders().length) {
            <p>No confirmed or preparing orders for this warehouse.</p>
          }
          @if (store.orderLoading()) {
            <p role="status">Verifying order…</p>
          }
          @if (store.orderError()) {
            <p role="alert">{{ store.orderError() }}</p>
          }
          @if (store.order(); as order) {
            <p>
              <strong>{{ order.orderNumber }}</strong> · {{ order.items.length }} product lines
            </p>
            <a [routerLink]="['/orders', order.id]">Open order record</a>
          }
          <div class="sequence-state" role="status">
            <strong>{{ sequence().phase }}</strong
            ><span>{{ sequence().progress | number: '1.0-0' }}%</span>
          </div>
          <progress
            max="100"
            [value]="sequence().progress"
            aria-label="Visual preparation progress"
          ></progress>
          <div class="sequence-actions">
            <button
              class="primary"
              (click)="toggleSequence()"
              [disabled]="!ready() || !store.order() || reduced() || blockedLane()"
            >
              {{ sequence().running ? 'Pause sequence' : 'Play sequence' }}
            </button>
            <button (click)="scene?.reset()" [disabled]="!ready()">Reset sequence</button>
          </div>
          @if (blockedLane()) {
            <p>
              Static blueprint: no clear loading lane between staging and an outward-facing dock.
              The default animation is not used here.
            </p>
          }
          @if (reduced()) {
            <p>Reduced motion enabled. Explore static zones with the camera controls.</p>
          }
          <p class="warehouse-disclosure">
            The van is illustrative and unassigned. Shelf contents and the carried pallet do not
            represent recorded product locations.
          </p>
        </div>
      </aside>
    </div>
    <section class="warehouse-inventory" aria-label="Warehouse inventory records">
      <header>
        <div>
          <h2>Verified inventory</h2>
          <p>
            Warehouse-level records, not a shelf map. Up to 40 recent compatible orders are offered
            for the demonstration.
          </p>
        </div>
        <span>{{ store.inventory().length }} positions loaded</span>
      </header>
      @if (!store.loading() && !store.inventoryError() && !store.inventory().length) {
        <p>No inventory positions in this warehouse.</p>
      }
      <div class="inventory-scroll">
        <table>
          <caption class="sr-only">
            Stock associated with the selected warehouse
          </caption>
          <thead>
            <tr>
              <th>Product</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            @for (row of store.inventory(); track row.id) {
              <tr>
                <td>
                  <a [routerLink]="['/inventory', row.id]">{{ row.sku }}</a
                  ><span>{{ row.product }}</span>
                </td>
                <td>{{ row.onHand }}</td>
                <td>{{ row.reserved }}</td>
                <td>{{ row.available }}</td>
                <td>{{ row.available <= row.reorderLevel ? 'Critical' : 'Available' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styleUrl: './warehouse-twin.page.scss',
})
export class WarehouseTwinPage implements AfterViewInit, OnDestroy {
  readonly store = inject(WarehouseTwinStore);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  readonly blueprint = signal<WarehouseVisualLayout | null>(null);
  readonly blockedLane = computed(() => {
    const plan = this.blueprint();
    return !!plan && !loadingLane(plan.items);
  });
  readonly auth = inject(AuthService);
  private readonly loadScene = inject(WAREHOUSE_SCENE_LOADER);
  private readonly zone = inject(NgZone);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  readonly zones = WAREHOUSE_ZONES;
  readonly selectedZone = signal<WarehouseZone | null>(null);
  readonly ready = signal(false);
  readonly sceneLoading = signal(false);
  readonly sceneError = signal('');
  readonly roofVisible = signal(false);
  readonly sequence = signal<SequenceSnapshot>({
    elapsed: 0,
    progress: 0,
    phase: 'Preparing',
    running: false,
  });
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  readonly reduced = signal(this.media.matches);
  scene?: WarehouseScenePort;
  private revision = 0;
  private destroyed = false;
  private readonly motionChanged = () => this.reduced.set(this.media.matches);
  ngAfterViewInit() {
    this.store.load(this.route.snapshot.queryParamMap.get('warehouse') ?? undefined);
    this.media.addEventListener('change', this.motionChanged);
  }
  private closeScene() {
    ++this.revision;
    this.blueprint.set(null);
    this.scene?.dispose();
    this.scene = undefined;
    this.ready.set(false);
    this.sceneLoading.set(false);
    this.sceneError.set('');
    this.selectedZone.set(null);
    this.roofVisible.set(false);
    this.sequence.set({ elapsed: 0, progress: 0, phase: 'Preparing', running: false });
  }
  chooseWarehouse(event: Event) {
    if (event.target instanceof HTMLSelectElement) {
      this.closeScene();
      this.store.selectWarehouse(event.target.value);
    }
  }
  chooseOrder(event: Event) {
    if (event.target instanceof HTMLSelectElement) {
      this.scene?.reset();
      this.store.selectOrder(event.target.value);
    }
  }
  refresh() {
    this.closeScene();
    this.store.load();
  }
  async openScene() {
    if (!this.store.warehouse() || this.sceneLoading()) return;
    this.closeScene();
    const revision = this.revision;
    this.sceneLoading.set(true);
    try {
      const warehouseId = this.store.warehouseId();
      const [Constructor, layout] = await Promise.all([
        this.loadScene(),
        firstValueFrom(this.api.warehouseVisualLayout(warehouseId)),
      ]);
      if (layout.warehouseId !== warehouseId || !validLayout(layout.items))
        throw new Error('Invalid blueprint');
      if (this.destroyed || revision !== this.revision) return;
      this.blueprint.set(layout.saved ? layout : null);
      this.zone.runOutsideAngular(() => {
        this.scene = new Constructor(
          this.host.nativeElement,
          {
            select: (id) =>
              this.zone.run(() => {
                this.selectedZone.set(id);
                this.roofVisible.set(false);
              }),
            sequence: (state) => this.zone.run(() => this.sequence.set(state)),
            lost: () =>
              this.zone.run(() => {
                this.ready.set(false);
                this.sequence.update((s) => ({ ...s, running: false }));
                this.sceneError.set(
                  '3D context lost. Warehouse records remain available. Retry to rebuild the illustration.',
                );
              }),
          },
          layout.saved ? layout.items : undefined,
        );
        this.scene.init();
      });
      this.ready.set(true);
    } catch {
      if (revision === this.revision) {
        this.scene?.dispose();
        this.scene = undefined;
        this.sceneError.set(
          'Blueprint or 3D unavailable. Check your connection and WebGL, then retry. Inventory records remain available.',
        );
      }
    } finally {
      if (revision === this.revision) this.sceneLoading.set(false);
    }
  }
  focus(zone: WarehouseZone, event: MouseEvent) {
    this.selectedZone.set(zone);
    this.roofVisible.set(false);
    this.scene?.focus(zone, event.detail === 0);
  }
  hasZone(id: WarehouseZone) {
    const kind = { racks: 'RACK', dispatch: 'DOCK', picking: 'PICKING', receiving: 'STAGING' }[id];
    return this.blueprint()?.items.some((o) => o.kind === kind) ?? true;
  }
  overview() {
    this.selectedZone.set(null);
    this.scene?.overview();
  }
  toggleRoof() {
    this.roofVisible.set(!this.roofVisible());
    this.scene?.roof(this.roofVisible());
  }
  toggleSequence() {
    if (this.blockedLane() || !this.store.order()) return;
    if (this.sequence().running) this.scene?.pause();
    else this.scene?.play();
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.closeScene();
    this.media.removeEventListener('change', this.motionChanged);
  }
}
