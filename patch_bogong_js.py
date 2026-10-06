import sys

py_file = 'bogong/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# Add to _cacheDom:
# bogongPanel: $('bogong-panel'),
# btnInfo: $('btn-info'),
# bogongPanelClose: $('bogong-panel-close'),
cache = "this.dom = {\n      loadingOverlay:   $('loading-overlay'),"
new_cache = "this.dom = {\n      loadingOverlay:   $('loading-overlay'),\n      bogongPanel: $('bogong-panel'),\n      btnInfo: $('btn-info'),\n      bogongPanelClose: $('bogong-panel-close'),"
content = content.replace(cache, new_cache)

# Add logic to _setupControls:
controls = "this.dom.fadeToggle.addEventListener('change', e => {"
new_controls = """
    if (this.dom.bogongPanel) {
      makeDraggable(this.dom.bogongPanel);
    }
    if (this.dom.bogongPanelClose) {
      this.dom.bogongPanelClose.addEventListener('click', () => {
        this.dom.bogongPanel.classList.add('hidden');
      });
    }
    if (this.dom.btnInfo) {
      this.dom.btnInfo.addEventListener('click', () => {
        this.dom.bogongPanel.classList.remove('hidden');
      });
    }

    """ + controls

content = content.replace(controls, new_controls)

with open(py_file, 'w') as f:
    f.write(content)
