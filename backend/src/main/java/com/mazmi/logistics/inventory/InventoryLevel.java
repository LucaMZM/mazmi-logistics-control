package com.mazmi.logistics.inventory;

import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.warehouses.Warehouse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "inventory_levels",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_inventory_warehouse_product",
            columnNames = {"warehouse_id", "product_id"}))
public class InventoryLevel {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "warehouse_id")
  private Warehouse warehouse;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id")
  private Product product;

  @Column(name = "on_hand", nullable = false)
  private int onHand;

  @Column(nullable = false)
  private int reserved;

  @Column(name = "reorder_level", nullable = false)
  private int reorderLevel;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void beforeInsert() {
    if (id == null) id = UUID.randomUUID();
    updatedAt = Instant.now();
  }

  @PreUpdate
  void beforeUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public Warehouse getWarehouse() {
    return warehouse;
  }

  public void setWarehouse(Warehouse warehouse) {
    this.warehouse = warehouse;
  }

  public Product getProduct() {
    return product;
  }

  public void setProduct(Product product) {
    this.product = product;
  }

  public int getOnHand() {
    return onHand;
  }

  public void setOnHand(int onHand) {
    this.onHand = onHand;
  }

  public int getReserved() {
    return reserved;
  }

  public void setReserved(int reserved) {
    this.reserved = reserved;
  }

  public int getReorderLevel() {
    return reorderLevel;
  }

  public void setReorderLevel(int reorderLevel) {
    this.reorderLevel = reorderLevel;
  }

  public long getVersion() {
    return version;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public int available() {
    return onHand - reserved;
  }
}
