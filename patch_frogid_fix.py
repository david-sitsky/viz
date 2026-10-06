import sys

py_file = 'frogid/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

find = "  _onHover(recordIdx, info) {"
repl = """  _onHover(recordIdx, info) {
    if (recordIdx < 0) {
      // Mouse left the dot, but we don't hide the frogID panel automatically
      // so we just do nothing.
      return;
    }"""

content = content.replace(find, repl)

with open(py_file, 'w') as f:
    f.write(content)

