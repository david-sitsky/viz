import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

old_counts = """  getVisibleCounts() {
    const active = this._getActiveData();
    const day = this.currentDay;
    const offsets = active.dayOffsets;
    const endIdx = (day + 1 < offsets.length) ? offsets[day + 1] : active.recordCount;
    return { total: endIdx, today: endIdx - (offsets[day] ?? 0) };
  }"""
new_counts = """  getVisibleCounts() {
    const active = this._getActiveData();
    const day = this.currentDay;
    const offsets = active.dayOffsets;
    const dayStart = offsets[day] || 0;
    const dayEnd = (day + 1 < offsets.length) ? offsets[day + 1] : active.facilityIds.length;
    
    let today = 0;
    if (this.delegate && this.delegate.selectedStates) {
        for (let i = dayStart; i < dayEnd; i++) {
            const fac = this.delegate.facilityMap.get(active.facilityIds[i]);
            if (fac && this.delegate.selectedStates.has(fac.state)) {
                today++;
            }
        }
    } else {
        today = dayEnd - dayStart;
    }
    
    return { total: dayEnd, today };
  }"""
js = js.replace(old_counts, new_counts)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
