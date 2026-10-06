import sys
import re

def process_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Extract the occurrences stat block
    if "🪲 OCCURRENCES" in content:
        stat_regex = r'<div class="stat">\s*<span class="stat-label">🪲 OCCURRENCES.*?</div>'
    elif "BOGONG MOTH" in content:
        stat_regex = r'<div class="stat">\s*<span class="stat-label">\s*<svg.*?BOGONG MOTH.*?</div>'
    elif "🐸 FROGID v7" in content:
        stat_regex = r'<div class="stat">\s*<span class="stat-label">🐸 FROGID v7.*?</div>'
    else:
        return

    match = re.search(stat_regex, content, re.DOTALL)
    if not match:
        print(f"Could not find occurrences stat in {path}")
        return
        
    stat_html = match.group(0)

    # Remove the stat block and the divider before it from Row 1
    # Basically we want to remove `<div class="stat-divider"></div>` and `stat_html`
    remove_regex = r'<div class="stat-divider"></div>\s*' + re.escape(stat_html) + r'\s*<div class="stat-divider"></div>'
    if re.search(remove_regex, content):
        content = re.sub(remove_regex, '<div class="stat-divider"></div>', content)
    else:
        # Fallback if there's only one divider
        remove_regex_alt = r'<div class="stat-divider"></div>\s*' + re.escape(stat_html)
        content = re.sub(remove_regex_alt, '', content)
    
    # Insert the stat block into Row 2 before the scrubber
    scrubber_regex = r'<div class="controls-row" style="margin-bottom: 2px;">\s*<input type="range" id="scrubber"'
    replacement = f'<div class="controls-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 2px;">\n        {stat_html}\n        <input type="range" id="scrubber" style="flex: 1;"'
    
    content = re.sub(scrubber_regex, replacement, content)

    with open(path, 'w') as f:
        f.write(content)

process_file('christmas-beetle/index.html')
process_file('bogong/index.html')
process_file('frogid/index.html')
