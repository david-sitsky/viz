import re
with open('js/energy_map.js', 'r') as f:
    js = f.read()

old_fallback = """    return {
      facilityIds:     this.data.facilityIds,
      positions:       this.data.positions,"""

new_fallback = """    return {
      facilityIds:     this.data.facilityIds,
      positions:       this.data.positions,
      filteredPositions: this.data.filteredPositions,"""

js = js.replace(old_fallback, new_fallback)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
