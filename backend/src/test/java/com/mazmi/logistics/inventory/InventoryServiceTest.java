package com.mazmi.logistics.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderItem;
import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.products.ProductRepository;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.warehouses.Warehouse;
import com.mazmi.logistics.warehouses.WarehouseRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InventoryServiceTest {
  private final InventoryRepository inventory = mock(InventoryRepository.class);
  private final StockMovementRepository movements = mock(StockMovementRepository.class);
  private final CurrentUser currentUser = mock(CurrentUser.class);
  private InventoryService service;
  private InventoryLevel level;
  private Order order;

  @BeforeEach
  void setUp() {
    service =
        new InventoryService(
            inventory,
            movements,
            mock(ProductRepository.class),
            mock(WarehouseRepository.class),
            currentUser);
    Warehouse warehouse = new Warehouse();
    warehouse.setId(UUID.randomUUID());
    Product product = new Product();
    product.setId(UUID.randomUUID());
    product.setSku("TL-220");
    product.setActive(true);
    level = new InventoryLevel();
    level.setWarehouse(warehouse);
    level.setProduct(product);
    level.setOnHand(10);
    level.setReserved(0);
    order = new Order();
    order.setId(UUID.randomUUID());
    order.setWarehouse(warehouse);
    order.setOrderNumber("ORD-TEST");
    OrderItem item = new OrderItem();
    item.setProduct(product);
    item.setQuantity(4);
    order.addItem(item);
    when(inventory.findByWarehouseIdAndProductId(warehouse.getId(), product.getId()))
        .thenReturn(Optional.of(level));
  }

  @Test
  void successfulReservationUpdatesReservedAndWritesMovement() {
    service.reserve(order, new User());
    assertThat(level.getReserved()).isEqualTo(4);
    assertThat(level.available()).isEqualTo(6);
    verify(movements)
        .save(
            org.mockito.ArgumentMatchers.argThat(
                m -> m.getType() == StockMovementType.RESERVATION && m.getReservedDelta() == 4));
  }

  @Test
  void insufficientStockLeavesBalanceUntouched() {
    level.setOnHand(3);
    assertThatThrownBy(() -> service.reserve(order, new User()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("TL-220");
    assertThat(level.getReserved()).isZero();
  }

  @Test
  void negativeReservationQuantityIsRejected() {
    order.getItems().getFirst().setQuantity(-1);
    assertThatThrownBy(() -> service.reserve(order, new User()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("positive");
  }

  @Test
  void dispatchCannotMakeInventoryNegative() {
    level.setOnHand(2);
    level.setReserved(2);
    order.getItems().getFirst().setQuantity(4);
    assertThatThrownBy(() -> service.dispatch(order, new User()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("constraints");
  }

  @Test
  void releaseRestoresAvailability() {
    level.setReserved(4);
    service.release(order, new User());
    assertThat(level.getReserved()).isZero();
    assertThat(level.available()).isEqualTo(10);
  }
}
