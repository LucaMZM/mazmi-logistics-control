package com.mazmi.logistics.incidents;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.incidents.dto.IncidentDtos;
import com.mazmi.logistics.shipments.DeliveryHealth;
import com.mazmi.logistics.shipments.RealtimePublisher;
import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentService;
import com.mazmi.logistics.shipments.ShipmentStatus;
import com.mazmi.logistics.shipments.TrackingEvent;
import com.mazmi.logistics.shipments.TrackingEventType;
import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IncidentService {
  private final IncidentRepository incidents;
  private final ShipmentRepository shipments;
  private final ShipmentService shipmentService;
  private final CurrentUser currentUser;
  private final RealtimePublisher publisher;

  public IncidentService(
      IncidentRepository incidents,
      ShipmentRepository shipments,
      ShipmentService shipmentService,
      CurrentUser currentUser,
      RealtimePublisher publisher) {
    this.incidents = incidents;
    this.shipments = shipments;
    this.shipmentService = shipmentService;
    this.currentUser = currentUser;
    this.publisher = publisher;
  }

  @Transactional
  public IncidentDtos.Response create(UUID shipmentId, IncidentDtos.Create request) {
    Shipment shipment = shipmentService.requireDetailed(shipmentId);
    if (shipment.getStatus() != ShipmentStatus.IN_TRANSIT)
      throw BusinessException.conflict(
          "INVALID_SHIPMENT_TRANSITION", "Incidents can only be opened for in-transit shipments");
    Incident incident = new Incident();
    incident.setShipment(shipment);
    incident.setType(request.type());
    incident.setSeverity(request.severity());
    incident.setTitle(request.title());
    incident.setDescription(request.description());
    incident.setStatus(IncidentStatus.OPEN);
    incident.setCreatedBy(currentUser.require());
    incidents.save(incident);
    shipment.setDeliveryHealth(
        request.severity() == IncidentSeverity.LOW
            ? DeliveryHealth.AT_RISK
            : DeliveryHealth.DELAYED);
    long delayMinutes =
        request.severity() == IncidentSeverity.CRITICAL
            ? 120
            : request.severity() == IncidentSeverity.HIGH ? 75 : 45;
    shipment.setEstimatedDeliveryAt(
        (shipment.getEstimatedDeliveryAt() == null
                ? Instant.now()
                : shipment.getEstimatedDeliveryAt())
            .plus(delayMinutes, ChronoUnit.MINUTES));
    TrackingEvent event =
        shipmentService.addEvent(
            shipment,
            TrackingEventType.INCIDENT,
            request.title(),
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude());
    shipmentService.addEvent(
        shipment,
        TrackingEventType.DELAYED,
        "Estimated delivery updated due to incident",
        shipment.getCurrentLatitude(),
        shipment.getCurrentLongitude());
    publisher.shipment(shipment, ShipmentDtos.Event.from(event));
    return IncidentDtos.Response.from(incident);
  }

  @Transactional
  public IncidentDtos.Response resolve(UUID id, String resolutionNote) {
    Incident incident =
        incidents.findById(id).orElseThrow(() -> BusinessException.notFound("Incident"));
    if (incident.getStatus() != IncidentStatus.OPEN)
      throw BusinessException.conflict("INCIDENT_ALREADY_RESOLVED", "Incident is already resolved");
    incident.setStatus(IncidentStatus.RESOLVED);
    incident.setResolutionNote(resolutionNote);
    incident.setResolvedAt(Instant.now());
    Shipment shipment = incident.getShipment();
    if (!incidents.existsByShipmentIdAndStatus(shipment.getId(), IncidentStatus.OPEN))
      shipment.setDeliveryHealth(DeliveryHealth.ON_TIME);
    TrackingEvent event =
        shipmentService.addEvent(
            shipment,
            TrackingEventType.RESUMED,
            "Incident resolved: " + resolutionNote,
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude());
    publisher.shipment(shipment, ShipmentDtos.Event.from(event));
    return IncidentDtos.Response.from(incident);
  }
}
