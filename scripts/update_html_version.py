import re
from datetime import datetime

with open('../energy.html', 'r') as f:
    html = f.read()
    
# Find <script type="module" src="js/energy_app.js?v=35"></script>
# and bump it
new_v = datetime.now().strftime("%Y%m%d%H%M")
html = re.sub(r'js/energy_app\.js\?v=[0-9]+', f'js/energy_app.js?v={new_v}', html)

with open('../energy.html', 'w') as f:
    f.write(html)
