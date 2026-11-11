const assert = require("node:assert/strict");

// Only run against the disposable demo database created by capture-demo.yml.
module.exports = async function verifyLogistics(context, baseURL) {
  async function request(route, method = "GET", data, expected = 200) {
    const headers = {};
    if (method !== "GET") {
      const csrf = await context.request.get(`${baseURL}/api/v1/auth/csrf`);
      assert.equal(csrf.status(), 200);
      const cookie = (await context.cookies()).find(
        (item) => item.name === "XSRF-TOKEN",
      );
      assert(cookie, "CSRF cookie required");
      headers["X-XSRF-TOKEN"] = decodeURIComponent(cookie.value);
    }
    const response = await context.request.fetch(`${baseURL}/api/v1${route}`, {
      method,
      data,
      headers,
    });
    assert.equal(
      response.status(),
      expected,
      `${method} ${route}: ${await response.text()}`,
    );
    return response.json();
  }
  const customers = (await request("/customers?size=100")).content;
  const inventory = (await request("/inventory?size=100")).content;
  const first = inventory.find((item) => item.available >= 4);
  assert(first, "Demo needs available stock");
  const stock = inventory
    .filter(
      (item) => item.warehouseId === first.warehouseId && item.available >= 4,
    )
    .slice(0, 2);
  assert.equal(stock.length, 2);
  const customer = customers.find((item) => item.active);
  assert(customer);
  const payload = {
    customerId: customer.id,
    warehouseId: first.warehouseId,
    priority: "NORMAL",
    shippingName: customer.companyName,
    shippingAddress: customer.address,
    shippingCity: customer.city,
    shippingPostalCode: customer.postalCode,
    shippingCountry: customer.country,
    shippingLatitude: customer.latitude,
    shippingLongitude: customer.longitude,
    items: stock.map((item) => ({ productId: item.productId, quantity: 2 })),
  };
  let order = await request("/orders", "POST", payload, 201);
  assert.equal(order.status, "DRAFT");
  const products = await request("/products");
  for (const item of order.items) {
    assert.equal(
      item.unitPrice,
      products.find((product) => product.id === item.productId).unitPrice,
    );
  }
  order = await request(`/orders/${order.id}/confirm`, "POST", {});
  assert.equal(order.status, "CONFIRMED");
  for (const level of stock) {
    const current = await request(`/inventory/${level.id}`);
    assert.equal(current.reserved, level.reserved + 2);
    assert.equal(current.onHand, level.onHand);
    assert(
      (await request(`/inventory/${level.id}/movements`)).some(
        (move) => move.type === "RESERVATION" && move.reservedDelta === 2,
      ),
    );
  }
  order = await request(`/orders/${order.id}/start-preparation`, "POST", {});
  assert.equal(order.status, "PREPARING");
  order = await request(`/orders/${order.id}/mark-ready`, "POST", {});
  assert.equal(order.status, "READY");
  let shipment = await request(`/shipments/${order.shipmentId}`);
  assert.equal(shipment.status, "CREATED");
  await request(`/shipments/${shipment.id}/start`, "POST", {}, 409);
  const assigned = (await request("/shipments?status=ASSIGNED&size=100"))
    .content;
  const drivers = await request("/drivers");
  const vehicles = await request("/vehicles");
  const weight = order.items.reduce(
    (total, item) =>
      total +
      item.quantity *
        products.find((product) => product.id === item.productId).weightKg,
    0,
  );
  const driver = drivers.find(
    (item) =>
      item.active &&
      item.status === "AVAILABLE" &&
      !assigned.some((s) => s.driver === item.fullName),
  );
  const vehicle = vehicles.find(
    (item) =>
      item.active &&
      item.status === "AVAILABLE" &&
      item.capacityKg >= weight &&
      !assigned.some((s) => s.vehicle === item.registrationPlate),
  );
  assert(driver && vehicle, "Available fleet with enough capacity required");
  shipment = await request(`/shipments/${shipment.id}/assign`, "POST", {
    driverId: driver.id,
    vehicleId: vehicle.id,
  });
  assert.equal(shipment.status, "ASSIGNED");
  shipment = await request(`/shipments/${shipment.id}/start`, "POST", {});
  assert.equal(shipment.status, "IN_TRANSIT");
  assert(shipment.events.some((event) => event.type === "DEPARTED"));
  assert.equal((await request(`/orders/${order.id}`)).status, "SHIPPED");
  assert.equal((await request(`/drivers/${driver.id}`)).status, "ON_ROUTE");
  assert.equal((await request(`/vehicles/${vehicle.id}`)).status, "IN_SERVICE");
  await request(`/orders/${order.id}/cancel`, "POST", {}, 409);
  for (const level of stock) {
    const current = await request(`/inventory/${level.id}`);
    assert.equal(current.onHand, level.onHand - 2);
    assert.equal(current.reserved, level.reserved);
    assert.equal(current.available, current.onHand - current.reserved);
    assert(
      (await request(`/inventory/${level.id}/movements`)).some(
        (move) => move.type === "DISPATCH" && move.onHandDelta === -2,
      ),
    );
  }
  const eta = shipment.eta;
  const incident = await request(
    `/shipments/${shipment.id}/simulation/incident`,
    "POST",
    { type: "TRAFFIC" },
  );
  assert.equal(incident.status, "OPEN");
  shipment = await request(`/shipments/${shipment.id}`);
  assert.equal(shipment.deliveryHealth, "DELAYED");
  assert.notEqual(shipment.eta, eta);
  assert(shipment.events.some((event) => event.type === "INCIDENT"));
  const minor = await request(
    `/shipments/${shipment.id}/incidents`,
    "POST",
    {
      type: "ADDRESS",
      severity: "LOW",
      title: "Comprobar dirección",
      description: "Incidencia secundaria de prueba",
    },
    201,
  );
  assert.equal(
    (await request(`/shipments/${shipment.id}`)).deliveryHealth,
    "DELAYED",
  );
  const resolved = await request(`/incidents/${incident.id}/resolve`, "POST", {
    resolutionNote: "Verificación del flujo demo completada",
  });
  assert.equal(resolved.status, "RESOLVED");
  assert.equal(
    resolved.resolutionNote,
    "Verificación del flujo demo completada",
  );
  shipment = await request(`/shipments/${shipment.id}`);
  assert.equal(shipment.deliveryHealth, "AT_RISK");
  assert(!shipment.events.some((event) => event.type === "RESUMED"));
  await request(`/incidents/${minor.id}/resolve`, "POST", {
    resolutionNote: "Dirección confirmada",
  });
  shipment = await request(`/shipments/${shipment.id}`);
  assert.equal(shipment.deliveryHealth, "ON_TIME");
  assert(shipment.events.some((event) => event.type === "RESUMED"));
  await request(`/shipments/${shipment.id}/simulation/start`, "POST", {});
  const deadline = Date.now() + 120000;
  let moved = false;
  const origin = [shipment.currentLatitude, shipment.currentLongitude];
  do {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    shipment = await request(`/shipments/${shipment.id}`);
    if (
      shipment.progress > 0 &&
      (shipment.currentLatitude !== origin[0] ||
        shipment.currentLongitude !== origin[1])
    )
      moved = true;
  } while (shipment.status !== "DELIVERED" && Date.now() < deadline);
  assert(moved, "Simulation must change the position");
  assert.equal(shipment.status, "DELIVERED");
  assert.equal(shipment.progress, 100);
  assert.equal(shipment.simulationActive, false);
  assert(shipment.events.some((event) => event.type === "DELIVERED"));
  assert.equal((await request(`/orders/${order.id}`)).status, "DELIVERED");
  assert.equal((await request(`/drivers/${driver.id}`)).status, "AVAILABLE");
  assert.equal((await request(`/vehicles/${vehicle.id}`)).status, "AVAILABLE");
  for (const level of stock) {
    const current = await request(`/inventory/${level.id}`);
    assert.equal(current.reserved, level.reserved);
    assert.equal(current.onHand, level.onHand - 2);
    assert(current.reserved >= 0 && current.reserved <= current.onHand);
  }
  const cancelled = await request("/orders", "POST", payload, 201);
  await request(`/orders/${cancelled.id}/confirm`, "POST", {});
  assert.equal(
    (await request(`/orders/${cancelled.id}/cancel`, "POST", {})).status,
    "CANCELLED",
  );
  for (const level of stock)
    assert.equal(
      (await request(`/inventory/${level.id}`)).reserved,
      level.reserved,
    );
  assert.equal(
    (
      await context.request.post(`${baseURL}/api/v1/orders`, { data: payload })
    ).status(),
    403,
  );
  assert.equal(
    (await context.request.get(`${baseURL}/api/v1/users`)).status(),
    403,
  );
  return {
    order: order.id,
    shipment: shipment.id,
    inventory: "balanced",
    simulation: "delivered",
    incident: "resolved",
    cancellation: "released",
    csrf: "enforced",
    operatorAuthorization: "enforced",
  };
};
