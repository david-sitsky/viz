import sys
import re

def clean_file(path):
    with open(path, 'r') as f:
        lines = f.readlines()
    
    out = []
    for line in lines:
        if 'dayInfo:' in line or 'todayInfo:' in line:
            continue
        if 'this.dom.todayInfo.textContent' in line or 'this.dom.dayInfo.textContent' in line:
            continue
        if line.strip().startswith('# this.dom.'):
            continue
        out.append(line)
        
    with open(path, 'w') as f:
        f.writelines(out)

clean_file('bogong/js/app.js')
clean_file('frogid/js/app.js')
