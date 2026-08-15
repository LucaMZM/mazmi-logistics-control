package com.mazmi.logistics.shipments;

import com.mazmi.logistics.common.jpa.AuditedEntity;
import com.mazmi.logistics.fleet.drivers.Driver;
import com.mazmi.logistics.fleet.vehicles.Vehicle;
import com.mazmi.logistics.orders.Order;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "shipments")
public class Shipment extends AuditedEntity {
  @Column(name = "tracking_number", nullable = false, unique = true, length = 40)
  private String trackingNumber;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "order_id", unique = true)
  private Order order;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "driver_id")
  private Driver driver;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "vehicle_id")
  private Vehicle vehicle;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ShipmentStatus status = ShipmentStatus.CREATED;

  @Enumerated(EnumType.STRING)
  @Column(name = "delivery_health", nullable = false, length = 20)
  private DeliveryHealth deliveryHealth = DeliveryHealth.ON_TIME;

  @Column(name = "current_latitude", precision = 10, scale = 7)
  private BigDecimal currentLatitude;

  @Column(name = "current_longitude", precision = 10, scale = 7)
  private BigDecimal currentLongitude;

  @Column(name = "simulation_progress", nullable = false)
  private int simulationProgress;

  @Column(name = "simulation_active", nullable = false)
  private boolean simulationActive;

  @Column(name = "estimated_delivery_at")
  private Instant estimatedDeliveryAt;

  @Column(name = "departed_at")
  private Instant departedAt;

  @Column(name = "delivered_at")
  private Instant deliveredAt;

  public String getTrackingNumber() {
    return trackingNumber;
  }

  public void setTrackingNumber(String trackingNumber) {
    this.trackingNumber = trackingNumber;
  }

  public Order getOrder() {
    return order;
  }

  public void setOrder(Order order) {
    this.order = order;
  }

  public Driver getDriver() {
    return driver;
  }

  public void setDriver(Driver driver) {
    this.driver = driver;
  }

  public Vehicle getVehicle() {
    return vehicle;
  }

  public void setVehicle(Vehicle vehicle) {
    this.vehicle = vehicle;
  }

  public ShipmentStatus getStatus() {
    return status;
  }

  public void setStatus(ShipmentStatus status) {
    this.status = status;
  }

  public DeliveryHealth getDeliveryHealth() {
    return deliveryHealth;
  }

  public void setDeliveryHealth(DeliveryHealth deliveryHealth) {
    this.deliveryHealth = deliveryHealth;
  }

  public BigDecimal getCurrentLatitude() {
    return currentLatitude;
  }

  public void setCurrentLatitude(BigDecimal currentLatitude) {
    this.currentLatitude = currentLatitude;
  }

  public BigDecimal getCurrentLongitude() {
    return currentLongitude;
  }

  public void setCurrentLongitude(BigDecimal currentLongitude) {
    this.currentLongitude = currentLongitude;
  }

  public int getSimulationProgress() {
    return simulationProgress;
  }

  public void setSimulationProgress(int simulationProgress) {
    this.simulationProgress = simulationProgress;
  }

  public boolean isSimulationActive() {
    return simulationActive;
  }

  public void setSimulationActive(boolean simulationActive) {
    this.simulationActive = simulationActive;
  }

  public Instant getEstimatedDeliveryAt() {
    return estimatedDeliveryAt;
  }

  public void setEstimatedDeliveryAt(Instant estimatedDeliveryAt) {
    this.estimatedDeliveryAt = estimatedDeliveryAt;
  }

  public Instant getDepartedAt() {
    return departedAt;
  }

  public void setDepartedAt(Instant departedAt) {
    this.departedAt = departedAt;
  }

  public Instant getDeliveredAt() {
    return deliveredAt;
  }

  public void setDeliveredAt(Instant deliveredAt) {
    this.deliveredAt = deliveredAt;
  }
}
