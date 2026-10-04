const { test, expect } = require('@playwright/test');

test('test map rendering errors', async ({ page }) => {
  let errors = [];
  page.on('pageerror', err => { errors.push(err.message); console.log("PAGE ERROR:", err.message); });
  page.on('console', msg => { 
    if(msg.type() === 'error') {
      errors.push(msg.text());
      console.log("CONSOLE ERROR:", msg.text());
    }
  });
  
  await page.addInitScript(() => window.localStorage.setItem('hasSeenTour', 'true'));
  await page.goto('http://127.0.0.1:8889/energy.html');
  await page.waitForTimeout(5000);
});
