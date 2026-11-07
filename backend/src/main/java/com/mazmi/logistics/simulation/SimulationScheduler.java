package com.mazmi.logistics.simulation;

import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SimulationScheduler {
  private static final Logger LOGGER = LoggerFactory.getLogger(SimulationScheduler.class);
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
    try {
      simulation.advance(id);
    } catch (RuntimeException exception) {
      LOGGER.error("Simulation tick failed for shipment {}. Retrying next tick.", id, exception);
    }
  }
}
