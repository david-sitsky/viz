import re

with open('energy.html', 'r') as f:
    html = f.read()

# Remove the old filter-dropdown from controls
html = re.sub(r'\s*<div class="filter-dropdown">.*?</div>\n        </div>', '', html, flags=re.DOTALL)

# Create the new filter panel after stats-bar
new_panel = """    </header>
    
    <!-- State Filter Panel -->
    <div id="filter-panel" class="glass hidden" style="margin-top: 10px; padding: 12px 15px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: rgba(255,255,255,0.65); margin-bottom: 10px;">FILTER BY STATE</div>
      <div id="filter-content" class="filter-grid">
      </div>
    </div>"""

html = html.replace('</header>', new_panel)
html = html.replace('v=25', 'v=26')

with open('energy.html', 'w') as f:
    f.write(html)

# Now update styles.css to style the new grid
with open('styles.css', 'a') as f:
    f.write("""
.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.filter-grid label {
  color: #e4e4e7;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.filter-grid input[type="checkbox"] {
  margin: 0;
  accent-color: #F59E0B;
}
""")

# And update js/energy_app.js to unhide the panel in init() instead of having a button listener
with open('js/energy_app.js', 'r') as f:
    js = f.read()

js = js.replace("['statsBar','controls','mapStyleSelector']", "['statsBar','controls','mapStyleSelector','filterPanel']")

js = re.sub(r'filterBtn\.addEventListener\(\'click\', \(\) => \{.*?\n          \}\);\s+', '', js, flags=re.DOTALL)
js = js.replace("const filterBtn = document.getElementById('filter-btn');", "")
js = js.replace("if (filterBtn && filterContent) {", "if (filterContent) {")

with open('js/energy_app.js', 'w') as f:
    f.write(js)
