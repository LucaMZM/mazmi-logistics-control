package com.mazmi.logistics.warehouses;

import com.mazmi.logistics.common.exception.BusinessException;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/warehouses")
public class WarehouseController {
  private final WarehouseRepository warehouses;

  public WarehouseController(WarehouseRepository warehouses) {
    this.warehouses = warehouses;
  }

  public record Save(
      @NotBlank String code,
      @NotBlank String name,
      @NotBlank String address,
      @NotBlank String city,
      @NotBlank String postalCode,
      @NotBlank String country,
      @NotNull BigDecimal latitude,
      @NotNull BigDecimal longitude,
      boolean active) {}

  public record Response(
      UUID id,
      String code,
      String name,
      String address,
      String city,
      String postalCode,
      String country,
      BigDecimal latitude,
      BigDecimal longitude,
      boolean active) {
    static Response from(Warehouse w) {
      return new Response(
          w.getId(),
          w.getCode(),
          w.getName(),
          w.getAddress(),
          w.getCity(),
          w.getPostalCode(),
          w.getCountry(),
          w.getLatitude(),
          w.getLongitude(),
          w.isActive());
    }
  }

  @GetMapping
  public List<Response> list() {
    return warehouses.findAll().stream().map(Response::from).toList();
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) {
    return Response.from(find(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response create(@Valid @RequestBody Save request) {
    return Response.from(warehouses.save(apply(new Warehouse(), request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Save request) {
    return Response.from(warehouses.save(apply(find(id), request)));
  }

  private Warehouse find(UUID id) {
    return warehouses.findById(id).orElseThrow(() -> BusinessException.notFound("Warehouse"));
  }

  private Warehouse apply(Warehouse w, Save r) {
    w.setCode(r.code());
    w.setName(r.name());
    w.setAddress(r.address());
    w.setCity(r.city());
    w.setPostalCode(r.postalCode());
    w.setCountry(r.country());
    w.setLatitude(r.latitude());
    w.setLongitude(r.longitude());
    w.setActive(r.active());
    return w;
  }
}
