package com.mazmi.logistics.shipments.dto;

import com.mazmi.logistics.incidents.Incident;
import com.mazmi.logistics.incidents.IncidentSeverity;
import com.mazmi.logistics.incidents.IncidentType;
import com.mazmi.logistics.shipments.DeliveryHealth;
import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentStatus;
import com.mazmi.logistics.shipments.TrackingEvent;
import com.mazmi.logistics.shipments.TrackingEventType;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ShipmentDtos {
  private ShipmentDtos() {}

  public record Assign(@NotNull UUID driverId, @NotNull UUID vehicleId) {}

  public record Summary(
      UUID id,
      String trackingNumber,
      String orderNumber,
      ShipmentStatus status,
      DeliveryHealth deliveryHealth,
      String driver,
      String vehicle,
      int progress,
      Instant eta,
      Instant updatedAt) {
    public static Summary from(Shipment shipment) {
      return new Summary(
          shipment.getId(),
          shipment.getTrackingNumber(),
          shipment.getOrder().getOrderNumber(),
          shipment.getStatus(),
          shipment.getDeliveryHealth(),
          shipment.getDriver() == null ? null : shipment.getDriver().getFullName(),
          shipment.getVehicle() == null ? null : shipment.getVehicle().getRegistrationPlate(),
          shipment.getSimulationProgress(),
          shipment.getEstimatedDeliveryAt(),
          shipment.getUpdatedAt());
    }
  }

  public record Event(
      UUID id,
      TrackingEventType type,
      BigDecimal latitude,
      BigDecimal longitude,
      String description,
      Instant eventTime) {
    public static Event from(TrackingEvent event) {
      return new Event(
          event.getId(),
          event.getType(),
          event.getLatitude(),
          event.getLongitude(),
          event.getDescription(),
          event.getEventTime());
    }
  }

  public record OpenIncident(
      UUID id,
      IncidentType type,
      IncidentSeverity severity,
      String title,
      String description,
      Instant openedAt) {
    public static OpenIncident from(Incident incident) {
      return new OpenIncident(
          incident.getId(),
          incident.getType(),
          incident.getSeverity(),
          incident.getTitle(),
          incident.getDescription(),
          incident.getOpenedAt());
    }
  }

  public record Detail(
      UUID id,
      String trackingNumber,
      UUID orderId,
      String orderNumber,
      ShipmentStatus status,
      DeliveryHealth deliveryHealth,
      BigDecimal currentLatitude,
      BigDecimal currentLongitude,
      int progress,
      boolean simulationActive,
      Instant eta,
      Instant departedAt,
      Instant deliveredAt,
      BigDecimal warehouseLatitude,
      BigDecimal warehouseLongitude,
      BigDecimal destinationLatitude,
      BigDecimal destinationLongitude,
      UUID driverId,
      String driver,
      UUID vehicleId,
      String vehicle,
      List<Event> events,
      List<OpenIncident> openIncidents) {}

  public record Realtime(
      UUID id,
      ShipmentStatus status,
      DeliveryHealth deliveryHealth,
      BigDecimal latitude,
      BigDecimal longitude,
      int progress,
      boolean simulationActive,
      Instant eta,
      Event latestEvent) {}
}
