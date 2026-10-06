const { test, expect } = require('@playwright/test');

test.describe('Bogong Moth Visualiser', () => {
  test('loads without errors and UI elements appear', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('/bogong/');
    
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

    // Check if the Bogong Moth right panel is visible
    const rightPanel = page.locator('.species-panel');
    await expect(rightPanel).toBeVisible();
    await expect(rightPanel).toContainText('Bogong Moth');
    await expect(rightPanel).toContainText('Agrotis infusa');

    // Ensure no JS errors occurred
    expect(errors.length).toBe(0);
  });
});
