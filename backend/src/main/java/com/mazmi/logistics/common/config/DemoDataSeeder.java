package com.mazmi.logistics.common.config;

import com.mazmi.logistics.customers.Customer;
import com.mazmi.logistics.customers.CustomerRepository;
import com.mazmi.logistics.fleet.drivers.Driver;
import com.mazmi.logistics.fleet.drivers.DriverRepository;
import com.mazmi.logistics.fleet.drivers.DriverStatus;
import com.mazmi.logistics.fleet.vehicles.Vehicle;
import com.mazmi.logistics.fleet.vehicles.VehicleRepository;
import com.mazmi.logistics.fleet.vehicles.VehicleStatus;
import com.mazmi.logistics.fleet.vehicles.VehicleType;
import com.mazmi.logistics.incidents.Incident;
import com.mazmi.logistics.incidents.IncidentRepository;
import com.mazmi.logistics.incidents.IncidentSeverity;
import com.mazmi.logistics.incidents.IncidentStatus;
import com.mazmi.logistics.incidents.IncidentType;
import com.mazmi.logistics.inventory.InventoryLevel;
import com.mazmi.logistics.inventory.InventoryRepository;
import com.mazmi.logistics.inventory.StockMovement;
import com.mazmi.logistics.inventory.StockMovementRepository;
import com.mazmi.logistics.inventory.StockMovementType;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.orders.OrderItem;
import com.mazmi.logistics.orders.OrderPriority;
import com.mazmi.logistics.orders.OrderRepository;
import com.mazmi.logistics.orders.OrderStatus;
import com.mazmi.logistics.products.Product;
import com.mazmi.logistics.products.ProductRepository;
import com.mazmi.logistics.shipments.DeliveryHealth;
import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import com.mazmi.logistics.shipments.TrackingEvent;
import com.mazmi.logistics.shipments.TrackingEventRepository;
import com.mazmi.logistics.shipments.TrackingEventType;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRepository;
import com.mazmi.logistics.users.UserRole;
import com.mazmi.logistics.warehouses.Warehouse;
import com.mazmi.logistics.warehouses.WarehouseRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.demo-enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
  private static final Random RANDOM = new Random(20260809L);
  private final UserRepository users;
  private final CustomerRepository customers;
  private final WarehouseRepository warehouses;
  private final ProductRepository products;
  private final InventoryRepository inventory;
  private final StockMovementRepository movements;
  private final OrderRepository orders;
  private final DriverRepository drivers;
  private final VehicleRepository vehicles;
  private final ShipmentRepository shipments;
  private final TrackingEventRepository events;
  private final IncidentRepository incidents;
  private final PasswordEncoder passwordEncoder;

  public DemoDataSeeder(
      UserRepository users,
      CustomerRepository customers,
      WarehouseRepository warehouses,
      ProductRepository products,
      InventoryRepository inventory,
      StockMovementRepository movements,
      OrderRepository orders,
      DriverRepository drivers,
      VehicleRepository vehicles,
      ShipmentRepository shipments,
      TrackingEventRepository events,
      IncidentRepository incidents,
      PasswordEncoder passwordEncoder) {
    this.users = users;
    this.customers = customers;
    this.warehouses = warehouses;
    this.products = products;
    this.inventory = inventory;
    this.movements = movements;
    this.orders = orders;
    this.drivers = drivers;
    this.vehicles = vehicles;
    this.shipments = shipments;
    this.events = events;
    this.incidents = incidents;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (users.findByEmailIgnoreCase("admin@mazmilogistics.test").isPresent()) return;
    User admin = user("Demo Administrator", "admin@mazmilogistics.test", UserRole.ADMIN);
    user("Operations Coordinator", "operator@mazmilogistics.test", UserRole.OPERATOR);
    user("Read Only Reviewer", "viewer@mazmilogistics.test", UserRole.VIEWER);
    List<Warehouse> warehouseList = seedWarehouses();
    List<Customer> customerList = seedCustomers();
    List<Product> productList = seedProducts();
    List<Driver> driverList = seedDrivers();
    List<Vehicle> vehicleList = seedVehicles();
    Map<String, InventoryLevel> stock = seedInventory(warehouseList, productList, admin);
    seedOrders(customerList, warehouseList, productList, driverList, vehicleList, stock, admin);
  }

  private User user(String name, String email, UserRole role) {
    User user = new User();
    user.setName(name);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode("Demo2026!"));
    user.setRole(role);
    user.setEnabled(true);
    return users.save(user);
  }

  private List<Warehouse> seedWarehouses() {
    return List.of(
        warehouse(
            "VLC-01",
            "Valencia Logistics Hub",
            "Avinguda Portuària 41",
            "Valencia",
            "46024",
            "39.4501000",
            "-0.3317000"),
        warehouse(
            "MAD-01",
            "Madrid Central Depot",
            "Avenida Industrial 18",
            "Madrid",
            "28021",
            "40.3447000",
            "-3.6976000"),
        warehouse(
            "BCN-01",
            "Barcelona Distribution Center",
            "Carrer Logístic 7",
            "Barcelona",
            "08040",
            "41.3493000",
            "2.1417000"));
  }

  private Warehouse warehouse(
      String code,
      String name,
      String address,
      String city,
      String postalCode,
      String latitude,
      String longitude) {
    Warehouse w = new Warehouse();
    w.setCode(code);
    w.setName(name);
    w.setAddress(address);
    w.setCity(city);
    w.setPostalCode(postalCode);
    w.setCountry("Spain");
    w.setLatitude(new BigDecimal(latitude));
    w.setLongitude(new BigDecimal(longitude));
    w.setActive(true);
    return warehouses.save(w);
  }

  private List<Customer> seedCustomers() {
    String[] names = {
      "Levante Vectorial SL",
      "Nexo Atlántico Distribución",
      "Mediterránea Técnica",
      "Nova Habitat Supply",
      "Iberia Componentes Norte",
      "Atlas Workshop Supply",
      "Costa Modular Systems",
      "Sierra Industrial Network",
      "Delta Technical Goods"
    };
    String[] cities = {
      "Valencia",
      "Madrid",
      "Barcelona",
      "Alicante",
      "Zaragoza",
      "Bilbao",
      "Seville",
      "Murcia",
      "Valladolid"
    };
    List<Customer> result = new ArrayList<>();
    for (int i = 0; i < 27; i++) {
      Customer c = new Customer();
      String city = cities[i % cities.length];
      c.setCode("CUS-" + String.format("%03d", i + 1));
      c.setCompanyName(
          names[i % names.length] + (i >= names.length ? " " + (i / names.length + 1) : ""));
      c.setContactName("Demo Contact " + String.format("%02d", i + 1));
      c.setEmail("contact" + (i + 1) + "@fictional-customer.test");
      c.setPhone("+34 960 000 " + String.format("%03d", i + 1));
      c.setAddress("Operational Avenue " + (10 + i));
      c.setCity(city);
      c.setPostalCode(String.format("%05d", 28000 + i));
      c.setCountry("Spain");
      c.setLatitude(
          BigDecimal.valueOf(36.8 + RANDOM.nextDouble() * 6.2).setScale(7, RoundingMode.HALF_UP));
      c.setLongitude(
          BigDecimal.valueOf(-5.5 + RANDOM.nextDouble() * 8.2).setScale(7, RoundingMode.HALF_UP));
      c.setActive(i != 26);
      result.add(customers.save(c));
    }
    return result;
  }

  private List<Product> seedProducts() {
    String[] nouns = {
      "Compact Drill Unit",
      "Portable Power Module",
      "Professional Tool Kit",
      "Electrical Control Unit",
      "Warehouse Sensor Pack",
      "Hydraulic Service Set",
      "Industrial Cable Reel",
      "Protective Transit Case",
      "Loading Dock Controller",
      "Modular Work Light"
    };
    String[] categories = {
      "Power tools", "Energy", "Tooling", "Electrical", "Sensors", "Hydraulics"
    };
    List<Product> result = new ArrayList<>();
    for (int i = 0; i < 60; i++) {
      Product p = new Product();
      p.setSku("TL-" + String.format("%03d", 200 + i));
      p.setName(nouns[i % nouns.length] + " " + (char) ('A' + i / 10));
      p.setCategory(categories[i % categories.length]);
      p.setDescription("Fictional technical inventory item for logistics workflow demonstrations.");
      p.setWeightKg(BigDecimal.valueOf(2.5 + (i % 12) * 3.75).setScale(3, RoundingMode.HALF_UP));
      p.setUnitPrice(BigDecimal.valueOf(45 + i * 7.35).setScale(2, RoundingMode.HALF_UP));
      p.setActive(true);
      result.add(products.save(p));
    }
    return result;
  }

  private List<Driver> seedDrivers() {
    String[] first = {
      "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Robin", "Avery", "Jamie", "Riley",
      "Cameron", "Drew"
    };
    List<Driver> result = new ArrayList<>();
    for (int i = 0; i < 12; i++) {
      Driver d = new Driver();
      d.setEmployeeCode("DRV-" + String.format("%03d", i + 1));
      d.setFirstName(first[i]);
      d.setLastName("Demo " + (char) ('A' + i));
      d.setPhone("+34 610 000 " + String.format("%03d", i + 1));
      d.setLicenseNumber("DEMO-LIC-" + String.format("%04d", i + 1));
      d.setStatus(DriverStatus.AVAILABLE);
      d.setActive(true);
      result.add(drivers.save(d));
    }
    return result;
  }

  private List<Vehicle> seedVehicles() {
    List<Vehicle> result = new ArrayList<>();
    for (int i = 0; i < 10; i++) {
      Vehicle v = new Vehicle();
      v.setRegistrationPlate("MZ" + String.format("%02d", i + 10) + "D" + (char) ('A' + i));
      v.setModel(
          i < 4
              ? "Transit Van " + (i + 1)
              : i < 8 ? "Regional Truck " + (i + 1) : "Heavy Cargo " + (i + 1));
      v.setVehicleType(
          i < 4 ? VehicleType.VAN : i < 8 ? VehicleType.TRUCK : VehicleType.LARGE_TRUCK);
      v.setCapacityKg(BigDecimal.valueOf(i < 4 ? 1400 : i < 8 ? 6500 : 14000));
      v.setStatus(VehicleStatus.AVAILABLE);
      v.setActive(true);
      result.add(vehicles.save(v));
    }
    return result;
  }

  private Map<String, InventoryLevel> seedInventory(
      List<Warehouse> warehouseList, List<Product> productList, User admin) {
    Map<String, InventoryLevel> result = new HashMap<>();
    int index = 0;
    for (Warehouse warehouse : warehouseList)
      for (Product product : productList) {
        InventoryLevel level = new InventoryLevel();
        level.setWarehouse(warehouse);
        level.setProduct(product);
        int onHand = index < 9 ? 32 : 45 + RANDOM.nextInt(110);
        level.setOnHand(onHand);
        level.setReserved(0);
        level.setReorderLevel(index < 9 ? 35 : 20 + RANDOM.nextInt(16));
        inventory.save(level);
        movement(level, null, StockMovementType.INITIAL, onHand, 0, "Demo opening balance", admin);
        result.put(key(warehouse, product), level);
        index++;
      }
    return result;
  }

  private void seedOrders(
      List<Customer> customerList,
      List<Warehouse> warehouseList,
      List<Product> productList,
      List<Driver> driverList,
      List<Vehicle> vehicleList,
      Map<String, InventoryLevel> stock,
      User admin) {
    Instant now = Instant.now();
    int shippedIndex = 0;
    int incidentCount = 0;
    for (int i = 0; i < 140; i++) {
      OrderStatus status =
          i < 30
              ? OrderStatus.DRAFT
              : i < 54
                  ? OrderStatus.CONFIRMED
                  : i < 74
                      ? OrderStatus.PREPARING
                      : i < 90
                          ? OrderStatus.READY
                          : i < 98
                              ? OrderStatus.SHIPPED
                              : i < 130 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
      Customer customer = customerList.get(i % 26);
      Warehouse warehouse = warehouseList.get(i % 3);
      Order order = new Order();
      order.setOrderNumber("ORD-" + Year.now().getValue() + "-" + String.format("%05d", i + 1));
      order.setCustomer(customer);
      order.setWarehouse(warehouse);
      order.setStatus(status);
      order.setPriority(OrderPriority.values()[i % OrderPriority.values().length]);
      order.setShippingName(customer.getCompanyName());
      order.setShippingAddress(customer.getAddress());
      order.setShippingCity(customer.getCity());
      order.setShippingPostalCode(customer.getPostalCode());
      order.setShippingCountry(customer.getCountry());
      order.setShippingLatitude(customer.getLatitude());
      order.setShippingLongitude(customer.getLongitude());
      order.setCreatedBy(admin);
      Instant created = now.minus(i % 9, ChronoUnit.DAYS).minus(i % 18, ChronoUnit.HOURS);
      order.setCreatedAt(created);
      order.setUpdatedAt(created.plus(2, ChronoUnit.HOURS));
      int itemCount = 1 + i % 3;
      BigDecimal total = BigDecimal.ZERO;
      for (int j = 0; j < itemCount; j++) {
        Product product = productList.get((i * 3 + j * 7) % productList.size());
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(1 + (i + j) % 4);
        item.setUnitPrice(product.getUnitPrice());
        order.addItem(item);
        total = total.add(item.subtotal());
      }
      order.setTotalAmount(total);
      orders.save(order);
      boolean reservedStatus =
          status == OrderStatus.CONFIRMED
              || status == OrderStatus.PREPARING
              || status == OrderStatus.READY;
      boolean dispatchedStatus = status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED;
      for (OrderItem item : order.getItems()) {
        InventoryLevel level = stock.get(key(warehouse, item.getProduct()));
        if (reservedStatus) {
          level.setReserved(level.getReserved() + item.getQuantity());
          movement(
              level,
              order,
              StockMovementType.RESERVATION,
              0,
              item.getQuantity(),
              "Reserved for " + order.getOrderNumber(),
              admin);
        }
        if (dispatchedStatus) {
          level.setOnHand(level.getOnHand() - item.getQuantity());
          movement(
              level,
              order,
              StockMovementType.RESERVATION,
              0,
              item.getQuantity(),
              "Reserved for " + order.getOrderNumber(),
              admin);
          movement(
              level,
              order,
              StockMovementType.DISPATCH,
              -item.getQuantity(),
              -item.getQuantity(),
              "Dispatched for " + order.getOrderNumber(),
              admin);
        }
      }
      if (status == OrderStatus.READY
          || status == OrderStatus.SHIPPED
          || status == OrderStatus.DELIVERED) {
        Shipment shipment = new Shipment();
        shipment.setTrackingNumber(
            "MZ-" + Year.now().getValue() + "-" + String.format("%05d", i + 1));
        shipment.setOrder(order);
        shipment.setCurrentLatitude(
            status == OrderStatus.DELIVERED
                ? order.getShippingLatitude()
                : warehouse.getLatitude());
        shipment.setCurrentLongitude(
            status == OrderStatus.DELIVERED
                ? order.getShippingLongitude()
                : warehouse.getLongitude());
        shipment.setEstimatedDeliveryAt(now.plus(i % 5, ChronoUnit.HOURS));
        shipment.setStatus(
            status == OrderStatus.READY
                ? ShipmentStatus.CREATED
                : status == OrderStatus.SHIPPED
                    ? ShipmentStatus.IN_TRANSIT
                    : ShipmentStatus.DELIVERED);
        shipment.setDeliveryHealth(
            status == OrderStatus.SHIPPED && shippedIndex % 3 == 0
                ? DeliveryHealth.DELAYED
                : DeliveryHealth.ON_TIME);
        shipment.setSimulationProgress(
            status == OrderStatus.DELIVERED
                ? 100
                : status == OrderStatus.SHIPPED ? 15 + shippedIndex * 9 : 0);
        shipment.setSimulationActive(status == OrderStatus.SHIPPED && shippedIndex < 2);
        shipment.setCreatedAt(created.plus(3, ChronoUnit.HOURS));
        shipment.setUpdatedAt(now.minus(i % 60, ChronoUnit.MINUTES));
        if (status != OrderStatus.READY) {
          int resource = status == OrderStatus.SHIPPED ? shippedIndex : i % driverList.size();
          shipment.setDriver(driverList.get(resource));
          shipment.setVehicle(vehicleList.get(resource % vehicleList.size()));
          shipment.setDepartedAt(created.plus(5, ChronoUnit.HOURS));
        }
        if (status == OrderStatus.SHIPPED) {
          driverList.get(shippedIndex).setStatus(DriverStatus.ON_ROUTE);
          vehicleList.get(shippedIndex).setStatus(VehicleStatus.IN_SERVICE);
          shippedIndex++;
        }
        if (status == OrderStatus.DELIVERED)
          shipment.setDeliveredAt(created.plus(12, ChronoUnit.HOURS));
        shipments.save(shipment);
        trackingHistory(shipment, created, status);
        if (incidentCount < 12 && status != OrderStatus.READY && i % 3 == 0) {
          incident(shipment, admin, incidentCount++, status == OrderStatus.SHIPPED);
        }
      }
    }
  }

  private void trackingHistory(Shipment shipment, Instant start, OrderStatus status) {
    event(shipment, TrackingEventType.CREATED, "Shipment created", start.plus(3, ChronoUnit.HOURS));
    if (status == OrderStatus.READY) return;
    event(
        shipment,
        TrackingEventType.ASSIGNED,
        "Driver and vehicle assigned",
        start.plus(4, ChronoUnit.HOURS));
    event(
        shipment, TrackingEventType.DEPARTED, "Shipment departed", start.plus(5, ChronoUnit.HOURS));
    event(
        shipment,
        TrackingEventType.CHECKPOINT,
        "Simulated route checkpoint 25%",
        start.plus(6, ChronoUnit.HOURS));
    event(
        shipment,
        TrackingEventType.CHECKPOINT,
        "Simulated route checkpoint 50%",
        start.plus(7, ChronoUnit.HOURS));
    event(
        shipment,
        TrackingEventType.CHECKPOINT,
        "Simulated route checkpoint 75%",
        start.plus(8, ChronoUnit.HOURS));
    if (status == OrderStatus.DELIVERED)
      event(
          shipment,
          TrackingEventType.DELIVERED,
          "Shipment delivered",
          start.plus(9, ChronoUnit.HOURS));
  }

  private void incident(Shipment shipment, User admin, int index, boolean open) {
    Incident incident = new Incident();
    incident.setShipment(shipment);
    incident.setType(IncidentType.values()[index % 4]);
    incident.setSeverity(IncidentSeverity.values()[1 + index % 3]);
    incident.setStatus(open ? IncidentStatus.OPEN : IncidentStatus.RESOLVED);
    incident.setTitle(open ? "Active demo operational issue" : "Resolved demo operational issue");
    incident.setDescription("Fictional incident included to demonstrate the operational workflow.");
    incident.setOpenedAt(Instant.now().minus(index + 1, ChronoUnit.HOURS));
    incident.setCreatedBy(admin);
    if (!open) {
      incident.setResolvedAt(Instant.now().minus(index, ChronoUnit.HOURS));
      incident.setResolutionNote("Operational check completed.");
    }
    incidents.save(incident);
    event(
        shipment,
        open ? TrackingEventType.INCIDENT : TrackingEventType.RESUMED,
        incident.getTitle(),
        incident.getOpenedAt());
  }

  private void event(Shipment shipment, TrackingEventType type, String description, Instant time) {
    TrackingEvent event = new TrackingEvent();
    event.setShipment(shipment);
    event.setType(type);
    event.setDescription(description);
    event.setLatitude(shipment.getCurrentLatitude());
    event.setLongitude(shipment.getCurrentLongitude());
    event.setEventTime(time);
    events.save(event);
  }

  private void movement(
      InventoryLevel level,
      Order order,
      StockMovementType type,
      int onHand,
      int reserved,
      String note,
      User actor) {
    StockMovement movement = new StockMovement();
    movement.setInventoryLevel(level);
    movement.setOrder(order);
    movement.setType(type);
    movement.setOnHandDelta(onHand);
    movement.setReservedDelta(reserved);
    movement.setNote(note);
    movement.setCreatedBy(actor);
    movements.save(movement);
  }

  private String key(Warehouse warehouse, Product product) {
    return warehouse.getCode() + ":" + product.getSku();
  }
}
