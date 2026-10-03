import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

old_filter = """  applyStateFilter(facilityMap, selectedStates) {
    if (!this.data || !this.data.generation) return;
    
    // We create a filtered generation array where unselected states have 0 generation
    if (!this.data.filteredGeneration) {
        this.data.filteredGeneration = new Float32Array(this.data.generation.length);
    }
    
    for (let i = 0; i < this.data.metadata.recordCount; i++) {
        const fac = facilityMap.get(this.data.facilityIds[i]);
        if (fac && selectedStates.has(fac.state)) {
            this.data.filteredGeneration[i] = this.data.generation[i];
        } else {
            this.data.filteredGeneration[i] = 0;
        }
    }"""

new_filter = """  applyStateFilter(facilityMap, selectedStates) {
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
    }"""

js = js.replace(old_filter, new_filter)

# Now we need to update `_updateLayers` to use `active.filteredPositions` instead of `active.positions`!
# BUT wait! `active` might be `this._filtered...` (from the fuel filter).
# So we need to make sure `active.filteredPositions` is available on the fuel filter too!
# In `_buildFilteredData`, it builds `this._filteredPositions`. So if we have both state filter and fuel filter?
