import sys

py_file = 'christmas-beetle/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# Modify _showHoverPopup to handle click vs hover
old_show = """  _showHoverPopup(recordIdx, info) {
    if (recordIdx < 0 || !info) {
      return; // Keep pinned until dismissed or new record hovered
    }"""
new_show = """  _showHoverPopup(recordIdx, info, isClick) {
    if (recordIdx < 0 || !info) {
      if (!this.dom.hoverPanel.classList.contains('pinned')) {
        this.dom.hoverPanel.classList.add('hidden');
      }
      return;
    }
    
    // If it's a hover and already pinned somewhere else, don't move it? No, if it's a click we pin it.
    // If it's a click, we add 'pinned' and remove 'pointer-events: none'.
    // If it's a hover, we add 'pointer-events: none' UNLESS it's already pinned.
    if (isClick) {
      this.dom.hoverPanel.classList.add('pinned');
      this.dom.hoverPanel.style.pointerEvents = 'auto';
    } else {
      if (!this.dom.hoverPanel.classList.contains('pinned')) {
        this.dom.hoverPanel.style.pointerEvents = 'none';
      } else {
        // if pinned, we don't update on hover. The user has to close the pinned popup to see hovers again!
        return;
      }
    }
"""
content = content.replace(old_show, new_show)

# Also update the close listener to remove 'pinned'
old_close = """      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dom.hoverPanel.classList.add('hidden');
        });
      }"""
new_close = """      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dom.hoverPanel.classList.add('hidden');
          this.dom.hoverPanel.classList.remove('pinned');
        });
      }"""
content = content.replace(old_close, new_close)

with open(py_file, 'w') as f:
    f.write(content)
