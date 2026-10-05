import sys

html_file = 'christmas-beetle/index.html'

with open(html_file, 'r') as f:
    content = f.read()

# Remove old scrubber, btn-settings, day-info, today-info
content = content.replace('<input type="range" id="scrubber" class="scrubber" min="0" max="2556" value="0" aria-label="Timeline">', '')
content = content.replace('<label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings">⚙️ Settings</label>', '')
content = content.replace('<span id="day-info" class="info-chip">Day 1 of 2,557</span>', '')
content = content.replace('<span id="today-info" class="info-chip">0 today</span>', '')

# Insert scrubber into controls-info-row
content = content.replace('<div class="speed-ctrl">', '<input type="range" id="scrubber" class="scrubber" min="0" max="2556" value="0" aria-label="Timeline" style="flex: 1; margin-right: 15px;">\n        <div class="speed-ctrl">')

# Add btn-settings to stats-bar
stats_bar = '''    <header id="stats-bar" class="glass hidden" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div class="stat">
          <span class="stat-label">📅 DATE</span>
          <span class="stat-value" id="stat-date">—</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-label">🪲 OCCURRENCES</span>
          <span class="stat-value" id="stat-records">0</span>
          <span class="stat-sub">recordings</span>
        </div>
      </div>
      <label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings">⚙️ Settings</label>
    </header>'''

import re
content = re.sub(r'<header id="stats-bar" class="glass hidden">.*?</header>', stats_bar, content, flags=re.DOTALL)

with open(html_file, 'w') as f:
    f.write(content)
