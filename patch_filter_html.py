with open('energy.html', 'r') as f:
    html = f.read()

filter_html = """
        <div class="filter-dropdown">
          <button id="filter-btn" class="filter-btn">Filter States ▾</button>
          <div id="filter-content" class="filter-content hidden">
          </div>
        </div>"""

html = html.replace('<label class="fade-toggle"', filter_html + '\n        <label class="fade-toggle"')
html = html.replace('v=24', 'v=25')

with open('energy.html', 'w') as f:
    f.write(html)
