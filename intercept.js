const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    const url = response.url();
    const type = response.request().resourceType();
    if (type === 'fetch' || type === 'xhr') {
      console.log('Intercepted API:', url);
      try {
        const text = await response.text();
        if (text.includes('Yallourn') || text.includes('latitude') || text.includes('lat') || text.includes('lon') || url.includes('facilities')) {
          console.log(`Saved ${url.split('/').pop()} (${text.length} chars)`);
          fs.writeFileSync('oe_api_' + url.split('/').pop().replace(/\W/g, '_') + '.json', text);
        }
      } catch (e) {}
    }
  });

  await page.goto('https://openelectricity.org.au/facilities', { waitUntil: 'networkidle' });
  await browser.close();
})();
