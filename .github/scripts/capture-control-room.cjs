const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = 'http://localhost:4200';
const output = process.env.CAPTURE_DIR;
assert(output, 'CAPTURE_DIR must point to an artifact directory');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  const writes = [];
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      locale: 'en-GB',
      timezoneId: 'Europe/Madrid',
      reducedMotion: 'no-preference',
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email', { exact: true }).fill('operator@mazmilogistics.test');
    await page.getByLabel('Password', { exact: true }).fill('Demo2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');
    const me = await context.request.get(`${baseURL}/api/v1/auth/me`);
    assert.equal(me.status(), 200);
    assert.equal((await me.json()).role, 'OPERATOR');
    page.on('request', (request) => {
      if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });

    const dashboard = await context.request.get(`${baseURL}/api/v1/dashboard`);
    assert.equal(dashboard.status(), 200);
    const data = await dashboard.json();

    await page.goto(`${baseURL}/control-room`);
    await page.getByRole('heading', { name: 'Control Room', exact: true }).waitFor();
    await page.locator('.scene canvas').waitFor();
    await page.getByRole('button', { name: 'Overview', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.scene canvas')?.width > 0);
    await page.evaluate(() => document.fonts.ready);

    const metricValues = await page.locator('.summary strong').allInnerTexts();
    const fmt = (value) => Number(value).toLocaleString('en-GB');
    assert.deepEqual(metricValues, [
      fmt(data.activeShipments), fmt(data.delayedShipments),
      fmt(data.openIncidents), fmt(data.criticalInventory.length),
    ], 'HTML operational metrics must match the real dashboard API');
    assert.equal(await page.locator('.scene canvas').count(), 1);
    assert(await page.getByRole('link', { name: 'Explore Fleet Twin' }).count() === 0,
      'The selected station must initially be Operations');

    const canvas = page.locator('.scene canvas');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, 'control-room-overview.png'), animations: 'disabled' });

    const fleetButton = page.locator('.station-choice').filter({ hasText: 'Fleet console' });
    await fleetButton.click();
    await page.waitForFunction(() => [...document.querySelectorAll('.station-choice')].some(el => el.textContent.includes('Fleet console') && el.getAttribute('aria-pressed') === 'true'));
    await page.getByRole('link', { name: 'Explore Fleet Twin' }).waitFor();
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(output, 'control-room-fleet.png'), animations: 'disabled' });

    const warehouseButton = page.locator('.station-choice').filter({ hasText: 'Warehouse console' });
    await warehouseButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => [...document.querySelectorAll('.station-choice')].some(el => el.textContent.includes('Warehouse console') && el.getAttribute('aria-pressed') === 'true'));
    await page.getByRole('link', { name: 'Explore Warehouse Twin' }).waitFor();
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(output, 'control-room-warehouse.png'), animations: 'disabled' });

    const screenshotBefore = await canvas.screenshot({ animations: 'disabled' });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.waitForTimeout(550);
    const screenshotAfter = await canvas.screenshot({ animations: 'disabled' });
    assert(!screenshotBefore.equals(screenshotAfter), 'Camera focus and overview must render distinct images');
    await page.getByRole('button', { name: 'Rotate', exact: true }).click();
    await page.waitForTimeout(200);

    // A simulated context loss should leave the operational HTML and navigation intact.
    const lost = await canvas.evaluate((element) => {
      const gl = element.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_lose_context');
      ext?.loseContext();
      return Boolean(ext);
    });
    assert(lost, 'SwiftShader must expose the WebGL loss extension');
    await page.getByRole('button', { name: 'Retry 3D control room' }).waitFor();
    assert.equal(await page.locator('.summary strong').count(), 4);
    await page.getByRole('button', { name: 'Retry 3D control room' }).click();
    await page.locator('.scene canvas').waitFor();
    await page.waitForFunction(() => !document.querySelector('.scene-message'));

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      'Control Room must not overflow at 390px');
    assert(await page.locator('.scene canvas').count() === 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, 'control-room-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByRole('link', { name: 'Open command center' }).click();
    await page.waitForURL('**/dashboard');
    assert.equal(await page.locator('.scene canvas').count(), 0);
    assert.deepEqual(writes, [], 'Exploring the room must never mutate ERP records');
    assert.deepEqual(errors, [], 'No uncaught JavaScript errors are allowed');

    await fs.writeFile(path.join(output, 'control-room-validation.json'), JSON.stringify({
      source: 'Demo PostgreSQL, Spring Boot and Angular application',
      chromium: browser.version(),
      desktop: '1440x1000',
      mobile: '390x844',
      verified: [
        'authenticated route', 'metrics match dashboard API', 'lazy WebGL scene',
        'operations, fleet and warehouse navigation', 'keyboard station selection',
        'camera focus and overview', 'WebGL context recovery',
        'mobile viewport without horizontal overflow',
        'reduced motion', 'scene destroyed when navigating away',
        'zero API mutations', 'zero JavaScript errors',
      ],
      javascriptErrors: errors,
      apiWrites: writes,
    }, null, 2));
    console.log('Control Room validation passed; screenshots captured.');
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'control-room-failure.png'), fullPage: true })
        .catch(() => {});
      await fs.writeFile(path.join(output, 'control-room-failure.txt'),
        `${error.stack || error}\n${errors.join('\n')}\n`).catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
