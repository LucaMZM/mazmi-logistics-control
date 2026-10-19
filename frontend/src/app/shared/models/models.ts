export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type OrderStatus =
  'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ShipmentStatus = 'CREATED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type DeliveryHealth = 'ON_TIME' | 'AT_RISK' | 'DELAYED';
export type IncidentType = 'TRAFFIC' | 'VEHICLE' | 'WEATHER' | 'ADDRESS' | 'CUSTOMER' | 'OTHER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface DailyVolume {
  date: string;
  orders: number;
}
export interface MapItem {
  id: string;
  trackingNumber: string;
  latitude: number;
  longitude: number;
  deliveryHealth: DeliveryHealth;
  progress: number;
}
export interface CriticalStock {
  inventoryId: string;
  sku: string;
  product: string;
  warehouse: string;
  available: number;
  reorderLevel: number;
}
export interface Incident {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  openedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdBy: string;
}
export interface Dashboard {
  ordersToday: number;
  activeShipments: number;
  delayedShipments: number;
  openIncidents: number;
  orderVolumeLast7Days: DailyVolume[];
  criticalInventory: CriticalStock[];
  recentIncidents: Incident[];
  activeShipmentMapItems: MapItem[];
}
export interface OrderSummary {
  id: string;
  orderNumber: string;
  customer: string;
  warehouse: string;
  status: OrderStatus;
  priority: OrderPriority;
  totalAmount: number;
  createdAt: string;
}
export interface OrderItem {
  productId: string;
  sku: string;
  product: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
export interface OrderDetail extends OrderSummary {
  customerId: string;
  warehouseId: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingLatitude: number;
  shippingLongitude: number;
  createdBy: string;
  updatedAt: string;
  shipmentId?: string;
  items: OrderItem[];
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  weightKg: number;
  unitPrice: number;
  active: boolean;
}
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  active: boolean;
}
export interface Customer {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  active: boolean;
  createdAt?: string;
}
export interface Inventory {
  id: string;
  productId: string;
  sku: string;
  product: string;
  warehouseId: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  stockStatus: string;
  version: number;
  updatedAt: string;
}
export interface StockMovement {
  id: string;
  type: string;
  onHandDelta: number;
  reservedDelta: number;
  note: string;
  createdBy: string;
  createdAt: string;
}
export interface Driver {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  status: string;
  active: boolean;
}
export interface Vehicle {
  id: string;
  registrationPlate: string;
  model: string;
  vehicleType: string;
  capacityKg: number;
  status: string;
  active: boolean;
}
export interface ShipmentSummary {
  id: string;
  trackingNumber: string;
  orderNumber: string;
  status: ShipmentStatus;
  deliveryHealth: DeliveryHealth;
  driver: string | null;
  vehicle: string | null;
  progress: number;
  eta: string | null;
  updatedAt: string;
}
export interface TrackingEvent {
  id: string;
  type: string;
  latitude?: number;
  longitude?: number;
  description: string;
  eventTime: string;
}
export interface ShipmentDetail {
  id: string;
  trackingNumber: string;
  orderId: string;
  orderNumber: string;
  status: ShipmentStatus;
  deliveryHealth: DeliveryHealth;
  currentLatitude: number;
  currentLongitude: number;
  progress: number;
  simulationActive: boolean;
  eta: string | null;
  departedAt: string | null;
  deliveredAt: string | null;
  warehouseLatitude: number;
  warehouseLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  driverId: string | null;
  driver: string | null;
  vehicleId: string | null;
  vehicle: string | null;
  events: TrackingEvent[];
  openIncidents: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    openedAt: string;
  }>;
}
export interface RealtimeUpdate {
  id: string;
  status: ShipmentStatus;
  deliveryHealth: DeliveryHealth;
  latitude: number;
  longitude: number;
  progress: number;
  simulationActive: boolean;
  eta: string | null;
  latestEvent: TrackingEvent | null;
}
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}
