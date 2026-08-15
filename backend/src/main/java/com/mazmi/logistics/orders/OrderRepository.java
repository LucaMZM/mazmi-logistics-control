package com.mazmi.logistics.orders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository
    extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {
  @EntityGraph(attributePaths = {"customer", "warehouse", "createdBy", "items", "items.product"})
  @Query("select distinct o from Order o where o.id = :id")
  Optional<Order> findDetailedById(UUID id);

  long countByCreatedAtBetween(Instant start, Instant end);

  long countByStatus(OrderStatus status);

  List<Order> findTop8ByOrderByCreatedAtDesc();
}
