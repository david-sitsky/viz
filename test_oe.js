const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for all network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('facilities') || url.includes('.json')) {
      console.log('Intercepted:', url);
    }
  });

  console.log("Navigating to OpenElectricity...");
  await page.goto('https://openelectricity.org.au/facilities', { waitUntil: 'networkidle' }).catch(e => console.log(e));
  
  const content = await page.content();
  console.log("Title:", await page.title());
  
  await browser.close();
})();
