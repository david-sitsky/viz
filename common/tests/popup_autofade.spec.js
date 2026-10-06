const { test, expect } = require('@playwright/test');

const PAGES = [
  '/frogid/index.html',
  '/energy/index.html'
];

test.describe('Popup Auto-Fade Tests', () => {
  for (const pagePath of PAGES) {
    test(`Ensure hover popup auto-fades in ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });
      
      const playBtn = page.locator('#btn-play');
      if (await playBtn.count() > 0) {
        await playBtn.click({ force: true });
      }

      await page.waitForTimeout(2000);
      
      const hoverPanel = page.locator('#hover-panel');
      // Wait, let's trigger the hover logic via map move
      const mapContainer = page.locator('#map-container');
      const box = await mapContainer.boundingBox();
      
      if (box) {
        // Move to center of map
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000);
        
        // Move off map (or top left corner)
        await page.mouse.move(0, 0);
        
        // We wait >1500ms since the timeout is 1500ms
        await page.waitForTimeout(2000);
        
        // Assert it is hidden or faded
        if (await hoverPanel.count() > 0) {
          const classList = await hoverPanel.evaluate(el => el.className);
          const isHiddenOrFaded = classList.includes('hidden') || classList.includes('faded') || classList.includes('fade-out');
          expect(isHiddenOrFaded).toBe(true);
        }
      }
    });
  }
});
