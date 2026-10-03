import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

js = js.replace("statsBar:         $('stats-bar'),", "statsBar:         $('stats-bar'),\n      filterPanel:      $('filter-panel'),")

with open('js/energy_app.js', 'w') as f:
    f.write(js)
