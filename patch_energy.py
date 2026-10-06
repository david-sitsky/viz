import sys

py_file = 'energy/js/energy_app.js'
with open(py_file, 'r') as f:
    content = f.read()

find = "this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {"
repl = "makeDraggable(this.dom.hoverPanel, this.dom.hoverPanel, () => { this._isPopupDragged = true; });\n    this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {\n      this._isPopupDragged = false;"

if find in content:
    content = content.replace(find, repl)
    
with open(py_file, 'w') as f:
    f.write(content)
