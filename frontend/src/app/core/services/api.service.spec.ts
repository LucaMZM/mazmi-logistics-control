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

  it('sends shipment filters using the Spring Boot query names', () => {
    api
      .shipments({
        status: 'IN_TRANSIT',
        deliveryHealth: 'DELAYED',
        driver: 'driver-1',
        vehicle: 'vehicle-1',
        page: 2,
        size: 10,
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/shipments');
    expect(request.request.params.get('deliveryHealth')).toBe('DELAYED');
    expect(request.request.params.get('driver')).toBe('driver-1');
    expect(request.request.params.get('vehicle')).toBe('vehicle-1');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ content: [], page: 2, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('uses typed assignment and simulation incident payloads', () => {
    api.assignShipment('shipment-1', { driverId: 'driver-1', vehicleId: 'vehicle-1' }).subscribe();
    const assignment = http.expectOne('/api/v1/shipments/shipment-1/assign');
    expect(assignment.request.method).toBe('POST');
    expect(assignment.request.body).toEqual({ driverId: 'driver-1', vehicleId: 'vehicle-1' });
    assignment.flush({});

    api.simulationAction('shipment-1', 'incident', { type: 'TRAFFIC' }).subscribe();
    const incident = http.expectOne('/api/v1/shipments/shipment-1/simulation/incident');
    expect(incident.request.method).toBe('POST');
    expect(incident.request.body).toEqual({ type: 'TRAFFIC' });
    incident.flush({});
  });
});
