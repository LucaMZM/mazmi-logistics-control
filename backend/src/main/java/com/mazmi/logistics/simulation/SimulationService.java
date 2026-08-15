package com.mazmi.logistics.simulation;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.incidents.IncidentService;
import com.mazmi.logistics.incidents.IncidentSeverity;
import com.mazmi.logistics.incidents.IncidentType;
import com.mazmi.logistics.incidents.dto.IncidentDtos;
import com.mazmi.logistics.shipments.RealtimePublisher;
import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentService;
import com.mazmi.logistics.shipments.ShipmentStatus;
import com.mazmi.logistics.shipments.TrackingEvent;
import com.mazmi.logistics.shipments.TrackingEventRepository;
import com.mazmi.logistics.shipments.TrackingEventType;
import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SimulationService {
  private final TrackingEventRepository events;
  private final ShipmentService shipmentService;
  private final IncidentService incidentService;
  private final RealtimePublisher publisher;

  public SimulationService(
      TrackingEventRepository events,
      ShipmentService shipmentService,
      IncidentService incidentService,
      RealtimePublisher publisher) {
    this.events = events;
    this.shipmentService = shipmentService;
    this.incidentService = incidentService;
    this.publisher = publisher;
  }

  @Transactional
  public ShipmentDtos.Detail start(UUID id) {
    Shipment shipment = shipmentService.requireDetailed(id);
    if (shipment.getStatus() != ShipmentStatus.IN_TRANSIT)
      throw BusinessException.conflict(
          "INVALID_SHIPMENT_TRANSITION", "Demo simulation requires an in-transit shipment");
    shipment.setSimulationActive(true);
    publisher.shipment(shipment, null);
    return shipmentService.detail(shipment);
  }

  @Transactional
  public ShipmentDtos.Detail pause(UUID id) {
    Shipment shipment = shipmentService.requireDetailed(id);
    shipment.setSimulationActive(false);
    publisher.shipment(shipment, null);
    return shipmentService.detail(shipment);
  }

  @Transactional
  public IncidentDtos.Response simulateIncident(UUID id, IncidentType type) {
    String title =
        switch (type) {
          case TRAFFIC -> "Traffic congestion";
          case VEHICLE -> "Vehicle issue";
          case WEATHER -> "Adverse weather";
          case ADDRESS -> "Address verification required";
          default -> "Operational incident";
        };
    return incidentService.create(
        id,
        new IncidentDtos.Create(
            type,
            IncidentSeverity.MEDIUM,
            title,
            "Demo incident generated during simulated tracking."));
  }

  @Transactional
  public void advance(UUID id) {
    Shipment shipment = shipmentService.requireDetailed(id);
    if (!shipment.isSimulationActive() || shipment.getStatus() != ShipmentStatus.IN_TRANSIT) return;
    int previous = shipment.getSimulationProgress();
    int progress = Math.min(100, previous + 8);
    shipment.setSimulationProgress(progress);
    double ratio = progress / 100.0;
    double startLat = shipment.getOrder().getWarehouse().getLatitude().doubleValue();
    double startLon = shipment.getOrder().getWarehouse().getLongitude().doubleValue();
    double endLat = shipment.getOrder().getShippingLatitude().doubleValue();
    double endLon = shipment.getOrder().getShippingLongitude().doubleValue();
    double curve = Math.sin(Math.PI * ratio) * 0.08;
    shipment.setCurrentLatitude(
        decimal(startLat + (endLat - startLat) * ratio + curve * (endLon - startLon)));
    shipment.setCurrentLongitude(
        decimal(startLon + (endLon - startLon) * ratio - curve * (endLat - startLat)));
    long minutesRemaining = Math.max(1, Math.round((100 - progress) * 1.2));
    if (shipment.getDeliveryHealth() != com.mazmi.logistics.shipments.DeliveryHealth.DELAYED)
      shipment.setEstimatedDeliveryAt(Instant.now().plus(minutesRemaining, ChronoUnit.MINUTES));
    TrackingEvent latest = null;
    for (int checkpoint : new int[] {25, 50, 75}) {
      String description = "Simulated route checkpoint " + checkpoint + "%";
      if (previous < checkpoint
          && progress >= checkpoint
          && !events.existsByShipmentIdAndDescription(id, description))
        latest =
            shipmentService.addEvent(
                shipment,
                TrackingEventType.CHECKPOINT,
                description,
                shipment.getCurrentLatitude(),
                shipment.getCurrentLongitude());
    }
    if (progress == 100) {
      shipment.setSimulationActive(false);
      shipmentService.deliver(id);
    } else {
      publisher.shipment(shipment, latest == null ? null : ShipmentDtos.Event.from(latest));
    }
  }

  private BigDecimal decimal(double value) {
    return BigDecimal.valueOf(value).setScale(7, RoundingMode.HALF_UP);
  }
}
