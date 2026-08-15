import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FeedbackStateComponent } from '../../shared/components/feedback-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { Customer, Product, Warehouse } from '../../shared/models/models';

type ItemForm = FormGroup<{ productId: FormControl<string>; quantity: FormControl<number> }>;

@Component({
  selector: 'app-order-form-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FeedbackStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      eyebrow="Orders"
      title="New order"
      subtitle="Create a draft using server-owned product prices and customer address snapshots."
      ><a mat-button routerLink="/orders">Cancel</a></app-page-header
    >
    @if (referenceLoading()) {
      <app-loading-state />
    } @else if (referenceError()) {
      <app-feedback-state
        kind="error"
        title="Order setup unavailable"
        message="Customers, warehouses or products could not be loaded."
        actionLabel="Retry"
        (action)="loadReferences()"
      />
    } @else if (referenceIssue()) {
      <app-feedback-state title="Order setup unavailable" [message]="referenceIssue()" />
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()">
        <section class="section">
          <h2>Order setup</h2>
          <div class="form-grid">
            <mat-form-field appearance="outline"
              ><mat-label>Customer</mat-label
              ><mat-select formControlName="customerId">
                @for (customer of customers(); track customer.id) {
                  <mat-option [value]="customer.id"
                    >{{ customer.code }} · {{ customer.companyName }}</mat-option
                  >
                }
              </mat-select></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Warehouse</mat-label
              ><mat-select formControlName="warehouseId">
                @for (warehouse of warehouses(); track warehouse.id) {
                  <mat-option [value]="warehouse.id"
                    >{{ warehouse.code }} · {{ warehouse.name }}</mat-option
                  >
                }
              </mat-select></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Priority</mat-label
              ><mat-select formControlName="priority"
                ><mat-option value="LOW">Low</mat-option
                ><mat-option value="NORMAL">Normal</mat-option
                ><mat-option value="HIGH">High</mat-option
                ><mat-option value="URGENT">Urgent</mat-option></mat-select
              ></mat-form-field
            >
          </div>
        </section>
        <section class="section">
          <h2>Shipping destination <span>Stored as an order snapshot</span></h2>
          <div class="form-grid address">
            <mat-form-field appearance="outline"
              ><mat-label>Recipient / company</mat-label
              ><input matInput formControlName="shippingName" /></mat-form-field
            ><mat-form-field appearance="outline" class="wide"
              ><mat-label>Address</mat-label
              ><input matInput formControlName="shippingAddress" /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>City</mat-label
              ><input matInput formControlName="shippingCity" /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Postal code</mat-label
              ><input matInput formControlName="shippingPostalCode" /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Country</mat-label
              ><input matInput formControlName="shippingCountry" /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Latitude</mat-label
              ><input matInput type="number" formControlName="shippingLatitude" /></mat-form-field
            ><mat-form-field appearance="outline"
              ><mat-label>Longitude</mat-label
              ><input matInput type="number" formControlName="shippingLongitude"
            /></mat-form-field>
          </div>
        </section>
        <section class="section">
          <header>
            <div>
              <h2>Items</h2>
              <p>Prices are loaded from the product catalogue and recalculated by the backend.</p>
            </div>
            <button mat-stroked-button type="button" (click)="addItem()">Add product</button>
          </header>
          <div formArrayName="items" class="items">
            @for (group of items.controls; track group; let i = $index) {
              <div class="item" [formGroupName]="i">
                <mat-form-field appearance="outline"
                  ><mat-label>Product</mat-label
                  ><mat-select formControlName="productId">
                    @for (product of products(); track product.id) {
                      <mat-option [value]="product.id"
                        >{{ product.sku }} · {{ product.name }}</mat-option
                      >
                    }
                  </mat-select></mat-form-field
                ><mat-form-field appearance="outline"
                  ><mat-label>Quantity</mat-label
                  ><input matInput type="number" min="1" formControlName="quantity"
                /></mat-form-field>
                <div class="price">
                  <span>Catalogue price</span
                  ><strong>{{
                    productPrice(group.controls.productId.value) | currency: 'EUR'
                  }}</strong>
                </div>
                <button
                  mat-button
                  color="warn"
                  type="button"
                  [disabled]="items.length === 1"
                  (click)="removeItem(i)"
                >
                  Remove
                </button>
              </div>
            }
          </div>
        </section>
        <footer>
          <div>
            <span>Estimated total</span><strong>{{ estimatedTotal() | currency: 'EUR' }}</strong
            ><small>Final amount is calculated on the server.</small>
          </div>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
          >
            {{ submitting() ? 'Creating draft…' : 'Create draft order' }}
          </button>
        </footer>
      </form>
    }
  `,
  styles: [
    `
      form {
        display: grid;
        gap: 17px;
      }
      .section {
        background: #fff;
        border: 1px solid #e2e8f0;
      }
      .section > h2,
      .section > header {
        margin: 0;
        padding: 17px 20px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
      }
      .section > h2 span {
        font-weight: 400;
        color: #64748b;
        font-size: 10px;
        margin-left: 8px;
      }
      .section > header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .section header h2 {
        margin: 0;
        font-size: 13px;
      }
      .section header p {
        font-size: 10px;
        color: #64748b;
        margin: 4px 0 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 220px;
        gap: 14px;
        padding: 20px 20px 0;
      }
      .address {
        grid-template-columns: repeat(3, 1fr);
      }
      .wide {
        grid-column: span 2;
      }
      .items {
        padding: 0 20px;
      }
      .item {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) 130px 140px 80px;
        gap: 14px;
        align-items: center;
        padding-top: 18px;
        border-bottom: 1px solid #eef2f7;
      }
      .item:last-child {
        border-bottom: 0;
      }
      .price {
        padding-bottom: 18px;
      }
      .price span,
      .price strong {
        display: block;
      }
      .price span {
        font-size: 10px;
        color: #64748b;
      }
      .price strong {
        font-size: 13px;
        margin-top: 5px;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 35px;
        padding: 20px;
        background: #0f172a;
        color: #fff;
      }
      footer div {
        text-align: right;
      }
      footer span,
      footer strong,
      footer small {
        display: block;
      }
      footer span,
      footer small {
        font-size: 10px;
        color: #94a3b8;
      }
      footer strong {
        font-size: 22px;
        margin: 4px 0;
      }
      footer button {
        min-width: 190px;
        height: 44px;
      }
      @media (max-width: 900px) {
        .form-grid,
        .address {
          grid-template-columns: 1fr 1fr;
        }
        .item {
          grid-template-columns: 1fr 110px;
        }
        .price {
          padding-bottom: 15px;
        }
        .wide {
          grid-column: auto;
        }
      }
      @media (max-width: 600px) {
        .form-grid,
        .address {
          grid-template-columns: 1fr;
        }
        .item {
          grid-template-columns: 1fr;
        }
        .wide {
          grid-column: auto;
        }
        footer {
          align-items: stretch;
          flex-direction: column;
        }
        footer div {
          text-align: left;
        }
      }
    `,
  ],
})
export class OrderFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  readonly customers = signal<Customer[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly products = signal<Product[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal(false);
  readonly referenceIssue = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.group({
    customerId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    priority: ['NORMAL', Validators.required],
    shippingName: ['', Validators.required],
    shippingAddress: ['', Validators.required],
    shippingCity: ['', Validators.required],
    shippingPostalCode: ['', Validators.required],
    shippingCountry: ['Spain', Validators.required],
    shippingLatitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    shippingLongitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    items: this.fb.array<ItemForm>([]),
  });
  get items(): FormArray<ItemForm> {
    return this.form.controls.items;
  }
  ngOnInit(): void {
    this.addItem();
    this.loadReferences();
    this.form.controls.customerId.valueChanges.subscribe((id) => this.prefillAddress(id));
  }
  loadReferences(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(false);
    this.referenceIssue.set('');
    forkJoin({
      customers: this.api.customers(),
      warehouses: this.api.warehouses(),
      products: this.api.products(),
    }).subscribe({
      next: ({ customers, warehouses, products }) => {
        const activeCustomers = customers.content.filter((item) => item.active);
        const activeWarehouses = warehouses.filter((item) => item.active);
        const activeProducts = products.filter((item) => item.active);
        this.customers.set(activeCustomers);
        this.warehouses.set(activeWarehouses);
        this.products.set(activeProducts);
        if (!activeCustomers.length)
          this.referenceIssue.set('At least one active customer is required to create an order.');
        else if (!activeWarehouses.length)
          this.referenceIssue.set('At least one active warehouse is required to create an order.');
        else if (!activeProducts.length)
          this.referenceIssue.set('At least one active product is required to create an order.');
        this.referenceLoading.set(false);
      },
      error: () => {
        this.referenceError.set(true);
        this.referenceLoading.set(false);
      },
    });
  }
  addItem(): void {
    this.items.push(
      this.fb.group({
        productId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
      }),
    );
  }
  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }
  productPrice(id: string): number {
    return this.products().find((product) => product.id === id)?.unitPrice ?? 0;
  }
  estimatedTotal(): number {
    return this.items.controls.reduce(
      (sum, item) =>
        sum + this.productPrice(item.controls.productId.value) * item.controls.quantity.value,
      0,
    );
  }
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    this.api.saveOrder(raw).subscribe({
      next: (order) => {
        this.snackBar.open('Draft order created.', 'Dismiss', { duration: 2500 });
        void this.router.navigate(['/orders', order.id]);
      },
      error: () => this.submitting.set(false),
    });
  }
  private prefillAddress(id: string): void {
    const customer = this.customers().find((item) => item.id === id);
    if (!customer) return;
    this.form.patchValue({
      shippingName: customer.companyName,
      shippingAddress: customer.address,
      shippingCity: customer.city,
      shippingPostalCode: customer.postalCode,
      shippingCountry: customer.country,
      shippingLatitude: customer.latitude,
      shippingLongitude: customer.longitude,
    });
  }
}
