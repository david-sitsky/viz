import re
import os
from datetime import datetime

py_file = 'common/scripts/update_html_version.py'
with open(py_file, 'r') as f:
    content = f.read()

# Add JS files to the script
add_js = """
for js_file in ['energy/js/energy_app.js', 'frogid/js/app.js', 'bogong/js/app.js', 'christmas-beetle/js/app.js']:
    filepath = os.path.join(root_dir, js_file)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        js_content = f.read()
    
    js_content = re.sub(r'((?:\.\.\/)+common\/js/[a-zA-Z0-9_]+\.js)\?v=[0-9]+', rf'\1?v={new_v}', js_content)
    js_content = re.sub(r'(\.\/energy_[a-zA-Z0-9_]+\.js)\?v=[0-9]+', rf'\1?v={new_v}', js_content)
    
    with open(filepath, 'w') as f:
        f.write(js_content)
"""

content += add_js

with open(py_file, 'w') as f:
    f.write(content)
