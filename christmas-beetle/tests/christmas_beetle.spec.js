const { test, expect } = require('@playwright/test');

test.describe('Christmas Beetle Visualiser', () => {
  test('loads without errors and UI elements appear', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('/christmas-beetle/');
    
    // Wait for the loading overlay to disappear
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });
    
    // Check if map container exists
    const map = page.locator('#map-container');
    await expect(map).toBeVisible();

    // Stats bar should be visible
    const statsBar = page.locator('#stats-bar');
    await expect(statsBar).toBeVisible();
    await expect(statsBar).toContainText('OCCURRENCES');

    // Controls should be visible
    const controls = page.locator('#controls');
    await expect(controls).toBeVisible();
    await expect(page.locator('#btn-play')).toBeVisible();

    // Ensure no JS errors occurred
    expect(errors.length).toBe(0);
  });

  test('species list works correctly', async ({ page }) => {
    await page.goto('/christmas-beetle/');
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });

    const speciesList = page.locator('#species-list');
    await expect(speciesList).toBeVisible();

    // Find the first checkbox and check it
    const firstCheckbox = speciesList.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();

    // Ensure it checked successfully
    await expect(firstCheckbox).toBeChecked();

    // Uncheck it
    await firstCheckbox.uncheck();
    await expect(firstCheckbox).not.toBeChecked();
  });
});
