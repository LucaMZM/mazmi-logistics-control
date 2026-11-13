const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = 'http://localhost:4200';
const output = process.env.CAPTURE_DIR;
assert(output, 'CAPTURE_DIR must identify the artifact directory');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [], writes = [];
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
      locale: 'en-GB',
      timezoneId: 'Europe/Madrid',
      reducedMotion: 'no-preference',
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    const get = async endpoint => {
      const response = await context.request.get(`${baseURL}/api/v1/${endpoint}`);
      assert.equal(response.status(), 200, endpoint);
      return response.json();
    };
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email', { exact: true }).fill('operator@mazmilogistics.test');
    await page.getByLabel('Password', { exact: true }).fill('Demo2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');
    assert.equal((await get('auth/me')).role, 'OPERATOR');
    page.on('request', request => {
      if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    const warehouses = await get('warehouses');
    let warehouse, order;
    for (const candidate of warehouses) {
      const result = await get(`orders?warehouse=${candidate.id}&status=CONFIRMED&size=20`);
      if (result.content.length) {
        warehouse = candidate;
        order = await get(`orders/${result.content[0].id}`);
        break;
      }
    }
    assert(warehouse && order, 'Demo must contain a real warehouse with a confirmed order');
    assert.equal(order.warehouseId, warehouse.id);
    assert(order.items.length > 0);
    const before = await get(`inventory?warehouse=${warehouse.id}&size=100`);
    assert(before.content.length > 0);
    assert(before.content.every(row => row.warehouseId === warehouse.id));
    await page.goto(`${baseURL}/warehouse-twin`);
    await page.getByRole('heading', { name: 'Warehouse Twin', exact: true }).waitFor();
    await page.getByLabel('Warehouse', { exact: true }).selectOption(warehouse.id);
    await page.getByLabel('Compatible order', { exact: true }).selectOption(order.id);
    await page.getByRole('link', { name: 'Open order record' }).waitFor();
    assert((await page.locator('.warehouse-metrics').innerText()).includes(warehouse.code));
    assert.equal(await page.locator('.warehouse-inventory tbody tr').count(), before.totalElements);
    await page.getByRole('button', { name: 'Open 3D warehouse', exact: true }).click();
    await page.getByRole('button', { name: 'Overview', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('.warehouse-controls button').disabled);
    assert.equal(await page.locator('.warehouse-scene canvas').count(), 1);
    await page.evaluate(() => document.fonts.ready);
    const shot = async (name, fullPage = false) => {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(output, name), fullPage });
    };
    await shot('warehouse-overview.png');
    const storage = page.getByRole('button', { name: 'Storage racks', exact: true });
    await storage.focus();
    await page.keyboard.press('Enter');
    assert.equal(await storage.getAttribute('aria-pressed'), 'true');
    await shot('warehouse-storage.png');
    await page.getByRole('button', { name: 'Show roof', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Hide roof' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Hide roof', exact: true }).click();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('progress').value >= 40, { }, { timeout: 120000 });
    await page.getByRole('button', { name: 'Pause sequence', exact: true }).click();
    const paused = await page.locator('progress').evaluate(el => el.value);
    await shot('warehouse-manoeuvre.png');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('progress').evaluate(el => el.value), paused);
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('progress').value === 100, {}, { timeout: 180000 });
    assert((await page.locator('.sequence-state').innerText()).includes('Complete'));
    await page.getByRole('button', { name: 'Dispatch docks', exact: true }).click();
    await shot('warehouse-dispatch.png');
    await page.getByRole('button', { name: 'Reset sequence', exact: true }).click();
    assert.equal(await page.locator('progress').evaluate(el => el.value), 0);
    const after = await get(`inventory?warehouse=${warehouse.id}&size=100`);
    const stock = rows => rows.map(({ id, onHand, reserved, available }) => ({ id, onHand, reserved, available })).sort((a,b) => a.id.localeCompare(b.id));
    assert.deepEqual(stock(after.content), stock(before.content));
    assert.equal((await get(`orders/${order.id}`)).status, order.status);
    assert.deepEqual(writes, [], 'Illustration must never mutate ERP records');

    // Real context loss must retain the HTML records and permit a fresh scene.
    assert(await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      extension?.loseContext();
      return Boolean(extension);
    }));
    await page.getByRole('button', { name: 'Retry 3D warehouse' }).click();
    await page.waitForFunction(() => !document.querySelector('.warehouse-controls button').disabled);
    assert.equal(await page.locator('.warehouse-scene canvas').count(), 1);
    assert.equal(await page.locator('.warehouse-inventory tbody tr').count(), before.totalElements);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled());
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('warehouse-mobile.png', true);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile must not overflow');
    await page.goto(`${baseURL}/orders`);
    await page.getByRole('heading', { name: 'Orders', exact: true }).waitFor();
    assert.equal(await page.locator('.warehouse-scene canvas').count(), 0);
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'warehouse-validation.json'), JSON.stringify({
      source: 'Real demo PostgreSQL, Spring Boot and Angular application',
      browser: browser.version(), desktop: '1440x1100', mobile: '390x844',
      warehouseCode: warehouse.code, orderNumber: order.orderNumber,
      checks: ['authenticated access', 'warehouse and inventory identity', 'compatible order',
        'WebGL scene', 'keyboard zone selection', 'roof toggle', 'pause/resume/reset',
        'complete preparation and loading sequence', 'unchanged inventory and order',
        'zero API mutations', 'WebGL context recovery', 'reduced motion',
        'mobile overflow', 'navigation back to ERP'],
      javascriptErrors: errors, apiWrites: writes,
    }, null, 2));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure-review.png'), fullPage: true }).catch(() => {});
      await fs.writeFile(path.join(output, 'failure.txt'), `${error.stack}\n${errors.join('\n')}`);
    }
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
