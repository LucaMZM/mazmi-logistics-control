package com.mazmi.logistics.incidents;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.web.PageResponse;
import com.mazmi.logistics.incidents.dto.IncidentDtos;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class IncidentController {
  private final IncidentRepository incidents;
  private final IncidentService service;

  public IncidentController(IncidentRepository incidents, IncidentService service) {
    this.incidents = incidents;
    this.service = service;
  }

  @GetMapping("/incidents")
  @Transactional(readOnly = true)
  public PageResponse<IncidentDtos.Response> list(
      @RequestParam(required = false) IncidentStatus status,
      @RequestParam(required = false) IncidentSeverity severity,
      @RequestParam(required = false) IncidentType type,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        incidents.search(
            status,
            severity,
            type,
            PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "openedAt"))),
        IncidentDtos.Response::from);
  }

  @GetMapping("/incidents/{id}")
  @Transactional(readOnly = true)
  public IncidentDtos.Response get(@PathVariable UUID id) {
    return IncidentDtos.Response.from(
        incidents.findById(id).orElseThrow(() -> BusinessException.notFound("Incident")));
  }

  @PostMapping("/shipments/{shipmentId}/incidents")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public IncidentDtos.Response create(
      @PathVariable UUID shipmentId, @Valid @RequestBody IncidentDtos.Create request) {
    return service.create(shipmentId, request);
  }

  @PostMapping("/incidents/{id}/resolve")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public IncidentDtos.Response resolve(
      @PathVariable UUID id, @Valid @RequestBody IncidentDtos.Resolve request) {
    return service.resolve(id, request.resolutionNote());
  }
}
