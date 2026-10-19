const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const baseURL = "http://localhost:4200";
const output = process.env.CAPTURE_DIR;
assert(output, "CAPTURE_DIR must identify the artifact directory");

async function main() {
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.join(output, "review"), { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1440 },
      deviceScaleFactor: 1,
      locale: "en-GB",
      timezoneId: "Europe/Madrid",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    const shipmentFrames = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("websocket", (socket) => {
      socket.on("framereceived", ({ payload }) => {
        const frame = payload.toString();
        if (frame.includes("destination:/topic/shipments/"))
          shipmentFrames.push(frame);
      });
    });

    const health = await context.request.get(
      "http://localhost:8080/actuator/health",
    );
    assert.equal(health.status(), 200);
    assert.equal((await health.json()).status, "UP");
    await page.goto(`${baseURL}/login`);
    await page
      .getByLabel("Email", { exact: true })
      .fill("operator@mazmilogistics.test");
    await page.getByLabel("Password", { exact: true }).fill("Demo2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard");
    await page.locator(".connection.connected").waitFor();
    const me = await context.request.get(`${baseURL}/api/v1/auth/me`);
    assert.equal(me.status(), 200);
    assert.equal((await me.json()).role, "OPERATOR");

    async function ready(heading, selector, map = false) {
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.locator(selector).first().waitFor();
      await page.waitForFunction(
        () => !document.querySelector("app-loading-state"),
      );
      await page.evaluate(() => document.fonts.ready);
      if (map) {
        await page.waitForFunction(() => {
          const tiles = [...document.querySelectorAll(".leaflet-tile")];
          return (
            tiles.length > 0 &&
            tiles.every(
              (tile) =>
                tile.complete &&
                tile.naturalWidth > 0 &&
                Number(getComputedStyle(tile).opacity) === 1,
            )
          );
        });
      }
      await page
        .locator(".mat-mdc-snack-bar-container")
        .waitFor({ state: "hidden" });
      await page.mouse.move(0, 0);
    }
    const views = [];
    async function capture(name, route, heading, selector, map = false) {
      await page.goto(`${baseURL}${route}`);
      await ready(heading, selector, map);
      await page.screenshot({
        path: path.join(output, name),
        animations: "disabled",
      });
      views.push({ name, route, heading, selector, map });
    }

    await capture(
      "dashboard.png",
      "/dashboard",
      "Operations command center",
      ".attention-board",
      true,
    );
    await capture("orders.png", "/orders", "Orders", "table tbody tr");
    await capture("inventory.png", "/inventory", "Inventory", "table tbody tr");
    const response = await context.request.get(
      `${baseURL}/api/v1/shipments?status=IN_TRANSIT&size=50`,
    );
    assert.equal(response.status(), 200);
    const { content } = await response.json();
    const shipment =
      content.find(
        (item) => item.progress < 80 && item.deliveryHealth === "DELAYED",
      ) ?? content.find((item) => item.progress < 80);
    assert(shipment, "The demo must contain an in-transit shipment");
    await page.goto(`${baseURL}/shipments/${shipment.id}`);
    await ready(shipment.trackingNumber, ".controls", true);
    await page.locator(".connection.connected").waitFor();
    const start = page.getByRole("button", {
      name: "Start simulation",
      exact: true,
    });
    if (await start.isVisible()) await start.click();
    await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .waitFor();
    const deadline = Date.now() + 25000;
    while (
      !shipmentFrames.some((frame) => frame.includes(shipment.id)) &&
      Date.now() < deadline
    ) {
      await page.waitForTimeout(250);
    }
    assert(
      shipmentFrames.some((frame) => frame.includes(shipment.id)),
      "Expected a real shipment STOMP update",
    );
    await ready(shipment.trackingNumber, ".controls", true);
    await page.screenshot({
      path: path.join(output, "shipment-tracking.png"),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start simulation", exact: true })
      .waitFor();
    views.push({
      name: "shipment-tracking.png",
      route: `/shipments/${shipment.id}`,
      heading: shipment.trackingNumber,
      selector: ".controls",
      map: true,
    });
    await capture("incidents.png", "/incidents", "Incidents", "table tbody tr");
    await capture(
      "review/shipments.png",
      "/shipments",
      "Shipments",
      "table tbody tr",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of views) {
      await page.goto(`${baseURL}${view.route}`);
      await ready(view.heading, view.selector, view.map);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${view.route} overflows on mobile`,
      );
      const table = page.locator(".responsive-table tbody tr").first();
      if (await table.count())
        assert.equal(
          await table.evaluate((row) => getComputedStyle(row).display),
          "grid",
        );
      await page.screenshot({
        path: path.join(output, "review", `mobile-${path.basename(view.name)}`),
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForURL("**/login");
    assert.deepEqual(errors, [], "Unexpected JavaScript errors");
    await fs.writeFile(
      path.join(output, "capture-report.json"),
      JSON.stringify(
        {
          commit: process.env.GITHUB_SHA,
          run: process.env.GITHUB_RUN_ID,
          capturedAt: new Date().toISOString(),
          viewport: { width: 1440, height: 1440 },
          screenshots: views.map(({ name }) => name),
          mobileViewport: { width: 390, height: 844 },
          shipmentWebSocketVerified: true,
          javascriptErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "Captured five real demo screens; mobile layout, login, logout and shipment WebSocket passed.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
