package com.mazmi.logistics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mazmi.logistics.orders.OrderPriority;
import com.mazmi.logistics.orders.OrderService;
import com.mazmi.logistics.orders.dto.OrderDtos;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    properties = {
      "app.demo-enabled=false",
      "app.security.jwt-secret=test-secret-at-least-thirty-two-characters",
      "springdoc.api-docs.enabled=false"
    })
@Testcontainers
class PostgresConstraintTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired OrderService orderService;

  @AfterEach
  void clearSecurity() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void duplicateSkuIsRejectedByPostgres() {
    insertProduct(UUID.randomUUID(), "DUP-001");
    assertThatThrownBy(() -> insertProduct(UUID.randomUUID(), "DUP-001"))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void duplicateUserEmailIsRejectedByPostgres() {
    String email = "duplicate-" + UUID.randomUUID() + "@test.invalid";
    insertUser(UUID.randomUUID(), email);

    assertThatThrownBy(() -> insertUser(UUID.randomUUID(), email))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void duplicateOrderNumberIsRejectedByPostgres() {
    SeededOrder seeded = insertDraftOrder(8, 8);

    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into orders(
                      id, order_number, customer_id, warehouse_id, status, priority,
                      shipping_name, shipping_address, shipping_city, shipping_postal_code,
                      shipping_country, shipping_latitude, shipping_longitude, total_amount,
                      created_by, created_at, updated_at
                    )
                    select ?, order_number, customer_id, warehouse_id, status, priority,
                      shipping_name, shipping_address, shipping_city, shipping_postal_code,
                      shipping_country, shipping_latitude, shipping_longitude, total_amount,
                      created_by, created_at, updated_at
                    from orders where id = ?
                    """,
                    UUID.randomUUID(),
                    seeded.orderId()))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void duplicateTrackingNumberIsRejectedByPostgres() {
    SeededOrder first = insertDraftOrder(8, 8);
    SeededOrder second = insertDraftOrder(8, 8);
    String tracking = "MZ-DUP-" + UUID.randomUUID().toString().substring(0, 8);
    insertShipment(UUID.randomUUID(), tracking, first.orderId());

    assertThatThrownBy(() -> insertShipment(UUID.randomUUID(), tracking, second.orderId()))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void secondShipmentForTheSameOrderIsRejectedByPostgres() {
    SeededOrder seeded = insertDraftOrder(8, 8);
    insertShipment(UUID.randomUUID(), tracking("ONE"), seeded.orderId());

    assertThatThrownBy(() -> insertShipment(UUID.randomUUID(), tracking("TWO"), seeded.orderId()))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void negativeInventoryIsRejectedByPostgres() {
    UUID warehouse = UUID.randomUUID();
    UUID product = UUID.randomUUID();
    jdbc.update(
        "insert into warehouses(id,code,name,address,city,postal_code,country,latitude,longitude,active,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,now(),now())",
        warehouse,
        "WH-T",
        "Test",
        "Test",
        "Test",
        "00000",
        "Test",
        1,
        1,
        true);
    insertProduct(product, "INV-001");
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "insert into inventory_levels(id,warehouse_id,product_id,on_hand,reserved,reorder_level,version,updated_at) values (?,?,?,?,?,?,0,now())",
                    UUID.randomUUID(),
                    warehouse,
                    product,
                    -1,
                    0,
                    1))
        .isInstanceOf(DataAccessException.class);
  }

  @Test
  void failedOrderConfirmationRollsBackEveryReservation() {
    SeededOrder seeded = insertDraftOrder(8, 2);
    authenticate(seeded.email());
    assertThatThrownBy(() -> orderService.confirm(seeded.orderId()))
        .hasMessageContaining("Not enough stock");
    Integer firstReserved =
        jdbc.queryForObject(
            "select reserved from inventory_levels where id = ?",
            Integer.class,
            seeded.firstInventory());
    Integer secondReserved =
        jdbc.queryForObject(
            "select reserved from inventory_levels where id = ?",
            Integer.class,
            seeded.secondInventory());
    String status =
        jdbc.queryForObject(
            "select status from orders where id = ?", String.class, seeded.orderId());
    org.assertj.core.api.Assertions.assertThat(firstReserved).isZero();
    org.assertj.core.api.Assertions.assertThat(secondReserved).isZero();
    org.assertj.core.api.Assertions.assertThat(status).isEqualTo("DRAFT");
  }

  @Test
  void successfulOrderConfirmationReservesAllLines() {
    SeededOrder seeded = insertDraftOrder(8, 8);
    authenticate(seeded.email());
    orderService.confirm(seeded.orderId());
    Integer firstReserved =
        jdbc.queryForObject(
            "select reserved from inventory_levels where id = ?",
            Integer.class,
            seeded.firstInventory());
    Integer secondReserved =
        jdbc.queryForObject(
            "select reserved from inventory_levels where id = ?",
            Integer.class,
            seeded.secondInventory());
    String status =
        jdbc.queryForObject(
            "select status from orders where id = ?", String.class, seeded.orderId());
    assertThat(firstReserved).isEqualTo(4);
    assertThat(secondReserved).isEqualTo(4);
    assertThat(status).isEqualTo("CONFIRMED");
  }

  @Test
  void draftUpdateCanReuseProductsAndAlwaysRefreshesServerPrices() {
    SeededOrder seeded = insertDraftOrder(8, 8);
    authenticate(seeded.email());
    UUID customerId =
        jdbc.queryForObject(
            "select customer_id from orders where id = ?", UUID.class, seeded.orderId());
    UUID warehouseId =
        jdbc.queryForObject(
            "select warehouse_id from orders where id = ?", UUID.class, seeded.orderId());
    List<UUID> productIds =
        jdbc.queryForList(
            "select product_id from order_items where order_id = ? order by product_id",
            UUID.class,
            seeded.orderId());
    jdbc.update(
        "update products set unit_price = ? where id = ?",
        new BigDecimal("17.25"),
        productIds.get(0));
    jdbc.update(
        "update products set unit_price = ? where id = ?",
        new BigDecimal("23.50"),
        productIds.get(1));

    OrderDtos.Detail updated =
        orderService.update(
            seeded.orderId(),
            new OrderDtos.Save(
                customerId,
                warehouseId,
                OrderPriority.HIGH,
                "Updated recipient",
                "Updated address",
                "Updated city",
                "28001",
                "Test",
                BigDecimal.ONE,
                BigDecimal.ONE,
                List.of(
                    new OrderDtos.ItemRequest(productIds.get(0), 2),
                    new OrderDtos.ItemRequest(productIds.get(1), 3))));

    assertThat(updated.items())
        .extracting(OrderDtos.Item::productId, OrderDtos.Item::quantity, OrderDtos.Item::unitPrice)
        .containsExactlyInAnyOrder(
            org.assertj.core.groups.Tuple.tuple(productIds.get(0), 2, new BigDecimal("17.25")),
            org.assertj.core.groups.Tuple.tuple(productIds.get(1), 3, new BigDecimal("23.50")));
    assertThat(updated.totalAmount()).isEqualByComparingTo("105.00");
    assertThat(
            jdbc.queryForObject(
                "select count(*) from order_items where order_id = ?",
                Integer.class,
                seeded.orderId()))
        .isEqualTo(2);
  }

  private void insertProduct(UUID id, String sku) {
    jdbc.update(
        "insert into products(id,sku,name,category,description,weight_kg,unit_price,active,created_at,updated_at) values (?,?,?,?,?,?,?,?,now(),now())",
        id,
        sku,
        "Test product",
        "Test",
        "Test",
        1,
        10,
        true);
  }

  private void insertUser(UUID id, String email) {
    jdbc.update(
        "insert into users(id,name,email,password_hash,role,enabled,created_at,updated_at) values (?,?,?,?,?,?,now(),now())",
        id,
        "Constraint test user",
        email,
        "not-used",
        "VIEWER",
        true);
  }

  private void insertShipment(UUID id, String trackingNumber, UUID orderId) {
    jdbc.update(
        """
        insert into shipments(
          id, tracking_number, order_id, status, delivery_health,
          simulation_progress, simulation_active, created_at, updated_at
        ) values (?, ?, ?, 'CREATED', 'ON_TIME', 0, false, now(), now())
        """,
        id,
        trackingNumber,
        orderId);
  }

  private String tracking(String marker) {
    return "MZ-" + marker + "-" + UUID.randomUUID().toString().substring(0, 8);
  }

  private SeededOrder insertDraftOrder(int firstStock, int secondStock) {
    UUID user = UUID.randomUUID();
    UUID customer = UUID.randomUUID();
    UUID warehouse = UUID.randomUUID();
    UUID firstProduct = UUID.randomUUID();
    UUID secondProduct = UUID.randomUUID();
    UUID firstInventory = UUID.randomUUID();
    UUID secondInventory = UUID.randomUUID();
    UUID order = UUID.randomUUID();
    String marker = order.toString().substring(0, 8);
    String email = marker + "@test.invalid";
    jdbc.update(
        "insert into users(id,name,email,password_hash,role,enabled,created_at,updated_at) values (?,?,?,?,?,?,now(),now())",
        user,
        "Test operator",
        email,
        "not-used-in-service-test",
        "OPERATOR",
        true);
    jdbc.update(
        "insert into customers(id,code,company_name,contact_name,email,phone,address,city,postal_code,country,latitude,longitude,active,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,now(),now())",
        customer,
        "C-" + marker,
        "Test customer",
        "Test contact",
        email,
        "000",
        "Test address",
        "Test city",
        "00000",
        "Test",
        1,
        1,
        true);
    jdbc.update(
        "insert into warehouses(id,code,name,address,city,postal_code,country,latitude,longitude,active,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,now(),now())",
        warehouse,
        "W-" + marker,
        "Test warehouse",
        "Test address",
        "Test city",
        "00000",
        "Test",
        1,
        1,
        true);
    insertProduct(firstProduct, "P1-" + marker);
    insertProduct(secondProduct, "P2-" + marker);
    jdbc.update(
        "insert into inventory_levels(id,warehouse_id,product_id,on_hand,reserved,reorder_level,version,updated_at) values (?,?,?,?,?,?,0,now())",
        firstInventory,
        warehouse,
        firstProduct,
        firstStock,
        0,
        1);
    jdbc.update(
        "insert into inventory_levels(id,warehouse_id,product_id,on_hand,reserved,reorder_level,version,updated_at) values (?,?,?,?,?,?,0,now())",
        secondInventory,
        warehouse,
        secondProduct,
        secondStock,
        0,
        1);
    jdbc.update(
        "insert into orders(id,order_number,customer_id,warehouse_id,status,priority,shipping_name,shipping_address,shipping_city,shipping_postal_code,shipping_country,shipping_latitude,shipping_longitude,total_amount,created_by,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        order,
        "ORD-" + marker,
        customer,
        warehouse,
        "DRAFT",
        "NORMAL",
        "Test",
        "Test",
        "Test",
        "00000",
        "Test",
        1,
        1,
        20,
        user,
        java.sql.Timestamp.from(java.time.Instant.now()),
        java.sql.Timestamp.from(java.time.Instant.now()));
    jdbc.update(
        "insert into order_items(id,order_id,product_id,quantity,unit_price) values (?,?,?,?,?)",
        UUID.randomUUID(),
        order,
        firstProduct,
        4,
        10);
    jdbc.update(
        "insert into order_items(id,order_id,product_id,quantity,unit_price) values (?,?,?,?,?)",
        UUID.randomUUID(),
        order,
        secondProduct,
        4,
        10);
    return new SeededOrder(order, firstInventory, secondInventory, email);
  }

  private void authenticate(String email) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"))));
  }

  private record SeededOrder(
      UUID orderId, UUID firstInventory, UUID secondInventory, String email) {}
}
