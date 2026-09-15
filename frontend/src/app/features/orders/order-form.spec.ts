import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { OrderFormPage } from './order-form.page';

describe('OrderFormPage validation', () => {
  let component: OrderFormPage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new OrderFormPage());
    component.addItem();
  });

  it('rejects non-positive item quantities', () => {
    const quantity = component.items.at(0).controls.quantity;
    quantity.setValue(0);
    expect(quantity.hasError('min')).toBe(true);
    quantity.setValue(1);
    expect(quantity.valid).toBe(true);
  });

  it('rejects coordinates outside valid latitude and longitude ranges', () => {
    component.form.controls.shippingLatitude.setValue(91);
    component.form.controls.shippingLongitude.setValue(-181);
    expect(component.form.controls.shippingLatitude.hasError('max')).toBe(true);
    expect(component.form.controls.shippingLongitude.hasError('min')).toBe(true);
  });
  it('rejects fractional quantities before creating an order', () => {
    const quantity = component.items.at(0).controls.quantity;
    quantity.setValue(1.5);
    expect(quantity.invalid).toBe(true);
    quantity.setValue(2);
    expect(quantity.valid).toBe(true);
  });
});
