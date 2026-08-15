package com.mazmi.logistics.shipments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.customers.Customer;
import com.mazmi.logistics.fleet.drivers.Driver;
import com.mazmi.logistics.fleet.drivers.DriverRepository;
import com.mazmi.logistics.fleet.drivers.DriverStatus;
import com.mazmi.logistics.fleet.vehicles.Vehicle;
import com.mazmi.logistics.fleet.vehicles.VehicleRepository;
import com.mazmi.logistics.fleet.vehicles.VehicleStatus;
import com.mazmi.logistics.incidents.IncidentRepository;
import com.mazmi.logistics.inventory.InventoryService;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderItem;
import com.mazmi.logistics.orders.OrderRepository;
import com.mazmi.logistics.orders.OrderStatus;
import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.warehouses.Warehouse;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShipmentServiceTest {
  private final ShipmentRepository shipments = mock(ShipmentRepository.class);
  private final TrackingEventRepository events = mock(TrackingEventRepository.class);
  private final DriverRepository drivers = mock(DriverRepository.class);
  private final VehicleRepository vehicles = mock(VehicleRepository.class);
  private final InventoryService inventory = mock(InventoryService.class);
  private final CurrentUser currentUser = mock(CurrentUser.class);
  private ShipmentService service;
  private Shipment shipment;
  private Driver driver;
  private Vehicle vehicle;
  private User operator;

  @BeforeEach
  void setUp() {
    service =
        new ShipmentService(
            shipments,
            events,
            mock(IncidentRepository.class),
            drivers,
            vehicles,
            mock(OrderRepository.class),
            inventory,
            currentUser,
            mock(RealtimePublisher.class));
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    Warehouse warehouse = new Warehouse();
    warehouse.setId(UUID.randomUUID());
    warehouse.setLatitude(BigDecimal.ONE);
    warehouse.setLongitude(BigDecimal.ONE);
    Product product = new Product();
    product.setId(UUID.randomUUID());
    product.setWeightKg(BigDecimal.valueOf(50));
    Order order = new Order();
    order.setId(UUID.randomUUID());
    order.setOrderNumber("ORD-TEST");
    order.setCustomer(customer);
    order.setWarehouse(warehouse);
    order.setShippingLatitude(BigDecimal.TEN);
    order.setShippingLongitude(BigDecimal.TEN);
    order.setStatus(OrderStatus.READY);
    OrderItem item = new OrderItem();
    item.setProduct(product);
    item.setQuantity(2);
    order.addItem(item);
    shipment = new Shipment();
    shipment.setId(UUID.randomUUID());
    shipment.setOrder(order);
    shipment.setTrackingNumber("MZ-TEST");
    shipment.setStatus(ShipmentStatus.CREATED);
    shipment.setDeliveryHealth(DeliveryHealth.ON_TIME);
    driver = new Driver();
    driver.setId(UUID.randomUUID());
    driver.setFirstName("Demo");
    driver.setLastName("Driver");
    driver.setStatus(DriverStatus.AVAILABLE);
    driver.setActive(true);
    vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setRegistrationPlate("MZ10DA");
    vehicle.setCapacityKg(BigDecimal.valueOf(1000));
    vehicle.setStatus(VehicleStatus.AVAILABLE);
    vehicle.setActive(true);
    operator = new User();
    when(currentUser.require()).thenReturn(operator);
    when(shipments.findDetailedById(shipment.getId())).thenReturn(Optional.of(shipment));
    when(events.save(any(TrackingEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(drivers.findById(driver.getId())).thenReturn(Optional.of(driver));
    when(vehicles.findById(vehicle.getId())).thenReturn(Optional.of(vehicle));
  }

  @Test
  void cannotStartWithoutAssignment() {
    assertThatThrownBy(() -> service.start(shipment.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("requires");
  }

  @Test
  void unavailableDriverCannotBeAssigned() {
    driver.setStatus(DriverStatus.OFF_DUTY);
    assertThatThrownBy(() -> service.assign(shipment.getId(), driver.getId(), vehicle.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Driver");
  }

  @Test
  void vehicleWithInsufficientCapacityCannotBeAssigned() {
    vehicle.setCapacityKg(BigDecimal.valueOf(90));
    assertThatThrownBy(() -> service.assign(shipment.getId(), driver.getId(), vehicle.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("capacity");
  }

  @Test
  void busyDriverCannotBeAssignedEvenIfItsStatusIsAvailable() {
    when(shipments.existsByDriverIdAndStatusIn(
            org.mockito.ArgumentMatchers.eq(driver.getId()),
            org.mockito.ArgumentMatchers.anyList()))
        .thenReturn(true);

    assertThatThrownBy(() -> service.assign(shipment.getId(), driver.getId(), vehicle.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Driver");
  }

  @Test
  void busyVehicleCannotBeAssignedEvenIfItsStatusIsAvailable() {
    when(shipments.existsByVehicleIdAndStatusIn(
            org.mockito.ArgumentMatchers.eq(vehicle.getId()),
            org.mockito.ArgumentMatchers.anyList()))
        .thenReturn(true);

    assertThatThrownBy(() -> service.assign(shipment.getId(), driver.getId(), vehicle.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Vehicle");
  }

  @Test
  void startingShipmentDispatchesAndClaimsFleet() {
    shipment.setDriver(driver);
    shipment.setVehicle(vehicle);
    shipment.setStatus(ShipmentStatus.ASSIGNED);
    service.start(shipment.getId());
    verify(inventory).dispatch(shipment.getOrder(), operator);
    assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.IN_TRANSIT);
    assertThat(shipment.getOrder().getStatus()).isEqualTo(OrderStatus.SHIPPED);
    assertThat(driver.getStatus()).isEqualTo(DriverStatus.ON_ROUTE);
    assertThat(vehicle.getStatus()).isEqualTo(VehicleStatus.IN_SERVICE);
  }

  @Test
  void departureRevalidatesAssignedFleetAvailability() {
    shipment.setDriver(driver);
    shipment.setVehicle(vehicle);
    shipment.setStatus(ShipmentStatus.ASSIGNED);
    driver.setStatus(DriverStatus.OFF_DUTY);

    assertThatThrownBy(() -> service.start(shipment.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("no longer available");
    verify(inventory, never()).dispatch(org.mockito.ArgumentMatchers.any(), any());
  }

  @Test
  void departureRevalidatesVehicleCapacity() {
    shipment.setDriver(driver);
    shipment.setVehicle(vehicle);
    shipment.setStatus(ShipmentStatus.ASSIGNED);
    vehicle.setCapacityKg(BigDecimal.valueOf(90));

    assertThatThrownBy(() -> service.start(shipment.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("capacity");
    verify(inventory, never()).dispatch(org.mockito.ArgumentMatchers.any(), any());
  }

  @Test
  void cancellingAwaitingShipmentCancelsOrderAndReleasesReservation() {
    service.cancel(shipment.getId());

    verify(inventory).release(shipment.getOrder(), operator);
    assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.CANCELLED);
    assertThat(shipment.getOrder().getStatus()).isEqualTo(OrderStatus.CANCELLED);
  }

  @Test
  void deliveryReleasesFleetAndCompletesOrder() {
    shipment.setDriver(driver);
    shipment.setVehicle(vehicle);
    shipment.setStatus(ShipmentStatus.IN_TRANSIT);
    driver.setStatus(DriverStatus.ON_ROUTE);
    vehicle.setStatus(VehicleStatus.IN_SERVICE);
    service.deliver(shipment.getId());
    assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.DELIVERED);
    assertThat(shipment.getOrder().getStatus()).isEqualTo(OrderStatus.DELIVERED);
    assertThat(driver.getStatus()).isEqualTo(DriverStatus.AVAILABLE);
    assertThat(vehicle.getStatus()).isEqualTo(VehicleStatus.AVAILABLE);
  }
}
