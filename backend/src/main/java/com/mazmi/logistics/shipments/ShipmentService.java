package com.mazmi.logistics.shipments;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.fleet.drivers.Driver;
import com.mazmi.logistics.fleet.drivers.DriverRepository;
import com.mazmi.logistics.fleet.drivers.DriverStatus;
import com.mazmi.logistics.fleet.vehicles.Vehicle;
import com.mazmi.logistics.fleet.vehicles.VehicleRepository;
import com.mazmi.logistics.fleet.vehicles.VehicleStatus;
import com.mazmi.logistics.incidents.IncidentRepository;
import com.mazmi.logistics.incidents.IncidentStatus;
import com.mazmi.logistics.inventory.InventoryService;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderRepository;
import com.mazmi.logistics.orders.OrderStatus;
import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShipmentService {
  private static final List<ShipmentStatus> ACTIVE =
      List.of(ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT);
  private final ShipmentRepository shipments;
  private final TrackingEventRepository events;
  private final IncidentRepository incidents;
  private final DriverRepository drivers;
  private final VehicleRepository vehicles;
  private final OrderRepository orders;
  private final InventoryService inventory;
  private final CurrentUser currentUser;
  private final RealtimePublisher publisher;

  public ShipmentService(
      ShipmentRepository shipments,
      TrackingEventRepository events,
      IncidentRepository incidents,
      DriverRepository drivers,
      VehicleRepository vehicles,
      OrderRepository orders,
      InventoryService inventory,
      CurrentUser currentUser,
      RealtimePublisher publisher) {
    this.shipments = shipments;
    this.events = events;
    this.incidents = incidents;
    this.drivers = drivers;
    this.vehicles = vehicles;
    this.orders = orders;
    this.inventory = inventory;
    this.currentUser = currentUser;
    this.publisher = publisher;
  }

  @Transactional
  public Shipment createForOrder(Order order) {
    return shipments
        .findByOrderId(order.getId())
        .orElseGet(
            () -> {
              Shipment shipment = new Shipment();
              shipment.setTrackingNumber(
                  "MZ-"
                      + Instant.now().toString().substring(0, 4)
                      + "-"
                      + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
              shipment.setOrder(order);
              shipment.setStatus(ShipmentStatus.CREATED);
              shipment.setDeliveryHealth(DeliveryHealth.ON_TIME);
              shipment.setCurrentLatitude(order.getWarehouse().getLatitude());
              shipment.setCurrentLongitude(order.getWarehouse().getLongitude());
              shipment.setEstimatedDeliveryAt(Instant.now().plus(3, ChronoUnit.HOURS));
              shipments.save(shipment);
              addEvent(
                  shipment,
                  TrackingEventType.CREATED,
                  "Shipment created",
                  shipment.getCurrentLatitude(),
                  shipment.getCurrentLongitude());
              return shipment;
            });
  }

  @Transactional
  public ShipmentDtos.Detail assign(UUID id, UUID driverId, UUID vehicleId) {
    Shipment shipment = requireDetailed(id);
    if (shipment.getStatus() != ShipmentStatus.CREATED
        && shipment.getStatus() != ShipmentStatus.ASSIGNED)
      invalid("Shipment can only be assigned before departure");
    Driver driver =
        drivers.findById(driverId).orElseThrow(() -> BusinessException.notFound("Driver"));
    Vehicle vehicle =
        vehicles.findById(vehicleId).orElseThrow(() -> BusinessException.notFound("Vehicle"));
    if (!driver.isActive()
        || driver.getStatus() != DriverStatus.AVAILABLE
        || shipments.existsByDriverIdAndStatusIn(driverId, ACTIVE)
            && (shipment.getDriver() == null || !shipment.getDriver().getId().equals(driverId)))
      throw BusinessException.conflict("DRIVER_NOT_AVAILABLE", "Driver is not available");
    if (!vehicle.isActive()
        || vehicle.getStatus() != VehicleStatus.AVAILABLE
        || shipments.existsByVehicleIdAndStatusIn(vehicleId, ACTIVE)
            && (shipment.getVehicle() == null || !shipment.getVehicle().getId().equals(vehicleId)))
      throw BusinessException.conflict("VEHICLE_NOT_AVAILABLE", "Vehicle is not available");
    BigDecimal weight = totalWeight(shipment.getOrder());
    if (vehicle.getCapacityKg().compareTo(weight) < 0)
      throw BusinessException.conflict(
          "VEHICLE_CAPACITY_EXCEEDED",
          "Vehicle capacity is below order weight of " + weight + " kg");
    shipment.setDriver(driver);
    shipment.setVehicle(vehicle);
    shipment.setStatus(ShipmentStatus.ASSIGNED);
    TrackingEvent event =
        addEvent(
            shipment,
            TrackingEventType.ASSIGNED,
            "Driver and vehicle assigned",
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude());
    publisher.shipment(shipment, ShipmentDtos.Event.from(event));
    return detail(shipment);
  }

  @Transactional
  public ShipmentDtos.Detail start(UUID id) {
    Shipment shipment = requireDetailed(id);
    if (shipment.getStatus() != ShipmentStatus.ASSIGNED
        || shipment.getDriver() == null
        || shipment.getVehicle() == null)
      invalid("Shipment requires a driver and vehicle assignment before departure");
    if (shipment.getOrder().getStatus() != OrderStatus.READY)
      invalid("Order must be ready before shipment departure");
    validateFleetForDeparture(shipment);
    inventory.dispatch(shipment.getOrder(), currentUser.require());
    shipment.getOrder().setStatus(OrderStatus.SHIPPED);
    shipment.setStatus(ShipmentStatus.IN_TRANSIT);
    shipment.setDepartedAt(Instant.now());
    shipment.getDriver().setStatus(DriverStatus.ON_ROUTE);
    shipment.getVehicle().setStatus(VehicleStatus.IN_SERVICE);
    TrackingEvent event =
        addEvent(
            shipment,
            TrackingEventType.DEPARTED,
            "Shipment departed from " + shipment.getOrder().getWarehouse().getName(),
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude());
    publisher.shipment(shipment, ShipmentDtos.Event.from(event));
    return detail(shipment);
  }

  @Transactional
  public ShipmentDtos.Detail deliver(UUID id) {
    Shipment shipment = requireDetailed(id);
    if (shipment.getStatus() != ShipmentStatus.IN_TRANSIT)
      invalid("Only an in-transit shipment can be delivered");
    shipment.setStatus(ShipmentStatus.DELIVERED);
    shipment.setSimulationActive(false);
    shipment.setSimulationProgress(100);
    shipment.setCurrentLatitude(shipment.getOrder().getShippingLatitude());
    shipment.setCurrentLongitude(shipment.getOrder().getShippingLongitude());
    shipment.setDeliveredAt(Instant.now());
    shipment.getOrder().setStatus(OrderStatus.DELIVERED);
    shipment.getDriver().setStatus(DriverStatus.AVAILABLE);
    shipment.getVehicle().setStatus(VehicleStatus.AVAILABLE);
    TrackingEvent event =
        addEvent(
            shipment,
            TrackingEventType.DELIVERED,
            "Shipment delivered",
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude());
    publisher.shipment(shipment, ShipmentDtos.Event.from(event));
    return detail(shipment);
  }

  @Transactional
  public void cancelForOrder(Order order) {
    shipments.findByOrderId(order.getId()).ifPresent(this::cancelBeforeDeparture);
  }

  @Transactional
  public ShipmentDtos.Detail cancel(UUID id) {
    Shipment shipment = requireDetailed(id);
    if (shipment.getOrder().getStatus() != OrderStatus.READY)
      invalid("Only a ready order shipment can be cancelled before departure");
    inventory.release(shipment.getOrder(), currentUser.require());
    cancelBeforeDeparture(shipment);
    shipment.getOrder().setStatus(OrderStatus.CANCELLED);
    return detail(shipment);
  }

  @Transactional(readOnly = true)
  public Shipment requireDetailed(UUID id) {
    return shipments.findDetailedById(id).orElseThrow(() -> BusinessException.notFound("Shipment"));
  }

  @Transactional(readOnly = true)
  public ShipmentDtos.Detail get(UUID id) {
    return detail(requireDetailed(id));
  }

  public TrackingEvent addEvent(
      Shipment shipment,
      TrackingEventType type,
      String description,
      BigDecimal latitude,
      BigDecimal longitude) {
    TrackingEvent event = new TrackingEvent();
    event.setShipment(shipment);
    event.setType(type);
    event.setDescription(description);
    event.setLatitude(latitude);
    event.setLongitude(longitude);
    return events.save(event);
  }

  public ShipmentDtos.Detail detail(Shipment shipment) {
    return new ShipmentDtos.Detail(
        shipment.getId(),
        shipment.getTrackingNumber(),
        shipment.getOrder().getId(),
        shipment.getOrder().getOrderNumber(),
        shipment.getStatus(),
        shipment.getDeliveryHealth(),
        shipment.getCurrentLatitude(),
        shipment.getCurrentLongitude(),
        shipment.getSimulationProgress(),
        shipment.isSimulationActive(),
        shipment.getEstimatedDeliveryAt(),
        shipment.getDepartedAt(),
        shipment.getDeliveredAt(),
        shipment.getOrder().getWarehouse().getLatitude(),
        shipment.getOrder().getWarehouse().getLongitude(),
        shipment.getOrder().getShippingLatitude(),
        shipment.getOrder().getShippingLongitude(),
        shipment.getDriver() == null ? null : shipment.getDriver().getId(),
        shipment.getDriver() == null ? null : shipment.getDriver().getFullName(),
        shipment.getVehicle() == null ? null : shipment.getVehicle().getId(),
        shipment.getVehicle() == null ? null : shipment.getVehicle().getRegistrationPlate(),
        events.findByShipmentIdOrderByEventTimeAsc(shipment.getId()).stream()
            .map(ShipmentDtos.Event::from)
            .toList(),
        incidents
            .findByShipmentIdAndStatusOrderByOpenedAtDesc(shipment.getId(), IncidentStatus.OPEN)
            .stream()
            .map(ShipmentDtos.OpenIncident::from)
            .toList());
  }

  private void cancelBeforeDeparture(Shipment shipment) {
    if (shipment.getStatus() != ShipmentStatus.CREATED
        && shipment.getStatus() != ShipmentStatus.ASSIGNED)
      invalid("Only a shipment awaiting departure can be cancelled");
    shipment.setStatus(ShipmentStatus.CANCELLED);
    shipment.setSimulationActive(false);
    publisher.shipment(shipment, null);
  }

  private void validateFleetForDeparture(Shipment shipment) {
    Driver driver = shipment.getDriver();
    Vehicle vehicle = shipment.getVehicle();
    if (!driver.isActive() || driver.getStatus() != DriverStatus.AVAILABLE)
      throw BusinessException.conflict(
          "DRIVER_NOT_AVAILABLE", "Assigned driver is no longer available");
    if (!vehicle.isActive() || vehicle.getStatus() != VehicleStatus.AVAILABLE)
      throw BusinessException.conflict(
          "VEHICLE_NOT_AVAILABLE", "Assigned vehicle is no longer available");
    BigDecimal weight = totalWeight(shipment.getOrder());
    if (vehicle.getCapacityKg().compareTo(weight) < 0)
      throw BusinessException.conflict(
          "VEHICLE_CAPACITY_EXCEEDED",
          "Vehicle capacity is below order weight of " + weight + " kg");
  }

  private BigDecimal totalWeight(Order order) {
    return order.getItems().stream()
        .map(
            item ->
                item.getProduct().getWeightKg().multiply(BigDecimal.valueOf(item.getQuantity())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private void invalid(String message) {
    throw BusinessException.conflict("INVALID_SHIPMENT_TRANSITION", message);
  }
}
