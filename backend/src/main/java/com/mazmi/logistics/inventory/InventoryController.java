package com.mazmi.logistics.inventory;

import com.mazmi.logistics.common.web.PageResponse;
import com.mazmi.logistics.inventory.dto.InventoryDtos;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
  private final InventoryRepository inventory;
  private final InventoryService service;

  public InventoryController(InventoryRepository inventory, InventoryService service) {
    this.inventory = inventory;
    this.service = service;
  }

  @GetMapping
  public PageResponse<InventoryDtos.Response> list(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(required = false) UUID warehouse,
      @RequestParam(defaultValue = "false") boolean lowStock,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        inventory.search(
            search,
            warehouse,
            lowStock,
            PageRequest.of(page, Math.min(size, 100), Sort.by("product.name"))),
        InventoryDtos.Response::from);
  }

  @GetMapping("/{id}")
  public InventoryDtos.Response get(@PathVariable UUID id) {
    return InventoryDtos.Response.from(service.find(id));
  }

  @GetMapping("/{id}/movements")
  public List<InventoryDtos.Movement> movements(@PathVariable UUID id) {
    return service.history(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public InventoryDtos.Response create(@Valid @RequestBody InventoryDtos.Create request) {
    return service.create(request);
  }

  @PostMapping("/{id}/receive")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public InventoryDtos.Response receive(
      @PathVariable UUID id, @Valid @RequestBody InventoryDtos.Receive request) {
    return service.receive(id, request.quantity(), request.note());
  }

  @PostMapping("/{id}/adjust")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public InventoryDtos.Response adjust(
      @PathVariable UUID id, @Valid @RequestBody InventoryDtos.Adjust request) {
    return service.adjust(id, request.onHandDelta(), request.note());
  }
}
