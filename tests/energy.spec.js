const { test, expect } = require('@playwright/test');

test.describe('Energy Visualiser UI', () => {
  test.beforeEach(async ({ page }) => {
    // Log any console errors to catch TypeError exceptions
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
});
