const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err}`));
  
  await page.goto('http://localhost:8000/bogong/index.html');
  await page.waitForTimeout(5000);
  
  console.log("BOGONG LOGS:");
  console.log(logs.join('\n'));
  
  await browser.close();
  process.exit(0);
})();
