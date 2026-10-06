const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err}`));
  
  await page.goto('http://localhost:8000/frogid/');
  await page.waitForSelector('#loading-overlay.hidden', { timeout: 15000 });
  
  // click play
  await page.click('#btn-play');
  await page.waitForTimeout(1000);
  
  console.log("FROGID LOGS:");
  console.log(logs.join('\n'));
  
  await browser.close();
})();
