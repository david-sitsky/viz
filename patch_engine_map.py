import sys

py_file = 'common/js/engine_map.js'
with open(py_file, 'r') as f:
    content = f.read()

# Fix _handleClick to pass true for isClick
old_click = "if (this.onRecord) this.onRecord(recordIdx, info);"
new_click = "if (this.onRecord) this.onRecord(recordIdx, info, true);"
if "  _handleClick(info) {" in content:
    idx = content.find("  _handleClick(info) {")
    part1 = content[:idx]
    part2 = content[idx:]
    part2 = part2.replace(old_click, new_click, 1)
    content = part1 + part2

# Fix _handleHover
old_hover = """    if (!info || info.index < 0 || !info.layer || info.layer.id === 'glow') {
      if (container) container.style.cursor = '';
      return;
    }"""
new_hover = """    if (!info || info.index < 0 || !info.layer || info.layer.id === 'glow') {
      if (container) container.style.cursor = '';
      this._lastHoveredRecord = -1;
      if (this.onRecord) this.onRecord(-1, null, false);
      return;
    }"""
content = content.replace(old_hover, new_hover)

old_hover_call1 = """      if (this.onRecord) this.onRecord(recordIdx, info);
      return;"""
new_hover_call1 = """      if (this.onRecord) this.onRecord(recordIdx, info, false);
      return;"""
content = content.replace(old_hover_call1, new_hover_call1)

old_hover_call2 = """    this._lastHoveredRecord = recordIdx;

    if (this.onRecord) this.onRecord(recordIdx, info);"""
new_hover_call2 = """    this._lastHoveredRecord = recordIdx;

    if (this.onRecord) this.onRecord(recordIdx, info, false);"""
content = content.replace(old_hover_call2, new_hover_call2)

with open(py_file, 'w') as f:
    f.write(content)
