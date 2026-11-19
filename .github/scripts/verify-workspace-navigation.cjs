const assert = require("node:assert/strict");
module.exports = async function verifyWorkspaceNavigation(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 960 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("viewer@mazmilogistics.test");
    await page.getByLabel("Password", { exact: true }).fill("Demo2026!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
    for (const path of ["/warehouse-editor", "/admin/users"]) {
      await page.goto(baseURL + path);
      await page.waitForURL("**/dashboard");
    }
    await page.goto(baseURL + "/warehouse-twin");
    await page
      .getByRole("heading", { name: "Warehouse Twin", exact: true })
      .waitFor();
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const nav = page.getByRole("navigation", { name: "Workspace sections" });
    const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
    await dialog.waitFor();
    await nav
      .getByRole("button", { name: "Digital spaces", expanded: true })
      .waitFor();
    assert.equal(
      await nav
        .getByRole("link", { name: "Warehouse Twin", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    assert.equal(
      await nav
        .locator('a[href="/warehouse-editor"],a[href="/admin/users"]')
        .count(),
      0,
    );
    await page.keyboard.press("Tab");
    assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert(await trigger.evaluate((el) => el === document.activeElement));
    await trigger.click();
    await nav.getByRole("link", { name: "Inventory", exact: true }).click();
    await page.waitForURL("**/inventory");
    await dialog.waitFor({ state: "hidden" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await nav.waitFor();
    assert.equal(
      await nav
        .getByRole("link", { name: "Inventory", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    await nav.getByRole("link", { name: "Fleet", exact: true }).click();
    await page.waitForURL("**/fleet");
    await page.goBack();
    await page.waitForURL("**/inventory");
    await nav.locator('a[href="/inventory"][aria-current="page"]').waitFor();
    await page.goForward();
    await page.waitForURL("**/fleet");
    await page.reload();
    await nav.locator('a[href="/fleet"][aria-current="page"]').waitFor();
  } finally {
    await context.close();
  }
};
