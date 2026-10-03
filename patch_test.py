import re

with open('tests/energy.spec.js', 'r') as f:
    text = f.read()

# Replace the wait logic with the default timeout
old_wait = "await page.waitForFunction(() => typeof window.energyApp !== 'undefined', {timeout: 5000});"
new_wait = "await page.waitForFunction(() => window.energyApp && window.energyApp.data && window.energyApp.data.facilityIds);"

text = text.replace(old_wait, new_wait)

with open('tests/energy.spec.js', 'w') as f:
    f.write(text)
