package com.mazmi.logistics.simulation;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SimulationSchedulerTest {
  private final ShipmentRepository shipments = mock(ShipmentRepository.class);
  private final SimulationService simulation = mock(SimulationService.class);
  private final SimulationScheduler scheduler = new SimulationScheduler(shipments, simulation);

  @Test
  void aFailedShipmentDoesNotPreventOtherShipmentsFromAdvancing() {
    UUID failedId = UUID.randomUUID();
    UUID healthyId = UUID.randomUUID();
    Shipment failed = mock(Shipment.class);
    Shipment healthy = mock(Shipment.class);
    when(failed.getId()).thenReturn(failedId);
    when(healthy.getId()).thenReturn(healthyId);
    when(shipments.findBySimulationActiveTrueAndStatus(ShipmentStatus.IN_TRANSIT))
        .thenReturn(List.of(failed, healthy));
    doThrow(new IllegalStateException("Shipment cannot advance"))
        .when(simulation)
        .advance(failedId);

    scheduler.tick();

    verify(simulation).advance(failedId);
    verify(simulation).advance(healthyId);
  }

  @Test
  void anEmptyTickDoesNotAdvanceAnyShipment() {
    when(shipments.findBySimulationActiveTrueAndStatus(ShipmentStatus.IN_TRANSIT))
        .thenReturn(List.of());

    scheduler.tick();

    org.mockito.Mockito.verifyNoInteractions(simulation);
  }
}
