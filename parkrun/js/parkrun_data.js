const DB_NAME = 'engine-viz';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const RECORD_SIZE = 16;

export async function loadData(metaUrl, binUrl, cacheKey, onProgress) {
  onProgress('download', 0);
  
  // 1. Fetch fresh metadata
  const cacheBuster = metaUrl.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
  const metadata = await fetch(metaUrl + cacheBuster).then(r => r.json());

  // 2. Check cache
  onProgress('cache-check', 0.05);
  try {
    const cached = await getFromCache(cacheKey);
    if (cached) {
      if (JSON.stringify(cached.metadata) === JSON.stringify(metadata)) {
        onProgress('cache-hit', 1);
        return parseBinary(cached.buffer, cached.metadata);
      }
    }
  } catch (e) {
    console.warn('Cache read failed:', e);
  }

  // 3. Download binary
  onProgress('download', 0.1);
  const binCacheBuster = binUrl.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
  const buffer = await fetchWithProgress(binUrl + binCacheBuster, (p) => onProgress('download', 0.1 + p * 0.85));

  onProgress('parse', 0.95);
  const data = parseBinary(buffer, metadata);

  try {
    await saveToCache(buffer, metadata, cacheKey);
  } catch (e) {
    console.warn('Cache write failed:', e);
  }

  return data;
}

function fetchWithProgress(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send();
  });
}

function parseBinary(buffer, metadata) {
  const { recordCount } = metadata;
  const view = new DataView(buffer);

  if (buffer.byteLength !== recordCount * RECORD_SIZE) {
    throw new Error(`Binary size mismatch: ${buffer.byteLength} != ${recordCount * RECORD_SIZE}`);
  }

  const eventIds = new Uint16Array(recordCount);
  const stateIds = new Uint8Array(recordCount);
  const positions = new Float32Array(recordCount * 2);
  const finishers = new Uint16Array(recordCount);
  const eventNumbers = new Uint16Array(recordCount);
  const radii = new Float32Array(recordCount);

  for (let i = 0; i < recordCount; i++) {
    const offset = i * RECORD_SIZE;
    eventIds[i]     = view.getUint16(offset, true);
    stateIds[i]     = view.getUint8(offset + 2);
    positions[i * 2]     = view.getFloat32(offset + 4, true);
    positions[i * 2 + 1] = view.getFloat32(offset + 8, true);
    finishers[i]    = view.getUint16(offset + 12, true);
    eventNumbers[i] = view.getUint16(offset + 14, true);

    radii[i] = Math.sqrt(Math.max(1, finishers[i]));
  }

  // Precompute state-level weekly aggregations for instant O(1) state filtering
  const totalWeeks = metadata.totalWeeks;
  const offsets = metadata.weekOffsets;
  const weeklyFinishersByState = new Int32Array(totalWeeks * 8);
  const weeklyActiveByState = new Int16Array(totalWeeks * 8);
  const weeklyCumulativeByState = new Int32Array(totalWeeks * 8);
  const weeklyEstablishedByState = new Int16Array(totalWeeks * 8);

  const seenEventsPerState = Array.from({ length: 8 }, () => new Set());
  const stateEstablishedCount = new Int16Array(8);

  for (let w = 0; w < totalWeeks; w++) {
    const start = offsets[w];
    const end = (w + 1 < offsets.length) ? offsets[w + 1] : recordCount;
    for (let i = start; i < end; i++) {
      const eid = eventIds[i];
      const sid = stateIds[i];
      const fin = finishers[i];
      const idx = w * 8 + sid;
      weeklyFinishersByState[idx] += fin;
      weeklyActiveByState[idx] += 1;
      if (sid < 8 && !seenEventsPerState[sid].has(eid)) {
        seenEventsPerState[sid].add(eid);
        stateEstablishedCount[sid]++;
      }
    }
    for (let s = 0; s < 8; s++) {
      weeklyEstablishedByState[w * 8 + s] = stateEstablishedCount[s];
    }
  }

  for (let s = 0; s < 8; s++) {
    let sum = 0;
    for (let w = 0; w < totalWeeks; w++) {
      sum += weeklyFinishersByState[w * 8 + s];
      weeklyCumulativeByState[w * 8 + s] = sum;
    }
  }

  // Pre-index event metadata by ID for quick lookup
  const eventMap = new Map();
  if (metadata.events) {
    for (const ev of metadata.events) {
      eventMap.set(ev.id, ev);
    }
  }

  return {
    metadata,
    eventIds,
    stateIds,
    positions,
    finishers,
    eventNumbers,
    radii,
    eventMap,
    weeklyFinishersByState,
    weeklyActiveByState,
    weeklyCumulativeByState,
    weeklyEstablishedByState
  };
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getFromCache(cacheKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(cacheKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveToCache(buffer, metadata, cacheKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ buffer, metadata }, cacheKey);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
