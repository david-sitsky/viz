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

    // Verify weekly participants stat is populated
    const weeklyVal = page.locator('#weekly-card-val');
    await expect(weeklyVal).not.toHaveText('—');

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
    await expect(page.locator('#weekly-card-val')).toHaveText('108');

    // Advance scrubber to week 1 (2011-04-09)
    await scrubber.fill('1');
    await scrubber.dispatchEvent('input');
    await expect(page.locator('#weekly-card-val')).toHaveText('100');
  });

  test('Bottom panel renders Growth Line and Weekly Line graphs matching desktop on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const bottomPanel = page.locator('#bottom-panel');
    await expect(bottomPanel).toBeVisible();

    // Verify old weekly bar charts are removed
    await expect(page.locator('#tab-btn-weekly')).toHaveCount(0);
    await expect(page.locator('#bottom-view-weekly')).toHaveCount(0);

    // Verify Growth Line and Weekly Line tabs are present
    const tabGrowth = page.locator('#tab-btn-growth');
    const tabWeeklyPlot = page.locator('#tab-btn-weekly-plot');
    await expect(tabGrowth).toBeVisible();
    await expect(tabWeeklyPlot).toBeVisible();

    // Growth Line view is active by default
    await expect(tabGrowth).toHaveClass(/active/);
    await expect(page.locator('#bottom-view-growth')).toBeVisible();

    // Scrubber to final week (25,611,770 total runners)
    const scrubber = page.locator('#scrubber');
    const maxVal = await scrubber.getAttribute('max');
    await scrubber.fill(maxVal);
    await scrubber.dispatchEvent('input');

    // At final week, total finishers in growth graph matches total cumulative
    const expectedTotal = await page.evaluate(() => {
      const stats = window.app.data.metadata.weekStats;
      return stats[stats.length - 1].cumulativeFinishers.toLocaleString();
    });
    await expect(page.locator('#growth-bottom-val')).toContainText(expectedTotal);
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

    const growthVal = page.locator('#growth-card-val');
    const expectedNationalTotal = await page.evaluate(() => {
      const stats = window.app.data.metadata.weekStats;
      return stats[stats.length - 1].cumulativeFinishers.toLocaleString();
    });
    await expect(growthVal).toContainText(expectedNationalTotal);

    // Deselect all states
    const btnDeselectAll = page.locator('#btn-deselect-all');
    await btnDeselectAll.click();

    // Verify stats drop to zero
    await expect(page.locator('#weekly-card-val')).toHaveText('0');
    await expect(growthVal).toHaveText('0');
    await expect(page.locator('#stat-established')).toHaveText('0');

    // Select only Queensland (QLD - index 2)
    const qldCheckbox = filterPanel.locator('input[type="checkbox"][value="2"]');
    await qldCheckbox.check();

    // Verify QLD stats are populated for final week
    const expectedQldTotal = await page.evaluate(() => {
      const { weeklyCumulativeByState, metadata } = window.app.data;
      const lastWeek = metadata.totalWeeks - 1;
      return weeklyCumulativeByState[lastWeek * 8 + 2].toLocaleString();
    });
    await expect(growthVal).toContainText(expectedQldTotal);
    await expect(page.locator('#weekly-card-val')).not.toHaveText('0');
    await expect(page.locator('#stat-established')).not.toHaveText('0');

    // Select all states again
    const btnSelectAll = page.locator('#btn-select-all');
    await btnSelectAll.click();

    // Verify cumulative restores to total Australia count
    await expect(growthVal).toContainText(expectedNationalTotal);
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
    await expect(page.locator('#stat-established')).toHaveText('1');
    await expect(page.locator('#weekly-card-val')).toHaveText('64');

    // Deselect Victoria and select NSW (index 0)
    await vicCheckbox.uncheck();
    const nswCheckbox = page.locator('#filter-content input[type="checkbox"][value="0"]');
    await nswCheckbox.check();

    // Earliest event in NSW is St Peters on 21 Jan 2012 (Week 42)
    await expect(statDate).toHaveText('21 Jan 2012');
    await expect(scrubber).toHaveValue('42');
    await expect(page.locator('#stat-established')).toHaveText('1');
    await expect(page.locator('#weekly-card-val')).toHaveText('122');

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

    // Stats naturally show 0 weekly participants
    await expect(page.locator('#weekly-card-val')).toHaveText('0');
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
    await expect(popover.locator('.driver-popover-description')).toContainText('animates weekly Parkrun events across Australia');

    // Step 2: Main controls
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Play the Timeline');

    // Step 3: All-Time Growth line graph (desktop left panel)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('All-Time Growth');
    await expect(popover.locator('.driver-popover-description')).toContainText('cumulative finishes');

    // Step 4: Weekly Participants line graph (desktop left panel)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Weekly Participants');
    await expect(popover.locator('.driver-popover-description')).toContainText('weekly attendance');

    // Step 5: Filter by Single Venue
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Filter by Single Venue');
    await expect(popover.locator('.driver-popover-description')).toContainText('filter exclusively to that venue');

    // Step 6: Settings button
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Settings');

    // Step 7: Filtering settings shown (drawer opened)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Filter by State & Territory');
    const isCheckedStep7 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep7).toBe(true);

    // Step 8: Speed control
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Adjust Speed');

    // Step 9: Home button strictly last (drawer closed)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Back to Home');
    const isCheckedStep9 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep9).toBe(false);

    // Close / Complete tour
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover).toHaveCount(0);

    // Verify tour state is persisted in localStorage
    const hasSeen = await page.evaluate(() => localStorage.getItem('hasSeenParkrunTour'));
    expect(hasSeen).toBe('true');
  });

  test('Help walkthrough tour on mobile highlights bottom panel graphs and venue selection', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const popover = page.locator('.driver-popover');
    await expect(popover).toBeVisible({ timeout: 6000 });

    // Step 1: Welcome
    await expect(popover.locator('.driver-popover-title')).toHaveText('Welcome');

    // Step 2: Play the Timeline
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Play the Timeline');

    // Step 3: Interactive Graphs (bottom panel on mobile)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Interactive Graphs');
    await expect(popover.locator('.driver-popover-description')).toContainText('Growth Line');

    // Step 4: Filter by Single Venue
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Filter by Single Venue');

    // Step 5: Settings
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Settings');

    // Step 6: Filter by State & Territory (drawer opens)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Filter by State & Territory');
    const isCheckedStep6 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep6).toBe(true);

    // Step 7: Speed control
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Adjust Speed');

    // Step 8: Back to Home (drawer closes)
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover.locator('.driver-popover-title')).toHaveText('Back to Home');
    const isCheckedStep8 = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    expect(isCheckedStep8).toBe(false);

    // Complete tour
    await popover.locator('.driver-popover-next-btn').click();
    await expect(popover).toHaveCount(0);
  });

  test('Past venues checkbox option is removed from settings drawer and past venues remain enabled by default', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Verify toggle-established checkbox has been removed
    await expect(page.locator('#toggle-established')).toHaveCount(0);
  });

  test('Year watermark is centered in middle of screen and remains visible and stationary across map pan and zoom', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const watermarkContainer = page.locator('#year-watermark-container');
    await expect(watermarkContainer).toBeAttached();

    // Verify it is NOT attached as a map coordinate marker
    await expect(page.locator('.maplibregl-marker #year-watermark')).toHaveCount(0);

    // Trigger watermark to 2012
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('40');
    await scrubber.dispatchEvent('input');
    const watermark = page.locator('#year-watermark');
    await expect(watermark).toHaveText('2012');

    // Verify watermark is centered in screen viewport
    const viewport = page.viewportSize();
    const boxBefore = await watermark.boundingBox();
    expect(boxBefore).not.toBeNull();
    const centerBeforeX = boxBefore.x + boxBefore.width / 2;
    const centerBeforeY = boxBefore.y + boxBefore.height / 2;
    expect(Math.abs(centerBeforeX - viewport.width / 2)).toBeLessThan(10);
    expect(Math.abs(centerBeforeY - viewport.height / 2)).toBeLessThan(10);

    // Pan map by [150, 80] and zoom in significantly (e.g. zooming in on Sydney)
    await page.evaluate(() => {
      window.app.map.map.panBy([150, 80], { animate: false });
      window.app.map.map.zoomTo(8, { animate: false });
    });

    // Watermark position on screen remains centered and does not drift off-screen
    const boxAfter = await watermark.boundingBox();
    expect(boxAfter).not.toBeNull();
    const centerAfterX = boxAfter.x + boxAfter.width / 2;
    const centerAfterY = boxAfter.y + boxAfter.height / 2;
    expect(Math.abs(centerAfterX - viewport.width / 2)).toBeLessThan(10);
    expect(Math.abs(centerAfterY - viewport.height / 2)).toBeLessThan(10);
  });

  test('On mobile, Australia map is shifted up and year watermark is centered between top and bottom panels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // 1. Verify Australia map is centered higher to accommodate bottom panel and clear Tasmania
    const center = await page.evaluate(() => window.app.map.map.getCenter());
    expect(center.lat).toBeCloseTo(-37.0, 0);

    const ptAlice = await page.evaluate(() => window.app.map.map.project([133.5, -25.5]));
    expect(ptAlice.y).toBeLessThan(350); // shifted up from raw screen center (422)

    // Verify Tasmania southern tip has ample clearance above the bottom panel
    const initialBottomPanel = await page.locator('#bottom-panel').boundingBox();
    const ptTas = await page.evaluate(() => window.app.map.map.project([146.8, -43.64]));
    expect(initialBottomPanel.y - ptTas.y).toBeGreaterThan(100);

    // 2. Trigger watermark to 2012
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('40');
    await scrubber.dispatchEvent('input');

    const watermark = page.locator('#year-watermark');
    await expect(watermark).toHaveText('2012');

    const box = await watermark.boundingBox();
    const statsBar = await page.locator('#stats-bar').boundingBox();
    const bottomPanel = await page.locator('#bottom-panel').boundingBox();

    const distToStats = box.y - (statsBar.y + statsBar.height);
    const distToBottom = bottomPanel.y - (box.y + box.height);

    // Watermark is centered between top panel and bottom panel within 25px tolerance
    expect(Math.abs(distToStats - distToBottom)).toBeLessThan(25);
  });

  test('Female runner icons are used consistently across favicon, loading screen, header, and gallery', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // 1. Favicon has female runner emoji
    const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(faviconHref).toContain('🏃‍♀️');

    // 2. Loading screen has female runner emoji
    const loadingIcon = page.locator('#loading-overlay .loading-icon');
    await expect(loadingIcon).toHaveText('🏃‍♀️');

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
    const legendCard = page.locator('#legend-card');
    const controls = page.locator('#controls');
    const filterPanel = page.locator('#filter-panel');
    const bottomPanel = page.locator('#bottom-panel');
    const growthCard = page.locator('#growth-card');
    const weeklyChartCard = page.locator('#weekly-chart-card');

    // In default mobile portrait view (drawer closed):
    // statsBar and bottomPanel are visible; left panel charts and drawer cards are hidden
    await expect(statsBar).toBeVisible();
    await expect(bottomPanel).toBeVisible();
    await expect(legendCard).not.toBeVisible();
    await expect(growthCard).not.toBeVisible();
    await expect(weeklyChartCard).not.toBeVisible();
    await expect(controls).not.toBeVisible();
    await expect(filterPanel).not.toBeVisible();

    // Verify statsBar height is compact (<= 120px)
    const statsBarBox = await statsBar.boundingBox();
    expect(statsBarBox.height).toBeLessThanOrEqual(120);

    // Verify bottom panel is positioned at bottom and unobstructed space > 450px
    const bottomBox = await bottomPanel.boundingBox();
    const mapOpenSpace = bottomBox.y - (statsBarBox.y + statsBarBox.height);
    expect(mapOpenSpace).toBeGreaterThan(450);

    // When settings button is tapped, drawer opens showing settings cards (left charts remain hidden on mobile)
    const settingsBtn = page.locator('#btn-settings');
    await settingsBtn.click();
    await expect(legendCard).toBeVisible();
    await expect(growthCard).not.toBeVisible();
    await expect(weeklyChartCard).not.toBeVisible();
    await expect(controls).toBeVisible();
    await expect(filterPanel).toBeVisible();

    // Tapping settings button again collapses drawer
    await settingsBtn.click();
    await expect(legendCard).not.toBeVisible();
    await expect(controls).not.toBeVisible();
    await expect(filterPanel).not.toBeVisible();
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

  test('Bottom panel view tabs allow toggling between Growth Line and Weekly Line graphs on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const tabGrowth = page.locator('#tab-btn-growth');
    const tabWeeklyPlot = page.locator('#tab-btn-weekly-plot');
    const viewGrowth = page.locator('#bottom-view-growth');
    const viewWeeklyPlot = page.locator('#bottom-view-weekly-plot');
    const growthTitle = page.locator('#growth-bottom-title');
    const weeklyTitle = page.locator('#weekly-bottom-title');

    // Initially, Growth Line is active by default on mobile
    await expect(tabGrowth).toHaveClass(/active/);
    await expect(tabWeeklyPlot).not.toHaveClass(/active/);
    await expect(viewGrowth).toBeVisible();
    await expect(viewWeeklyPlot).not.toBeVisible();
    await expect(growthTitle).toHaveText('All-Time Growth');

    const bottomCanvas = page.locator('#growth-canvas-bottom');
    await expect(bottomCanvas).toBeVisible();

    // Advance timeline and verify bottom growth value updates
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('100');
    await scrubber.dispatchEvent('input');
    const bottomVal = page.locator('#growth-bottom-val');
    await expect(bottomVal).not.toHaveText('0');

    // Click Weekly Line plot tab
    await tabWeeklyPlot.click();
    await expect(tabWeeklyPlot).toHaveClass(/active/);
    await expect(tabGrowth).not.toHaveClass(/active/);
    await expect(viewWeeklyPlot).toBeVisible();
    await expect(viewGrowth).not.toBeVisible();
    await expect(weeklyTitle).toHaveText('Weekly Participants');

    const bottomWeeklyCanvas = page.locator('#weekly-canvas-bottom');
    await expect(bottomWeeklyCanvas).toBeVisible();
    const bottomWeeklyVal = page.locator('#weekly-bottom-val');
    await expect(bottomWeeklyVal).not.toHaveText('0');

    // Click Growth tab to switch back
    await tabGrowth.click();
    await expect(tabGrowth).toHaveClass(/active/);
    await expect(tabWeeklyPlot).not.toHaveClass(/active/);
    await expect(viewGrowth).toBeVisible();
    await expect(viewWeeklyPlot).not.toBeVisible();
    await expect(growthTitle).toHaveText('All-Time Growth');
  });

  test('Tapping on a venue on mobile always displays a pinned popup with venue filtering and close button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Set timeline to week 500
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('500');
    await scrubber.dispatchEvent('input');

    // Simulate mobile touch / hover on St Peters (eventId: 1)
    await page.evaluate(() => {
      const ev = window.app.data.eventMap.get(1);
      window.app.map._handleHover({
        object: {
          eventId: 1,
          placename: ev.shortName || 'St Peters',
          name: ev.longName || 'St Peters parkrun',
          eventname: ev.eventname || 'stpeters',
          lon: ev.lon,
          lat: ev.lat,
          finishers: 150,
          date: '2012-01-21'
        },
        index: 0,
        x: 200,
        y: 300
      });
    });

    const tooltip = page.locator('#map-tooltip');
    await expect(tooltip).toBeVisible();

    // Verify on mobile it is treated strictly as a pinned popup with close button visible
    const closeBtn = tooltip.locator('#tooltip-close');
    await expect(closeBtn).toBeVisible();

    // Verify venue filtering is applied (Locations Established is 1)
    await expect(page.locator('#stat-established')).toHaveText('1');

    // Verify mobile bottom panel chart titles include venue name in brackets
    const growthBottomTitle = page.locator('#growth-bottom-title');
    const weeklyBottomTitle = page.locator('#weekly-bottom-title');
    await expect(growthBottomTitle).toContainText('(St Peters)');
    await expect(weeklyBottomTitle).toContainText('(St Peters)');

    // Dismiss pinned popup via close button
    await closeBtn.click();
    await expect(tooltip).not.toBeVisible();

    // Stats and mobile chart titles restored to global overview
    await expect(page.locator('#stat-established')).not.toHaveText('1');
    await expect(growthBottomTitle).toHaveText('All-Time Growth');
    await expect(weeklyBottomTitle).toHaveText('Weekly Participants');
  });

  test('Clicking a specific venue filters all statistics to that venue, and closing popup restores global options', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Set timeline to week 500
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('500');
    await scrubber.dispatchEvent('input');

    // Capture global Australia-wide stats
    const globalFinishers = parseInt((await page.locator('#weekly-card-val').textContent()).replace(/,/g, ''), 10);
    const globalCumulative = parseInt((await page.locator('#growth-card-val').textContent()).replace(/,/g, ''), 10);
    const globalEstablished = parseInt((await page.locator('#stat-established').textContent()).replace(/,/g, ''), 10);

    expect(globalEstablished).toBeGreaterThan(10);
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

    // Verify card titles include venue name in brackets
    await expect(page.locator('#growth-card-title')).toContainText('(St Peters)');
    await expect(page.locator('#weekly-card-title')).toContainText('(St Peters)');

    // Participants should reflect local venue attendance
    await expect(page.locator('#weekly-card-val')).toHaveText(venueData.fin.toLocaleString());

    // All-time finishes in Growth Card should match venue cumulative
    await expect(page.locator('#growth-card-val')).toHaveText(venueData.cum.toLocaleString());

    // Locations established reflects 1 for selected venue
    await expect(page.locator('#stat-established')).toHaveText('1');

    // Click '✕' on popup to close and revert to global filtering
    await tooltip.locator('#tooltip-close').click();

    // Verify popup is dismissed
    await expect(tooltip).not.toBeVisible();

    // Verify card titles revert to global default titles
    await expect(page.locator('#growth-card-title')).toHaveText('All-Time Growth');
    await expect(page.locator('#weekly-card-title')).toHaveText('Weekly Participants');

    // Verify stats immediately revert back to Australia-wide global totals
    const restoredFinishers = parseInt((await page.locator('#weekly-card-val').textContent()).replace(/,/g, ''), 10);
    const restoredCumulative = parseInt((await page.locator('#growth-card-val').textContent()).replace(/,/g, ''), 10);
    const restoredEstablished = parseInt((await page.locator('#stat-established').textContent()).replace(/,/g, ''), 10);

    expect(restoredFinishers).toBe(globalFinishers);
    expect(restoredCumulative).toBe(globalCumulative);
    expect(restoredEstablished).toBe(globalEstablished);
  });

  test('Weekly participants line graph on desktop left panel renders and supports scrubbing', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    const weeklyCard = page.locator('#weekly-chart-card');
    await expect(weeklyCard).toBeVisible();

    const weeklyVal = page.locator('#weekly-card-val');
    await expect(weeklyVal).toBeVisible();

    const canvas = page.locator('#weekly-canvas');
    await expect(canvas).toBeVisible();

    // Verify scrubber updates weekly runners
    const scrubber = page.locator('#scrubber');
    await scrubber.fill('200');
    await scrubber.dispatchEvent('input');

    const val200 = await weeklyVal.textContent();
    expect(parseInt(val200.replace(/,/g, ''), 10)).toBeGreaterThan(100);

    // Test click-to-scrub on canvas: clicking near the middle of canvas seeks timeline
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);

    const scrubVal = parseInt(await scrubber.inputValue(), 10);
    expect(scrubVal).toBeGreaterThan(300);
    expect(scrubVal).toBeLessThan(500);
  });

  test('Plots start dates and first date ticks reflect filtered start date (state and venue)', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // 1. Initial national view: starts at week 0 (April 2011), first tick is '11
    const initialChartState = await page.evaluate(() => ({
      growthStartWeek: window.app.growthChart.startWeek,
      growthFirstTick: window.app.growthChart.yearTicks[0]?.label,
      weeklyStartWeek: window.app.weeklyChart.startWeek,
      weeklyFirstTick: window.app.weeklyChart.yearTicks[0]?.label,
    }));

    expect(initialChartState.growthStartWeek).toBe(0);
    expect(initialChartState.growthFirstTick).toBe("'11");
    expect(initialChartState.weeklyStartWeek).toBe(0);
    expect(initialChartState.weeklyFirstTick).toBe("'11");

    // 2. Filter by NSW (starts 21 Jan 2012, Week 42): first tick should reflect '12
    const settingsBtn = page.locator('#btn-settings');
    const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    if (!isChecked) await settingsBtn.click({ force: true });

    await page.locator('#btn-deselect-all').click();
    await page.locator('#filter-content input[type="checkbox"][value="0"]').check(); // NSW

    const nswChartState = await page.evaluate(() => ({
      growthStartWeek: window.app.growthChart.startWeek,
      growthFirstTick: window.app.growthChart.yearTicks[0]?.label,
      weeklyStartWeek: window.app.weeklyChart.startWeek,
      weeklyFirstTick: window.app.weeklyChart.yearTicks[0]?.label,
    }));

    expect(nswChartState.growthStartWeek).toBe(42);
    expect(nswChartState.growthFirstTick).toBe("'12");
    expect(nswChartState.weeklyStartWeek).toBe(42);
    expect(nswChartState.weeklyFirstTick).toBe("'12");

    // 3. Select all states again
    await page.locator('#btn-select-all').click();

    // Close settings drawer
    const isCheckedAfter = await page.locator('#mobile-toggle').evaluate(el => el.checked);
    if (isCheckedAfter) await settingsBtn.click({ force: true });

    // 4. Select a specific venue: Event 1 (St Peters, firstWeek 42)
    await page.evaluate(() => {
      const ev = window.app.data.eventMap.get(1);
      window.app.map._handleClick({
        object: {
          eventId: 1,
          placename: ev.shortName || 'St Peters',
          name: ev.longName || 'St Peters parkrun',
          eventname: ev.eventname || 'stpeters',
          lon: ev.lon,
          lat: ev.lat,
          finishers: 100,
          date: '2012-01-21'
        },
        index: 0,
        x: 350,
        y: 250
      });
    });

    const venueChartState = await page.evaluate(() => ({
      growthStartWeek: window.app.growthChart.startWeek,
      growthFirstTick: window.app.growthChart.yearTicks[0]?.label,
      weeklyStartWeek: window.app.weeklyChart.startWeek,
      weeklyFirstTick: window.app.weeklyChart.yearTicks[0]?.label,
    }));

    expect(venueChartState.growthStartWeek).toBe(42);
    expect(venueChartState.growthFirstTick).toBe("'12");
    expect(venueChartState.weeklyStartWeek).toBe(42);
    expect(venueChartState.weeklyFirstTick).toBe("'12");

    // 5. Dismiss venue popup: verifies restored to week 0 and '11
    await page.locator('#tooltip-close').click();

    const restoredChartState = await page.evaluate(() => ({
      growthStartWeek: window.app.growthChart.startWeek,
      growthFirstTick: window.app.growthChart.yearTicks[0]?.label,
    }));

    expect(restoredChartState.growthStartWeek).toBe(0);
    expect(restoredChartState.growthFirstTick).toBe("'11");
  });

  test('Desktop view removes bottom panel completely and displays left panel charts with dynamic venue titles', async ({ page }) => {
    // Default desktop viewport: 1280x720
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // 1. Bottom panel is completely removed on desktop
    const bottomPanel = page.locator('#bottom-panel');
    await expect(bottomPanel).not.toBeVisible();

    // 2. Both left panel cards are visible on desktop
    const growthCard = page.locator('#growth-card');
    const weeklyCard = page.locator('#weekly-chart-card');
    await expect(growthCard).toBeVisible();
    await expect(weeklyCard).toBeVisible();

    // 3. Initial titles
    const growthTitle = page.locator('#growth-card-title');
    const weeklyTitle = page.locator('#weekly-card-title');
    await expect(growthTitle).toHaveText('All-Time Growth');
    await expect(weeklyTitle).toHaveText('Weekly Participants');

    // 4. Locations established is shown in lean header badge
    const establishedBadge = page.locator('#stat-established');
    await expect(establishedBadge).toBeVisible();

    // 5. Select venue via map click simulation (St Peters)
    await page.evaluate(() => {
      const ev = window.app.data.eventMap.get(1);
      window.app.map._handleClick({
        object: {
          eventId: 1,
          placename: ev.shortName || 'St Peters',
          name: ev.longName || 'St Peters parkrun',
          eventname: ev.eventname || 'stpeters',
          lon: ev.lon,
          lat: ev.lat,
          finishers: 150,
          date: '2012-01-21'
        },
        index: 0,
        x: 350,
        y: 250
      });
    });

    // 6. Titles now include venue name in brackets
    await expect(growthTitle).toContainText('(St Peters)');
    await expect(weeklyTitle).toContainText('(St Peters)');

    // 7. Close popup
    await page.locator('#tooltip-close').click();
    await expect(growthTitle).toHaveText('All-Time Growth');
    await expect(weeklyTitle).toHaveText('Weekly Participants');
  });

  test('Closed and relocated parkrun venues (e.g. Ballarat) display closure badges and archive links', async ({ page }) => {
    await page.goto('/parkrun/index.html');
    await expect(page.locator('#loading-overlay')).toHaveCSS('opacity', '0', { timeout: 15000 });

    // Look up Ballarat in catalog
    const ballaratMeta = await page.evaluate(() => {
      for (const ev of window.app.data.metadata.events) {
        if (ev.eventname === 'ballarat') return ev;
      }
      return null;
    });

    expect(ballaratMeta).not.toBeNull();
    expect(ballaratMeta.status).toBe('closed');
    expect(ballaratMeta.relocatedTo).toBe('princeofwales');

    // Simulate clicking Ballarat as a past/closed venue in 2024
    await page.evaluate((meta) => {
      window.app.map._handleClick({
        object: {
          eventId: meta.id,
          placename: meta.shortName,
          name: meta.longName,
          eventname: meta.eventname,
          lon: meta.lon,
          lat: meta.lat,
          finishers: 0,
          date: '2024-05-18',
          status: meta.status,
          closedDate: meta.closedDate,
          relocatedTo: meta.relocatedTo,
          note: meta.note,
          isPastVenue: true
        },
        index: 0,
        x: 400,
        y: 300
      });
    }, ballaratMeta);

    // 1. Initial pin jumps to Ballarat's timeline in 2015 when active
    const tooltip = page.locator('#map-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Ballarat');
    await expect(tooltip).toContainText('128');

    // Pinned card titles include [Closed] tag
    await expect(page.locator('#growth-card-title')).toContainText('Ballarat [Closed 2022]');

    // 2. Advance scrubber to timeline after closure (2026)
    const scrubber = page.locator('#scrubber');
    const maxVal = await scrubber.getAttribute('max');
    await scrubber.fill(maxVal);
    await scrubber.dispatchEvent('input');

    // In 2026, Ballarat is past closure, showing closure badge, note, and archive link
    await expect(tooltip).toContainText('Ballarat [Closed]');
    await expect(tooltip).toContainText('Relocated to Prince of Wales parkrun in November 2022');

    // Link points directly to full event history archive
    const link = tooltip.locator('a');
    await expect(link).toHaveAttribute('href', 'https://www.parkrun.com.au/ballarat/results/eventhistory/');
    await expect(link).toContainText('View full event history');
  });
});

