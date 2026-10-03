import re

with open('js/energy_app.js', 'r') as f:
    text = f.read()

# Update _absoluteMaxTotal logic
old_max = """    if (this._absoluteMaxTotal === undefined) {
        let absCatTotals = new Array(metadata.fuelTypes.length).fill(0);
        for (let i = 0; i < metadata.recordCount; i++) {
            const cIdx = categoryIndices[i];
            if (cIdx >= 0 && cIdx < absCatTotals.length) {
                absCatTotals[cIdx] += generation[i];
            }
        }
        this._absoluteMaxTotal = Math.max(...absCatTotals);
    }"""
new_max = """    if (this._absoluteMaxTotal === undefined) {
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
text = text.replace(old_max, new_max)

# Update UI logic
old_ui = """    // Build array of objects for sorting
    let chartData = [];
    for (let i = 0; i < metadata.fuelTypes.length; i++) {
        chartData.push({
            name: metadata.fuelTypes[i],
            total: catTotals[i],
            color: palette[i]
        });
    }
    
    // Sort highest to lowest
    chartData.sort((a, b) => b.total - a.total);
    
    // Render HTML
    if (!this.dom.barChart) this.dom.barChart = document.getElementById('bar-chart');
    if (this.dom.barChart) {
        let html = '';
        for (const item of chartData) {
            let currentMax = this._absoluteMaxTotal;
            if (this.chartMode === 'snapshot') {
                currentMax = Math.max(...catTotals);
            }
            const pct = currentMax > 0 ? (item.total / currentMax) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            const label = item.name.replace('_', ' ');
            const valStr = Math.round(item.total).toLocaleString() + ' MWh';
            
            html += `
              <div class="bar-row">
                <div class="bar-label">${label}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background: ${colorStr};"></div>
                </div>
                <div class="bar-value">${valStr}</div>
              </div>
            `;
        }
        this.dom.barChart.innerHTML = html;
        document.getElementById('bottom-panel').classList.remove('hidden');
    }"""

new_ui = """    // Calculate aggregates
    let fossilTotal = 0;
    let renewableTotal = 0;
    for (let i = 0; i < metadata.fuelTypes.length; i++) {
        const fType = metadata.fuelTypes[i];
        if (fType === 'coal' || fType === 'gas') fossilTotal += catTotals[i];
        else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renewableTotal += catTotals[i];
    }

    // Build array of objects for sorting
    let chartData = [];
    for (let i = 0; i < metadata.fuelTypes.length; i++) {
        chartData.push({
            name: metadata.fuelTypes[i],
            total: catTotals[i],
            color: palette[i]
        });
    }
    
    // Sort highest to lowest
    chartData.sort((a, b) => b.total - a.total);
    
    // Render HTML
    if (!this.dom.barChart) this.dom.barChart = document.getElementById('bar-chart');
    if (this.dom.barChart) {
        let html = '';
        let currentMax = this._absoluteMaxTotal;
        if (this.chartMode === 'snapshot') {
            currentMax = Math.max(...catTotals, fossilTotal, renewableTotal);
        }
        for (const item of chartData) {
            const pct = currentMax > 0 ? (item.total / currentMax) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            const label = item.name.replace('_', ' ').toUpperCase();
            const valStr = Math.round(item.total).toLocaleString() + ' MWh';
            
            html += `
              <div class="bar-row">
                <div class="bar-label">${label}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background: ${colorStr};"></div>
                </div>
                <div class="bar-value">${valStr}</div>
              </div>
            `;
        }

        // Add aggregates
        html += '<hr style="border: 1px solid #444; margin: 10px 0;">';
        
        const fossilPct = currentMax > 0 ? (fossilTotal / currentMax) * 100 : 0;
        html += `
          <div class="bar-row">
            <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
            </div>
            <div class="bar-value" style="font-weight: bold;">${Math.round(fossilTotal).toLocaleString()} MWh</div>
          </div>
        `;

        const renPct = currentMax > 0 ? (renewableTotal / currentMax) * 100 : 0;
        html += `
          <div class="bar-row">
            <div class="bar-label" style="font-weight: bold;">RENEWABLES</div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${renPct}%; background: #4CAF50;"></div>
            </div>
            <div class="bar-value" style="font-weight: bold;">${Math.round(renewableTotal).toLocaleString()} MWh</div>
          </div>
        `;

        this.dom.barChart.innerHTML = html;
        document.getElementById('bottom-panel').classList.remove('hidden');
    }"""
text = text.replace(old_ui, new_ui)

with open('js/energy_app.js', 'w') as f:
    f.write(text)
