import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip.component';
import { Inventory, Product, Warehouse } from '../../shared/models/models';

@Component({
  selector: 'app-inventory-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatPaginatorModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Inventory"
      subtitle="Stock is controlled through auditable movements at each warehouse."
    />
    <section class="tabs-card">
      <mat-tab-group animationDuration="0ms">
        <mat-tab label="Stock"
          ><div class="filters">
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Search SKU or product</mat-label
              ><input matInput [formControl]="search" /></mat-form-field
            ><mat-slide-toggle [formControl]="lowStock">Low stock only</mat-slide-toggle>
            <span class="stock-count">{{ total() }} stock positions</span>
          </div>
          @if (loading()) {
            <app-loading-state />
          } @else if (stockError()) {
            <app-feedback-state
              kind="error"
              title="Inventory unavailable"
              message="Stock levels could not be loaded. The current filters have been preserved."
              actionLabel="Retry"
              (action)="loadStock()"
            />
          } @else {
            @if (stock().length) {
              <div class="table-wrap">
                <table class="responsive-table" aria-label="Warehouse stock">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Warehouse</th>
                      <th class="numeric">On hand</th>
                      <th class="numeric">Reserved</th>
                      <th class="numeric">Available</th>
                      <th class="numeric">Reorder</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of stock(); track item.id) {
                      <tr>
                        <td data-label="SKU">
                          <a [routerLink]="['/inventory', item.id]">{{ item.sku }}</a>
                        </td>
                        <td data-label="Product">{{ item.product }}</td>
                        <td data-label="Warehouse">{{ item.warehouse }}</td>
                        <td data-label="On hand" class="numeric">{{ item.onHand }}</td>
                        <td data-label="Reserved" class="numeric">{{ item.reserved }}</td>
                        <td
                          data-label="Available"
                          class="numeric availability"
                          [class.is-low]="item.available <= item.reorderLevel"
                        >
                          <strong>{{ item.available }}</strong>
                          <span class="stock-track" aria-hidden="true"
                            ><span [style.width.%]="stockBar(item)"></span
                          ></span>
                        </td>
                        <td data-label="Reorder" class="numeric">{{ item.reorderLevel }}</td>
                        <td data-label="Status"><app-status-chip [status]="item.stockStatus" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-feedback-state
                title="No stock levels found"
                message="Try a different search or turn off the low-stock filter."
              />
            }
            @if (total()) {
              <mat-paginator
                [length]="total()"
                [pageIndex]="pageIndex"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 20, 50]"
                (page)="page($event)"
                aria-label="Inventory pages"
              />
            }
          }
        </mat-tab>
        <mat-tab label="Products">
          @if (productsLoading()) {
            <app-loading-state />
          } @else if (productsError()) {
            <app-feedback-state
              kind="error"
              title="Products unavailable"
              message="The product catalogue could not be loaded."
              actionLabel="Retry"
              (action)="loadProducts()"
            />
          } @else if (products().length) {
            <div class="table-wrap">
              <table class="responsive-table" aria-label="Products">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th class="numeric">Weight</th>
                    <th class="numeric">Unit price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (product of products(); track product.id) {
                    <tr>
                      <td data-label="SKU">
                        <strong>{{ product.sku }}</strong>
                      </td>
                      <td data-label="Product">{{ product.name }}</td>
                      <td data-label="Category">{{ product.category }}</td>
                      <td data-label="Weight" class="numeric">{{ product.weightKg }} kg</td>
                      <td data-label="Unit price" class="numeric">
                        {{ product.unitPrice | currency: 'EUR' }}
                      </td>
                      <td data-label="Status">
                        <app-status-chip [status]="product.active ? 'AVAILABLE' : 'INACTIVE'" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-feedback-state
              title="No products"
              message="There are no products in the catalogue."
            />
          }
        </mat-tab>
        <mat-tab label="Warehouses">
          @if (warehousesLoading()) {
            <app-loading-state />
          } @else if (warehousesError()) {
            <app-feedback-state
              kind="error"
              title="Warehouses unavailable"
              message="Warehouse reference data could not be loaded."
              actionLabel="Retry"
              (action)="loadWarehouses()"
            />
          } @else if (warehouses().length) {
            <div class="warehouse-grid">
              @for (warehouse of warehouses(); track warehouse.id) {
                <article>
                  <span>{{ warehouse.code }}</span>
                  <h3>{{ warehouse.name }}</h3>
                  <p>
                    {{ warehouse.address }}<br />{{ warehouse.postalCode }} {{ warehouse.city }}
                  </p>
                  <app-status-chip [status]="warehouse.active ? 'AVAILABLE' : 'INACTIVE'" />
                </article>
              }
            </div>
          } @else {
            <app-feedback-state
              title="No warehouses"
              message="There are no warehouses configured."
            />
          }
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [
    `
      .tabs-card {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .filters {
        display: flex;
        gap: 30px;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      .filters mat-form-field {
        width: min(420px, 60%);
      }
      .stock-count {
        margin-left: auto;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 850px;
      }
      .numeric {
        text-align: right;
      }
      .availability strong {
        color: var(--ink);
      }
      .availability.is-low strong {
        color: #a4551d;
      }
      .stock-track {
        display: block;
        width: 72px;
        height: 4px;
        margin: 5px 0 0 auto;
        background: #dce8e6;
      }
      .stock-track span {
        display: block;
        height: 100%;
        background: var(--accent);
      }
      .availability.is-low .stock-track span {
        background: #c9752a;
      }
      .warehouse-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        padding: 20px;
      }
      .warehouse-grid article {
        border: 1px solid #e2e8f0;
        padding: 20px;
      }
      .warehouse-grid span {
        color: #1d4ed8;
        font-size: 10px;
        font-weight: 800;
      }
      .warehouse-grid h3 {
        font-size: 15px;
        margin: 8px 0;
      }
      .warehouse-grid p {
        font-size: 11px;
        line-height: 1.6;
        color: #64748b;
      }
      @media (max-width: 800px) {
        .warehouse-grid {
          grid-template-columns: 1fr;
        }
        .filters {
          align-items: flex-start;
          flex-direction: column;
        }
        .filters mat-form-field {
          width: 100%;
        }
        .stock-count {
          margin-left: 0;
        }
        .stock-track {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class InventoryPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroy$ = new Subject<void>();
  private stockRequest?: Subscription;
  readonly loading = signal(true);
  readonly stockError = signal(false);
  readonly productsLoading = signal(true);
  readonly productsError = signal(false);
  readonly warehousesLoading = signal(true);
  readonly warehousesError = signal(false);
  readonly stock = signal<Inventory[]>([]);
  readonly total = signal(0);
  pageIndex = 0;
  pageSize = 20;
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly lowStock = new FormControl(false, { nonNullable: true });
  stockBar(item: Inventory): number {
    if (item.reorderLevel <= 0) return item.available > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, (item.available / item.reorderLevel) * 100));
  }
  ngOnInit(): void {
    this.loadStock();
    this.loadProducts();
    this.loadWarehouses();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadStock();
      });
    this.lowStock.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.pageIndex = 0;
      this.loadStock();
    });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadStock(): void {
    this.stockRequest?.unsubscribe();
    this.loading.set(true);
    this.stockError.set(false);
    this.stockRequest = this.api
      .inventory({
        search: this.search.value,
        lowStock: this.lowStock.value,
        page: this.pageIndex,
        size: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.total.set(result.totalElements);
          this.stock.set(result.content);
          this.loading.set(false);
        },
        error: () => {
          this.stockError.set(true);
          this.loading.set(false);
        },
      });
  }
  loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set(false);
    this.api.products().subscribe({
      next: (items) => {
        this.products.set(items);
        this.productsLoading.set(false);
      },
      error: () => {
        this.productsError.set(true);
        this.productsLoading.set(false);
      },
    });
  }
  page(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadStock();
  }
  loadWarehouses(): void {
    this.warehousesLoading.set(true);
    this.warehousesError.set(false);
    this.api.warehouses().subscribe({
      next: (items) => {
        this.warehouses.set(items);
        this.warehousesLoading.set(false);
      },
      error: () => {
        this.warehousesError.set(true);
        this.warehousesLoading.set(false);
      },
    });
  }
}
