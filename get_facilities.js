const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to OpenNEM facilities JSON...");
  const response = await page.goto('https://data.opennem.org.au/v3/network/nem/facilities.json', { waitUntil: 'networkidle' });
  
  if (response.ok()) {
    const text = await response.text();
    fs.writeFileSync('opennem_facilities.json', text);
    console.log(`Saved ${text.length} bytes to opennem_facilities.json`);
  } else {
    console.log("Failed. Status:", response.status());
    // Sometimes it renders the JSON in a <pre> tag if we visit it directly
    const text = await page.textContent('pre').catch(() => null);
    if (text) {
      fs.writeFileSync('opennem_facilities.json', text);
      console.log(`Saved ${text.length} bytes from PRE tag.`);
    } else {
      console.log(await page.content());
    }
  }

  await browser.close();
})();
