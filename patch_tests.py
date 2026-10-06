import sys
import glob

files = glob.glob('**/*.spec.js', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # We want to inject the click after the wait.
    # There are a few variants:
    # 1. await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });
    # 2. await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/, { timeout: 15000 });
    # 3. await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });
    # 4. await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });
    
    injection = """
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.count() > 0) {
      const isChecked = await page.locator('#mobile-toggle').evaluate(el => el.checked);
      if (!isChecked) await settingsBtn.click();
    }
    """
    
    # Simple replace:
    content = content.replace("await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });", "await page.waitForSelector('#loading-overlay.hidden', { state: 'attached', timeout: 15000 });" + injection)
    content = content.replace("await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/, { timeout: 15000 });", "await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/, { timeout: 15000 });" + injection)
    content = content.replace("await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });", "await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 30000 });" + injection)
    content = content.replace("await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });", "await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 15000 });" + injection)

    with open(file, 'w') as f:
        f.write(content)

