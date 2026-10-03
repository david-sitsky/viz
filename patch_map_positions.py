import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

# 1. Change _buildFilteredData to use this.data.filteredPositions instead of this.data.positions
old_build = """    for (let j = 0; j < fn; j++) {
      const i = filtered[j];
      this._filteredPositions[j*2]   = positions[i*2];
      this._filteredPositions[j*2+1] = positions[i*2+1];"""
new_build = """    const sourcePositions = this.data.filteredPositions || positions;
    for (let j = 0; j < fn; j++) {
      const i = filtered[j];
      this._filteredPositions[j*2]   = sourcePositions[i*2];
      this._filteredPositions[j*2+1] = sourcePositions[i*2+1];"""
js = js.replace(old_build, new_build)

# 2. Change _updateLayers to use active.filteredPositions if available
old_pos = "getPosition: { value: active.positions.subarray(dayStart*2, dayEnd*2), size: 2 }"
new_pos = "getPosition: { value: (active.filteredPositions || active.positions).subarray(dayStart*2, dayEnd*2), size: 2 }"
js = js.replace(old_pos, new_pos)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
