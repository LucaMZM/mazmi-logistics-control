import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OrdersPage } from './orders.page';

describe('OrdersPage refresh feedback', () => {
  it('keeps the last rows visible while a new search is debounced', async () => {
    vi.useFakeTimers();
    try {
      await TestBed.configureTestingModule({
        imports: [OrdersPage],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: AuthService, useValue: { canOperate: () => true } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(OrdersPage);
      const http = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      vi.advanceTimersByTime(0);
      http
        .expectOne((request) => request.url === '/api/v1/orders')
        .flush({
          content: [
            {
              id: '1',
              orderNumber: 'ORD-1',
              customer: 'Demo',
              warehouse: 'Warehouse',
              status: 'DRAFT',
              priority: 'NORMAL',
              totalAmount: 20,
              createdAt: '2026-11-11T10:00:00Z',
            },
          ],
          page: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1,
        });
      fixture.detectChanges();
      fixture.componentInstance.search.setValue('new search');
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('tbody')?.textContent).toContain('ORD-1');
      expect(element.querySelector('app-loading-state')).toBeNull();
      expect(element.querySelector('[role=status]')?.textContent).toContain('Updating results');
      expect(element.querySelector('.table-card')?.getAttribute('aria-busy')).toBe('true');
      fixture.destroy();
      vi.advanceTimersByTime(300);
      http.expectNone((request) => request.url === '/api/v1/orders');
      http.verify();
    } finally {
      vi.useRealTimers();
    }
  });
});
