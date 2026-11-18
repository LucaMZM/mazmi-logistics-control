const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const verifyLogistics = require("./verify-logistics.cjs");

const baseURL = "http://localhost:4200";
const output = process.env.CAPTURE_DIR;
assert(output, "CAPTURE_DIR must identify the artifact directory");

async function main() {
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.join(output, "review"), { recursive: true });
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
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
    await page.getByLabel("Email", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "review/login.png") });
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
                tile.classList.contains("leaflet-tile-loaded") &&
                tile.style.opacity === "1" &&
                Number(getComputedStyle(tile).opacity) === 1,
            )
          );
        });
        assert(
          await page.locator(".leaflet-control-zoom").evaluate((control) => {
            const panel = control.closest(".map-panel, .map-wrap");
            if (!panel) return false;
            const bounds = panel.getBoundingClientRect();
            const zoom = control.getBoundingClientRect();
            return zoom.bottom <= bounds.bottom && zoom.top >= bounds.top;
          }),
          "Map zoom controls must not be clipped",
        );
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
    const dock = page.locator(".rail-nav");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const width of [1440, 640]) {
      await page.setViewportSize({ width, height: 900 });
      await dock.getByRole("link", { name: "Orders", exact: true }).hover();
      await page.waitForFunction(() => {
        const scale = (name) =>
          Number(
            document
              .querySelector(`.rail-nav [aria-label="${name}"]`)
              .style.getPropertyValue("--scale"),
          );
        return (
          scale("Orders") > 1.15 && scale("Orders") > scale("Command center")
        );
      });
      await page.mouse.move(0, 0);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1440 });
    await page
      .locator(".rail")
      .screenshot({ path: path.join(output, "review/desktop-dock.png") });
    const spaces = dock.getByRole("button", { name: "Digital spaces" });
    await spaces.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      document.activeElement?.matches(".panel-close"),
    );
    await page.screenshot({
      path: path.join(output, "review/secondary-panel.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") === "Digital spaces",
    );
    // Motion is reduced in this browser: the decorative title and aurora
    // must remain readable and should not animate.
    const auroraHero = page.locator(
      "app-dashboard-page app-page-header header.aurora",
    );
    await auroraHero.waitFor();
    assert.equal(
      await auroraHero.locator('app-silk-aurora [aria-hidden="true"]').count(),
      1,
    );
    const heading = auroraHero.locator("h1");
    assert.equal(
      await heading.getAttribute("aria-label"),
      "Operations command center",
    );
    const words = heading.locator(".kinetic-word");
    assert.equal(await words.count(), 3);
    const titleStyle = await words.first().evaluate((node) => ({
      fontSize: parseFloat(getComputedStyle(node).fontSize),
      display: getComputedStyle(node).display,
      marginTop: parseFloat(getComputedStyle(node).marginTop),
    }));
    assert(
      titleStyle.fontSize >= 28,
      "Kinetic words must inherit the full page-title size",
    );
    assert.equal(
      titleStyle.display,
      "inline-block",
      "Kinetic words must stay inline",
    );
    assert.equal(
      titleStyle.marginTop,
      0,
      "Kinetic word spans must not inherit subtitle margins",
    );
    const revealAnimation = await words
      .first()
      .evaluate((node) => getComputedStyle(node).animationName);
    assert.equal(
      revealAnimation,
      "none",
      "Reduced motion must disable kinetic text animation",
    );

    // Color contrast is a usability requirement, not just a screenshot detail.
    const primaryActionContrast = await page
      .getByRole("link", { name: "New order" })
      .evaluate((node) => {
        const style = getComputedStyle(node);
        const parseColor = (value) =>
          [...value.matchAll(/[\d.]+/g)]
            .slice(0, 3)
            .map((match) => Number(match[0]) / 255);
        const luminance = (rgb) => {
          const linear = rgb.map((channel) =>
            channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4,
          );
          return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
        };
        const label = node.querySelector(".mdc-button__label");
        if (!label)
          throw new Error("Angular Material must render the New order label");
        const foreground = luminance(parseColor(getComputedStyle(label).color));
        const background = luminance(parseColor(style.backgroundColor));
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        );
      });
    assert(
      primaryActionContrast >= 4.5,
      "Primary New order action must provide at least 4.5:1 label contrast",
    );

    // Visual contract for the Phase B materials, with reduced motion enabled.
    const cards = page.locator("app-dashboard-page .pulse a");
    assert.equal(await cards.count(), 4);
    const cardStyle = await cards.first().evaluate((node) => {
      const css = getComputedStyle(node);
      return {
        radius: parseFloat(css.borderTopLeftRadius),
        shadow: css.boxShadow,
        background: css.backgroundColor,
      };
    });
    assert(
      cardStyle.radius >= 14,
      "KPI cards must have the new rounded premium treatment",
    );
    assert(
      cardStyle.shadow !== "none",
      "KPI cards should be visually elevated",
    );
    assert(
      cardStyle.background !== "rgba(0, 0, 0, 0)",
      "KPI content needs an opaque surface",
    );

    await capture("orders.png", "/orders", "Orders", "table tbody tr");
    const orderPanel = page.locator("app-orders-page .table-card");
    const tableRadius = await orderPanel.evaluate((node) =>
      parseFloat(getComputedStyle(node).borderTopLeftRadius),
    );
    assert(
      tableRadius >= 14,
      "Order registers must use the shared panel radius",
    );
    const firstOrder = page.locator('td[data-label="Order"] a').first();
    const orderNumber = (await firstOrder.innerText()).trim();
    await page.getByPlaceholder("Order number or customer").fill(orderNumber);
    await page.waitForFunction(
      () => document.querySelectorAll('td[data-label="Order"] a').length === 1,
    );
    await firstOrder.click();
    await page
      .getByRole("heading", { name: orderNumber, exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(output, "review", "order-detail.png"),
      animations: "disabled",
    });
    assert.equal(
      await dock
        .getByRole("link", { name: "Orders", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    await page.goto(baseURL + "/orders/new");

    await page.locator("form,mat-form-field").first().waitFor();
    const formSectionRadius = await page
      .locator("app-order-form-page .section")
      .first()
      .evaluate((node) =>
        parseFloat(getComputedStyle(node).borderTopLeftRadius),
      );
    assert(
      formSectionRadius >= 14,
      "Order forms must share the premium panel material",
    );
    await page.screenshot({
      path: path.join(output, "review", "order-form.png"),
      animations: "disabled",
    });
    await capture("inventory.png", "/inventory", "Inventory", "table tbody tr");
    await capture(
      "fleet.png",
      "/fleet",
      "Fleet",
      "app-fleet-page [role=tabpanel] tbody tr td strong",
    );
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
    const initialTracking = await context.request.get(
      `${baseURL}/api/v1/shipments/${shipment.id}`,
    );
    assert.equal(initialTracking.status(), 200);
    const initialDetail = await initialTracking.json();
    assert(
      Date.parse(initialDetail.departedAt) <= Date.now(),
      "Demo departure cannot be in the future",
    );
    assert(
      Date.parse(initialDetail.eta) >= Date.parse(initialDetail.departedAt),
      "ETA must follow departure",
    );
    for (const event of initialDetail.events) {
      assert(
        Date.parse(event.eventTime) <= Date.now(),
        "Demo events cannot be in the future",
      );
      const checkpoint = /checkpoint (\d+)%/.exec(event.description);
      if (checkpoint)
        assert(
          Number(checkpoint[1]) <= initialDetail.progress,
          "Checkpoint must not exceed current progress",
        );
    }
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

    await capture(
      "review/customers.png",
      "/customers",
      "Customers",
      "table tbody tr",
    );
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 1280, height: 900 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      for (const view of views) {
        await page.goto(`${baseURL}${view.route}`);
        await ready(view.heading, view.selector, view.map);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${view.route} overflows at ${viewport.width}`,
        );
        if (
          view.name === "dashboard.png" ||
          view.name === "shipment-tracking.png"
        ) {
          await page.screenshot({
            path: path.join(output, "review", `${viewport.width}-${view.name}`),
            animations: "disabled",
          });
        }
      }
    }
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
    // Mobile navigation is now a persistent icon dock with secondary popover panels.
    const mobileDock = page.getByRole("navigation", {
      name: "Workspace sections",
    });
    const ordersDockLink = mobileDock.getByRole("link", {
      name: "Orders",
      exact: true,
    });
    await ordersDockLink.focus();
    assert(
      await ordersDockLink.evaluate((node) => document.activeElement === node),
    );
    const moreButton = mobileDock.getByRole("button", {
      name: "More sections",
    });
    await moreButton.focus();
    await page.keyboard.press("Enter");
    await page.locator("#more-panel").waitFor();
    await page.screenshot({
      path: path.join(output, "review", "mobile-dock.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.locator("#more-panel").waitFor({ state: "detached" });
    assert(
      await moreButton.evaluate((node) => document.activeElement === node),
    );
    const publicationRejected = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const socket = new WebSocket(`ws://${location.host}/ws`);
          const timeout = setTimeout(() => {
            socket.close();
            reject(new Error("STOMP security check timed out"));
          }, 10000);
          socket.onopen = () =>
            socket.send("CONNECT\naccept-version:1.2\nhost:localhost\n\n\0");
          socket.onmessage = (event) => {
            if (event.data.startsWith("CONNECTED"))
              socket.send(
                'SEND\ndestination:/topic/dashboard\ncontent-type:application/json\n\n{"forged":true}\0',
              );
            if (event.data.startsWith("ERROR")) {
              clearTimeout(timeout);
              socket.close();
              resolve(true);
            }
          };
        }),
    );
    assert.equal(
      publicationRejected,
      true,
      "Clients must not publish operational updates",
    );
    const businessFlow = await verifyLogistics(context, baseURL);
    await require("./capture-twin.cjs")(page, output);
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForURL("**/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("admin@mazmilogistics.test");
    await page.getByLabel("Password", { exact: true }).fill("Demo2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard");
    await capture(
      "review/admin-users.png",
      "/admin/users",
      "Users",
      "table tbody tr",
    );
    assert.equal(
      await page
        .locator(".responsive-table tbody tr")
        .first()
        .evaluate((row) => getComputedStyle(row).display),
      "grid",
    );
    await page
      .getByRole("button", { name: "Edit", exact: true })
      .first()
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
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
          clientPublicationRejected: publicationRejected,
          businessFlow,
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
