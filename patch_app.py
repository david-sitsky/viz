import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# 1. Initialize states and UI
init_ui_code = """
    this._bindEvents();
    
    // Setup state filter
    this.selectedStates = new Set();
    const states = new Set();
    for (const fac of this.facilityMap.values()) {
        if (fac.state) states.add(fac.state);
    }
    
    const sortedStates = Array.from(states).sort();
    sortedStates.forEach(s => this.selectedStates.add(s)); // All on by default
    
    const filterBtn = document.getElementById('filter-btn');
    const filterContent = document.getElementById('filter-content');
    
    if (filterBtn && filterContent) {
        let html = '';
        sortedStates.forEach(s => {
            html += `<label><input type="checkbox" value="${s}" checked> ${s}</label>`;
        });
        filterContent.innerHTML = html;
        
        filterBtn.addEventListener('click', () => {
            filterContent.classList.toggle('hidden');
        });
        
        filterContent.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                if (e.target.checked) this.selectedStates.add(e.target.value);
                else this.selectedStates.delete(e.target.value);
                
                // Recalculate max total
                this._absoluteMaxTotal = undefined;
                this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                this._updateUI();
            }
        });
    }

    this.map.applyStateFilter(this.facilityMap, this.selectedStates);
    this._updateUI();
"""
js = js.replace('this._bindEvents();\n    this._updateUI();', init_ui_code)

# 2. Update _absoluteMaxTotal logic
old_max = """    if (this._absoluteMaxTotal === undefined) {
        let absCatTotals = new Array(metadata.fuelTypes.length).fill(0);
        for (let i = 0; i < metadata.recordCount; i++) {
            const cIdx = categoryIndices[i];
            if (cIdx >= 0 && cIdx < absCatTotals.length) {
                absCatTotals[cIdx] += generation[i];
            }
        }
        let fossilMax = 0, renMax = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilMax += absCatTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renMax += absCatTotals[i];
        }
        this._absoluteMaxTotal = Math.max(...absCatTotals, fossilMax, renMax);
    }"""
new_max = """    if (this._absoluteMaxTotal === undefined) {
        let absCatTotals = new Array(metadata.fuelTypes.length).fill(0);
        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const cIdx = categoryIndices[i];
            if (cIdx >= 0 && cIdx < absCatTotals.length) {
                absCatTotals[cIdx] += generation[i];
            }
        }
        let fossilMax = 0, renMax = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilMax += absCatTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renMax += absCatTotals[i];
        }
        this._absoluteMaxTotal = Math.max(...absCatTotals, fossilMax, renMax);
    }"""
js = js.replace(old_max, new_max)


# 3. Update catTotals loop logic
old_loop_cumul = """    if (this.chartMode === 'cumulative') {
        for (let i = 0; i < endIdx; i++) {
            const catIdx = categoryIndices[i];
            if (catIdx >= 0 && catIdx < catTotals.length) {
                catTotals[catIdx] += generation[i];
            }
        }
    }"""
new_loop_cumul = """    if (this.chartMode === 'cumulative') {
        for (let i = 0; i < endIdx; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const catIdx = categoryIndices[i];
            if (catIdx >= 0 && catIdx < catTotals.length) {
                catTotals[catIdx] += generation[i];
            }
        }
    }"""
js = js.replace(old_loop_cumul, new_loop_cumul)

old_loop_snap = """        // Daily Snapshot
        for (let i = dayStart; i < endIdx; i++) {
            const catIdx = categoryIndices[i];
            if (catIdx >= 0 && catIdx < catTotals.length) {
                catTotals[catIdx] += generation[i];
            }
        }"""
new_loop_snap = """        // Daily Snapshot
        for (let i = dayStart; i < endIdx; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const catIdx = categoryIndices[i];
            if (catIdx >= 0 && catIdx < catTotals.length) {
                catTotals[catIdx] += generation[i];
            }
        }"""
js = js.replace(old_loop_snap, new_loop_snap)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
