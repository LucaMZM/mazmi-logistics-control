package com.mazmi.logistics.inventory;

import com.mazmi.logistics.orders.Order;
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
@Table(name = "stock_movements")
public class StockMovement {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "inventory_level_id")
  private InventoryLevel inventoryLevel;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "order_id")
  private Order order;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private StockMovementType type;

  @Column(name = "on_hand_delta", nullable = false)
  private int onHandDelta;

  @Column(name = "reserved_delta", nullable = false)
  private int reservedDelta;

  @Column(nullable = false, length = 300)
  private String note;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by")
  private User createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void beforeInsert() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public InventoryLevel getInventoryLevel() {
    return inventoryLevel;
  }

  public void setInventoryLevel(InventoryLevel inventoryLevel) {
    this.inventoryLevel = inventoryLevel;
  }

  public Order getOrder() {
    return order;
  }

  public void setOrder(Order order) {
    this.order = order;
  }

  public StockMovementType getType() {
    return type;
  }

  public void setType(StockMovementType type) {
    this.type = type;
  }

  public int getOnHandDelta() {
    return onHandDelta;
  }

  public void setOnHandDelta(int onHandDelta) {
    this.onHandDelta = onHandDelta;
  }

  public int getReservedDelta() {
    return reservedDelta;
  }

  public void setReservedDelta(int reservedDelta) {
    this.reservedDelta = reservedDelta;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public User getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(User createdBy) {
    this.createdBy = createdBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
