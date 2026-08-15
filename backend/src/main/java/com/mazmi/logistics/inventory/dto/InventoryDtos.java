package com.mazmi.logistics.inventory.dto;

import com.mazmi.logistics.inventory.InventoryLevel;
import com.mazmi.logistics.inventory.StockMovement;
import com.mazmi.logistics.inventory.StockMovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class InventoryDtos {
  private InventoryDtos() {}

  public record Create(
      @NotNull UUID warehouseId,
      @NotNull UUID productId,
      @Min(0) int onHand,
      @Min(0) int reorderLevel) {}

  public record Receive(@Min(1) int quantity, @NotBlank String note) {}

  public record Adjust(int onHandDelta, @NotBlank String note) {}

  public record Response(
      UUID id,
      UUID productId,
      String sku,
      String product,
      UUID warehouseId,
      String warehouse,
      int onHand,
      int reserved,
      int available,
      int reorderLevel,
      String stockStatus,
      long version,
      Instant updatedAt) {
    public static Response from(InventoryLevel level) {
      int available = level.available();
      String status =
          available == 0
              ? "OUT_OF_STOCK"
              : available <= level.getReorderLevel() ? "LOW_STOCK" : "HEALTHY";
      return new Response(
          level.getId(),
          level.getProduct().getId(),
          level.getProduct().getSku(),
          level.getProduct().getName(),
          level.getWarehouse().getId(),
          level.getWarehouse().getName(),
          level.getOnHand(),
          level.getReserved(),
          available,
          level.getReorderLevel(),
          status,
          level.getVersion(),
          level.getUpdatedAt());
    }
  }

  public record Movement(
      UUID id,
      StockMovementType type,
      int onHandDelta,
      int reservedDelta,
      String note,
      String createdBy,
      Instant createdAt) {
    public static Movement from(StockMovement movement) {
      return new Movement(
          movement.getId(),
          movement.getType(),
          movement.getOnHandDelta(),
          movement.getReservedDelta(),
          movement.getNote(),
          movement.getCreatedBy() == null ? "System" : movement.getCreatedBy().getName(),
          movement.getCreatedAt());
    }
  }
}
