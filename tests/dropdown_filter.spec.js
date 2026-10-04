const { test, expect } = require('@playwright/test');

test('test chart view mode dropdown and map filtering', async ({ page }) => {
  let errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.addInitScript(() => window.localStorage.setItem('hasSeenTour', 'true'));
  await page.goto('http://localhost:8889/energy.html');

  // Wait for loading to finish
  await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Check initial chart labels (should be fuel types)
  const initialLabels = await page.locator('.bar-label').allTextContents();
  expect(initialLabels.length).toBeGreaterThan(0);
  expect(initialLabels).toContain('COAL');
  expect(initialLabels).toContain('GAS');

  // Change dropdown to state_rooftop_solar
  await page.selectOption('#chart-view-mode', 'state_rooftop_solar');
  await page.waitForTimeout(1000); // Wait for UI to update

  // Verify no errors occurred
  expect(errors).toHaveLength(0);

  // Check new chart labels (should be state names)
  const newLabels = await page.locator('.bar-label').allTextContents();
  expect(newLabels.length).toBeGreaterThan(0);
  expect(newLabels).toContain('NSW');
  expect(newLabels).toContain('QLD');
  expect(newLabels).toContain('VIC');
  
  // Verify COAL and GAS are no longer in the labels
  expect(newLabels).not.toContain('COAL');
  expect(newLabels).not.toContain('GAS');
  
  // Test another option
  await page.selectOption('#chart-view-mode', 'state_coal');
  await page.waitForTimeout(1000);
  expect(errors).toHaveLength(0);
  
  const coalLabels = await page.locator('.bar-label').allTextContents();
  expect(coalLabels).toContain('NSW');
  expect(coalLabels).toContain('QLD');
});
