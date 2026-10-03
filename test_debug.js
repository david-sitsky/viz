const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:8889/energy.html');
  await page.waitForTimeout(2000);
  
  const hasData = await page.evaluate(() => !!window.energyApp.data);
  console.log("Has data:", hasData);
  if (hasData) {
      const hasFacilityIds = await page.evaluate(() => !!window.energyApp.data.facilityIds);
      console.log("Has facilityIds:", hasFacilityIds);
  }
  
  await browser.close();
})();
