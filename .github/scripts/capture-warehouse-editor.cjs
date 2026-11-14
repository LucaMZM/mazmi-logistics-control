const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = 'http://localhost:4200';
const output = process.env.CAPTURE_DIR;
assert(output, 'CAPTURE_DIR must identify the screenshot artifact directory');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [], writes = [];
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
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/login`);
    await page.getByLabel('Email', { exact: true }).fill('operator@mazmilogistics.test');
    await page.getByLabel('Password', { exact: true }).fill('Demo2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');

    const fetchJSON = async (endpoint) => {
      const response = await context.request.get(`${base}/api/v1/${endpoint}`);
      assert.equal(response.status(), 200, endpoint);
      return response.json();
    };

    const warehouses = await fetchJSON('warehouses');
    const warehouse = warehouses.find((x) => x.active) ?? warehouses[0];
    assert(warehouse, 'Demo data requires a real warehouse');
    const url = `${base}/warehouse-editor?warehouse=${warehouse.id}`;
    const initial = await fetchJSON(`warehouses/${warehouse.id}/visual-layout`);
    assert.equal(initial.saved, false, 'Ephemeral demo database must begin without a saved layout');
    assert.equal(initial.revision, 0);
    const ordersBefore=await fetchJSON('orders?warehouse='+warehouse.id+'&size=100');
    const stockBefore = await fetchJSON('inventory?size=100');
    const stockView = (rows) => rows.content.map(({ id, onHand, available, reserved }) => ({
      id, onHand, available, reserved,
    })).sort((a, b) => a.id.localeCompare(b.id));

    page.on('request', (request) => {
      if (request.url().includes('/api/') && !['GET', 'OPTIONS', 'HEAD'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await page.goto(url);
    await page.getByRole('heading', { name: 'Warehouse Editor', exact: true }).waitFor();
    await page.getByText('Unsaved illustrative starter plan.', { exact: false }).waitFor();
    const canvas = page.locator('.scene-host canvas');
    await canvas.waitFor();
    await page.waitForFunction(() => document.querySelector('.scene-host canvas')?.width > 0);
    assert.equal(await page.locator('.scene-host canvas').count(), 1);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, 'warehouse-editor-overview.png'), animations: 'disabled' });

    await page.getByLabel('Select layout object').selectOption('rack-1');
    await page.getByRole('button', { name: 'Move right', exact: true }).click();
    await page.getByText('Unsaved layout changes.', { exact: false }).waitFor();
    await page.waitForFunction(
      () => [...document.querySelectorAll('.item-controls dd')][1]?.textContent?.trim() === '-6 / -3',
    );
    await page.getByRole('button', { name: 'Rotate object 90°' }).click();
    await page.waitForFunction(
      () => [...document.querySelectorAll('.item-controls dd')][2]?.textContent?.trim() === '90°',
    );
    await page.getByRole('button', { name: 'Save layout', exact: true }).click();
    await page.getByText('Visual layout saved', { exact: false }).waitFor();
    const firstSaved = await fetchJSON(`warehouses/${warehouse.id}/visual-layout`);
    assert.equal(firstSaved.revision, 1);
    assert.equal(firstSaved.items.find((item) => item.id === 'rack-1').x, -6);
    assert.equal(firstSaved.items.find((item) => item.id === 'rack-1').orientation, 90);
    await page.screenshot({ path: path.join(output, 'warehouse-editor-saved.png'), animations: 'disabled' });

    await page.reload();
    await page.getByRole('heading', { name: 'Warehouse Editor', exact: true }).waitFor();
    await page.getByText('Saved blueprint', { exact: false }).waitFor();
    await page.getByLabel('Select layout object').selectOption('rack-1');
    await page.waitForFunction(
      () => [...document.querySelectorAll('.item-controls dd')][1]?.textContent?.trim() === '-6 / -3',
    );

    // Two authenticated browser tabs must not overwrite each other.
    const secondPage = await context.newPage();
    secondPage.on('request', (request) => {
      if (request.url().includes('/api/') &&
          !['GET', 'OPTIONS', 'HEAD'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    secondPage.setDefaultTimeout(45000);
    secondPage.on('pageerror', (e) => errors.push(e.message));
    await secondPage.goto(url);
    await secondPage.getByText('Saved blueprint', { exact: false }).waitFor();
    await secondPage.getByLabel('Select layout object').selectOption('rack-2');
    await secondPage.getByRole('button', { name: 'Move down', exact: true }).click();
    await secondPage.getByRole('button', { name: 'Save layout', exact: true }).click();
    await secondPage.getByText('Visual layout saved', { exact: false }).waitFor();

    await page.getByLabel('Select layout object').selectOption('rack-3');
    await page.getByRole('button', { name: 'Move left', exact: true }).click();
    await page.getByRole('button', { name: 'Save layout', exact: true }).click();
    await page.getByText('Someone saved a newer revision.', { exact: false }).waitFor();
    const latest = await fetchJSON(`warehouses/${warehouse.id}/visual-layout`);
    assert.equal(latest.revision, 2);
    assert.equal(latest.items.find((item) => item.id === 'rack-2').z, -2);
    assert.equal(latest.items.find((item) => item.id === 'rack-3').x, 7);
    await secondPage.close();

    // Failed visual context must preserve editable HTML and saved data.
    const lost = await canvas.evaluate((element) => {
      const gl = element.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_lose_context');
      ext?.loseContext();
      return Boolean(ext);
    });
    assert(lost, 'WebGL loss extension is required for the recovery test');
    await page.getByRole('button', { name: 'Retry 3D', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Retry 3D', exact: true }).click();
    await canvas.waitFor();

    // The concurrency conflict was intentionally tested above. Reload the
    // authoritative revision before taking the portfolio mobile screenshot.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    await page.getByText('Saved blueprint', { exact: false }).waitFor();
    await page.waitForFunction(() => !document.querySelector('.notice.error'));
    const dismissToast = page.getByRole('button', { name: 'Dismiss', exact: true });
    if (await dismissToast.count()) await dismissToast.click();
    await page.locator('.mat-mdc-snack-bar-container').waitFor({ state: 'hidden' });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      'Editor must not cause mobile horizontal overflow');
    await page.screenshot({
      path: path.join(output, 'warehouse-editor-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({width:1440,height:1100});
    await page.getByRole('link',{name:'Back to Warehouse Twin'}).click();
    await page.getByRole('button',{name:'Open 3D warehouse'}).click();
    await page.getByText('Saved blueprint · Revision 2',{exact:false}).waitFor();
    await page.locator('.warehouse-scene canvas').waitFor();
    await page.getByText('Static blueprint:',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Storage racks'}).focus();
    await page.keyboard.press('Enter');
    await page.locator('.warehouse-zones button[aria-pressed="true"]').waitFor();
    await page.getByRole('button',{name:'Overview',exact:true}).click();
    await page.screenshot({path:path.join(output,'warehouse-twin-saved-layout.png'),animations:'disabled'});
    const other=warehouses.find(w=>w.id!==warehouse.id);
    assert(other);
    await page.getByLabel('Warehouse',{exact:true}).selectOption(other.id);
    await page.getByRole('button',{name:'Open 3D warehouse'}).click();
    await page.locator('.warehouse-scene canvas').waitFor();
    assert.equal(await page.getByText('Saved blueprint · Revision 2',{exact:false}).count(),0);
    // Save a designed scenario in this disposable warehouse. No domain writes.
    const planUrl=base+'/api/v1/warehouses/'+warehouse.id+'/visual-layout';
    const request={revision:2,items:[
      {id:'staging-east',kind:'STAGING',x:8,z:-3,orientation:0},
      {id:'dock-east',kind:'DOCK',x:8,z:5,orientation:0},
    ]};
    assert.equal((await context.request.put(planUrl,{data:request})).status(),403);
    const token=(await context.cookies()).find(c=>c.name==='XSRF-TOKEN');
    assert(token);
    const saved=await context.request.put(planUrl,{data:request,headers:{'X-XSRF-TOKEN':decodeURIComponent(token.value)}});
    assert.equal(saved.status(),200);
    await page.getByLabel('Warehouse',{exact:true}).selectOption(warehouse.id);
    await page.getByRole('button',{name:'Open 3D warehouse'}).click();
    await page.getByText('Saved blueprint · Revision 3',{exact:false}).waitFor();
    const orderSelect=page.getByLabel('Compatible order',{exact:true});
    await orderSelect.locator('option').nth(1).waitFor({state:'attached'});
    await orderSelect.selectOption({index:1});
    await page.getByRole('button',{name:'Play sequence',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('progress').value===100,null,{timeout:180000});
    const viewContext=await browser.newContext();
    const viewer=await viewContext.newPage();
    await viewer.goto(base+'/login');
    await viewer.getByLabel('Email',{exact:true}).fill('viewer@mazmilogistics.test');
    await viewer.getByLabel('Password',{exact:true}).fill('Demo2026!');
    await viewer.getByRole('button',{name:'Sign in',exact:true}).click();
    await viewer.waitForURL('**/dashboard');
    assert.equal((await viewContext.request.get(planUrl)).status(),200);
    const viewerToken=(await viewContext.cookies()).find(c=>c.name==='XSRF-TOKEN');
    assert(viewerToken);
    assert.equal((await viewContext.request.put(planUrl,{data:{...request,revision:3},headers:{'X-XSRF-TOKEN':decodeURIComponent(viewerToken.value)}})).status(),403);
    await viewContext.close();
    assert.deepEqual(await fetchJSON('orders?warehouse='+warehouse.id+'&size=100'),ordersBefore);
    const stockAfter = await fetchJSON('inventory?size=100');
    assert.deepEqual(stockView(stockAfter), stockView(stockBefore),
      'Saving a visual layout must never change stock');
    assert(writes.length >= 3, 'The browser must exercise the save and stale-write paths');
    assert(writes.every((line) => line.startsWith('PUT /api/v1/warehouses/')
      && line.endsWith('/visual-layout')),
      'Only layout saves may mutate API records');
    assert.deepEqual(errors, [], 'No uncaught JavaScript errors are allowed');
    await fs.writeFile(path.join(output, 'warehouse-editor-validation.json'), JSON.stringify({
      source: 'Temporary demo PostgreSQL, Spring Boot and Angular',
      browser: browser.version(),
      warehouse: warehouse.code,
      revision: latest.revision,
      checks: [
        'authenticated warehouse selection',
        'real 3D WebGL rendering and screenshot',
        'grid movement and object rotation',
        'persistent save and reload',
        'two-tab optimistic version conflict',
        'unchanged warehouse inventory',
        'WebGL loss and recovery',
        'responsive mobile viewport and reduced motion',
        'no unexpected API writes or JavaScript errors',
      ],
      writes,
      errors,
    }, null, 2));
    console.log('Warehouse Editor: persistent layout, concurrency, scene and mobile checks passed.');
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'warehouse-editor-failure.png'), fullPage: true })
        .catch(() => {});
      await fs.writeFile(path.join(output, 'warehouse-editor-failure.txt'),
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
