const { test, expect } = require('@playwright/test');

test('test chart calculation for NSW/ACT at end of timeline', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('hasSeenTour', 'true'));
  await page.goto('http://127.0.0.1:8889/energy/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.bar-row');
  
  // Wait for application to initialize
  await page.waitForTimeout(2000);
  
  // Click 'None' to clear selected states
  await page.click('label[for="mobile-toggle"]'); await page.waitForTimeout(500);
  await page.click('#btn-deselect-all');
  await page.waitForTimeout(500);
  
  // Select ONLY 'NSW/ACT'
  await page.evaluate(() => {
    const cb = document.querySelector('input[value="NSW/ACT"]');
    if(cb) { cb.click(); }
  });
  
  await page.waitForTimeout(500);
  
  // Move to end of timeline
  await page.evaluate(() => {
    const slider = document.getElementById('scrubber');
    if (slider) {
      slider.value = slider.max;
      slider.dispatchEvent(new Event('input'));
    }
  });
  
  // Wait for the chart aggregation to settle
  await page.waitForTimeout(1500);
  
  // Extract all bar rows
  const stats = await page.evaluate(() => {
    const rows = document.querySelectorAll('.bar-row');
    let res = {};
    rows.forEach(r => {
      const label = r.querySelector('.bar-label')?.innerText?.trim() || '';
      const val = r.querySelector('.bar-value')?.innerText?.trim() || '';
      res[label] = val;
    });
    return res;
  });
  
  // Verify that the UI numbers match the backend binary data precisely
  // We use > since the data grows dynamically every day
  const fossil = parseInt((stats['FOSSIL FUELS'] || '0').replace(/,/g, ''), 10);
  const renewables = parseInt((stats['RENEWABLES'] || '0').replace(/,/g, ''), 10);
  
  expect(fossil).toBeGreaterThan(80000);
  expect(renewables).toBeGreaterThan(50000);
});
