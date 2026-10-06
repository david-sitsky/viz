import sys

py_file = 'christmas-beetle/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# 1. Add listeners in init()
old_close = """      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dom.hoverPanel.classList.add('hidden');
          this.dom.hoverPanel.classList.remove('pinned');
        });
      }"""
new_close = """      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dom.hoverPanel.classList.add('hidden');
        });
      }
      
      this.dom.hoverPanel.addEventListener('mouseenter', () => {
        this._isHoveringPopup = true;
        if (this._hideTooltipTimeout) {
          clearTimeout(this._hideTooltipTimeout);
          this._hideTooltipTimeout = null;
        }
      });
      this.dom.hoverPanel.addEventListener('mouseleave', () => {
        this._isHoveringPopup = false;
        this._showHoverPopup(-1, null);
      });"""
content = content.replace(old_close, new_close)

# 2. Update _showHoverPopup
import re

# We will replace everything from `  _showHoverPopup` to `    const catIdx = this.data.categoryIndices[recordIdx];`
old_start = """  _showHoverPopup(recordIdx, info, isClick) {
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

    const catIdx = this.data.categoryIndices[recordIdx];"""

new_start = """  _showHoverPopup(recordIdx, info) {
    if (recordIdx < 0 || !info) {
      if (this._isHoveringPopup) return;
      if (this._hideTooltipTimeout) clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = setTimeout(() => {
        if (this.dom && this.dom.hoverPanel) {
          this.dom.hoverPanel.classList.add('faded');
          setTimeout(() => {
            if (this.dom.hoverPanel.classList.contains('faded')) {
              this.dom.hoverPanel.classList.add('hidden');
            }
          }, 500); // Wait for CSS transition
        }
      }, 500);
      return;
    }

    if (this._hideTooltipTimeout) {
      clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = null;
    }

    const catIdx = this.data.categoryIndices[recordIdx];"""
content = content.replace(old_start, new_start)

# 3. Update the positioning logic at the bottom of _showHoverPopup
old_pos = """    // Position absolute near cursor
    this.dom.hoverPanel.style.position = 'absolute';
    this.dom.hoverPanel.style.top = (info.y + 15) + 'px';
    this.dom.hoverPanel.style.left = (info.x + 15) + 'px';
    this.dom.hoverPanel.style.transform = 'none';
    this.dom.hoverPanel.style.right = 'auto';
    this.dom.hoverPanel.style.bottom = 'auto';
    
    this.dom.hoverPanel.classList.remove('hidden');"""

new_pos = """    if (this._lastPopupRecordIdx !== recordIdx) {
      this.dom.hoverPanel.style.position = 'absolute';
      this.dom.hoverPanel.style.top = (info.y + 15) + 'px';
      this.dom.hoverPanel.style.left = (info.x + 15) + 'px';
      this.dom.hoverPanel.style.transform = 'none';
      this.dom.hoverPanel.style.right = 'auto';
      this.dom.hoverPanel.style.bottom = 'auto';
      this._lastPopupRecordIdx = recordIdx;
    }
    
    // Clear inline pointerEvents if any was left from old code
    this.dom.hoverPanel.style.pointerEvents = '';
    this.dom.hoverPanel.classList.remove('hidden', 'faded');"""
content = content.replace(old_pos, new_pos)

with open(py_file, 'w') as f:
    f.write(content)
