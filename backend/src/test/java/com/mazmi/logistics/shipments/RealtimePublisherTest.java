package com.mazmi.logistics.shipments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.mazmi.logistics.shipments.dto.ShipmentDtos;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class RealtimePublisherTest {
  private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
  private final RealtimePublisher publisher = new RealtimePublisher(messaging);

  @AfterEach
  void clearTransactionState() {
    if (TransactionSynchronizationManager.isSynchronizationActive())
      TransactionSynchronizationManager.clearSynchronization();
    TransactionSynchronizationManager.setActualTransactionActive(false);
  }

  @Test
  void transactionalUpdateIsPublishedOnlyAfterCommit() {
    TransactionSynchronizationManager.setActualTransactionActive(true);
    TransactionSynchronizationManager.initSynchronization();
    Shipment shipment = shipment();

    publisher.shipment(shipment, null);

    verifyNoInteractions(messaging);
    assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);
    TransactionSynchronizationManager.getSynchronizations().getFirst().afterCommit();
    verify(messaging)
        .convertAndSend(
            eq("/topic/shipments/" + shipment.getId()), any(ShipmentDtos.Realtime.class));
    verify(messaging).convertAndSend(eq("/topic/dashboard"), any(ShipmentDtos.Realtime.class));
  }

  @Test
  void nonTransactionalUpdateIsPublishedImmediately() {
    Shipment shipment = shipment();

    publisher.shipment(shipment, null);

    verify(messaging)
        .convertAndSend(
            eq("/topic/shipments/" + shipment.getId()), any(ShipmentDtos.Realtime.class));
  }

  private Shipment shipment() {
    Shipment shipment = new Shipment();
    shipment.setId(UUID.randomUUID());
    shipment.setStatus(ShipmentStatus.IN_TRANSIT);
    shipment.setDeliveryHealth(DeliveryHealth.ON_TIME);
    return shipment;
  }
}
