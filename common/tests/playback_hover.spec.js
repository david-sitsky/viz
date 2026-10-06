const { test, expect } = require('@playwright/test');

const PAGES = [
  '/bogong/index.html',
  '/frogid/index.html',
  '/christmas-beetle/index.html',
  '/energy/index.html'
];

test.describe('Playback & Hover Crash Tests', () => {
  for (const pagePath of PAGES) {
    test(`Ensure playback and hovering does not throw unhandled exceptions in ${pagePath}`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      // Also listen for unhandled rejections or console errors if they are actual Errors
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('TypeError')) {
          pageErrors.push(msg.text());
        }
      });

      await page.goto(pagePath);
      
      await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });
      
      const settingsBtn = page.locator('#btn-settings');
      if (await settingsBtn.count() > 0) {
        const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
        if (!isChecked) await settingsBtn.click({ force: true });
      }

      // Start playback
      const playBtn = page.locator('#btn-play');
      if (await playBtn.count() > 0) {
        await playBtn.click({ force: true });
      }

      // Wait 2 seconds for dots to appear on the map
      await page.waitForTimeout(2000);

      const mapContainer = page.locator('#map-container');
      const box = await mapContainer.boundingBox();
      
      if (box) {
        // Move mouse systematically across the center of the map to trigger hovers
        const stepsX = 5;
        const stepsY = 5;
        for (let i = 1; i < stepsX; i++) {
          for (let j = 1; j < stepsY; j++) {
            const x = box.x + (box.width * (i / stepsX));
            const y = box.y + (box.height * (j / stepsY));
            await page.mouse.move(x, y);
            await page.waitForTimeout(100);
          }
        }
        
        // Move completely off to top-left to trigger mouseleave / recordIdx = -1
        await page.mouse.move(0, 0);
      }

      await page.waitForTimeout(1000);

      expect(pageErrors, `Unhandled exceptions occurred: ${pageErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
