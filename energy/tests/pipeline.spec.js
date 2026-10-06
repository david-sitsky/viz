const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');

test('test daily update pipeline scripts execute without errors', async () => {
  // We run build_blob.py and update_html_version.py to ensure paths are correct.
  // We skip update_data.py to avoid spamming the OpenElectricity API during tests.
  
  expect(() => {
    execSync('cd energy && python3 scripts/build_blob.py');
  }).not.toThrow();

  expect(() => {
    execSync('python3 common/scripts/update_html_version.py');
  }).not.toThrow();
});
