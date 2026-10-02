with open("generate_aemo.py", "r") as f:
    content = f.read()

import re

# Add loading of real coords
loading = """import json
with open('oe_real_coords.json', 'r') as f:
    oe_coords = {item['code']: (item['lat'], item['lon']) for item in json.load(f) if item['lat'] is not None}
"""

# Replace the get_state_coords call
pattern = r"cat = map_fuel_type\(fuel\)\s*lat, lon = get_state_coords\(region\)"
replacement = """cat = map_fuel_type(fuel)
    if duid in oe_coords:
        lat, lon = oe_coords[duid]
    elif duid.rstrip('123456789') in oe_coords:
        lat, lon = oe_coords[duid.rstrip('123456789')]
    else:
        lat, lon = get_state_coords(region)
"""

# insert loading right after imports
content = content.replace("import pandas as pd", "import pandas as pd\n" + loading)
content = re.sub(pattern, replacement, content)

with open("generate_aemo.py", "w") as f:
    f.write(content)

