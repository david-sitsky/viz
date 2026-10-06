import re
import os
from datetime import datetime

new_v = datetime.now().strftime("%Y%m%d%H%M")
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

for filename in ['energy/index.html', 'frogid/index.html', 'bogong/index.html', 'christmas-beetle/index.html', 'index.html']:
    filepath = os.path.join(root_dir, filename)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        html = f.read()
    
    html = re.sub(r'((?:\.\.\/)?(?:common\/)?js/[a-zA-Z0-9_]+\.js)\?v=[0-9]+', r'\g<1>?v=' + new_v, html)
    html = re.sub(r'((?:\.\.\/)?(?:common\/)?styles\.css)\?v=[0-9]+', r'\g<1>?v=' + new_v, html)
    
    with open(filepath, 'w') as f:
        f.write(html)

for js_file in ['energy/js/energy_app.js', 'frogid/js/app.js', 'bogong/js/app.js', 'christmas-beetle/js/app.js']:
    filepath = os.path.join(root_dir, js_file)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        js_content = f.read()
    
    js_content = re.sub(r'((?:\.\.\/)+common\/js/[a-zA-Z0-9_]+\.js)\?v=[0-9]+', r'\g<1>?v=' + new_v, js_content)
    js_content = re.sub(r'(\.\/energy_[a-zA-Z0-9_]+\.js)\?v=[0-9]+', r'\g<1>?v=' + new_v, js_content)
    
    with open(filepath, 'w') as f:
        f.write(js_content)
