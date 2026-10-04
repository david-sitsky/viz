const { test, expect } = require('@playwright/test');

const PAGES = ['/', '/energy/index.html', '/bogong/index.html', '/frogid/index.html'];

test.describe('Smoke Tests - No 404s', () => {
  for (const p of PAGES) {
    test(`Page ${p} should load without 404s`, async ({ page }) => {
      const failedRequests = [];
      page.on('response', response => {
        // Ignore analytics or external ad trackers if any, but we have none
        if (response.status() === 404) {
          failedRequests.push(response.url());
        }
      });

      await page.addInitScript(() => {
        window.localStorage.setItem('hasSeenTour', 'true');
        window.localStorage.setItem('hasSeenFrogTour', 'true');
        window.localStorage.setItem('hasSeenBogongTour', 'true');
      });

      await page.goto(p, { waitUntil: 'networkidle' });
      
      expect(failedRequests, `Found 404 errors on ${p}:\n${failedRequests.join('\n')}`).toHaveLength(0);
    });
  }
});
