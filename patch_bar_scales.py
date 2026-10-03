import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# Update _absoluteMaxTotal calculation
old_max = """        let fossilMax = 0, renMax = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilMax += absCatTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renMax += absCatTotals[i];
        }
        this._absoluteMaxTotal = Math.max(...absCatTotals, fossilMax, renMax);"""

new_max = """        let fossilMax = 0, renMax = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilMax += absCatTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renMax += absCatTotals[i];
        }
        this._absoluteMaxTotal = Math.max(...absCatTotals);
        this._absoluteAggregateMaxTotal = Math.max(fossilMax, renMax);"""

js = js.replace(old_max, new_max)

# Filter 0 totals
js = js.replace("for (const item of chartData) {", "for (const item of chartData) {\n            if (item.total === 0) continue;")

# Update aggregate section scale
old_agg = """        // Add aggregates
        html += '<hr style="border: 1px solid #444; margin: 10px 0;">';
        
        const fossilPct = currentMax > 0 ? (fossilTotal / currentMax) * 100 : 0;
        html += `
          <div class="bar-row">
            <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
            </div>
            <div class="bar-value" style="font-weight: bold;">${Math.round(fossilTotal / 1000).toLocaleString()} GWh</div>
          </div>
        `;

        const renPct = currentMax > 0 ? (renewableTotal / currentMax) * 100 : 0;"""

new_agg = """        // Add aggregates
        html += '<hr style="border: 1px solid #444; margin: 10px 0;">';
        
        let aggMax = this._absoluteAggregateMaxTotal;
        if (this.chartMode === 'snapshot') {
            aggMax = Math.max(fossilTotal, renewableTotal);
        }
        
        if (fossilTotal > 0 || renewableTotal > 0) {
            if (fossilTotal > 0) {
                const fossilPct = aggMax > 0 ? (fossilTotal / aggMax) * 100 : 0;
                html += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${Math.round(fossilTotal / 1000).toLocaleString()} GWh</div>
                  </div>
                `;
            }

            if (renewableTotal > 0) {
                const renPct = aggMax > 0 ? (renewableTotal / aggMax) * 100 : 0;
                html += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">RENEWABLES</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${renPct}%; background: #4CAF50;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${Math.round(renewableTotal / 1000).toLocaleString()} GWh</div>
                  </div>
                `;
            }
        }"""

js = js.replace(old_agg, new_agg)

# The trailing part of old_agg replacement needs to match exactly, so let's adjust the patch
