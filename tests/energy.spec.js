const { test, expect } = require('@playwright/test');

test.describe('Energy Visualiser UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/energy.html');
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
  });

  test('should load the energy map and UI components', async ({ page }) => {
    await expect(page.locator('#map-container')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#stats-bar')).toBeVisible();
    await expect(page.locator('#stat-date')).toContainText('2000');
  });

  test('should play through the timeline', async ({ page }) => {
    const initialDate = await page.locator('#stat-date').textContent();
    await page.click('#btn-play');
    await expect(page.locator('#stat-date')).not.toHaveText(initialDate, { timeout: 5000 });
    await page.click('#btn-play');
  });
});
