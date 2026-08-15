package com.mazmi.logistics.shipments;

import com.mazmi.logistics.common.web.PageResponse;
import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shipments")
public class ShipmentController {
  private final ShipmentRepository shipments;
  private final ShipmentService service;

  public ShipmentController(ShipmentRepository shipments, ShipmentService service) {
    this.shipments = shipments;
    this.service = service;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public PageResponse<ShipmentDtos.Summary> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(required = false) ShipmentStatus status,
      @RequestParam(required = false) DeliveryHealth deliveryHealth,
      @RequestParam(required = false) UUID driver,
      @RequestParam(required = false) UUID vehicle) {
    Specification<Shipment> specification =
        (root, query, builder) -> {
          List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
          if (!search.isBlank()) {
            String term = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
            predicates.add(
                builder.or(
                    builder.like(builder.lower(root.get("trackingNumber")), term),
                    builder.like(builder.lower(root.join("order").get("orderNumber")), term)));
          }
          if (status != null) {
            predicates.add(builder.equal(root.get("status"), status));
          }
          if (deliveryHealth != null) {
            predicates.add(builder.equal(root.get("deliveryHealth"), deliveryHealth));
          }
          if (driver != null) {
            predicates.add(builder.equal(root.join("driver").get("id"), driver));
          }
          if (vehicle != null) {
            predicates.add(builder.equal(root.join("vehicle").get("id"), vehicle));
          }
          return builder.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    return PageResponse.from(
        shipments.findAll(
            specification,
            PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "updatedAt"))),
        ShipmentDtos.Summary::from);
  }

  @GetMapping("/{id}")
  public ShipmentDtos.Detail get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping("/{id}/assign")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public ShipmentDtos.Detail assign(
      @PathVariable UUID id, @Valid @RequestBody ShipmentDtos.Assign request) {
    return service.assign(id, request.driverId(), request.vehicleId());
  }

  @PostMapping("/{id}/start")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public ShipmentDtos.Detail start(@PathVariable UUID id) {
    return service.start(id);
  }

  @PostMapping("/{id}/deliver")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public ShipmentDtos.Detail deliver(@PathVariable UUID id) {
    return service.deliver(id);
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public ShipmentDtos.Detail cancel(@PathVariable UUID id) {
    return service.cancel(id);
  }
}
