import re
import os
from datetime import datetime

new_v = datetime.now().strftime("%Y%m%d%H%M")
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for filename in ['energy.html', 'frogid.html', 'bogong.html', 'index.html']:
    filepath = os.path.join(root_dir, filename)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        html = f.read()
    
    html = re.sub(r'(js/[a-zA-Z0-9_]+\.js)\?v=[0-9]+', rf'\1?v={new_v}', html)
    
    with open(filepath, 'w') as f:
        f.write(html)
