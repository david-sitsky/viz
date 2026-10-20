const fs = require('fs');
const path = require('path');
const https = require('https');
const { chromium } = require('@playwright/test');

const EVENTS_JSON_URL = 'https://images.parkrun.com/events.json';
const DATA_DIR = path.resolve(__dirname, '../data');
const EVENTS_DIR = path.resolve(DATA_DIR, 'events');
const CATALOG_FILE = path.resolve(DATA_DIR, 'events_catalog.json');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const LIMIT = parseInt(getArg('--limit', '0'), 10);
const CONCURRENCY = parseInt(getArg('--concurrency', '1'), 10); // Default to 1 for polite rate-limiting
const DELAY_MS = parseInt(getArg('--delay', '1500'), 10);
const FORCE = hasFlag('--force');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchEventsJson() {
  return new Promise((resolve, reject) => {
    https.get(EVENTS_JSON_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
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

async function scrapeEventHistory(page, eventName, retries = 3) {
  const url = `https://www.parkrun.com.au/${eventName}/results/eventhistory/`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      if (resp && resp.status() === 404) {
        return { notFound: true, rows: [] };
      }
      if (resp && resp.status() === 405) {
        console.warn(`[WAF Challenge] HTTP 405 on ${eventName}. Cooling down 90 seconds...`);
        await sleep(90000);
        continue;
      }
      if (!resp || resp.status() >= 400) {
        throw new Error(`HTTP ${resp ? resp.status() : 'No response'}`);
      }

      const hasTable = await page.$('table.Results-table');
      if (!hasTable) {
        return { notFound: false, rows: [] };
      }

      const rows = await page.$$eval('table.Results-table tbody tr', (trs) => {
        return trs.map((tr) => {
          const tds = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim());
          return tds;
        });
      });

      const parsedRows = [];
      for (const cells of rows) {
        if (!cells || cells.length < 4) continue;
        const eventNum = parseInt(cells[0], 10);
        if (isNaN(eventNum)) continue;
        const dateRaw = cells[1];
        const finishers = parseInt(cells[2], 10) || 0;
        const volunteers = parseInt(cells[3], 10) || 0;
        const maleFinisher = cells[4] || '';
        const maleTime = cells[5] || '';
        const femaleFinisher = cells[6] || '';
        const femaleTime = cells[7] || '';

        parsedRows.push({
          event_number: eventNum,
          date: dateRaw,
          finishers,
          volunteers,
          male_first_finisher: maleFinisher,
          male_time: maleTime,
          female_first_finisher: femaleFinisher,
          female_time: femaleTime,
        });
      }

      return { notFound: false, rows: parsedRows };
    } catch (e) {
      if (attempt === retries) {
        throw e;
      }
      await sleep(3000 * attempt);
    }
  }
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true });

  let catalog;
  if (fs.existsSync(CATALOG_FILE)) {
    catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
    console.log(`Loaded ${catalog.length} events from existing catalog.`);
  } else {
    console.log('Fetching master events.json...');
    const master = await fetchEventsJson();
    const ausFeatures = master.events.features.filter(
      (f) => f.properties && f.properties.countrycode === 3
    );

    catalog = ausFeatures.map((f, idx) => ({
      id: idx + 1,
      eventname: f.properties.eventname,
      longName: f.properties.EventLongName,
      shortName: f.properties.EventShortName,
      location: f.properties.EventLocation,
      seriesid: f.properties.seriesid,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));

    fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
    console.log(`Saved catalog to ${CATALOG_FILE}`);
  }

  let targetEvents = catalog;
  if (LIMIT > 0) {
    targetEvents = catalog.slice(0, LIMIT);
    console.log(`Limiting scrape to first ${LIMIT} events`);
  }

  const queue = [];
  for (const ev of targetEvents) {
    const csvPath = path.join(EVENTS_DIR, `${ev.eventname}.csv`);
    if (!FORCE && fs.existsSync(csvPath)) {
      const stats = fs.statSync(csvPath);
      if (stats.size > 50) {
        continue;
      }
    }
    queue.push(ev);
  }

  console.log(`Already scraped: ${targetEvents.length - queue.length}/${targetEvents.length}`);
  console.log(`Remaining to scrape: ${queue.length}`);
  if (queue.length === 0) {
    console.log('All target events already scraped!');
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

  let completedCount = targetEvents.length - queue.length;
  let successCount = 0;
  let failCount = 0;

  async function worker(workerId) {
    const page = await context.newPage();
    while (queue.length > 0) {
      const ev = queue.shift();
      const csvPath = path.join(EVENTS_DIR, `${ev.eventname}.csv`);
      try {
        // Human-like jitter delay
        const jitter = DELAY_MS + Math.floor(Math.random() * 800);
        await sleep(jitter);

        const result = await scrapeEventHistory(page, ev.eventname);
        completedCount++;

        if (result.notFound) {
          console.log(`[${completedCount}/${targetEvents.length}] ${ev.eventname}: Not found (404)`);
        } else if (result.rows.length === 0) {
          console.log(`[${completedCount}/${targetEvents.length}] ${ev.eventname}: 0 events found`);
        } else {
          result.rows.sort((a, b) => a.event_number - b.event_number);

          const lines = [
            'event_number,date,finishers,volunteers,male_first_finisher,male_time,female_first_finisher,female_time',
          ];
          for (const r of result.rows) {
            lines.push(
              [
                r.event_number,
                parseDateDDMMYYYY(r.date),
                r.finishers,
                r.volunteers,
                escapeCsvField(r.male_first_finisher),
                escapeCsvField(r.male_time),
                escapeCsvField(r.female_first_finisher),
                escapeCsvField(r.female_time),
              ].join(',')
            );
          }
          fs.writeFileSync(csvPath, lines.join('\n') + '\n');
          successCount++;
          console.log(
            `[${completedCount}/${targetEvents.length}] ${ev.eventname}: Scraped ${result.rows.length} events (latest: ${result.rows[result.rows.length - 1].date})`
          );
        }
      } catch (err) {
        failCount++;
        completedCount++;
        console.error(`[${completedCount}/${targetEvents.length}] ${ev.eventname} ERROR:`, err.message);
      }
    }
    await page.close();
  }

  const workers = [];
  const activeConcurrency = Math.min(CONCURRENCY, queue.length);
  for (let i = 0; i < activeConcurrency; i++) {
    workers.push(worker(i + 1));
  }

  await Promise.all(workers);
  await browser.close();

  console.log(`\nScrape finished! Added: ${successCount}, Failed: ${failCount}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
