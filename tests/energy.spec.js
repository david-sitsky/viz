const { test, expect } = require('@playwright/test');

test.describe('Energy Visualiser UI', () => {
  test.beforeEach(async ({ page }) => {
    // Log any console errors to catch TypeError exceptions
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => {
      console.error(`Uncaught exception: "${exception}"`);
    });
    
    await page.goto('/energy.html');
    await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
  });

  test('should load the energy map and UI components', async ({ page }) => {
    await expect(page.locator('#map-container')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#stats-bar')).toBeVisible();
    await expect(page.locator('#stat-date')).toContainText('2024'); // Starts in 2024 now
  });

  test('should populate the dynamic bar chart', async ({ page }) => {
    // Check that the bottom panel becomes visible and has bars
    await expect(page.locator('#bottom-panel')).toBeVisible();
    const bars = page.locator('.bar-row');
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThan(0);
    
    // Verify first bar has text content
    await expect(bars.first().locator('.bar-label')).not.toBeEmpty();
    await expect(bars.first().locator('.bar-value')).not.toBeEmpty();
  });

  test('should not blank out at the end of the timeline', async ({ page }) => {
    // Manually scrub to the very end of the timeline
    await page.evaluate(() => { const s = document.getElementById('scrubber'); s.value = s.max; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); });
    
    // Check that there is still data in the bar chart
    const bars = page.locator('.bar-row');
    const firstVal = await bars.first().locator('.bar-value').textContent();
    expect(firstVal).not.toBe('0 MWh');
  });

  test('should display correct metadata on hover for specific production entities', async ({ page }) => {
    // Wait for the app to finish loading data
    
    // Just wait for loading to finish, then evaluate directly on window
    await page.waitForFunction(() => window.energyApp && window.energyApp.data && window.energyApp.data.facilityIds);


    // Find the exact record index for a known facility (e.g. Ararat wind farm)
    // We search the facilityMap for 'Ararat', get its ID, then find an index in facilityIds matching that ID
    const hoverData = await page.evaluate(() => {
      const app = window.energyApp;
      let targetFacId = -1;
      let targetFacName = '';
      let targetFacType = '';
      
      // Find a wind farm (e.g. Ararat)
      for (const [id, fac] of app.facilityMap.entries()) {
        if (fac.name === 'Ararat') {
          targetFacId = id;
          targetFacName = fac.name;
          targetFacType = fac.type;
          break;
        }
      }
      
      // Find its record index in the current day's active array
      const currentDay = app.map.currentDay || 0;
      const dayStart = app.map._getActiveData().dayOffsets[currentDay];
      const dayEnd = app.map._getActiveData().dayOffsets[currentDay + 1] || app.data.facilityIds.length;
      
      let recordIdx = -1;
      for (let i = dayStart; i < dayEnd; i++) {
        if (app.data.facilityIds[i] === targetFacId) {
          recordIdx = i;
          break;
        }
      }
      
      // Trigger the hover programmatically
      if (recordIdx >= 0) {
        app._onHover(recordIdx, 200, 200);
      }
      
      return { recordIdx, targetFacName, targetFacType };
    });
    
    expect(hoverData.recordIdx).toBeGreaterThanOrEqual(0);
    
    // Verify the DOM updated correctly
    await expect(page.locator('#hover-panel')).toBeVisible();
    await expect(page.locator('#hover-name')).toHaveText(hoverData.targetFacName);
    await expect(page.locator('#hover-type')).toHaveText(hoverData.targetFacType.replace('_', ' ').toUpperCase());
  });

});
