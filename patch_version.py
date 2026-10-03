with open('energy.html', 'r') as f:
    html = f.read()

html = html.replace('v=27', 'v=28')

with open('energy.html', 'w') as f:
    f.write(html)
