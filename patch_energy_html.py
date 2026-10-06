import sys

py_file = 'energy/index.html'
with open(py_file, 'r') as f:
    content = f.read()

target = '<option value="state_rooftop_solar">Compare States: Rooftop Solar</option>'
new_option = '<option value="state_rooftop_solar">Compare States: Rooftop Solar</option>\n        <option value="state_renewables_pct">Compare States: Renewable Usage</option>'

content = content.replace(target, new_option)

with open(py_file, 'w') as f:
    f.write(content)

