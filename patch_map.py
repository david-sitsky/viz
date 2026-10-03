import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

# In setData:
js = js.replace('this.data = data;', 'this.data = data;\n    this.data.filteredGeneration = new Float32Array(this.data.generation);')

# In _getActiveData (Wait, it just returns everything. We can just use filteredGeneration directly)

js = js.replace('value: active.generation.subarray(dayStart, dayEnd),', 'value: active.filteredGeneration.subarray(dayStart, dayEnd),')

# Add applyStateFilter method
apply_filter = """
  applyStateFilter(facilityMap, selectedStates) {
    if (!this.data || !this.data.generation) return;
    for (let i = 0; i < this.data.generation.length; i++) {
        const fId = this.data.facilityIds[i];
        const fac = facilityMap.get(fId);
        if (fac && selectedStates.has(fac.state)) {
            this.data.filteredGeneration[i] = this.data.generation[i];
        } else {
            this.data.filteredGeneration[i] = 0;
        }
    }
    this.render();
  }
"""

js = js.replace('  setData(data) {', apply_filter + '\n  setData(data) {')

with open('js/energy_map.js', 'w') as f:
    f.write(js)
