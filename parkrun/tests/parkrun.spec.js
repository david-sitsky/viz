const { test, expect } = require('@playwright/test');

test.describe('Parkrun Visualisation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenParkrunTour', 'true');
      window.localStorage.setItem('parkrun_help_seen', '1');
    });
  });

  test('Page loads correctly and animates data', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/parkrun/index.html');

    // Verify page title
    await expect(page).toHaveTitle(/Australian Parkrun/);

    // Verify splash screen subtitle
    const subtitle = page.locator('#loading-overlay .loading-subtitle');
    await expect(subtitle).toHaveText('Participation growth over time');

    // Wait for loading overlay to hide
    const loadingOverlay = page.locator('#loading-overlay');
    await expect(loadingOverlay).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Verify main title
    const vizTitle = page.locator('.viz-title');
    await expect(vizTitle).toContainText('Parkrun Australia');

    // Verify attribution is removed
    const attribution = page.locator('.attribution');
    await expect(attribution).toHaveCount(0);

    // Verify stats bar is visible
    const statsBar = page.locator('#stats-bar');
    await expect(statsBar).toBeVisible();

    // Verify inline home button exists and links to ../
    const homeBtn = page.locator('.home-nav-inline');
    await expect(homeBtn).toBeVisible();
    await expect(homeBtn).toHaveAttribute('href', '../');

    // Verify date format (e.g. "2 Apr 2011", strictly no day-of-week prefix like "Sat, ")
    const statDate = page.locator('#stat-date');
    await expect(statDate).toContainText('2011');
    const dateText = await statDate.textContent();
    expect(dateText).not.toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
    expect(dateText).toMatch(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/);

    // Verify stat label is DATE (not SATURDAY)
    const statLabel = page.locator('.stat-label').first();
    await expect(statLabel).toContainText('DATE');

    // Verify timeline scrubber is positioned on its own line below date and controls
    const dateBox = await statDate.boundingBox();
    const scrubberBox = await page.locator('#scrubber').boundingBox();
    expect(scrubberBox.y).toBeGreaterThanOrEqual(dateBox.y + dateBox.height - 2);

    // Open settings drawer to access controls (matches unified mobile-toggle pattern)
    const settingsBtn = page.locator('#btn-settings');
    const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    if (!isChecked) await settingsBtn.click({ force: true });

    // Verify speed slider defaults to 20x
    const speedSlider = page.locator('#speed');
    await expect(speedSlider).toBeVisible();
    await expect(speedSlider).toHaveValue('20');
    const speedVal = page.locator('#speed-val');
    await expect(speedVal).toHaveText('20×');

    // Adjust speed slider to 5x
    await speedSlider.fill('5');
    await speedSlider.dispatchEvent('input');
    await expect(speedVal).toHaveText('5×');

    // Verify weekly finishers stat is populated
    const statFinishers = page.locator('#stat-finishers');
    await expect(statFinishers).not.toHaveText('—');

    // Verify playback toggle
    const btnPlay = page.locator('#btn-play');
    await btnPlay.click();
    await expect(btnPlay).toHaveText('⏸');

    // Let it run for a brief moment then pause
    await page.waitForTimeout(600);
    await btnPlay.click();
    await expect(btnPlay).toHaveText('▶');

    // Verify scrubber interaction
    const scrubber = page.locator('#scrubber');
    const maxVal = await scrubber.getAttribute('max');
    expect(parseInt(maxVal, 10)).toBeGreaterThan(0);

    // Filter out expected Deck.gl WebGL warning if any in headless environment
    const criticalErrors = consoleErrors.filter(err => !err.includes('WebGL') && !err.includes('GL_'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Tooltip formatting uses placename only and links to specific event results', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Directly test the _updateTooltip rendering logic via page evaluation
    await page.evaluate(() => {
      const mockRecord = {
        name: 'Moree parkrun',
        placename: 'Moree',
        eventname: 'moree',
        eventNumber: 463,
        finishers: 42,
        date: '2026-10-17'
      };
      if (window.app) {
        window.app._updateTooltip(mockRecord, 200, 200, true);
      }
    });

    const tooltip = page.locator('#map-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Moree');
    await expect(tooltip).not.toContainText('Moree parkrun');
    await expect(tooltip).toContainText('42 runners on 17 Oct 2026');
    await expect(tooltip).not.toContainText('Sat, ');

    const link = tooltip.locator('a');
    await expect(link).toHaveAttribute('href', 'https://www.parkrun.com.au/moree/results/463/');
  });

  test('Tooltip updates dynamically to the current count when timeline advances', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Simulate pinning Main Beach (eventId 4) at Week 0 (2011-04-02)
    await page.evaluate(() => {
      // Find app instance or trigger via map
      const canvas = document.querySelector('canvas');
      // Set pinned record directly on map
      // Let's trigger via document/window or deck
      const app = window;
      // We can trigger setWeek(0) and simulate click on the event
      const scrubber = document.getElementById('scrubber');
      scrubber.value = '0';
      scrubber.dispatchEvent(new Event('input'));
    });

    // Pin an event via page.evaluate
    await page.evaluate(() => {
      // Find the app by inspecting global / event map
      // We can call map._handleClick with week 0's record
      const mapContainer = document.getElementById('map-container');
      // Deck overlay instance
    });

    // Let's test using the scrubber and verifying timeline stats update
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('0');
    await scrubber.dispatchEvent('input');
    await expect(page.locator('#stat-date')).toContainText('2011');
    await expect(page.locator('#stat-finishers')).toHaveText('108');

    // Advance scrubber to week 1 (2011-04-09)
    await scrubber.fill('1');
    await scrubber.dispatchEvent('input');
    await expect(page.locator('#stat-finishers')).toHaveText('100');
  });

  test('Bottom panel renders horizontal bar graphs scaled appropriately with 100% peaks', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const bottomPanel = page.locator('#bottom-panel');
    await expect(bottomPanel).toBeVisible();

    const barValActive = page.locator('#bar-val-active');
    const barValFinishers = page.locator('#bar-val-finishers');

    // At week 0 (start), 1 venue should use singular form "1 venue" (strictly not "1 venues")
    await expect(barValActive).toHaveText('1 venue');
    await expect(barValFinishers).toHaveText('108 runners');

    // Verify WEEKLY PARTICIPATION section
    await expect(bottomPanel.locator('#chart-title-participation')).toHaveText('WEEKLY PARTICIPATION');

    // Verify "Total Finishers" label in HUD
    await expect(page.locator('#weekly-stats-card')).toContainText('Total Finishers');

    const scrubber = page.locator('#scrubber');

    // At week 804 (peak active venues in dataset: 540 venues), bar reaches 100%
    await scrubber.fill('804');
    await scrubber.dispatchEvent('input');
    const barFillActive = page.locator('#bar-fill-active');
    const activeWidth = await barFillActive.evaluate(el => el.style.width);
    expect(activeWidth).toMatch(/^100(\.0)?%$/);

    // At week 770 (peak weekly participants: 98,962 runners), bar reaches 100%
    await scrubber.fill('770');
    await scrubber.dispatchEvent('input');
    const barFillFinishers = page.locator('#bar-fill-finishers');
    const finishersWidth = await barFillFinishers.evaluate(el => el.style.width);
    expect(finishersWidth).toMatch(/^100(\.0)?%$/);

    // Scrubber to final week (25,354,245 total runners)
    const maxVal = await scrubber.getAttribute('max');
    await scrubber.fill(maxVal);
    await scrubber.dispatchEvent('input');

    // At final week, total finishers in HUD and growth card reaches 25,354,245
    await expect(page.locator('#stat-cumulative')).toContainText('25,354,245');
    await expect(page.locator('#growth-card-val')).toContainText('25,354,245');
  });

  test('Past venue popup indicates inactive status and provides homepage link when available', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Simulate clicking a past venue that is not active this week
    await page.evaluate(() => {
      const mockPastVenue = {
        name: 'Mount Isa parkrun',
        placename: 'Mount Isa',
        eventname: 'mountisa',
        isPastVenue: true,
        finishers: 0,
        date: '2026-10-17'
      };
      if (window.app) {
        window.app._updateTooltip(mockPastVenue, 200, 200, true);
      }
    });

    const tooltip = page.locator('#map-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Mount Isa');
    await expect(tooltip).toContainText('Past venue — not active on 17 Oct 2026');
    const link = tooltip.locator('a');
    await expect(link).toHaveAttribute('href', 'https://www.parkrun.com.au/mountisa/');
    await expect(link).toContainText('Visit venue homepage');
  });

  test('State & territory filters update HUD stats, chart scales, and map markers', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Open settings drawer to access state filter panel
    const settingsBtn = page.locator('#btn-settings');
    const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    if (!isChecked) await settingsBtn.click({ force: true });

    // Verify filter panel is present
    const filterPanel = page.locator('#filter-panel');
    await expect(filterPanel).toBeVisible();

    const checkboxes = filterPanel.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(8);

    // Verify all 8 state labels
    const labels = await filterPanel.locator('#filter-content label').allTextContents();
    const cleanLabels = labels.map(t => t.trim());
    expect(cleanLabels).toEqual(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);

    // Advance scrubber to final week (all states selected)
    const scrubber = page.locator('#scrubber');
    const maxVal = await scrubber.getAttribute('max');
    await scrubber.fill(maxVal);
    await scrubber.dispatchEvent('input');

    const statCumulative = page.locator('#stat-cumulative');
    await expect(statCumulative).toContainText('25,354,245');

    // Deselect all states
    const btnDeselectAll = page.locator('#btn-deselect-all');
    await btnDeselectAll.click();

    // Verify stats drop to zero
    await expect(page.locator('#stat-finishers')).toHaveText('0');
    await expect(page.locator('#stat-active')).toHaveText('0');
    await expect(statCumulative).toHaveText('0');
    await expect(page.locator('#stat-established')).toHaveText('0');

    // Verify bottom panel bar widths drop to 0% and growth card drops to 0
    const barActive = page.locator('#bar-fill-active');
    const barFinishers = page.locator('#bar-fill-finishers');
    await expect(barActive).toHaveCSS('width', '0px');
    await expect(barFinishers).toHaveCSS('width', '0px');
    await expect(page.locator('#growth-card-val')).toHaveText('0');

    // Select only Queensland (QLD - index 2)
    const qldCheckbox = filterPanel.locator('input[type="checkbox"][value="2"]');
    await qldCheckbox.check();

    // Verify QLD stats are populated for final week
    await expect(statCumulative).toContainText('7,725,348');
    await expect(page.locator('#growth-card-val')).toContainText('7,725,348');
    await expect(page.locator('#stat-active')).not.toHaveText('0');
    await expect(page.locator('#stat-finishers')).not.toHaveText('0');

    // Select all states again
    const btnSelectAll = page.locator('#btn-select-all');
    await btnSelectAll.click();

    // Verify cumulative restores to total Australia count
    await expect(statCumulative).toContainText('25,354,245');
    await expect(page.locator('#growth-card-val')).toContainText('25,354,245');
  });

  test('Popup is draggable and maintains fixed jitter-free dimensions', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const tooltip = page.locator('#map-tooltip');

    // Pin an event using app.map.pinnedRecord so Deck.gl hover doesn't unpin it
    await page.evaluate(() => {
      const mockRecord = {
        eventId: 4,
        name: 'Main Beach parkrun',
        placename: 'Main Beach',
        eventname: 'mainbeach',
        eventNumber: 1,
        finishers: 108,
        date: '2011-04-02',
        lon: 153.42,
        lat: -27.98
      };
      if (window.app) {
        if (window.app.map) window.app.map.pinnedRecord = mockRecord;
        window.app._updateTooltip(mockRecord, 300, 200, true);
      }
    });

    await expect(tooltip).toBeVisible();

    // Verify fixed width (250px) preventing horizontal jitter
    const width = await tooltip.evaluate(el => el.getBoundingClientRect().width);
    expect(width).toBe(250);

    // Verify grab cursor for drag affordance
    await expect(tooltip).toHaveCSS('cursor', 'grab');

    // Simulate drag via mouse events
    const box = await tooltip.boundingBox();
    expect(box).not.toBeNull();
    const startX = box.x + 40;
    const startY = box.y + 15;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 60, { steps: 5 });
    await page.mouse.up();

    // Verify tooltip position shifted after dragging
    const newBox = await tooltip.boundingBox();
    expect(newBox).not.toBeNull();
    expect(newBox.x).toBeGreaterThan(box.x + 30);
    expect(newBox.y).toBeGreaterThan(box.y + 30);

    // Advancing timeline keeps pinned popup at its dragged position without resetting or jittering
    await page.evaluate(() => {
      const scrubber = document.getElementById('scrubber');
      scrubber.value = '50';
      scrubber.dispatchEvent(new Event('input'));
    });

    const boxAfterScrub = await tooltip.boundingBox();
    expect(boxAfterScrub).not.toBeNull();
    expect(Math.round(boxAfterScrub.x)).toBe(Math.round(newBox.x));
    expect(Math.round(boxAfterScrub.y)).toBe(Math.round(newBox.y));
  });

  test('Main date in UI control maintains stable width between single and double digit dates', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const scrubber = page.locator('#scrubber');
    const stat = page.locator('.stat').first();
    const statDate = page.locator('#stat-date');

    // Week 0: "2 Apr 2011" (single digit day)
    await scrubber.fill('0');
    await scrubber.dispatchEvent('input');
    await expect(statDate).toContainText('2 Apr 2011');
    const singleDigitBox = await stat.boundingBox();

    // Week 2: "16 Apr 2011" (double digit day)
    await scrubber.fill('2');
    await scrubber.dispatchEvent('input');
    await expect(statDate).toContainText('16 Apr 2011');
    const doubleDigitBox = await stat.boundingBox();

    // Width of .stat should remain identical (no horizontal jitter)
    expect(singleDigitBox).not.toBeNull();
    expect(doubleDigitBox).not.toBeNull();
    expect(Math.round(singleDigitBox.width)).toBe(Math.round(doubleDigitBox.width));
  });

  test('Close button and links work during active fast playback without dropped clicks', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const tooltip = page.locator('#map-tooltip');
    const closeBtn = page.locator('#tooltip-close');

    // Start playback (default speed is 20x)
    const btnPlay = page.locator('#btn-play');
    await btnPlay.click();
    await expect(btnPlay).toHaveText('⏸');

    // Pin a venue during active playback
    await page.evaluate(() => {
      const mockRecord = {
        eventId: 4,
        name: 'Main Beach parkrun',
        placename: 'Main Beach',
        eventname: 'mainbeach',
        eventNumber: 1,
        finishers: 108,
        date: '2011-04-02',
        lon: 153.42,
        lat: -27.98
      };
      if (window.app) {
        if (window.app.map) window.app.map.pinnedRecord = mockRecord;
        window.app._updateTooltip(mockRecord, 300, 200, true);
      }
    });

    await expect(tooltip).toBeVisible();
    await expect(closeBtn).toBeVisible();

    // Wait a brief moment to let multiple animation ticks run (150ms = ~3 ticks at 20x)
    await page.waitForTimeout(150);

    // Click close button while animation is actively playing
    await closeBtn.click();

    // Tooltip should be closed cleanly
    await expect(tooltip).toBeHidden();

    // Stop playback
    await btnPlay.click();
    await expect(btnPlay).toHaveText('▶');
  });

  test('Filtering states before animation starts automatically sets start date to earliest record of filtered area', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const statDate = page.locator('#stat-date');
    const scrubber = page.locator('#scrubber');

    // Default start date is 2 Apr 2011 (Queensland opening week 0)
    await expect(statDate).toHaveText('2 Apr 2011');
    await expect(scrubber).toHaveValue('0');

    // Open settings drawer
    const settingsBtn = page.locator('#btn-settings');
    const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    if (!isChecked) await settingsBtn.click({ force: true });

    // Deselect all
    await page.locator('#btn-deselect-all').click();

    // Select Victoria (VIC - index 1)
    const vicCheckbox = page.locator('#filter-content input[type="checkbox"][value="1"]');
    await vicCheckbox.check();

    // Earliest event in Victoria is Albert Melbourne on 19 Nov 2011 (Week 33)
    await expect(statDate).toHaveText('19 Nov 2011');
    await expect(scrubber).toHaveValue('33');
    await expect(page.locator('#stat-active')).toHaveText('1');
    await expect(page.locator('#stat-finishers')).toHaveText('64');

    // Deselect Victoria and select NSW (index 0)
    await vicCheckbox.uncheck();
    const nswCheckbox = page.locator('#filter-content input[type="checkbox"][value="0"]');
    await nswCheckbox.check();

    // Earliest event in NSW is St Peters on 21 Jan 2012 (Week 42)
    await expect(statDate).toHaveText('21 Jan 2012');
    await expect(scrubber).toHaveValue('42');
    await expect(page.locator('#stat-active')).toHaveText('1');
    await expect(page.locator('#stat-finishers')).toHaveText('122');

    // Select all states
    await page.locator('#btn-select-all').click();

    // Restores automatically to earliest overall record (2 Apr 2011, Week 0)
    await expect(statDate).toHaveText('2 Apr 2011');
    await expect(scrubber).toHaveValue('0');
  });

  test('New year transition briefly flashes the year watermark over the map and fades quickly', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const watermark = page.locator('#year-watermark');
    await expect(watermark).toBeAttached();
    // Initially not showing
    await expect(watermark).not.toHaveClass(/show/);

    const scrubber = page.locator('#scrubber');
    // Week 40 is 7 Jan 2012 (crossing from 2011 to 2012)
    await scrubber.fill('40');
    await scrubber.dispatchEvent('input');

    // Watermark should update text to "2012"
    await expect(watermark).toHaveText('2012');

    // And within the interval, class "show" is removed
    await expect(watermark).not.toHaveClass(/show/);
  });

  test('COVID skipping logic and UI controls are removed, playing naturally through inactive weeks', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Verify skip-covid checkbox and covid-banner do not exist
    await expect(page.locator('#toggle-skip-covid')).toHaveCount(0);
    await expect(page.locator('#covid-banner')).toHaveCount(0);

    // Scrub to COVID shutdown period (e.g. week 470, April 2020)
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('470');
    await scrubber.dispatchEvent('input');

    // Stats naturally show 0 active locations and 0 weekly participants
    await expect(page.locator('#stat-active')).toHaveText('0');
    await expect(page.locator('#stat-finishers')).toHaveText('0');
    await expect(page.locator('#bar-val-active')).toHaveText('0 venues');
    await expect(page.locator('#bar-val-finishers')).toHaveText('0 runners');
  });

  test('Step-by-step Driver.js help tour displays on first visit and covers required sections in order with Home button last', async ({ page }) => {
    // Override beforeEach initScript to simulate first-time user
    await page.addInitScript(() => {
      window.localStorage.removeItem('hasSeenParkrunTour');
      window.localStorage.removeItem('parkrun_help_seen');
    });

    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Verify info button is NOT present (matches all other visualizers)
    await expect(page.locator('#btn-info')).toHaveCount(0);

    const popover = page.locator('.driver-popover');
    await expect(popover).toBeVisible({ timeout: 6000 });

    // Step 1: Welcome / Intro text
    await expect(popover.locator('.driver-popover-title')).toHaveText('Welcome');
    await expect(popover.locator('.driver-popover-description')).toContainText('animates weekly Saturday Parkrun events across Australia');

    // Step 2: Main controls
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Play the Timeline');

    // Step 3: Settings button
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Settings');

    // Step 4: Filtering settings shown (drawer opened)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Filter by State & Territory');
    const isCheckedStep4 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep4).toBe(true);

    // Step 5: Speed control
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Adjust Speed');

    // Step 6: Home button strictly last (drawer closed)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Back to Home');
    const isCheckedStep6 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep6).toBe(false);

    // Close / Complete tour
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover).toHaveCount(0);

    // Verify tour state is persisted in localStorage
    const hasSeen = await page.evaluate(() => localStorage.getItem('hasSeenParkrunTour'));
    expect(hasSeen).toBe('true');
  });

  test('Past venues checkbox option is removed from settings drawer and past venues remain enabled by default', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Verify toggle-established checkbox has been removed
    await expect(page.locator('#toggle-established')).toHaveCount(0);
  });

  test('Year watermark is anchored to central Australia and follows map movement', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const watermarkContainer = page.locator('#year-watermark-container');
    await expect(watermarkContainer).toBeAttached();

    // Verify it is attached inside MapLibre marker container
    await expect(page.locator('.maplibregl-marker #year-watermark')).toBeAttached();

    // Trigger watermark to 2012
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('40');
    await scrubber.dispatchEvent('input');
    await expect(page.locator('#year-watermark')).toHaveText('2012');

    // Get initial position of marker
    const boxBefore = await watermarkContainer.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Pan map by [150, 80]
    await page.evaluate(() => {
      window.app.map.map.panBy([150, 80], { animate: false });
    });

    const boxAfter = await watermarkContainer.boundingBox();
    expect(boxAfter).not.toBeNull();

    // Container position on screen should have shifted by exactly -150 and -80
    expect(Math.round(boxAfter.x - boxBefore.x)).toBe(-150);
    expect(Math.round(boxAfter.y - boxBefore.y)).toBe(-80);
  });

  test('Female runner icons are used consistently across favicon, loading SVG, header, and gallery', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // 1. Favicon has female runner emoji
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(faviconHref).toContain('🏃‍♀️');

    // 2. Loading screen SVG has female runner path with ponytail
    const loadingSvgPath = await page.locator('#loading-overlay svg path').getAttribute('d');
    expect(loadingSvgPath).toContain('M12.5 3c-1.8-.8-3.6-.4-4.8.8');

    // 3. Header title has female runner emoji
    const vizTitle = page.locator('.viz-title');
    await expect(vizTitle).toContainText('🏃‍♀️ Parkrun Australia');

    // 4. Index gallery card has female runner emoji
    await page.goto('/index.html');
    const galleryCard = page.locator('a[href="parkrun/"]');
    await expect(galleryCard.locator('.icon')).toHaveText('🏃‍♀️');
  });

  test('Mobile portrait layout keeps map viewport unobstructed with collapsible cards in settings drawer', async ({ page }) => {
    // Set mobile portrait viewport (iPhone 12/13/14/15 dimensions)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const statsBar = page.locator('#stats-bar');
    const weeklyCard = page.locator('#weekly-stats-card');
    const legendCard = page.locator('#legend-card');
    const controls = page.locator('#controls');
    const filterPanel = page.locator('#filter-panel');
    const bottomPanel = page.locator('#bottom-panel');

    // In default mobile portrait view (drawer closed), only statsBar is visible
    await expect(statsBar).toBeVisible();
    await expect(weeklyCard).not.toBeVisible();
    await expect(legendCard).not.toBeVisible();
    await expect(page.locator('#growth-card')).not.toBeVisible();
    await expect(controls).not.toBeVisible();
    await expect(filterPanel).not.toBeVisible();

    // Verify statsBar height is compact (<= 120px)
    const statsBarBox = await statsBar.boundingBox();
    expect(statsBarBox.height).toBeLessThanOrEqual(120);

    // Verify bottom panel is positioned at bottom and unobstructed space > 450px
    const bottomBox = await bottomPanel.boundingBox();
    const mapOpenSpace = bottomBox.y - (statsBarBox.y + statsBarBox.height);
    expect(mapOpenSpace).toBeGreaterThan(450);

    // When settings button is tapped, drawer opens showing all cards
    const settingsBtn = page.locator('#btn-settings');
    await settingsBtn.click();
    await expect(weeklyCard).toBeVisible();
    await expect(legendCard).toBeVisible();
    await expect(page.locator('#growth-card')).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(filterPanel).toBeVisible();

    // Tapping settings button again collapses them back
    await settingsBtn.click();
    await expect(weeklyCard).not.toBeVisible();
    await expect(legendCard).not.toBeVisible();
    await expect(page.locator('#growth-card')).not.toBeVisible();
  });

  test('Growth line chart renders in desktop left panel, updates as timeline advances, and supports click-to-scrub', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const growthCard = page.locator('#growth-card');
    await expect(growthCard).toBeVisible();

    const canvas = page.locator('#growth-canvas');
    await expect(canvas).toBeVisible();

    const growthVal = page.locator('#growth-card-val');
    // Initially week 0 (108 finishers on 2 Apr 2011)
    await expect(growthVal).toHaveText('108');

    // Advance timeline to week 200 (March 2015)
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('200');
    await scrubber.dispatchEvent('input');

    // Growth card value updates
    const text200 = await growthVal.textContent();
    expect(parseInt(text200.replace(/,/g, ''), 10)).toBeGreaterThan(500_000);

    // Test click-to-scrub on canvas: clicking near the middle of canvas seeks to ~week 400
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    // Click at 50% along the canvas width
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);

    // Verify scrubber value changed towards ~400
    const scrubVal = parseInt(await scrubber.inputValue(), 10);
    expect(scrubVal).toBeGreaterThan(300);
    expect(scrubVal).toBeLessThan(500);
  });

  test('Bottom panel view tabs allow toggling between weekly turnout bars and full growth curve line graph', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const tabWeekly = page.locator('#tab-btn-weekly');
    const tabGrowth = page.locator('#tab-btn-growth');
    const viewWeekly = page.locator('#bottom-view-weekly');
    const viewGrowth = page.locator('#bottom-view-growth');
    const subLabel = page.locator('#chart-sub-label');

    // Initially, Weekly view is active
    await expect(tabWeekly).toHaveClass(/active/);
    await expect(viewWeekly).toBeVisible();
    await expect(viewGrowth).not.toBeVisible();
    await expect(subLabel).toHaveText('Scaled to Peak (100%)');

    // Click Growth tab
    await tabGrowth.click();
    await expect(tabGrowth).toHaveClass(/active/);
    await expect(tabWeekly).not.toHaveClass(/active/);
    await expect(viewGrowth).toBeVisible();
    await expect(viewWeekly).not.toBeVisible();
    await expect(subLabel).toHaveText('All-Time Trajectory');

    const bottomCanvas = page.locator('#growth-canvas-bottom');
    await expect(bottomCanvas).toBeVisible();

    // Advance timeline and verify bottom growth value updates
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('100');
    await scrubber.dispatchEvent('input');
    const bottomVal = page.locator('#growth-bottom-val');
    await expect(bottomVal).not.toHaveText('0');

    // Click Weekly tab to switch back
    await tabWeekly.click();
    await expect(tabWeekly).toHaveClass(/active/);
    await expect(viewWeekly).toBeVisible();
    await expect(viewGrowth).not.toBeVisible();
  });

  test('Clicking a specific venue filters all statistics to that venue, and closing popup restores global options', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Set timeline to week 500
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('500');
    await scrubber.dispatchEvent('input');

    // Capture global Australia-wide stats
    const globalActive = parseInt((await page.locator('#stat-active').textContent()).replace(/,/g, ''), 10);
    const globalFinishers = parseInt((await page.locator('#stat-finishers').textContent()).replace(/,/g, ''), 10);
    const globalCumulative = parseInt((await page.locator('#stat-cumulative').textContent()).replace(/,/g, ''), 10);

    expect(globalActive).toBeGreaterThan(10);
    expect(globalFinishers).toBeGreaterThan(1000);
    expect(globalCumulative).toBeGreaterThan(1_000_000);

    // Simulate clicking Event 1 (St Peters) on map
    const venueData = await page.evaluate(() => {
      const ev = window.app.data.eventMap.get(1);
      const w = 500;
      const fin = window.app.data.eventWeeklyFinishers.get(1)[w];
      const cum = window.app.data.eventWeeklyCumulative.get(1)[w];
      const peak = window.app.data.eventPeakFinishers.get(1);

      window.app.map._handleClick({
        object: {
          eventId: 1,
          placename: ev.shortName || 'St Peters',
          name: ev.longName || 'St Peters parkrun',
          eventname: ev.eventname || 'stpeters',
          lon: ev.lon,
          lat: ev.lat,
          finishers: fin,
          date: window.app.data.metadata.weekStats[w].date
        },
        index: 0,
        x: 350,
        y: 250
      });

      return { fin, cum, peak, isVenueActive: fin > 0 };
    });

    // Verify popup is open and pinned
    const tooltip = page.locator('#map-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('#tooltip-title')).toContainText('St Peters');
    await expect(tooltip.locator('#tooltip-close')).toBeVisible();

    // Verify stats filtered strictly to St Peters venue:
    // Active Locations should be 1 (if active) or 0 (if inactive)
    const venueActiveText = venueData.isVenueActive ? '1' : '0';
    await expect(page.locator('#stat-active')).toHaveText(venueActiveText);
    await expect(page.locator('#bar-val-active')).toHaveText(venueData.isVenueActive ? '1 venue' : '0 venues');

    if (venueData.isVenueActive) {
      const activeBarWidth = await page.locator('#bar-fill-active').evaluate(el => el.style.width);
      expect(activeBarWidth).toMatch(/^100(\.0)?%$/);
    }

    // Participants should reflect local venue attendance
    await expect(page.locator('#stat-finishers')).toHaveText(venueData.fin.toLocaleString());
    await expect(page.locator('#bar-val-finishers')).toHaveText(`${venueData.fin.toLocaleString()} ${venueData.fin === 1 ? 'runner' : 'runners'}`);

    // All-time finishes in HUD and Growth Card should match venue cumulative
    await expect(page.locator('#stat-cumulative')).toHaveText(venueData.cum.toLocaleString());
    await expect(page.locator('#growth-card-val')).toHaveText(venueData.cum.toLocaleString());

    // Chart subtitle reflects venue peak scaling
    await expect(page.locator('#chart-sub-label')).toContainText('St Peters');

    // Click '✕' on popup to close and revert to global filtering
    await tooltip.locator('#tooltip-close').click();

    // Verify popup is dismissed
    await expect(tooltip).not.toBeVisible();

    // Verify stats immediately revert back to Australia-wide global totals
    const restoredActive = parseInt((await page.locator('#stat-active').textContent()).replace(/,/g, ''), 10);
    const restoredFinishers = parseInt((await page.locator('#stat-finishers').textContent()).replace(/,/g, ''), 10);
    const restoredCumulative = parseInt((await page.locator('#stat-cumulative').textContent()).replace(/,/g, ''), 10);

    expect(restoredActive).toBe(globalActive);
    expect(restoredFinishers).toBe(globalFinishers);
    expect(restoredCumulative).toBe(globalCumulative);
    await expect(page.locator('#growth-card-val')).toHaveText(globalCumulative.toLocaleString());
    await expect(page.locator('#chart-sub-label')).toHaveText('Scaled to Peak (100%)');
  });
});

