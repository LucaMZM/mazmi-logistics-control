package com.mazmi.logistics.inventory;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
  List<StockMovement> findByInventoryLevelIdOrderByCreatedAtDesc(UUID inventoryId);

  List<StockMovement> findByOrderIdAndType(UUID orderId, StockMovementType type);
}
