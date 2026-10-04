const { test, expect } = require('@playwright/test');

test('test map rendering with both rooftop modes', async ({ page }) => {
  let errors = [];
  page.on('pageerror', err => { errors.push(err.message); });
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  
  await page.addInitScript(() => window.localStorage.setItem('hasSeenTour', 'true'));
  await page.goto('http://127.0.0.1:8889/energy.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Select centroid
  await page.click('label[for="mobile-toggle"]'); await page.waitForTimeout(500); await page.selectOption('#rooftop-mode', 'centroid');
  await page.waitForTimeout(1000);
  
  // Select polygon
  await page.selectOption('#rooftop-mode', 'polygon');
  await page.waitForTimeout(1000);

  expect(errors.length).toBe(0);
});
