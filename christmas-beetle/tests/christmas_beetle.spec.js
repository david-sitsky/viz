const { test, expect } = require('@playwright/test');

test.describe('Christmas Beetle Visualiser', () => {
  test('loads without errors and UI elements appear', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('/christmas-beetle/');
    
    // Wait for the loading overlay to disappear
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.count() > 0) {
      const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
      if (!isChecked) await settingsBtn.click({ force: true });
    }
    
    
    // Check if map container exists
    const map = page.locator('#map-container');
    await expect(map).toBeVisible();

    // Stats bar should be visible
    const statsBar = page.locator('#stats-bar');
    await expect(statsBar).toBeVisible();
    await expect(statsBar).toContainText('recordings');

    // Controls should be visible
    const controls = page.locator('#controls');
    await expect(controls).toBeVisible();
    await expect(page.locator('#btn-play')).toBeVisible();

    // Ensure no JS errors occurred
    expect(errors.length).toBe(0);
  });

  test('species list works correctly with select all/none', async ({ page }) => {
    await page.goto('/christmas-beetle/');
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.count() > 0) {
      const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
      if (!isChecked) await settingsBtn.click({ force: true });
    }
    

    const speciesList = page.locator('#species-list');
    await expect(speciesList).toBeVisible();

    const selectAll = page.locator('button:has-text("Select All")');
    const selectNone = page.locator('button:has-text("Select None")');
    await expect(selectAll).toBeVisible();
    
    const checkboxes = speciesList.locator('input[type="checkbox"]');
    
    // Click Select None
    await selectNone.click();
    await expect(checkboxes.first()).not.toBeChecked();

    // Click Select All
    await selectAll.click();
    await expect(checkboxes.first()).toBeChecked();
  });
  
  test('hover popup appears on map hover', async ({ page }) => {
    await page.goto('/christmas-beetle/');
    await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.count() > 0) {
      const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
      if (!isChecked) await settingsBtn.click({ force: true });
    }
    
    
    // Wait for map to settle
    await page.waitForTimeout(1000);
    
    // Evaluate JS to manually trigger a fake hover via EngineMap
    await page.evaluate(() => {
      if (window.app && window.app.map) {
        // Trigger onRecord directly to simulate a deck.gl hover
        window.app._showHoverPopup(0, {x: 500, y: 500});
      }
    });
    
    const hoverPanel = page.locator('#hover-panel');
    await expect(hoverPanel).not.toHaveClass(/hidden/);
  });
});
