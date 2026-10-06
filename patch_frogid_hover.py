import sys

py_file = 'frogid/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# Update signature
content = content.replace('_onHover(recordIdx) {', '_onHover(recordIdx, info) {')
content = content.replace('(recordIdx) => this._onHover(recordIdx)', '(recordIdx, info) => this._onHover(recordIdx, info)')

# Find the end of _onHover where it removes hidden class
target = "this.dom.hoverPanel.classList.remove('hidden');"
repl = """if (!this._isPopupDragged && info) {
      this.dom.hoverPanel.style.position = 'fixed';
      this.dom.hoverPanel.style.left = (info.x + 15) + 'px';
      this.dom.hoverPanel.style.top = (info.y + 15) + 'px';
      this.dom.hoverPanel.style.right = 'auto';
      this.dom.hoverPanel.style.bottom = 'auto';
      this.dom.hoverPanel.style.margin = '0';
    }
    this.dom.hoverPanel.classList.remove('hidden');"""

content = content.replace(target, repl)

with open(py_file, 'w') as f:
    f.write(content)

