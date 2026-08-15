package com.mazmi.logistics.fleet.vehicles;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vehicles")
public class VehicleController {
  private static final List<ShipmentStatus> ACTIVE_SHIPMENT_STATUSES =
      List.of(ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT);
  private final VehicleRepository vehicles;
  private final ShipmentRepository shipments;

  public VehicleController(VehicleRepository vehicles, ShipmentRepository shipments) {
    this.vehicles = vehicles;
    this.shipments = shipments;
  }

  public record Save(
      @NotBlank String registrationPlate,
      @NotBlank String model,
      @NotNull VehicleType vehicleType,
      @NotNull @DecimalMin("1") BigDecimal capacityKg,
      @NotNull VehicleStatus status,
      boolean active) {}

  public record Response(
      UUID id,
      String registrationPlate,
      String model,
      VehicleType vehicleType,
      BigDecimal capacityKg,
      VehicleStatus status,
      boolean active) {
    static Response from(Vehicle v) {
      return new Response(
          v.getId(),
          v.getRegistrationPlate(),
          v.getModel(),
          v.getVehicleType(),
          v.getCapacityKg(),
          v.getStatus(),
          v.isActive());
    }
  }

  @GetMapping
  public List<Response> list() {
    return vehicles.findAll().stream().map(Response::from).toList();
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) {
    return Response.from(find(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response create(@Valid @RequestBody Save request) {
    validateUserManagedStatus(request.status());
    return Response.from(vehicles.save(apply(new Vehicle(), request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Save request) {
    Vehicle vehicle = find(id);
    if (shipments.existsByVehicleIdAndStatusIn(id, ACTIVE_SHIPMENT_STATUSES))
      throw BusinessException.conflict(
          "VEHICLE_ASSIGNED", "An assigned vehicle cannot be edited until the shipment finishes");
    validateUserManagedStatus(request.status());
    return Response.from(vehicles.save(apply(vehicle, request)));
  }

  private Vehicle find(UUID id) {
    return vehicles.findById(id).orElseThrow(() -> BusinessException.notFound("Vehicle"));
  }

  private Vehicle apply(Vehicle v, Save r) {
    v.setRegistrationPlate(r.registrationPlate());
    v.setModel(r.model());
    v.setVehicleType(r.vehicleType());
    v.setCapacityKg(r.capacityKg());
    v.setStatus(r.status());
    v.setActive(r.active());
    return v;
  }

  private void validateUserManagedStatus(VehicleStatus status) {
    if (status == VehicleStatus.IN_SERVICE)
      throw BusinessException.conflict(
          "VEHICLE_STATUS_MANAGED",
          "IN_SERVICE is managed by the shipment workflow and cannot be set directly");
  }
}
