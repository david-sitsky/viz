import sys

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    old_func = """export async function loadData(metaUrl, binUrl, cacheKey, palette, onProgress) {
  onProgress('cache-check', 0);
  try {
    const cached = await getFromCache(cacheKey);
    if (cached) {
      onProgress('cache-hit', 1);
      return parseBinary(cached.buffer, cached.metadata, palette);
    }
  } catch (e) {
    console.warn('Cache read failed:', e);
  }

  onProgress('download', 0);
  const metadata = await fetch(metaUrl).then(r => r.json());

  onProgress('download', 0.05);
  const buffer = await fetchWithProgress(binUrl, (p) => onProgress('download', 0.05 + p * 0.9));

  onProgress('parse', 0.95);
  const data = parseBinary(buffer, metadata, palette);

  try {
    await saveToCache(buffer, metadata, cacheKey);
  } catch (e) {
    console.warn('Cache write failed:', e);
  }

  return data;
}"""

    new_func = """export async function loadData(metaUrl, binUrl, cacheKey, palette, onProgress) {
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
        return parseBinary(cached.buffer, cached.metadata, palette);
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
  const data = parseBinary(buffer, metadata, palette);

  try {
    await saveToCache(buffer, metadata, cacheKey);
  } catch (e) {
    console.warn('Cache write failed:', e);
  }

  return data;
}"""

    if old_func in content:
        with open(filepath, 'w') as f:
            f.write(content.replace(old_func, new_func))
        print(f"Patched {filepath}")
    else:
        print(f"Failed to patch {filepath}: string not found.")

patch_file('common/js/engine_data.js')
patch_file('energy/js/energy_data.js')
