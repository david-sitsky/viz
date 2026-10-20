const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { execSync } = require('child_process');

const DATA_DIR = path.resolve(__dirname, '../data');
const EVENTS_DIR = path.resolve(DATA_DIR, 'events');
const CATALOG_FILE = path.resolve(DATA_DIR, 'events_catalog.json');

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const DRY_RUN = hasFlag('--dry-run');
const FORCE = hasFlag('--force');
const BATCH = parseInt(getArg('--batch', '1'), 10);
const TOTAL_BATCHES = parseInt(getArg('--total-batches', '1'), 10);
const DELAY_MS = parseInt(getArg('--delay', '1500'), 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLatestSaturday() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun, 6 = Sat
  const diffDays = (day + 1) % 7;
  const sat = new Date(now.getTime() - diffDays * 86400000);
  return sat.toISOString().slice(0, 10);
}

function parseDateDDMMYYYY(str) {
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return str;
}

function escapeCsvField(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getLatestEventInCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return null;
  const content = fs.readFileSync(csvPath, 'utf-8').trim();
  const lines = content.split('\n');
  if (lines.length <= 1) return null;
  const lastLine = lines[lines.length - 1];
  const parts = lastLine.split(',');
  return {
    event_number: parseInt(parts[0], 10),
    date: parts[1]
  };
}

async function scrapeNewEvents(page, eventName, lastRecordedEventNum) {
  const url = `https://www.parkrun.com.au/${eventName}/results/eventhistory/`;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    if (!resp || resp.status() === 404) return [];
    if (resp.status() === 405) {
      console.warn(`[WAF 405] Cooling down 90s on ${eventName}...`);
      await sleep(90000);
      return [];
    }

    const hasTable = await page.$('table.Results-table');
    if (!hasTable) return [];

    const rows = await page.$$eval('table.Results-table tbody tr', (trs) => {
      return trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()));
    });

    const newRows = [];
    for (const cells of rows) {
      if (!cells || cells.length < 3) continue;
      const eventNum = parseInt(cells[0], 10);
      if (isNaN(eventNum) || eventNum <= lastRecordedEventNum) {
        // Rows are sorted descending (latest first). Once we hit an already-recorded event, stop!
        break;
      }

      newRows.push({
        event_number: eventNum,
        date: cells[1],
        finishers: parseInt(cells[2], 10) || 0,
        volunteers: parseInt(cells[3], 10) || 0,
        male_first_finisher: cells[4] || '',
        male_time: cells[5] || '',
        female_first_finisher: cells[6] || '',
        female_time: cells[7] || '',
      });
    }

    // Sort ascending for appending
    newRows.reverse();
    return newRows;
  } catch (e) {
    console.error(`Error scraping ${eventName}:`, e.message);
    return [];
  }
}

async function main() {
  if (!fs.existsSync(CATALOG_FILE)) {
    console.error(`Catalog ${CATALOG_FILE} not found!`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  // Strictly Saturday 5k events
  const saturdayEvents = catalog.filter(
    (ev) => ev.seriesid === 1 && !ev.eventname.includes('-juniors')
  );

  const latestSaturday = getLatestSaturday();
  console.log(`Checking for Saturday Parkrun updates up to: ${latestSaturday}`);

  const pendingEvents = [];
  for (const ev of saturdayEvents) {
    const csvPath = path.join(EVENTS_DIR, `${ev.eventname}.csv`);
    const last = getLatestEventInCsv(csvPath);
    if (!last || last.date < latestSaturday || FORCE) {
      pendingEvents.push({
        ...ev,
        lastEventNum: last ? last.event_number : 0,
        lastDate: last ? last.date : 'none'
      });
    }
  }

  console.log(`Events needing updates: ${pendingEvents.length} of ${saturdayEvents.length}`);

  // Apply batch partition if specified
  let batchEvents = pendingEvents;
  if (TOTAL_BATCHES > 1) {
    const batchSize = Math.ceil(pendingEvents.length / TOTAL_BATCHES);
    const startIdx = (BATCH - 1) * batchSize;
    batchEvents = pendingEvents.slice(startIdx, startIdx + batchSize);
    console.log(`Processing Batch ${BATCH}/${TOTAL_BATCHES}: ${batchEvents.length} events`);
  }

  if (batchEvents.length === 0) {
    console.log('All Saturday events are already up to date!');
    return;
  }

  if (DRY_RUN) {
    console.log('Dry run complete. Sample pending events:', batchEvents.slice(0, 10).map(e => `${e.eventname} (last: ${e.lastDate})`));
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let totalNewRunsAdded = 0;
  let updatedCount = 0;

  for (let i = 0; i < batchEvents.length; i++) {
    const ev = batchEvents[i];
    const csvPath = path.join(EVENTS_DIR, `${ev.eventname}.csv`);

    await sleep(DELAY_MS + Math.floor(Math.random() * 600));

    const newRows = await scrapeNewEvents(page, ev.eventname, ev.lastEventNum);
    if (newRows.length > 0) {
      const appendLines = [];
      for (const r of newRows) {
        appendLines.push([
          r.event_number,
          parseDateDDMMYYYY(r.date),
          r.finishers,
          r.volunteers,
          escapeCsvField(r.male_first_finisher),
          escapeCsvField(r.male_time),
          escapeCsvField(r.female_first_finisher),
          escapeCsvField(r.female_time),
        ].join(','));
      }

      fs.appendFileSync(csvPath, appendLines.join('\n') + '\n');
      totalNewRunsAdded += newRows.length;
      updatedCount++;
      console.log(`[${i + 1}/${batchEvents.length}] ${ev.eventname}: +${newRows.length} new events added (latest: ${newRows[newRows.length - 1].date})`);
    } else {
      console.log(`[${i + 1}/${batchEvents.length}] ${ev.eventname}: no new runs`);
    }
  }

  await browser.close();

  console.log(`\nWeekly check complete. Updated ${updatedCount} events (+${totalNewRunsAdded} runs added).`);

  if (totalNewRunsAdded > 0) {
    console.log('Recompiling binary blob...');
    execSync('python3 parkrun/scripts/build_blob.py', { stdio: 'inherit' });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
