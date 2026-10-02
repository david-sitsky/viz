import sys

with open("js/energy_map.js", "r") as f:
    content = f.read()

# We want to replace _updateLayers completely.
import re
pattern = r"_updateLayers\(\)\s*\{.*?\}\n\n\s*_resolveRecordIndex"
replacement = """_updateLayers() {
    const active = this._getActiveData();
    const day = this.currentDay;
    const offsets = active.dayOffsets;
    const dayStart = offsets[day] ?? 0;
    const endIdx   = (day + 1 < offsets.length) ? offsets[day + 1] : active.recordCount;
    const dayEnd   = endIdx;
    const todayCount = dayEnd - dayStart;

    let layers = [];
    if (todayCount > 0) {
      // Glow layer for active generation
      layers.push(new ScatterplotLayer({
        id: 'glow',
        data: {
          length: todayCount,
          attributes: {
            getPosition: { value: active.positions.subarray(dayStart*2, dayEnd*2), size: 2 },
            getRadius:   { value: active.generation.subarray(dayStart, dayEnd),    size: 1 },
          },
        },
        radiusUnits: 'pixels', radiusScale: 0.000025, radiusMinPixels: 4, radiusMaxPixels: 20,
        getFillColor: [255, 255, 255, 40], opacity: 0.5,
        pickable: false, parameters: { depthTest: false },
      }));

      // Main station layer
      layers.push(new ScatterplotLayer({
        id: 'stations',
        data: {
          length: todayCount,
          attributes: {
            getPosition: { value: active.positions.subarray(dayStart*2, dayEnd*2), size: 2 },
            getFillColor:{ value: active.colors.subarray(dayStart*4, dayEnd*4), size: 4 },
            getRadius:   { value: active.generation.subarray(dayStart, dayEnd),    size: 1 },
          },
        },
        radiusUnits: 'pixels', radiusScale: 0.000015, radiusMinPixels: 3, radiusMaxPixels: 15,
        opacity: 0.95, pickable: true, parameters: { depthTest: false },
        _dayStart: dayStart,
      }));
    }

    this.overlay.setProps({ layers });
  }

  _resolveRecordIndex"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open("js/energy_map.js", "w") as f:
    f.write(content)
