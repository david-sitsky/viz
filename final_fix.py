import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# 1. Fix absCatTotals to filter by selected states
old_abs_loop = """        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            // Calculate absolute max using ALL states so the scale remains fixed and bars visually shrink when states are deselected
            
            const cIdx = categoryIndices[i];"""

new_abs_loop = """        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const cIdx = categoryIndices[i];"""

js = js.replace(old_abs_loop, new_abs_loop)

# 2. Separate the scales
old_max_calc = """        this._absoluteMaxTotal = Math.max(...absCatTotals, fossilMax, renMax);
    }"""
new_max_calc = """        this._absoluteMaxTotal = Math.max(...absCatTotals);
        this._absoluteAggregateMaxTotal = Math.max(fossilMax, renMax);
    }"""
js = js.replace(old_max_calc, new_max_calc)


# 3. Re-add `this._absoluteMaxTotal = undefined;` to checkbox change listener
# It is missing from `filterContent.addEventListener('change', ...)`
old_change = """                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
                  this._updateUI();"""
new_change = """                  this._absoluteMaxTotal = undefined;
                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
                  this._updateUI();"""
js = js.replace(old_change, new_change)

with open('js/energy_app.js', 'w') as f:
    f.write(js)

# Bump HTML version to v=29
with open('energy.html', 'r') as f:
    html = f.read()
html = re.sub(r'v=\d+', 'v=29', html)
with open('energy.html', 'w') as f:
    f.write(html)
