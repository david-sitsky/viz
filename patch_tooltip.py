with open("js/energy_app.js", "r") as f:
    content = f.read()

import re

# We need to change the callback signature in the constructor:
content = content.replace(
    "(recordIdx) => this._onHover(recordIdx)",
    "(recordIdx, x, y) => this._onHover(recordIdx, x, y)"
)

# And in _onHover
pattern = r"_onHover\(recordIdx\) \{(.*?)\n\s*const fId"
replacement = """_onHover(recordIdx, x, y) {
    if (this._hideTooltipTimeout) {
      clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = null;
    }
    
    if (recordIdx < 0) {
      this._hideTooltipTimeout = setTimeout(() => {
        if (this.dom && this.dom.tooltip) {
          this.dom.tooltip.classList.add('hidden');
        }
      }, 250);
      return;
    }
    const fId"""
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Add positioning
pattern2 = r"this\.dom\.tooltip\.innerHTML = html;\n\s*this\.dom\.tooltip\.classList\.remove\('hidden'\);"
replacement2 = """this.dom.tooltip.innerHTML = html;
    this.dom.tooltip.classList.remove('hidden');
    
    if (x !== undefined && y !== undefined) {
      const w = 320; // approximate width
      const h = 200; // approximate height
      let left = x + 15;
      let top = y + 15;
      
      if (left + w > window.innerWidth) left = x - w - 15;
      if (top + h > window.innerHeight) top = y - h - 15;
      
      this.dom.tooltip.style.left = left + 'px';
      this.dom.tooltip.style.top = top + 'px';
      this.dom.tooltip.style.right = 'auto';
      this.dom.tooltip.style.bottom = 'auto';
    }"""
content = re.sub(pattern2, replacement2, content)

# Also add mouseenter/mouseleave to tooltip in constructor
pattern3 = r"this\._setupHoverPanelClose\(\);"
replacement3 = """this._setupHoverPanelClose();
      if (this.dom.tooltip) {
        this.dom.tooltip.addEventListener('mouseenter', () => {
          if (this._hideTooltipTimeout) clearTimeout(this._hideTooltipTimeout);
        });
        this.dom.tooltip.addEventListener('mouseleave', () => {
          this.dom.tooltip.classList.add('hidden');
        });
      }"""
content = content.replace(pattern3, replacement3)

with open("js/energy_app.js", "w") as f:
    f.write(content)
