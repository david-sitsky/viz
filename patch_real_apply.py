import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

# Find the end of setFilter
pattern = r'(  setFilter\(categoryIndices\) \{.*?^\s*\}\n)'

apply_filter = """
  applyStateFilter(facilityMap, selectedStates) {
    if (!this.data || !this.data.generation) return;
    
    if (!this.data.filteredGeneration) {
        this.data.filteredGeneration = new Float32Array(this.data.generation.length);
        this.data.filteredPositions = new Float32Array(this.data.positions.length);
    }
    
    for (let i = 0; i < this.data.metadata.recordCount; i++) {
        const fac = facilityMap.get(this.data.facilityIds[i]);
        if (fac && selectedStates.has(fac.state)) {
            this.data.filteredGeneration[i] = this.data.generation[i];
            this.data.filteredPositions[i*2] = this.data.positions[i*2];
            this.data.filteredPositions[i*2+1] = this.data.positions[i*2+1];
        } else {
            this.data.filteredGeneration[i] = 0;
            // Move off-map so it doesn't render as a 2px circle due to radiusMinPixels
            this.data.filteredPositions[i*2] = 0;
            this.data.filteredPositions[i*2+1] = -90;
        }
    }
    
    // Also update the filtered subset if active
    if (this._filteredIndices) {
        if (!this._filteredFilteredGeneration) this._filteredFilteredGeneration = new Float32Array(this._filteredGeneration);
        for (let j = 0; j < this._filteredIndices.length; j++) {
            const originalIdx = this._filteredIndices[j];
            this._filteredFilteredGeneration[j] = this.data.filteredGeneration[originalIdx];
            
            // We also need to update the _filteredPositions! 
            // BUT wait! _buildFilteredData ALREADY re-copies from this.data.filteredPositions when called!
            // BUT we are NOT calling _buildFilteredData here! We just need to update it in place!
            this._filteredPositions[j*2] = this.data.filteredPositions[originalIdx*2];
            this._filteredPositions[j*2+1] = this.data.filteredPositions[originalIdx*2+1];
        }
    }
    
    this._updateLayers();
  }
"""

js = re.sub(pattern, r'\1' + apply_filter, js, count=1, flags=re.DOTALL | re.MULTILINE)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
