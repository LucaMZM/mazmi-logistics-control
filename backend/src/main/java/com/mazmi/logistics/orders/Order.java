package com.mazmi.logistics.orders;

import com.mazmi.logistics.common.jpa.AuditedEntity;
import com.mazmi.logistics.customers.Customer;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.warehouses.Warehouse;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order extends AuditedEntity {
  @Column(name = "order_number", nullable = false, unique = true, length = 40)
  private String orderNumber;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "customer_id")
  private Customer customer;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "warehouse_id")
  private Warehouse warehouse;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private OrderStatus status = OrderStatus.DRAFT;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private OrderPriority priority = OrderPriority.NORMAL;

  @Column(name = "shipping_name", nullable = false, length = 180)
  private String shippingName;

  @Column(name = "shipping_address", nullable = false, length = 220)
  private String shippingAddress;

  @Column(name = "shipping_city", nullable = false, length = 100)
  private String shippingCity;

  @Column(name = "shipping_postal_code", nullable = false, length = 20)
  private String shippingPostalCode;

  @Column(name = "shipping_country", nullable = false, length = 80)
  private String shippingCountry;

  @Column(name = "shipping_latitude", nullable = false, precision = 10, scale = 7)
  private BigDecimal shippingLatitude;

  @Column(name = "shipping_longitude", nullable = false, precision = 10, scale = 7)
  private BigDecimal shippingLongitude;

  @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal totalAmount = BigDecimal.ZERO;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by")
  private User createdBy;

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  public String getOrderNumber() {
    return orderNumber;
  }

  public void setOrderNumber(String orderNumber) {
    this.orderNumber = orderNumber;
  }

  public Customer getCustomer() {
    return customer;
  }

  public void setCustomer(Customer customer) {
    this.customer = customer;
  }

  public Warehouse getWarehouse() {
    return warehouse;
  }

  public void setWarehouse(Warehouse warehouse) {
    this.warehouse = warehouse;
  }

  public OrderStatus getStatus() {
    return status;
  }

  public void setStatus(OrderStatus status) {
    this.status = status;
  }

  public OrderPriority getPriority() {
    return priority;
  }

  public void setPriority(OrderPriority priority) {
    this.priority = priority;
  }

  public String getShippingName() {
    return shippingName;
  }

  public void setShippingName(String shippingName) {
    this.shippingName = shippingName;
  }

  public String getShippingAddress() {
    return shippingAddress;
  }

  public void setShippingAddress(String shippingAddress) {
    this.shippingAddress = shippingAddress;
  }

  public String getShippingCity() {
    return shippingCity;
  }

  public void setShippingCity(String shippingCity) {
    this.shippingCity = shippingCity;
  }

  public String getShippingPostalCode() {
    return shippingPostalCode;
  }

  public void setShippingPostalCode(String shippingPostalCode) {
    this.shippingPostalCode = shippingPostalCode;
  }

  public String getShippingCountry() {
    return shippingCountry;
  }

  public void setShippingCountry(String shippingCountry) {
    this.shippingCountry = shippingCountry;
  }

  public BigDecimal getShippingLatitude() {
    return shippingLatitude;
  }

  public void setShippingLatitude(BigDecimal shippingLatitude) {
    this.shippingLatitude = shippingLatitude;
  }

  public BigDecimal getShippingLongitude() {
    return shippingLongitude;
  }

  public void setShippingLongitude(BigDecimal shippingLongitude) {
    this.shippingLongitude = shippingLongitude;
  }

  public BigDecimal getTotalAmount() {
    return totalAmount;
  }

  public void setTotalAmount(BigDecimal totalAmount) {
    this.totalAmount = totalAmount;
  }

  public User getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(User createdBy) {
    this.createdBy = createdBy;
  }

  public List<OrderItem> getItems() {
    return items;
  }

  public void replaceItems(List<OrderItem> newItems) {
    items.clear();
    newItems.forEach(this::addItem);
  }

  public void addItem(OrderItem item) {
    item.setOrder(this);
    items.add(item);
  }
}
