package com.mazmi.logistics.incidents.dto;

import com.mazmi.logistics.incidents.Incident;
import com.mazmi.logistics.incidents.IncidentSeverity;
import com.mazmi.logistics.incidents.IncidentStatus;
import com.mazmi.logistics.incidents.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class IncidentDtos {
  private IncidentDtos() {}

  public record Create(
      @NotNull IncidentType type,
      @NotNull IncidentSeverity severity,
      @NotBlank String title,
      @NotBlank String description) {}

  public record Resolve(@NotBlank String resolutionNote) {}

  public record Response(
      UUID id,
      UUID shipmentId,
      String trackingNumber,
      IncidentType type,
      IncidentSeverity severity,
      IncidentStatus status,
      String title,
      String description,
      Instant openedAt,
      Instant resolvedAt,
      String resolutionNote,
      String createdBy) {
    public static Response from(Incident incident) {
      return new Response(
          incident.getId(),
          incident.getShipment().getId(),
          incident.getShipment().getTrackingNumber(),
          incident.getType(),
          incident.getSeverity(),
          incident.getStatus(),
          incident.getTitle(),
          incident.getDescription(),
          incident.getOpenedAt(),
          incident.getResolvedAt(),
          incident.getResolutionNote(),
          incident.getCreatedBy().getName());
    }
  }
}
