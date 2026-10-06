import sys

files = ['bogong/index.html', 'frogid/index.html', 'christmas-beetle/index.html', 'energy/index.html']

old_btn = '<label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings">⚙️ Settings</label>'
new_btn = '<label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings" style="font-size: 16px; padding: 4px; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;" title="Settings">⚙️</label>'

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    content = content.replace(old_btn, new_btn)
    with open(file, 'w') as f:
        f.write(content)

