import sys

py_file = 'bogong/index.html'
with open(py_file, 'r') as f:
    content = f.read()

old_panel = """    <div class="species-panel glass" style="border-left-color: rgb(240, 140, 50);">
      <!-- No close button so it stays permanently -->
      <div class="panel-header">"""

new_panel = """    <div id="bogong-panel" class="species-panel glass" style="border-left-color: rgb(240, 140, 50);">
      <button id="bogong-panel-close" class="panel-close" title="Close" aria-label="Close panel">✕</button>
      <div class="panel-header">"""

content = content.replace(old_panel, new_panel)

# Also add an info button to bring it back if it's closed!
# In `#stats-bar` row 1, near the settings cogwheel, let's add an info button.
info_btn = """<label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings" style="font-size: 16px; padding: 0; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" title="Settings">⚙️</label>"""
new_btns = """<button id="btn-info" class="ctrl-btn" title="Species Info" style="width: 32px; height: 32px; font-size: 16px;">ℹ️</button>
        """ + info_btn

content = content.replace(info_btn, new_btns)

with open(py_file, 'w') as f:
    f.write(content)
