import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { OrderDetail } from '../../shared/models/models';
import { OrderDetailPage } from './order-detail.page';

const draft = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  customer: 'Demo customer',
  warehouse: 'Demo warehouse',
  status: 'DRAFT',
  priority: 'NORMAL',
  totalAmount: 25,
  createdAt: '2026-08-15T10:00:00Z',
  customerId: 'customer-1',
  warehouseId: 'warehouse-1',
  shippingName: 'Demo recipient',
  shippingAddress: 'Demo street 1',
  shippingCity: 'Madrid',
  shippingPostalCode: '28001',
  shippingCountry: 'Spain',
  shippingLatitude: 40.4168,
  shippingLongitude: -3.7038,
  createdBy: 'operator@mazmilogistics.test',
  updatedAt: '2026-08-15T10:00:00Z',
  items: [
    {
      productId: 'product-1',
      sku: 'DEMO-1',
      product: 'Demo product',
      quantity: 1,
      unitPrice: 25,
      subtotal: 25,
    },
  ],
} satisfies OrderDetail;

describe('OrderDetailPage actions', () => {
  const confirmed = { ...draft, status: 'CONFIRMED' } satisfies OrderDetail;
  const cancelled = { ...draft, status: 'CANCELLED' } satisfies OrderDetail;
  const api = {
    order: vi.fn(() => of(draft)),
    orderAction: vi.fn((): Observable<OrderDetail> => of(confirmed)),
  };
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(true) })),
  };
  const snackBar = { open: vi.fn() };
  let component: OrderDetailPage;

  beforeEach(() => {
    api.order.mockClear();
    api.orderAction.mockReset();
    api.orderAction.mockReturnValue(of(confirmed));
    dialog.open.mockClear();
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { canOperate: () => true } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'order-1' } } },
        },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    component = TestBed.runInInjectionContext(() => new OrderDetailPage());
    component.ngOnInit();
  });

  it('runs an explicit workflow action and applies the server response', () => {
    component.action('confirm');

    expect(api.orderAction).toHaveBeenCalledWith('order-1', 'confirm');
    expect(component.order()).toEqual(confirmed);
    expect(snackBar.open).toHaveBeenCalledWith('Order workflow updated.', 'Dismiss', {
      duration: 2500,
    });
  });

  it('only cancels after confirmation and applies the cancelled state', () => {
    api.orderAction.mockReturnValueOnce(of(cancelled));

    component.cancel();

    expect(dialog.open).toHaveBeenCalledOnce();
    expect(api.orderAction).toHaveBeenCalledWith('order-1', 'cancel');
    expect(component.order()).toEqual(cancelled);
  });
  it('prevents duplicate transitions and re-enables actions after a failed request', () => {
    const response = new Subject<OrderDetail>();
    api.orderAction.mockReturnValue(response);
    component.action('confirm');
    component.action('confirm');
    expect(api.orderAction).toHaveBeenCalledOnce();
    expect(component.pending()).toBe(true);
    response.error(new Error('Conflict'));
    expect(component.pending()).toBe(false);
    expect(component.order()).toEqual(draft);
  });
});
