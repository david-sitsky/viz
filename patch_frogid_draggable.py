import sys

py_file = 'frogid/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# In _setupHoverPanelClose()
find = """  _setupHoverPanelClose() {
    // ✕ on the hover panel
    this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {
      this.dom.hoverPanel.classList.add('hidden');
      this._stopAudio(this.dom.hoverAudio);
      // Reset so next hover re-fires even if same record
      this.map._lastHoveredRecord = -1;
    });
  }"""

repl = """  _setupHoverPanelClose() {
    // ✕ on the hover panel
    this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {
      this.dom.hoverPanel.classList.add('hidden');
      this._stopAudio(this.dom.hoverAudio);
      // Reset so next hover re-fires even if same record
      this.map._lastHoveredRecord = -1;
      this._isPopupDragged = false;
    });
    
    makeDraggable(this.dom.hoverPanel, this.dom.hoverPanel, () => { this._isPopupDragged = true; });
  }"""

if find in content:
    content = content.replace(find, repl)
else:
    print("Could not find _setupHoverPanelClose in frogid/js/app.js")
    
with open(py_file, 'w') as f:
    f.write(content)

