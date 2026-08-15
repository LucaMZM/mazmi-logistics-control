package com.mazmi.logistics.orders;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.common.web.PageResponse;
import com.mazmi.logistics.customers.Customer;
import com.mazmi.logistics.customers.CustomerRepository;
import com.mazmi.logistics.inventory.InventoryService;
import com.mazmi.logistics.orders.dto.OrderDtos;
import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.products.ProductRepository;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentService;
import com.mazmi.logistics.warehouses.Warehouse;
import com.mazmi.logistics.warehouses.WarehouseRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
  private final OrderRepository orders;
  private final CustomerRepository customers;
  private final WarehouseRepository warehouses;
  private final ProductRepository products;
  private final InventoryService inventory;
  private final ShipmentService shipmentService;
  private final ShipmentRepository shipments;
  private final CurrentUser currentUser;

  public OrderService(
      OrderRepository orders,
      CustomerRepository customers,
      WarehouseRepository warehouses,
      ProductRepository products,
      InventoryService inventory,
      ShipmentService shipmentService,
      ShipmentRepository shipments,
      CurrentUser currentUser) {
    this.orders = orders;
    this.customers = customers;
    this.warehouses = warehouses;
    this.products = products;
    this.inventory = inventory;
    this.shipmentService = shipmentService;
    this.shipments = shipments;
    this.currentUser = currentUser;
  }

  @Transactional
  public OrderDtos.Detail create(OrderDtos.Save request) {
    Order order = new Order();
    order.setOrderNumber(
        "ORD-"
            + Year.now().getValue()
            + "-"
            + UUID.randomUUID().toString().substring(0, 5).toUpperCase(Locale.ROOT));
    order.setStatus(OrderStatus.DRAFT);
    order.setCreatedBy(currentUser.require());
    applyDraft(order, request);
    orders.save(order);
    return detail(order);
  }

  @Transactional
  public OrderDtos.Detail update(UUID id, OrderDtos.Save request) {
    Order order = require(id);
    expect(order, OrderStatus.DRAFT, "Only draft orders can be edited");
    order.replaceItems(List.of());
    orders.flush();
    applyDraft(order, request);
    return detail(order);
  }

  @Transactional
  public OrderDtos.Detail confirm(UUID id) {
    Order order = require(id);
    expect(order, OrderStatus.DRAFT, "Only a draft order can be confirmed");
    if (order.getItems().isEmpty())
      throw BusinessException.conflict(
          "ORDER_ITEMS_REQUIRED", "Cannot confirm an order without items");
    if (!order.getCustomer().isActive()
        || !order.getWarehouse().isActive()
        || order.getItems().stream().anyMatch(item -> !item.getProduct().isActive()))
      throw BusinessException.conflict(
          "INACTIVE_RESOURCE", "Customer, warehouse and products must be active");
    inventory.reserve(order, currentUser.require());
    order.setStatus(OrderStatus.CONFIRMED);
    return detail(order);
  }

  @Transactional
  public OrderDtos.Detail startPreparation(UUID id) {
    Order order = require(id);
    expect(order, OrderStatus.CONFIRMED, "Only a confirmed order can enter preparation");
    order.setStatus(OrderStatus.PREPARING);
    return detail(order);
  }

  @Transactional
  public OrderDtos.Detail markReady(UUID id) {
    Order order = require(id);
    expect(order, OrderStatus.PREPARING, "Only an order in preparation can be marked ready");
    order.setStatus(OrderStatus.READY);
    shipmentService.createForOrder(order);
    return detail(order);
  }

  @Transactional
  public OrderDtos.Detail cancel(UUID id) {
    Order order = require(id);
    if (order.getStatus() == OrderStatus.SHIPPED
        || order.getStatus() == OrderStatus.DELIVERED
        || order.getStatus() == OrderStatus.CANCELLED)
      throw BusinessException.conflict(
          "INVALID_ORDER_TRANSITION", "This order cannot be cancelled");
    if (order.getStatus() != OrderStatus.DRAFT) inventory.release(order, currentUser.require());
    shipmentService.cancelForOrder(order);
    order.setStatus(OrderStatus.CANCELLED);
    return detail(order);
  }

  @Transactional(readOnly = true)
  public OrderDtos.Detail get(UUID id) {
    return detail(require(id));
  }

  @Transactional(readOnly = true)
  public PageResponse<OrderDtos.Summary> list(
      String search,
      OrderStatus status,
      OrderPriority priority,
      UUID customer,
      UUID warehouse,
      int page,
      int size) {
    Specification<Order> spec =
        (root, query, builder) -> {
          List<Predicate> predicates = new ArrayList<>();
          if (search != null && !search.isBlank())
            predicates.add(
                builder.or(
                    builder.like(
                        builder.lower(root.get("orderNumber")),
                        "%" + search.toLowerCase(Locale.ROOT) + "%"),
                    builder.like(
                        builder.lower(root.join("customer").get("companyName")),
                        "%" + search.toLowerCase(Locale.ROOT) + "%")));
          if (status != null) predicates.add(builder.equal(root.get("status"), status));
          if (priority != null) predicates.add(builder.equal(root.get("priority"), priority));
          if (customer != null)
            predicates.add(builder.equal(root.get("customer").get("id"), customer));
          if (warehouse != null)
            predicates.add(builder.equal(root.get("warehouse").get("id"), warehouse));
          return builder.and(predicates.toArray(Predicate[]::new));
        };
    Page<Order> result =
        orders.findAll(
            spec,
            PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
    return PageResponse.from(result, OrderDtos.Summary::from);
  }

  private void applyDraft(Order order, OrderDtos.Save request) {
    Customer customer =
        customers
            .findById(request.customerId())
            .orElseThrow(() -> BusinessException.notFound("Customer"));
    Warehouse warehouse =
        warehouses
            .findById(request.warehouseId())
            .orElseThrow(() -> BusinessException.notFound("Warehouse"));
    if (new HashSet<>(request.items().stream().map(OrderDtos.ItemRequest::productId).toList())
            .size()
        != request.items().size())
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "DUPLICATE_ORDER_ITEM", "Each product may appear only once");
    List<OrderItem> items =
        request.items().stream()
            .map(
                itemRequest -> {
                  Product product =
                      products
                          .findById(itemRequest.productId())
                          .orElseThrow(() -> BusinessException.notFound("Product"));
                  OrderItem item = new OrderItem();
                  item.setProduct(product);
                  item.setQuantity(itemRequest.quantity());
                  item.setUnitPrice(product.getUnitPrice());
                  return item;
                })
            .toList();
    order.setCustomer(customer);
    order.setWarehouse(warehouse);
    order.setPriority(request.priority());
    order.setShippingName(request.shippingName());
    order.setShippingAddress(request.shippingAddress());
    order.setShippingCity(request.shippingCity());
    order.setShippingPostalCode(request.shippingPostalCode());
    order.setShippingCountry(request.shippingCountry());
    order.setShippingLatitude(request.shippingLatitude());
    order.setShippingLongitude(request.shippingLongitude());
    order.replaceItems(items);
    order.setTotalAmount(
        items.stream().map(OrderItem::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add));
  }

  private Order require(UUID id) {
    return orders.findDetailedById(id).orElseThrow(() -> BusinessException.notFound("Order"));
  }

  private void expect(Order order, OrderStatus status, String message) {
    if (order.getStatus() != status)
      throw BusinessException.conflict("INVALID_ORDER_TRANSITION", message);
  }

  private OrderDtos.Detail detail(Order order) {
    UUID shipmentId =
        shipments.findByOrderId(order.getId()).map(shipment -> shipment.getId()).orElse(null);
    return new OrderDtos.Detail(
        order.getId(),
        order.getOrderNumber(),
        order.getCustomer().getId(),
        order.getCustomer().getCompanyName(),
        order.getWarehouse().getId(),
        order.getWarehouse().getName(),
        order.getStatus(),
        order.getPriority(),
        order.getShippingName(),
        order.getShippingAddress(),
        order.getShippingCity(),
        order.getShippingPostalCode(),
        order.getShippingCountry(),
        order.getShippingLatitude(),
        order.getShippingLongitude(),
        order.getTotalAmount(),
        order.getCreatedBy().getName(),
        order.getCreatedAt(),
        order.getUpdatedAt(),
        shipmentId,
        order.getItems().stream().map(OrderDtos.Item::from).toList());
  }
}
