package com.mazmi.logistics.simulation;

import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SimulationScheduler {
  private final ShipmentRepository shipments;
  private final SimulationService simulation;

  public SimulationScheduler(ShipmentRepository shipments, SimulationService simulation) {
    this.shipments = shipments;
    this.simulation = simulation;
  }

  @Scheduled(fixedDelayString = "${app.simulation.tick-ms:5000}")
  public void tick() {
    shipments.findBySimulationActiveTrueAndStatus(ShipmentStatus.IN_TRANSIT).stream()
        .map(shipment -> shipment.getId())
        .toList()
        .forEach(this::advanceSafely);
  }

  private void advanceSafely(UUID id) {
    simulation.advance(id);
  }
}
