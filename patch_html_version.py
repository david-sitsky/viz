import re
with open('energy.html', 'r') as f:
    html = f.read()

html = re.sub(r'v=29', 'v=30', html)

with open('energy.html', 'w') as f:
    f.write(html)
