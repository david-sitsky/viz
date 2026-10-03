import re

# 1. Update styles.css
with open('styles.css', 'r') as f:
    css = f.read()
css = css.replace('.bar-label {\n  width: 100px;', '.bar-label {\n  width: 140px;')
with open('styles.css', 'w') as f:
    f.write(css)

# 2. Update energy.html
with open('energy.html', 'r') as f:
    html = f.read()
html = re.sub(r'<div class="chart-toggle">.*?</div>', '', html, flags=re.DOTALL)
html = html.replace('v=22', 'v=23')
with open('energy.html', 'w') as f:
    f.write(html)

# 3. Update js/energy_app.js
with open('js/energy_app.js', 'r') as f:
    js = f.read()

# Change MWh to GWh
js = js.replace("Math.round(gen).toLocaleString() + ' MWh this month'", "Math.round(gen / 1000).toLocaleString() + ' GWh this day'")
js = js.replace("Math.round(item.total).toLocaleString() + ' MWh'", "Math.round(item.total / 1000).toLocaleString() + ' GWh'")
js = js.replace("Math.round(fossilTotal).toLocaleString()} MWh", "Math.round(fossilTotal / 1000).toLocaleString()} GWh")
js = js.replace("Math.round(renewableTotal).toLocaleString()} MWh", "Math.round(renewableTotal / 1000).toLocaleString()} GWh")

with open('js/energy_app.js', 'w') as f:
    f.write(js)
