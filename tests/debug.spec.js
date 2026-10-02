const { test, expect } = require('@playwright/test');
test('catch errors', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('/frogid.html');
  await page.waitForTimeout(2000);
});
