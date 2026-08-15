import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService order actions', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses explicit business-action endpoints instead of arbitrary status patches', () => {
    api.orderAction('order-1', 'confirm').subscribe();
    const request = http.expectOne('/api/v1/orders/order-1/confirm');
    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('sends backend pagination and inventory filters', () => {
    api.inventory({ search: 'TL-220', lowStock: true, page: 2 }).subscribe();
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/inventory');
    expect(request.request.params.get('lowStock')).toBe('true');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });
});
