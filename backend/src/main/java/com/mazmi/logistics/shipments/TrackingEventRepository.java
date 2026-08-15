package com.mazmi.logistics.shipments;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, UUID> {
  List<TrackingEvent> findByShipmentIdOrderByEventTimeAsc(UUID shipmentId);

  boolean existsByShipmentIdAndType(UUID shipmentId, TrackingEventType type);

  boolean existsByShipmentIdAndDescription(UUID shipmentId, String description);
}
