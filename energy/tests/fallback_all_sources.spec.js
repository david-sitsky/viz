const { test, expect } = require('@playwright/test');

test('test all sources shows full data at end of timeline', async ({ page }) => {
  let errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.addInitScript(() => window.localStorage.setItem('hasSeenTour', 'true'));
  await page.goto('http://localhost:8889/energy/');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Set dropdown to 'all_sources'
  await page.selectOption('#chart-view-mode', 'all_sources');
  await page.waitForTimeout(500);

  // Scrub to the end of the timeline
  const scrubber = page.locator('#scrubber');
  const maxVal = await scrubber.getAttribute('max');
  
  // Actually evaluate the input to trigger the event listener properly
  await scrubber.evaluate((node, max) => {
    node.value = max;
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, maxVal);
  
  await page.waitForTimeout(1000);

  // Verify that multiple sources are still visible, not just ROOFTOP SOLAR
  const endLabels = await page.locator('.bar-label').allTextContents();
  
  expect(errors).toHaveLength(0);
  expect(endLabels.length).toBeGreaterThan(1);
  expect(endLabels).toContain('COAL');
  expect(endLabels).toContain('GAS');
});
