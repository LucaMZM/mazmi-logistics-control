package com.mazmi.logistics.inventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryRepository extends JpaRepository<InventoryLevel, UUID> {
  @EntityGraph(attributePaths = {"warehouse", "product"})
  Optional<InventoryLevel> findWithWarehouseAndProductById(UUID id);

  Optional<InventoryLevel> findByWarehouseIdAndProductId(UUID warehouseId, UUID productId);

  @EntityGraph(attributePaths = {"warehouse", "product"})
  @Query(
      "select i from InventoryLevel i where (:search = '' or lower(i.product.sku) like lower(concat('%', :search, '%')) or lower(i.product.name) like lower(concat('%', :search, '%'))) and (:warehouseId is null or i.warehouse.id = :warehouseId) and (:lowStock = false or (i.onHand - i.reserved) <= i.reorderLevel)")
  Page<InventoryLevel> search(
      @Param("search") String search,
      @Param("warehouseId") UUID warehouseId,
      @Param("lowStock") boolean lowStock,
      Pageable pageable);

  @EntityGraph(attributePaths = {"warehouse", "product"})
  @Query(
      "select i from InventoryLevel i where (i.onHand - i.reserved) <= i.reorderLevel order by (i.onHand - i.reserved)")
  List<InventoryLevel> findCritical(Pageable pageable);
}
