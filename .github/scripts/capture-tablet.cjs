const assert = require('node:assert/strict');
const path = require('node:path');

// Keep the loaded scene and its selection while exercising the real resize path.
module.exports = async function captureTablet(page, output, name, selector) {
  const previous = page.viewportSize();
  const scroll = await page.evaluate(() => ({x: scrollX, y: scrollY}));
  try {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator(selector).first().waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' overflows on tablet');
    const options = {path: path.join(output, 'tablet-' + name + '.png'), animations: 'disabled'};
    // In the tablet dashboard the map is below the attention queue. Frame the
    // actual map, not a second screenshot of the dashboard above the fold.
    if (selector === 'app-operations-world-map') {
      await page.locator(selector).screenshot(options);
    } else {
      await page.screenshot(options);
    }
  } finally {
    await page.setViewportSize(previous);
    // setViewportSize acknowledges Chromium's viewport change, not the subsequent
    // ResizeObserver delivery and render. Do not return stale tablet geometry.
    await page.waitForFunction(({width,height}) => innerWidth === width && innerHeight === height, previous);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(({x,y}) => window.scrollTo(x,y), scroll);
  }
};
