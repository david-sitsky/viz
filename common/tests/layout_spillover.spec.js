const { test, expect } = require('@playwright/test');

const PAGES = [
  '/bogong/index.html',
  '/frogid/index.html',
  '/christmas-beetle/index.html',
  '/energy/index.html'
];

test.describe('Layout Spillover Tests', () => {
  for (const pagePath of PAGES) {
    test(`Ensure no elements overflow the top-left panel in ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      
      // Wait for loading to finish
      await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.count() > 0) {
      const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
      if (!isChecked) await settingsBtn.click({ force: true });
    }
    
      
      // Ensure the advanced controls are expanded so we can check their width
      const settingsToggle = page.locator('#mobile-toggle');
      if (await settingsToggle.count() > 0) {
        await settingsToggle.evaluate(el => el.checked = true);
      }
      
      // Get the bounding box of the main panel container
      const panel = page.locator('#top-left-panel');
      const panelBox = await panel.boundingBox();
      expect(panelBox).not.toBeNull();
      
      // Check all visible child elements within the panel
      const childElements = panel.locator('*');
      const count = await childElements.count();
      
      for (let i = 0; i < count; i++) {
        const child = childElements.nth(i);
        const isVisible = await child.isVisible();
        if (!isVisible) continue;
        
        const childBox = await child.boundingBox();
        if (!childBox) continue;
        
        const spillover = childBox.x + childBox.width - (panelBox.x + panelBox.width);
        
        // Assert spillover is not strictly greater than 2 pixels
        expect(spillover, `Element ${await child.evaluate(el => el.tagName + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''))} overflows the panel by ${spillover}px`).toBeLessThanOrEqual(2);
      }
    });
  }
});
