import sys

py_file = 'common/scripts/update_html_version.py'
with open(py_file, 'r') as f:
    content = f.read()

content = content.replace(
    "['energy/index.html', 'frogid/index.html', 'bogong/index.html', 'index.html']",
    "['energy/index.html', 'frogid/index.html', 'bogong/index.html', 'christmas-beetle/index.html', 'index.html']"
)

with open(py_file, 'w') as f:
    f.write(content)
