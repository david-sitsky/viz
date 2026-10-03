import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

# Update _rebuildFilteredData to also build _filteredFilteredGeneration
old_rebuild = "this._filteredGeneration = new Float32Array(n);"
new_rebuild = "this._filteredGeneration = new Float32Array(n);\n      this._filteredFilteredGeneration = new Float32Array(n);"
js = js.replace(old_rebuild, new_rebuild)

old_rebuild2 = "this._filteredGeneration[n] = this.data.generation[i];"
new_rebuild2 = "this._filteredGeneration[n] = this.data.generation[i];\n        this._filteredFilteredGeneration[n] = this.data.filteredGeneration ? this.data.filteredGeneration[i] : this.data.generation[i];"
js = js.replace(old_rebuild2, new_rebuild2)

# Update _getActiveData to return filteredGeneration
old_get1 = "generation:      this._filteredGeneration,"
new_get1 = "generation:      this._filteredGeneration,\n        filteredGeneration: this._filteredFilteredGeneration,"
js = js.replace(old_get1, new_get1)

old_get2 = "generation:      this.data.generation,"
new_get2 = "generation:      this.data.generation,\n      filteredGeneration: this.data.filteredGeneration || this.data.generation,"
js = js.replace(old_get2, new_get2)

# Also fix the applyStateFilter method to update BOTH arrays if filtered data exists
apply_filter_update = """
  applyStateFilter(facilityMap, selectedStates) {
    if (!this.data || !this.data.generation) return;
    
    // Always update the underlying array
    if (!this.data.filteredGeneration) this.data.filteredGeneration = new Float32Array(this.data.generation);
    for (let i = 0; i < this.data.generation.length; i++) {
        const fId = this.data.facilityIds[i];
        const fac = facilityMap.get(fId);
        if (fac && selectedStates.has(fac.state)) {
            this.data.filteredGeneration[i] = this.data.generation[i];
        } else {
            this.data.filteredGeneration[i] = 0;
        }
    }
    
    // Also update the filtered subset if active
    if (this._filteredIndices) {
        if (!this._filteredFilteredGeneration) this._filteredFilteredGeneration = new Float32Array(this._filteredGeneration);
        for (let j = 0; j < this._filteredIndices.length; j++) {
            const originalIdx = this._filteredIndices[j];
            this._filteredFilteredGeneration[j] = this.data.filteredGeneration[originalIdx];
        }
    }
    
    this.render();
  }
"""
# Replace the whole applyStateFilter function using regex
js = re.sub(r'  applyStateFilter\(facilityMap, selectedStates\) \{.*?(?=\n  setData)', apply_filter_update, js, flags=re.DOTALL)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
