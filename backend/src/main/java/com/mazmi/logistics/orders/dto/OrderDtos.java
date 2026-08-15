package com.mazmi.logistics.orders.dto;

import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderItem;
import com.mazmi.logistics.orders.OrderPriority;
import com.mazmi.logistics.orders.OrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
  private OrderDtos() {}

  public record ItemRequest(@NotNull UUID productId, @Min(1) int quantity) {}

  public record Save(
      @NotNull UUID customerId,
      @NotNull UUID warehouseId,
      @NotNull OrderPriority priority,
      @NotBlank String shippingName,
      @NotBlank String shippingAddress,
      @NotBlank String shippingCity,
      @NotBlank String shippingPostalCode,
      @NotBlank String shippingCountry,
      @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal shippingLatitude,
      @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal shippingLongitude,
      @NotEmpty List<@Valid ItemRequest> items) {}

  public record Item(
      UUID productId,
      String sku,
      String product,
      int quantity,
      BigDecimal unitPrice,
      BigDecimal subtotal) {
    public static Item from(OrderItem item) {
      return new Item(
          item.getProduct().getId(),
          item.getProduct().getSku(),
          item.getProduct().getName(),
          item.getQuantity(),
          item.getUnitPrice(),
          item.subtotal());
    }
  }

  public record Summary(
      UUID id,
      String orderNumber,
      String customer,
      String warehouse,
      OrderStatus status,
      OrderPriority priority,
      BigDecimal totalAmount,
      Instant createdAt) {
    public static Summary from(Order order) {
      return new Summary(
          order.getId(),
          order.getOrderNumber(),
          order.getCustomer().getCompanyName(),
          order.getWarehouse().getName(),
          order.getStatus(),
          order.getPriority(),
          order.getTotalAmount(),
          order.getCreatedAt());
    }
  }

  public record Detail(
      UUID id,
      String orderNumber,
      UUID customerId,
      String customer,
      UUID warehouseId,
      String warehouse,
      OrderStatus status,
      OrderPriority priority,
      String shippingName,
      String shippingAddress,
      String shippingCity,
      String shippingPostalCode,
      String shippingCountry,
      BigDecimal shippingLatitude,
      BigDecimal shippingLongitude,
      BigDecimal totalAmount,
      String createdBy,
      Instant createdAt,
      Instant updatedAt,
      UUID shipmentId,
      List<Item> items) {}
}
