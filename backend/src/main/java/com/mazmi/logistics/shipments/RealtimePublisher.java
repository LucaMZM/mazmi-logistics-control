package com.mazmi.logistics.shipments;

import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class RealtimePublisher {
  private static final Logger LOGGER = LoggerFactory.getLogger(RealtimePublisher.class);
  private final SimpMessagingTemplate messaging;

  public RealtimePublisher(SimpMessagingTemplate messaging) {
    this.messaging = messaging;
  }

  public void shipment(Shipment shipment, ShipmentDtos.Event latestEvent) {
    UUID shipmentId = shipment.getId();
    ShipmentDtos.Realtime update =
        new ShipmentDtos.Realtime(
            shipmentId,
            shipment.getStatus(),
            shipment.getDeliveryHealth(),
            shipment.getCurrentLatitude(),
            shipment.getCurrentLongitude(),
            shipment.getSimulationProgress(),
            shipment.isSimulationActive(),
            shipment.getEstimatedDeliveryAt(),
            latestEvent);
    if (TransactionSynchronizationManager.isActualTransactionActive()
        && TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              send(shipmentId, update);
            }
          });
      return;
    }
    send(shipmentId, update);
  }

  private void send(UUID shipmentId, ShipmentDtos.Realtime update) {
    try {
      messaging.convertAndSend("/topic/shipments/" + shipmentId, update);
      messaging.convertAndSend("/topic/dashboard", update);
    } catch (RuntimeException exception) {
      LOGGER.warn("Realtime update could not be published for shipment {}", shipmentId, exception);
    }
  }
}
