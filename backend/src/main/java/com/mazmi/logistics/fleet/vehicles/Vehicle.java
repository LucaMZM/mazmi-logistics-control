package com.mazmi.logistics.fleet.vehicles;

import com.mazmi.logistics.common.jpa.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "vehicles")
public class Vehicle extends AuditedEntity {
  @Column(name = "registration_plate", nullable = false, unique = true, length = 20)
  private String registrationPlate;

  @Column(nullable = false, length = 120)
  private String model;

  @Enumerated(EnumType.STRING)
  @Column(name = "vehicle_type", nullable = false, length = 30)
  private VehicleType vehicleType;

  @Column(name = "capacity_kg", nullable = false, precision = 10, scale = 3)
  private BigDecimal capacityKg;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private VehicleStatus status = VehicleStatus.AVAILABLE;

  @Column(nullable = false)
  private boolean active = true;

  public String getRegistrationPlate() {
    return registrationPlate;
  }

  public void setRegistrationPlate(String registrationPlate) {
    this.registrationPlate = registrationPlate;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public VehicleType getVehicleType() {
    return vehicleType;
  }

  public void setVehicleType(VehicleType vehicleType) {
    this.vehicleType = vehicleType;
  }

  public BigDecimal getCapacityKg() {
    return capacityKg;
  }

  public void setCapacityKg(BigDecimal capacityKg) {
    this.capacityKg = capacityKg;
  }

  public VehicleStatus getStatus() {
    return status;
  }

  public void setStatus(VehicleStatus status) {
    this.status = status;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }
}
