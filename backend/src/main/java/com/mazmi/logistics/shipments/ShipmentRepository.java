package com.mazmi.logistics.shipments;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ShipmentRepository
    extends JpaRepository<Shipment, UUID>, JpaSpecificationExecutor<Shipment> {
  @EntityGraph(
      attributePaths = {
        "order",
        "order.customer",
        "order.warehouse",
        "order.items",
        "order.items.product",
        "driver",
        "vehicle"
      })
  @Query("select distinct s from Shipment s where s.id = :id")
  Optional<Shipment> findDetailedById(UUID id);

  Optional<Shipment> findByOrderId(UUID orderId);

  long countByStatus(ShipmentStatus status);

  long countByDeliveryHealthAndStatus(DeliveryHealth health, ShipmentStatus status);

  List<Shipment> findBySimulationActiveTrueAndStatus(ShipmentStatus status);

  List<Shipment> findByStatusOrderByUpdatedAtDesc(ShipmentStatus status);

  boolean existsByDriverIdAndStatusIn(UUID driverId, List<ShipmentStatus> statuses);

  boolean existsByVehicleIdAndStatusIn(UUID vehicleId, List<ShipmentStatus> statuses);
}
