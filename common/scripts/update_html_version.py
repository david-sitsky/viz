import re
import os
from datetime import datetime

new_v = datetime.now().strftime("%Y%m%d%H%M")
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

for filename in ['energy/index.html', 'frogid/index.html', 'bogong/index.html', 'index.html']:
    filepath = os.path.join(root_dir, filename)
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        html = f.read()
    
    # Match optionally ../common/ and then js/ or styles.css
    html = re.sub(r'((?:\.\.\/)?(?:common\/)?js/[a-zA-Z0-9_]+\.js)\?v=[0-9]+', rf'\1?v={new_v}', html)
    html = re.sub(r'((?:\.\.\/)?(?:common\/)?styles\.css)\?v=[0-9]+', rf'\1?v={new_v}', html)
    
    with open(filepath, 'w') as f:
        f.write(html)
