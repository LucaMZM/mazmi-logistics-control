package com.mazmi.logistics.orders;

import com.mazmi.logistics.common.web.PageResponse;
import com.mazmi.logistics.orders.dto.OrderDtos;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
  private final OrderService service;

  public OrderController(OrderService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<OrderDtos.Summary> list(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(required = false) OrderStatus status,
      @RequestParam(required = false) OrderPriority priority,
      @RequestParam(required = false) UUID customer,
      @RequestParam(required = false) UUID warehouse,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return service.list(search, status, priority, customer, warehouse, page, size);
  }

  @GetMapping("/{id}")
  public OrderDtos.Detail get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail create(@Valid @RequestBody OrderDtos.Save request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail update(
      @PathVariable UUID id, @Valid @RequestBody OrderDtos.Save request) {
    return service.update(id, request);
  }

  @PostMapping("/{id}/confirm")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail confirm(@PathVariable UUID id) {
    return service.confirm(id);
  }

  @PostMapping("/{id}/start-preparation")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail prepare(@PathVariable UUID id) {
    return service.startPreparation(id);
  }

  @PostMapping("/{id}/mark-ready")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail ready(@PathVariable UUID id) {
    return service.markReady(id);
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public OrderDtos.Detail cancel(@PathVariable UUID id) {
    return service.cancel(id);
  }
}
