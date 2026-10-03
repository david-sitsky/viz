import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# Remove the lines that reset _absoluteMaxTotal
js = js.replace('this._absoluteMaxTotal = undefined;', '')

# Also we need to make sure _absoluteMaxTotal is calculated across ALL states, not just selected states!
# Because currently it checks `if (!this.selectedStates.has(fac.state)) continue;`
old_max_loop = """        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const cIdx = categoryIndices[i];"""

new_max_loop = """        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            // Calculate absolute max using ALL states so the scale remains fixed and bars visually shrink when states are deselected
            
            const cIdx = categoryIndices[i];"""

js = js.replace(old_max_loop, new_max_loop)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
