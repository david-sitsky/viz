import sys

py_file = 'energy/js/energy_app.js'
with open(py_file, 'r') as f:
    content = f.read()

# 1. Inject the logic for `state_renewables_pct` in the data accumulation block.
# We will intercept `if (mode === 'all_sources') { ... } else if (mode === 'state_renewables_pct') { ... } else { ... }`

target_block = """    } else {
        const targetType = mode.replace('state_', '');"""

new_block = """    } else if (mode === 'state_renewables_pct') {
        const stateRen = new Map();
        const stateAll = new Map();
        
        let targetStart = this.chartMode === 'cumulative' ? 0 : dayStart;
        for (let i = targetStart; i < endIdx; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            let st = fac.state;
            if (st === 'NSW/ACT') st = 'NSW';
            
            const catIdx = categoryIndices[i];
            const fType = metadata.fuelTypes[catIdx];
            
            if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) {
                stateRen.set(st, (stateRen.get(st) || 0) + generation[i]);
            }
            if (fType) {
                stateAll.set(st, (stateAll.get(st) || 0) + generation[i]);
            }
        }
        
        currentMax = 100;
        
        for (const [state, totalAll] of stateAll.entries()) {
            if (totalAll === 0) continue;
            const ren = stateRen.get(state) || 0;
            const pct = (ren / totalAll) * 100;
            chartData.push({
                name: state,
                total: pct, // We store the percentage in total to sort it
                color: [76, 175, 80] // Green
            });
        }
    } else {
        const targetType = mode.replace('state_', '');"""

content = content.replace(target_block, new_block)

# 2. Update map filter logic so we don't break the map.
# If `this.chartViewMode === 'state_renewables_pct'`, what should the map filter show?
# "Renewables" on the map? Or ALL sources?
# The user wants "Compare States: Renewable Usage" which is for the dashboard popup.
# But it also filters the map. If it filters the map, we should probably show all renewables on the map.
# Let's see: `const targetCatIdx = this.data.metadata.fuelTypes.indexOf(targetType);`
# We'll intercept the map filter logic.

map_filter_target = """                if (this.chartViewMode === 'all_sources') {
                    this.map.setFilter(new Set());
                } else {"""

map_filter_new = """                if (this.chartViewMode === 'all_sources') {
                    this.map.setFilter(new Set());
                } else if (this.chartViewMode === 'state_renewables_pct') {
                    const renIndices = [];
                    this.data.metadata.fuelTypes.forEach((fType, idx) => {
                        if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) {
                            renIndices.push(idx);
                        }
                    });
                    this.map.setFilter(new Set(renIndices));
                } else {"""

content = content.replace(map_filter_target, map_filter_new)


# 3. Update the string formatting to show %
val_str_target = "const valStr = Math.round(item.total / 1000).toLocaleString() + ' GWh';"
val_str_new = """let valStr;
            if (this.chartViewMode === 'state_renewables_pct') {
                valStr = item.total.toFixed(1) + '%';
            } else {
                valStr = Math.round(item.total / 1000).toLocaleString() + ' GWh';
            }"""

content = content.replace(val_str_target, val_str_new)

with open(py_file, 'w') as f:
    f.write(content)

