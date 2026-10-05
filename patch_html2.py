import sys

html_file = 'christmas-beetle/index.html'
with open(html_file, 'r') as f:
    content = f.read()

# Extract controls block
import re
controls_match = re.search(r'(<!-- Playback Controls -->.*?</footer>)', content, flags=re.DOTALL)
controls_block = controls_match.group(1)

stats_match = re.search(r'(<!-- Stats Bar -->.*?</header>)', content, flags=re.DOTALL)
stats_block = stats_match.group(1)

# Remove both from content
content = content.replace(controls_block, '')
content = content.replace(stats_block, '')

# Insert stats_block THEN controls_block at top-left-panel
new_panel = f'''  <div id="top-left-panel">
{stats_block}

{controls_block}
'''
content = content.replace('  <div id="top-left-panel">\n', new_panel)

with open(html_file, 'w') as f:
    f.write(content)
