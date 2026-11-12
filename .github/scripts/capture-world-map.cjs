const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output = process.env.CAPTURE_DIR;
  assert(output);
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,locale:'en-GB',timezoneId:'Europe/Madrid'});
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const errors = [], frames = [], requests = [];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') console.error('Browser:',message.text());});
  page.on('requestfailed',request=>console.error('Request failed:',request.url(),request.failure()?.errorText));
  page.on('request',request=>requests.push(request.url()));
  page.on('websocket',socket=>socket.on('framereceived',({payload})=>{
    const text=payload.toString();
    if(text.includes('destination:/topic/shipments/')) frames.push(text);
  }));
  try {
    await page.goto('http://localhost:4200/login');
    await page.getByLabel('Email',{exact:true}).fill('operator@mazmilogistics.test');
    await page.getByLabel('Password',{exact:true}).fill('Demo2026!');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.waitForURL('**/dashboard');
    const worker=await page.request.get('http://localhost:4200/assets/maplibre/maplibre-gl-worker.mjs');
    assert.equal(worker.status(),200);
    assert.match(worker.headers()['content-type'],/javascript/);
    const dashboard=await (await page.request.get('http://localhost:4200/api/v1/dashboard')).json();
    const shipment=dashboard.activeShipmentMapItems.find(s=>s.vehicleId && s.vehicleType==='VAN' && !s.simulationActive && s.progress<85);
    assert(shipment,'Demo must contain an assigned in-transit van');
    const vehicles=await(await page.request.get('http://localhost:4200/api/v1/vehicles')).json();
    assert.equal(vehicles.find(v=>v.id===shipment.vehicleId)?.registrationPlate,shipment.registrationPlate);
    const map=page.locator('app-operations-world-map');
    await map.getByRole('button',{name:'3D',exact:true}).click();
    async function ready() {
      await map.locator('.maplibregl-canvas').waitFor();
      await page.waitForFunction(()=>document.querySelector('.world-canvas')?.dataset.mapReady==='true');
      assert.equal(await map.getByRole('alert').count(),0,'No map error should be visible');
      await page.evaluate(()=>document.fonts.ready);
      await page.mouse.move(0,0);
    }
    await ready();
    await page.screenshot({path:path.join(output,'world-map-overview.png')});
    await map.locator('summary').click();
    await map.getByLabel('Map shipment',{exact:true}).selectOption(shipment.id);
    await ready();
    await page.waitForTimeout(1000);
    await page.screenshot({path:path.join(output,'world-map-selected.png')});
    assert((await map.innerText()).includes(shipment.registrationPlate));
    await map.getByRole('button',{name:'2D',exact:true}).click();
    await map.locator('.leaflet-container').waitFor();
    await map.getByRole('button',{name:'3D',exact:true}).click();
    await ready();
    await page.goto(`http://localhost:4200/shipments/${shipment.id}`);
    await page.locator('.connection.connected').waitFor();
    await map.getByRole('button',{name:'3D',exact:true}).click();
    await ready();
    await map.locator('summary').click();
    await map.getByLabel('Map shipment',{exact:true}).selectOption(shipment.id);
    await map.getByRole('button',{name:'Follow vehicle',exact:true}).click();
    const before=await map.locator('canvas').screenshot();
    await page.getByRole('button',{name:'Start simulation',exact:true}).click();
    await page.getByRole('button',{name:'Pause simulation',exact:true}).waitFor();
    const hasAdvanced = () => frames.some(f => {
      const body = f.slice(f.indexOf('{')).replace(/\0/g,'');
      try { const update=JSON.parse(body); return update.id===shipment.id && update.progress>shipment.progress; } catch { return false; }
    });
    const deadline=Date.now()+20000;
    while (!hasAdvanced() && Date.now()<deadline) await page.waitForTimeout(250);
    assert(hasAdvanced(),'Real STOMP position advance required');
    await page.waitForTimeout(1700);
    assert(!before.equals(await map.locator('canvas').screenshot()),'The rendered map must change with real simulation data');
    await page.screenshot({path:path.join(output,'world-map-tracking.png')});
    await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
    await page.getByRole('button',{name:'Start simulation',exact:true}).waitFor();
    const canvas=map.locator('canvas');
    const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4);
    await page.mouse.down(); await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5,{steps:8}); await page.mouse.up();
    await map.getByRole('button',{name:'Follow vehicle',exact:true}).waitFor();
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await map.getByRole('button',{name:'Focus vehicle',exact:true}).click();
    await map.locator('summary').click();
    await page.waitForTimeout(800);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,'world-map-mobile.png'),fullPage:true});
    await canvas.evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await map.getByRole('alert').waitFor();
    await map.getByRole('button',{name:'Retry 3D map',exact:true}).click();
    await ready();
    await map.getByRole('button',{name:'2D',exact:true}).click();
    assert.equal(await map.locator('.leaflet-container').count(),1);
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'world-map-validation.json'),JSON.stringify({browser:await browser.version(),renderer:'Chromium / SwiftShader / Ubuntu runner',shipmentId:shipment.id,vehicleId:shipment.vehicleId,stompMessages:frames.length,cartographyRequests:requests.filter(u=>u.startsWith('https://tiles.openfreemap.org')).length,javascriptErrors:errors,desktop:[1440,1100],mobile:[390,844],checks:['real HTTP identity','2D/3D switch','real STOMP simulation','follow cancelled by drag','pause','mobile overflow','reduced motion','context loss and retry']},null,2));
  } catch(error) {
    console.error('JavaScript errors:',errors);
    await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
    console.error(await page.locator('body').innerText());
    throw error;
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
