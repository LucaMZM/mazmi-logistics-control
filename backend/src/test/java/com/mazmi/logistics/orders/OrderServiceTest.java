package com.mazmi.logistics.orders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.customers.Customer;
import com.mazmi.logistics.customers.CustomerRepository;
import com.mazmi.logistics.inventory.InventoryService;
import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.products.ProductRepository;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentService;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.warehouses.Warehouse;
import com.mazmi.logistics.warehouses.WarehouseRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OrderServiceTest {
  private final OrderRepository orders = mock(OrderRepository.class);
  private final InventoryService inventory = mock(InventoryService.class);
  private final ShipmentService shipmentService = mock(ShipmentService.class);
  private final ShipmentRepository shipments = mock(ShipmentRepository.class);
  private final CurrentUser currentUser = mock(CurrentUser.class);
  private OrderService service;
  private Order order;
  private User user;

  @BeforeEach
  void setUp() {
    service =
        new OrderService(
            orders,
            mock(CustomerRepository.class),
            mock(WarehouseRepository.class),
            mock(ProductRepository.class),
            inventory,
            shipmentService,
            shipments,
            currentUser);
    user = new User();
    user.setName("Operator");
    Customer customer = new Customer();
    customer.setId(UUID.randomUUID());
    customer.setActive(true);
    customer.setCompanyName("Demo Customer");
    Warehouse warehouse = new Warehouse();
    warehouse.setId(UUID.randomUUID());
    warehouse.setActive(true);
    warehouse.setName("Demo Warehouse");
    order = new Order();
    order.setId(UUID.randomUUID());
    order.setOrderNumber("ORD-TEST");
    order.setCustomer(customer);
    order.setWarehouse(warehouse);
    order.setCreatedBy(user);
    order.setStatus(OrderStatus.DRAFT);
    order.setTotalAmount(BigDecimal.TEN);
    when(orders.findDetailedById(order.getId())).thenReturn(Optional.of(order));
    when(currentUser.require()).thenReturn(user);
    when(shipments.findByOrderId(order.getId())).thenReturn(Optional.empty());
  }

  @Test
  void cannotConfirmWithoutItems() {
    assertThatThrownBy(() -> service.confirm(order.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("without items");
    assertThat(order.getStatus()).isEqualTo(OrderStatus.DRAFT);
  }

  @Test
  void successfulConfirmationReservesStock() {
    addItem();
    service.confirm(order.getId());
    verify(inventory).reserve(order, user);
    assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
  }

  @Test
  void cannotTransitionDraftDirectlyToPreparation() {
    assertThatThrownBy(() -> service.startPreparation(order.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("confirmed");
  }

  @Test
  void cancellationReleasesReservations() {
    addItem();
    order.setStatus(OrderStatus.CONFIRMED);
    service.cancel(order.getId());
    verify(inventory).release(order, user);
    verify(shipmentService).cancelForOrder(order);
    assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
  }

  @Test
  void shippedOrderCannotBeCancelled() {
    addItem();
    order.setStatus(OrderStatus.SHIPPED);

    assertThatThrownBy(() -> service.cancel(order.getId()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("cannot be cancelled");
    verify(inventory, never()).release(order, user);
    assertThat(order.getStatus()).isEqualTo(OrderStatus.SHIPPED);
  }

  @Test
  void readyTransitionCreatesShipment() {
    addItem();
    order.setStatus(OrderStatus.PREPARING);
    service.markReady(order.getId());
    verify(shipmentService).createForOrder(order);
    assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
  }

  private void addItem() {
    Product product = new Product();
    product.setId(UUID.randomUUID());
    product.setSku("TL-220");
    product.setActive(true);
    product.setUnitPrice(BigDecimal.TEN);
    OrderItem item = new OrderItem();
    item.setProduct(product);
    item.setQuantity(1);
    item.setUnitPrice(BigDecimal.TEN);
    order.addItem(item);
  }
}
