const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DATA_DIR = path.resolve(__dirname, '../data');
const EVENTS_DIR = path.resolve(DATA_DIR, 'events');
const CATALOG_FILE = path.resolve(DATA_DIR, 'events_catalog.json');

const DEFUNCT_EVENTS = [
  {
    eventname: 'ballarat',
    longName: 'Ballarat parkrun',
    shortName: 'Ballarat',
    location: 'Victoria Park, Lake Wendouree, Ballarat, VIC',
    lon: 143.820637,
    lat: -37.556649,
    seriesid: 1,
    status: 'closed',
    relocatedTo: 'princeofwales',
    note: 'Relocated to Prince of Wales parkrun in November 2022'
  },
  {
    eventname: 'augustineheights',
    longName: 'Augustine Heights parkrun',
    shortName: 'Augustine Heights',
    location: 'Augustine Heights, QLD',
    lon: 152.883124,
    lat: -27.659052,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in March 2020'
  },
  {
    eventname: 'bowral',
    longName: 'Bowral parkrun',
    shortName: 'Bowral',
    location: 'Briars Country Lodge and Inn, Bowral, NSW',
    lon: 150.395117,
    lat: -34.526266,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in January 2022'
  },
  {
    eventname: 'callaghan',
    longName: 'Callaghan parkrun',
    shortName: 'Callaghan',
    location: 'University Drive, Callaghan, Newcastle, NSW',
    lon: 151.702098,
    lat: -32.894393,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in March 2020'
  },
  {
    eventname: 'fairparkreserve',
    longName: 'Fairpark Reserve parkrun',
    shortName: 'Fairpark Reserve',
    location: 'Fairpark Reserve, Ferntree Gully, VIC',
    lon: 145.264418,
    lat: -37.867985,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in January 2022'
  },
  {
    eventname: 'gainsboroughgreens',
    longName: 'Gainsborough Greens parkrun',
    shortName: 'Gainsborough Greens',
    location: 'Wyperfield Circuit, Pimpama, Gold Coast, QLD',
    lon: 153.306901,
    lat: -27.81877,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in February 2025'
  },
  {
    eventname: 'gladstoneqld',
    longName: 'Gladstone QLD parkrun',
    shortName: 'Gladstone QLD',
    location: 'Lions Park, Gladstone, QLD',
    lon: 151.238458,
    lat: -23.871873,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in July 2026'
  },
  {
    eventname: 'heirissonisland',
    longName: 'Heirisson Island parkrun',
    shortName: 'Heirisson Island',
    location: 'Heirisson Island, East Perth, WA',
    lon: 115.88241,
    lat: -31.96825,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased due to safety concerns'
  },
  {
    eventname: 'jindabynesportandrecreation',
    longName: 'Jindabyne Sport and Recreation parkrun',
    shortName: 'Jindabyne Sport & Rec',
    location: 'The Station, Jindabyne, NSW',
    lon: 148.616972,
    lat: -36.433908,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in June 2023'
  },
  {
    eventname: 'lightningridge',
    longName: 'Lightning Ridge parkrun',
    shortName: 'Lightning Ridge',
    location: 'Lightning Ridge Golf Club, Lightning Ridge, NSW',
    lon: 147.97849,
    lat: -29.418312,
    seriesid: 1,
    status: 'closed',
    note: 'Permanently discontinued'
  },
  {
    eventname: 'lornebeach',
    longName: 'Lorne Beach parkrun',
    shortName: 'Lorne Beach',
    location: 'Lorne Foreshore, Lorne, VIC',
    lon: 143.978708,
    lat: -38.543524,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in July 2022'
  },
  {
    eventname: 'merimbula',
    longName: 'Merimbula parkrun',
    shortName: 'Merimbula',
    location: 'Merimbula Boardwalk, Merimbula, NSW',
    lon: 149.910936,
    lat: -36.895978,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in August 2021'
  },
  {
    eventname: 'merriwa',
    longName: 'Merriwa parkrun',
    shortName: 'Merriwa',
    location: 'Rotary Park, Merriwa, NSW',
    lon: 150.349493,
    lat: -32.139152,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased after 117 events'
  },
  {
    eventname: 'murraybridge',
    longName: 'Murray Bridge parkrun',
    shortName: 'Murray Bridge',
    location: 'Sturt Reserve, Murray Bridge, SA',
    lon: 139.285558,
    lat: -35.121567,
    seriesid: 1,
    status: 'closed',
    relocatedTo: 'naroomawetlands',
    note: 'Relocated to Narooma Wetlands parkrun'
  },
  {
    eventname: 'nathanroadsportsground',
    longName: 'Nathan Road Sports Ground parkrun',
    shortName: 'Nathan Road Sports Ground',
    location: 'Nathan Road Sports Ground, Newport, QLD',
    lon: 153.073387,
    lat: -27.211218,
    seriesid: 1,
    status: 'closed',
    relocatedTo: 'endeavour',
    note: 'Relocated to Endeavour parkrun'
  },
  {
    eventname: 'tytowetlands',
    longName: 'TYTO Wetlands parkrun',
    shortName: 'TYTO Wetlands',
    location: 'TYTO Wetlands, Ingham, QLD',
    lon: 146.149126,
    lat: -18.656953,
    seriesid: 1,
    status: 'closed',
    note: 'Ceased in November 2023 due to wildlife/crocodile safety'
  }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function scrapeEvent(page, eventName, retries = 3) {
  const url = `https://www.parkrun.com.au/${eventName}/results/eventhistory/`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Fetching] ${eventName} (attempt ${attempt})...`);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      
      if (resp && resp.status() === 405) {
        console.warn(`[WAF 405] Hit rate limit on ${eventName}. Sleeping 90 seconds...`);
        await sleep(90000);
        continue;
      }
      
      if (!resp || resp.status() >= 400) {
        console.warn(`[HTTP ${resp ? resp.status() : 'none'}] on ${eventName}`);
        return [];
      }

      const hasTable = await page.$('table.Results-table');
      if (!hasTable) {
        console.warn(`[No Table] on ${eventName}`);
        return [];
      }

      const rows = await page.$$eval('table.Results-table tbody tr', (trs) => {
        return trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()));
      });

      const parsed = [];
      for (const cells of rows) {
        if (!cells || cells.length < 3) continue;
        const num = parseInt(cells[0], 10);
        if (isNaN(num)) continue;
        parsed.push({
          event_number: num,
          date: parseDateDDMMYYYY(cells[1]),
          finishers: parseInt(cells[2], 10) || 0,
          volunteers: parseInt(cells[3], 10) || 0,
          male_first_finisher: cells[4] || '',
          male_time: cells[5] || '',
          female_first_finisher: cells[6] || '',
          female_time: cells[7] || '',
        });
      }

      parsed.sort((a, b) => a.event_number - b.event_number);
      return parsed;
    } catch (e) {
      console.warn(`[Error] ${eventName} attempt ${attempt}: ${e.message}`);
      if (attempt < retries) {
        await sleep(5000 * attempt);
      }
    }
  }
  return [];
}

async function main() {
  if (!fs.existsSync(CATALOG_FILE)) {
    console.error('Catalog file not found!');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  const catalogMap = new Map(catalog.map((e) => [e.eventname, e]));
  let maxId = Math.max(...catalog.map((e) => e.id || 0), 0);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log(`Starting extraction of ${DEFUNCT_EVENTS.length} defunct/relocated events...`);

  for (const def of DEFUNCT_EVENTS) {
    const csvPath = path.join(EVENTS_DIR, `${def.eventname}.csv`);
    let rows = [];

    // If CSV already exists with data, we don't need to re-fetch
    if (fs.existsSync(csvPath) && fs.readFileSync(csvPath, 'utf-8').trim().split('\n').length > 5) {
      console.log(`[Cache Hit] ${def.eventname}.csv already exists. Parsing final event date...`);
      const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
      const lastLine = lines[lines.length - 1].split(',');
      def.closedDate = lastLine[1];
    } else {
      // Respect polite rate limiting: 3.5s delay with jitter
      await sleep(3500 + Math.floor(Math.random() * 1500));
      rows = await scrapeEvent(page, def.eventname);

      if (rows.length > 0) {
        def.closedDate = rows[rows.length - 1].date;
        const csvLines = ['event_number,date,finishers,volunteers,male_first_finisher,male_time,female_first_finisher,female_time'];
        for (const r of rows) {
          csvLines.push([
            r.event_number,
            r.date,
            r.finishers,
            r.volunteers,
            escapeCsvField(r.male_first_finisher),
            escapeCsvField(r.male_time),
            escapeCsvField(r.female_first_finisher),
            escapeCsvField(r.female_time)
          ].join(','));
        }
        fs.writeFileSync(csvPath, csvLines.join('\n') + '\n');
        console.log(`[Saved CSV] ${def.eventname}: ${rows.length} runs (Closed: ${def.closedDate})`);
      } else {
        console.warn(`[Warning] No rows scraped for ${def.eventname}`);
      }
    }

    // Merge into catalog
    let catEntry = catalogMap.get(def.eventname);
    if (!catEntry) {
      maxId++;
      catEntry = {
        id: maxId,
        eventname: def.eventname,
        longName: def.longName,
        shortName: def.shortName,
        location: def.location,
        seriesid: def.seriesid,
        lon: def.lon,
        lat: def.lat,
        status: 'closed',
        closedDate: def.closedDate || '',
        relocatedTo: def.relocatedTo || undefined,
        note: def.note || undefined
      };
      catalog.push(catEntry);
      catalogMap.set(def.eventname, catEntry);
      console.log(`[Catalog Add] Added ${def.longName} (ID: ${maxId}, Status: closed)`);
    } else {
      catEntry.status = 'closed';
      if (def.closedDate) catEntry.closedDate = def.closedDate;
      if (def.relocatedTo) catEntry.relocatedTo = def.relocatedTo;
      if (def.note) catEntry.note = def.note;
      console.log(`[Catalog Update] Updated ${def.longName} (Status: closed)`);
    }
  }

  await browser.close();

  // Save updated catalog
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
  console.log(`Updated ${CATALOG_FILE}. Total events: ${catalog.length}`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
