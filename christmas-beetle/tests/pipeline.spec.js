const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');

test('test Christmas beetle pipeline script executes without errors', async () => {
  // We run ala_build.py on the existing raw_events.csv.
  // We skip ala_sync.py to avoid spamming the ALA API.
  
  expect(() => {
    execSync('python3 common/scripts/ala_build.py --input-csv christmas-beetle/data/raw_events.csv --output-bin christmas-beetle/data/data.bin --output-meta christmas-beetle/data/metadata.json --output-species christmas-beetle/data/species_info.json');
  }).not.toThrow();
});
