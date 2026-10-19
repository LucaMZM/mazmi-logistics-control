import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Customer,
  Dashboard,
  Driver,
  Incident,
  Inventory,
  OrderDetail,
  OrderPriority,
  OrderStatus,
  OrderSummary,
  PageResponse,
  Product,
  ShipmentDetail,
  ShipmentSummary,
  StockMovement,
  UserRecord,
  Vehicle,
  Warehouse,
} from '../../shared/models/models';

export interface OrderListParams {
  search?: string;
  status?: OrderStatus | '';
  priority?: OrderPriority;
  customer?: string;
  warehouse?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  dashboard() {
    return this.http.get<Dashboard>('/api/v1/dashboard');
  }
  orders(params: OrderListParams = {}) {
    return this.http.get<PageResponse<OrderSummary>>('/api/v1/orders', {
      params: this.params({ ...params }),
    });
  }
  order(id: string) {
    return this.http.get<OrderDetail>(`/api/v1/orders/${id}`);
  }
  saveOrder(payload: unknown) {
    return this.http.post<OrderDetail>('/api/v1/orders', payload);
  }
  orderAction(id: string, action: string) {
    return this.http.post<OrderDetail>(`/api/v1/orders/${id}/${action}`, {});
  }
  inventory(params: Record<string, string | number | boolean | undefined> = {}) {
    return this.http.get<PageResponse<Inventory>>('/api/v1/inventory', {
      params: this.params(params),
    });
  }
  inventoryLevel(id: string) {
    return this.http.get<Inventory>(`/api/v1/inventory/${id}`);
  }
  movements(id: string) {
    return this.http.get<StockMovement[]>(`/api/v1/inventory/${id}/movements`);
  }
  inventoryAction(id: string, action: 'receive' | 'adjust', payload: unknown) {
    return this.http.post<Inventory>(`/api/v1/inventory/${id}/${action}`, payload);
  }
  shipments(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<PageResponse<ShipmentSummary>>('/api/v1/shipments', {
      params: this.params(params),
    });
  }
  shipment(id: string) {
    return this.http.get<ShipmentDetail>(`/api/v1/shipments/${id}`);
  }
  shipmentAction(id: string, action: string, payload: unknown = {}) {
    return this.http.post<ShipmentDetail>(`/api/v1/shipments/${id}/${action}`, payload);
  }
  simulationAction(id: string, action: string, payload: unknown = {}) {
    return this.http.post<ShipmentDetail | Incident>(
      `/api/v1/shipments/${id}/simulation/${action}`,
      payload,
    );
  }
  customers(search = '') {
    return this.http.get<PageResponse<Customer>>('/api/v1/customers', {
      params: { search, size: 100 },
    });
  }
  customer(id: string) {
    return this.http.get<Customer>(`/api/v1/customers/${id}`);
  }
  products() {
    return this.http.get<Product[]>('/api/v1/products');
  }
  warehouses() {
    return this.http.get<Warehouse[]>('/api/v1/warehouses');
  }
  drivers() {
    return this.http.get<Driver[]>('/api/v1/drivers');
  }
  saveDriver(id: string | undefined, payload: unknown) {
    return id
      ? this.http.put<Driver>(`/api/v1/drivers/${id}`, payload)
      : this.http.post<Driver>('/api/v1/drivers', payload);
  }
  vehicles() {
    return this.http.get<Vehicle[]>('/api/v1/vehicles');
  }
  saveVehicle(id: string | undefined, payload: unknown) {
    return id
      ? this.http.put<Vehicle>(`/api/v1/vehicles/${id}`, payload)
      : this.http.post<Vehicle>('/api/v1/vehicles', payload);
  }
  incidents(params: Record<string, string | number | undefined> = {}) {
    return this.http.get<PageResponse<Incident>>('/api/v1/incidents', {
      params: this.params(params),
    });
  }
  incident(id: string) {
    return this.http.get<Incident>(`/api/v1/incidents/${id}`);
  }
  resolveIncident(id: string, resolutionNote: string) {
    return this.http.post<Incident>(`/api/v1/incidents/${id}/resolve`, { resolutionNote });
  }
  users() {
    return this.http.get<UserRecord[]>('/api/v1/users');
  }
  createUser(payload: unknown) {
    return this.http.post<UserRecord>('/api/v1/users', payload);
  }
  updateUser(id: string, payload: unknown) {
    return this.http.put<UserRecord>(`/api/v1/users/${id}`, payload);
  }
  resetPassword(id: string, password: string) {
    return this.http.post<void>(`/api/v1/users/${id}/password`, { password });
  }

  private params(values: Record<string, string | number | boolean | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return params;
  }
}
