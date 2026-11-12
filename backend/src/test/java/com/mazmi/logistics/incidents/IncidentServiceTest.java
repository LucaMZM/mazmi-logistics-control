package com.mazmi.logistics.incidents;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.mazmi.logistics.users.User;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class IncidentServiceTest {
  private final IncidentRepository incidents = mock(IncidentRepository.class);
  private final ShipmentService shipments = mock(ShipmentService.class);
  private final CurrentUser currentUser = mock(CurrentUser.class);
  private final IncidentService service =
      new IncidentService(
          incidents,
          mock(ShipmentRepository.class),
          shipments,
          currentUser,
          mock(RealtimePublisher.class));
  private final Shipment shipment = new Shipment();
  private final User actor = new User();

  @BeforeEach
  void setUp() {
    shipment.setId(UUID.randomUUID());
    shipment.setTrackingNumber("MZ-TEST");
    shipment.setStatus(ShipmentStatus.IN_TRANSIT);
    shipment.setDeliveryHealth(DeliveryHealth.DELAYED);
    shipment.setCurrentLatitude(BigDecimal.ONE);
    shipment.setCurrentLongitude(BigDecimal.ONE);
    actor.setName("Demo operator");
    when(currentUser.require()).thenReturn(actor);
    when(shipments.requireDetailed(shipment.getId())).thenReturn(shipment);
    when(shipments.addEvent(eq(shipment), any(), any(), any(), any()))
        .thenAnswer(
            invocation -> {
              TrackingEvent event = new TrackingEvent();
              event.setType(invocation.getArgument(1));
              return event;
            });
  }

  @Test
  void aNewLowSeverityIncidentCannotHideAnExistingCriticalIncident() {
    when(incidents.findByShipmentIdAndStatusOrderByOpenedAtDesc(
            shipment.getId(), IncidentStatus.OPEN))
        .thenReturn(List.of(incident(IncidentSeverity.CRITICAL), incident(IncidentSeverity.LOW)));
    service.create(
        shipment.getId(),
        new IncidentDtos.Create(
            IncidentType.ADDRESS,
            IncidentSeverity.LOW,
            "Address check",
            "Check the delivery address"));
    assertThat(shipment.getDeliveryHealth()).isEqualTo(DeliveryHealth.DELAYED);
  }

  @Test
  void resolvingOneIncidentRetainsTheRiskOfRemainingIncidents() {
    Incident resolved = incident(IncidentSeverity.HIGH);
    when(incidents.findById(resolved.getId())).thenReturn(Optional.of(resolved));
    when(incidents.findByShipmentIdAndStatusOrderByOpenedAtDesc(
            shipment.getId(), IncidentStatus.OPEN))
        .thenReturn(List.of(incident(IncidentSeverity.LOW)));
    service.resolve(resolved.getId(), "Vehicle checked");
    assertThat(shipment.getDeliveryHealth()).isEqualTo(DeliveryHealth.AT_RISK);
    verify(shipments).addEvent(eq(shipment), eq(TrackingEventType.INCIDENT), any(), any(), any());
  }

  @Test
  void resolvingTheLastIncidentRestoresOnTimeAndRecordsResumption() {
    Incident resolved = incident(IncidentSeverity.HIGH);
    when(incidents.findById(resolved.getId())).thenReturn(Optional.of(resolved));
    when(incidents.findByShipmentIdAndStatusOrderByOpenedAtDesc(
            shipment.getId(), IncidentStatus.OPEN))
        .thenReturn(List.of());
    service.resolve(resolved.getId(), "Road reopened");
    assertThat(shipment.getDeliveryHealth()).isEqualTo(DeliveryHealth.ON_TIME);
    assertThat(resolved.getStatus()).isEqualTo(IncidentStatus.RESOLVED);
    verify(shipments).addEvent(eq(shipment), eq(TrackingEventType.RESUMED), any(), any(), any());
  }

  private Incident incident(IncidentSeverity severity) {
    Incident incident = new Incident();
    incident.beforeInsert();
    incident.setShipment(shipment);
    incident.setSeverity(severity);
    incident.setStatus(IncidentStatus.OPEN);
    incident.setCreatedBy(actor);
    return incident;
  }
}
