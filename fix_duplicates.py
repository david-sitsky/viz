import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

pattern = r'      // Setup state filter.*?this\._setDay\(0\);'

def replacer(match):
    global count
    count += 1
    if count == 1:
        return match.group(0) # Keep first
    else:
        # For the others, we want to just return 'this._setDay(0);'
        return '      this._setDay(0);'

count = 0
js = re.sub(pattern, replacer, js, flags=re.DOTALL)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
