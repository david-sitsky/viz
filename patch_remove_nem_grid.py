with open('js/energy_app.js', 'r') as f:
    js = f.read()

old_logic = """for (const fac of this.facilityMap.values()) {
          if (fac.state === 'NEM (Multi-state)') fac.state = 'NEM (Grid)';
          if (fac.state) states.add(fac.state);
      }"""

new_logic = """for (const fac of this.facilityMap.values()) {
          if (fac.state) states.add(fac.state);
      }"""

js = js.replace(old_logic, new_logic)
js = js.replace('v=26', 'v=27')
with open('js/energy_app.js', 'w') as f:
    f.write(js)

with open('energy.html', 'r') as f:
    html = f.read()
html = html.replace('v=26', 'v=27')
with open('energy.html', 'w') as f:
    f.write(html)
