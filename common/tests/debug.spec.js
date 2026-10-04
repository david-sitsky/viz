const { test, expect } = require('@playwright/test');
test('catch errors', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.addInitScript(() => window.localStorage.setItem('hasSeenFrogTour', 'true'));
  await page.goto('/frogid/');
  await page.waitForTimeout(2000);
});
