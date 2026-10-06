import sys

def patch(file):
    with open(file, 'r') as f:
        content = f.read()

    # Find the inner div of footer id="controls"
    # It looks like: <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px;">
    # Or without margin-bottom if it was changed
    
    old_div = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;'
    new_div = '<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;'
    
    content = content.replace(old_div, new_div)
    
    with open(file, 'w') as f:
        f.write(content)

patch('bogong/index.html')
patch('frogid/index.html')
patch('christmas-beetle/index.html')
patch('energy/index.html')
