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

  test('species filter dropdown shows correctly', async ({ page }) => {
    await page.goto('/christmas-beetle/');
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });

    const filterInput = page.locator('#filter-input');
    await expect(filterInput).toBeVisible();

    // Type into the filter
    await filterInput.fill('porosus');

    // Dropdown should appear
    const dropdown = page.locator('#filter-dropdown');
    await expect(dropdown).toBeVisible();

    // Should contain the species
    await expect(dropdown).toContainText('Anoplognathus porosus');

    // Click it to add a pill
    await dropdown.locator('.filter-dropdown-item').first().click();

    // Pill should be visible
    const pills = page.locator('#filter-pills .filter-pill');
    await expect(pills).toHaveCount(1);
    await expect(pills.first()).toContainText('Anoplognathus porosus');

    // Clear filter
    const clearBtn = page.locator('#filter-clear');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(pills).toHaveCount(0);
  });
});
