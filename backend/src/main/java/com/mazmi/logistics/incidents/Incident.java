package com.mazmi.logistics.incidents;

import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.users.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "incidents")
public class Incident {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "shipment_id")
  private Shipment shipment;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private IncidentType type;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private IncidentSeverity severity;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private IncidentStatus status = IncidentStatus.OPEN;

  @Column(nullable = false, length = 180)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String description;

  @Column(name = "opened_at", nullable = false)
  private Instant openedAt;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  @Column(name = "resolution_note", columnDefinition = "text")
  private String resolutionNote;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by")
  private User createdBy;

  @PrePersist
  void beforeInsert() {
    if (id == null) id = UUID.randomUUID();
    if (openedAt == null) openedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public Shipment getShipment() {
    return shipment;
  }

  public void setShipment(Shipment shipment) {
    this.shipment = shipment;
  }

  public IncidentType getType() {
    return type;
  }

  public void setType(IncidentType type) {
    this.type = type;
  }

  public IncidentSeverity getSeverity() {
    return severity;
  }

  public void setSeverity(IncidentSeverity severity) {
    this.severity = severity;
  }

  public IncidentStatus getStatus() {
    return status;
  }

  public void setStatus(IncidentStatus status) {
    this.status = status;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Instant getOpenedAt() {
    return openedAt;
  }

  public void setOpenedAt(Instant openedAt) {
    this.openedAt = openedAt;
  }

  public Instant getResolvedAt() {
    return resolvedAt;
  }

  public void setResolvedAt(Instant resolvedAt) {
    this.resolvedAt = resolvedAt;
  }

  public String getResolutionNote() {
    return resolutionNote;
  }

  public void setResolutionNote(String resolutionNote) {
    this.resolutionNote = resolutionNote;
  }

  public User getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(User createdBy) {
    this.createdBy = createdBy;
  }
}
