package com.mazmi.logistics.simulation;

import com.mazmi.logistics.incidents.IncidentType;
import com.mazmi.logistics.incidents.dto.IncidentDtos;
import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shipments/{shipmentId}/simulation")
@PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
public class SimulationController {
  private final SimulationService simulation;

  public SimulationController(SimulationService simulation) {
    this.simulation = simulation;
  }

  public record IncidentRequest(@NotNull IncidentType type) {}

  @PostMapping("/start")
  public ShipmentDtos.Detail start(@PathVariable UUID shipmentId) {
    return simulation.start(shipmentId);
  }

  @PostMapping("/pause")
  public ShipmentDtos.Detail pause(@PathVariable UUID shipmentId) {
    return simulation.pause(shipmentId);
  }

  @PostMapping("/incident")
  public IncidentDtos.Response incident(
      @PathVariable UUID shipmentId, @Valid @RequestBody IncidentRequest request) {
    return simulation.simulateIncident(shipmentId, request.type());
  }
}
