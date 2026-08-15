package com.mazmi.logistics.fleet.drivers;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/v1/drivers")
public class DriverController {
  private static final List<ShipmentStatus> ACTIVE_SHIPMENT_STATUSES =
      List.of(ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT);
  private final DriverRepository drivers;
  private final ShipmentRepository shipments;

  public DriverController(DriverRepository drivers, ShipmentRepository shipments) {
    this.drivers = drivers;
    this.shipments = shipments;
  }

  public record Save(
      @NotBlank String employeeCode,
      @NotBlank String firstName,
      @NotBlank String lastName,
      @NotBlank String phone,
      @NotBlank String licenseNumber,
      @NotNull DriverStatus status,
      boolean active) {}

  public record Response(
      UUID id,
      String employeeCode,
      String firstName,
      String lastName,
      String fullName,
      String phone,
      String licenseNumber,
      DriverStatus status,
      boolean active) {
    static Response from(Driver d) {
      return new Response(
          d.getId(),
          d.getEmployeeCode(),
          d.getFirstName(),
          d.getLastName(),
          d.getFullName(),
          d.getPhone(),
          d.getLicenseNumber(),
          d.getStatus(),
          d.isActive());
    }
  }

  @GetMapping
  public List<Response> list() {
    return drivers.findAll().stream().map(Response::from).toList();
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
    return Response.from(drivers.save(apply(new Driver(), request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Save request) {
    Driver driver = find(id);
    if (shipments.existsByDriverIdAndStatusIn(id, ACTIVE_SHIPMENT_STATUSES))
      throw BusinessException.conflict(
          "DRIVER_ASSIGNED", "An assigned driver cannot be edited until the shipment finishes");
    validateUserManagedStatus(request.status());
    return Response.from(drivers.save(apply(driver, request)));
  }

  private Driver find(UUID id) {
    return drivers.findById(id).orElseThrow(() -> BusinessException.notFound("Driver"));
  }

  private Driver apply(Driver d, Save r) {
    d.setEmployeeCode(r.employeeCode());
    d.setFirstName(r.firstName());
    d.setLastName(r.lastName());
    d.setPhone(r.phone());
    d.setLicenseNumber(r.licenseNumber());
    d.setStatus(r.status());
    d.setActive(r.active());
    return d;
  }

  private void validateUserManagedStatus(DriverStatus status) {
    if (status == DriverStatus.ON_ROUTE)
      throw BusinessException.conflict(
          "DRIVER_STATUS_MANAGED",
          "ON_ROUTE is managed by the shipment workflow and cannot be set directly");
  }
}
