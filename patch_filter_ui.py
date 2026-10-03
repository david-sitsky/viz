import re

# Update HTML
with open('energy.html', 'r') as f:
    html = f.read()
    
new_controls = """      <div id="controls">
        <button class="play-btn" id="play-btn">▶</button>
        <div class="scrubber-container">
          <input type="range" id="scrubber" min="0" max="100" value="0">
        </div>
        
        <div class="filter-dropdown">
          <button id="filter-btn" class="filter-btn">Filter States ▾</button>
          <div id="filter-content" class="filter-content hidden">
          </div>
        </div>
      </div>"""
html = re.sub(r'      <div id="controls">.*?</div>\n      </div>', new_controls, html, flags=re.DOTALL)
html = html.replace('v=23', 'v=24')

with open('energy.html', 'w') as f:
    f.write(html)

# Update CSS
with open('styles.css', 'a') as f:
    f.write("""
.filter-dropdown {
  position: relative;
  display: inline-block;
  margin-left: 15px;
}
.filter-btn {
  background: #333;
  color: #fff;
  border: 1px solid #555;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.filter-btn:hover { background: #444; }
.filter-content {
  position: absolute;
  top: 100%;
  right: 0;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 10px;
  min-width: 150px;
  z-index: 1000;
  margin-top: 5px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-content label {
  color: #e4e4e7;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
""")
