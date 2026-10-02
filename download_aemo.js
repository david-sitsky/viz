const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to AEMO list...");
  
  const [ download ] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
    page.goto('https://aemo.com.au/-/media/files/electricity/nem/participant_information/nem-registration-and-exemption-list.xls', { waitUntil: 'networkidle' }).catch(() => null)
  ]);
  
  if (download) {
    await download.saveAs('aemo.xls');
    console.log("Downloaded aemo.xls successfully!");
  } else {
    console.log("No download triggered. Page title:", await page.title());
    const content = await page.content();
    console.log("Content snippet:", content.substring(0, 500));
  }
  
  await browser.close();
})();
