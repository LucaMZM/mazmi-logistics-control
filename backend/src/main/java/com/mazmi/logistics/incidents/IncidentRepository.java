package com.mazmi.logistics.incidents;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {
  @EntityGraph(attributePaths = {"shipment", "shipment.order", "createdBy"})
  @Query(
      "select i from Incident i where (:status is null or i.status = :status) and (:severity is null or i.severity = :severity) and (:type is null or i.type = :type)")
  Page<Incident> search(
      IncidentStatus status, IncidentSeverity severity, IncidentType type, Pageable pageable);

  long countByStatus(IncidentStatus status);

  boolean existsByShipmentIdAndStatus(UUID shipmentId, IncidentStatus status);

  List<Incident> findTop6ByOrderByOpenedAtDesc();

  List<Incident> findByShipmentIdAndStatusOrderByOpenedAtDesc(
      UUID shipmentId, IncidentStatus status);
}
