import sys

html_file = 'christmas-beetle/index.html'

with open(html_file, 'r') as f:
    content = f.read()

# Remove right-panels wrapper but keep the inner divs
content = content.replace('<div id="right-panels">', '')
content = content.replace('''    </div>
    <!-- Filter species popups injected here by JS -->
  </div>''', '''    </div>''')

with open(html_file, 'w') as f:
    f.write(content)
