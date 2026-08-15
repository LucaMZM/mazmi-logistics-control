package com.mazmi.logistics.inventory;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.inventory.dto.InventoryDtos;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderItem;
import com.mazmi.logistics.products.ProductRepository;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.warehouses.WarehouseRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
  private final InventoryRepository inventory;
  private final StockMovementRepository movements;
  private final ProductRepository products;
  private final WarehouseRepository warehouses;
  private final CurrentUser currentUser;

  public InventoryService(
      InventoryRepository inventory,
      StockMovementRepository movements,
      ProductRepository products,
      WarehouseRepository warehouses,
      CurrentUser currentUser) {
    this.inventory = inventory;
    this.movements = movements;
    this.products = products;
    this.warehouses = warehouses;
    this.currentUser = currentUser;
  }

  @Transactional
  public InventoryDtos.Response create(InventoryDtos.Create request) {
    if (inventory
        .findByWarehouseIdAndProductId(request.warehouseId(), request.productId())
        .isPresent())
      throw BusinessException.conflict(
          "INVENTORY_ALREADY_EXISTS", "Inventory already exists for this product and warehouse");
    InventoryLevel level = new InventoryLevel();
    level.setWarehouse(
        warehouses
            .findById(request.warehouseId())
            .orElseThrow(() -> BusinessException.notFound("Warehouse")));
    level.setProduct(
        products
            .findById(request.productId())
            .orElseThrow(() -> BusinessException.notFound("Product")));
    level.setOnHand(request.onHand());
    level.setReserved(0);
    level.setReorderLevel(request.reorderLevel());
    inventory.save(level);
    movement(
        level,
        null,
        StockMovementType.INITIAL,
        request.onHand(),
        0,
        "Initial inventory",
        currentUser.require());
    return InventoryDtos.Response.from(level);
  }

  @Transactional
  public InventoryDtos.Response receive(UUID id, int quantity, String note) {
    if (quantity <= 0)
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "Receipt quantity must be positive");
    InventoryLevel level = find(id);
    apply(level, quantity, 0);
    movement(level, null, StockMovementType.RECEIPT, quantity, 0, note, currentUser.require());
    return InventoryDtos.Response.from(level);
  }

  @Transactional
  public InventoryDtos.Response adjust(UUID id, int delta, String note) {
    if (delta == 0)
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "Adjustment cannot be zero");
    InventoryLevel level = find(id);
    apply(level, delta, 0);
    movement(level, null, StockMovementType.ADJUSTMENT, delta, 0, note, currentUser.require());
    return InventoryDtos.Response.from(level);
  }

  @Transactional
  public void reserve(Order order, User actor) {
    for (OrderItem item : order.getItems()) {
      if (item.getQuantity() <= 0)
        throw new BusinessException(
            HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "Reservation quantity must be positive");
      InventoryLevel level =
          byWarehouseProduct(order.getWarehouse().getId(), item.getProduct().getId());
      if (level.available() < item.getQuantity())
        throw BusinessException.conflict(
            "INSUFFICIENT_STOCK", "Not enough stock available for " + item.getProduct().getSku());
      apply(level, 0, item.getQuantity());
      movement(
          level,
          order,
          StockMovementType.RESERVATION,
          0,
          item.getQuantity(),
          "Reserved for " + order.getOrderNumber(),
          actor);
    }
  }

  @Transactional
  public void release(Order order, User actor) {
    for (OrderItem item : order.getItems()) {
      InventoryLevel level =
          byWarehouseProduct(order.getWarehouse().getId(), item.getProduct().getId());
      apply(level, 0, -item.getQuantity());
      movement(
          level,
          order,
          StockMovementType.RESERVATION_RELEASE,
          0,
          -item.getQuantity(),
          "Reservation released for " + order.getOrderNumber(),
          actor);
    }
  }

  @Transactional
  public void dispatch(Order order, User actor) {
    for (OrderItem item : order.getItems()) {
      InventoryLevel level =
          byWarehouseProduct(order.getWarehouse().getId(), item.getProduct().getId());
      apply(level, -item.getQuantity(), -item.getQuantity());
      movement(
          level,
          order,
          StockMovementType.DISPATCH,
          -item.getQuantity(),
          -item.getQuantity(),
          "Dispatched for " + order.getOrderNumber(),
          actor);
    }
  }

  @Transactional(readOnly = true)
  public InventoryLevel find(UUID id) {
    return inventory
        .findWithWarehouseAndProductById(id)
        .orElseThrow(() -> BusinessException.notFound("Inventory level"));
  }

  @Transactional(readOnly = true)
  public List<InventoryDtos.Movement> history(UUID id) {
    find(id);
    return movements.findByInventoryLevelIdOrderByCreatedAtDesc(id).stream()
        .map(InventoryDtos.Movement::from)
        .toList();
  }

  private InventoryLevel byWarehouseProduct(UUID warehouse, UUID product) {
    return inventory
        .findByWarehouseIdAndProductId(warehouse, product)
        .orElseThrow(
            () ->
                BusinessException.conflict(
                    "INSUFFICIENT_STOCK",
                    "No inventory exists for the requested product and warehouse"));
  }

  private void apply(InventoryLevel level, int onHandDelta, int reservedDelta) {
    int newOnHand = level.getOnHand() + onHandDelta;
    int newReserved = level.getReserved() + reservedDelta;
    if (newOnHand < 0 || newReserved < 0 || newReserved > newOnHand)
      throw BusinessException.conflict(
          "INVALID_INVENTORY_BALANCE", "Inventory balance would violate stock constraints");
    level.setOnHand(newOnHand);
    level.setReserved(newReserved);
  }

  private void movement(
      InventoryLevel level,
      Order order,
      StockMovementType type,
      int onHandDelta,
      int reservedDelta,
      String note,
      User actor) {
    StockMovement movement = new StockMovement();
    movement.setInventoryLevel(level);
    movement.setOrder(order);
    movement.setType(type);
    movement.setOnHandDelta(onHandDelta);
    movement.setReservedDelta(reservedDelta);
    movement.setNote(note);
    movement.setCreatedBy(actor);
    movements.save(movement);
  }
}
