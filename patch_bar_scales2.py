import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# 1. Filter out zeros
js = re.sub(r'for \(const item of chartData\) \{', r'for (const item of chartData) {\n            if (item.total === 0) continue;', js)

# 2. Fix the scales by replacing the whole `// Add aggregates` down to `this.dom.barChart.innerHTML = html;`
pattern = r'// Add aggregates.*?this\.dom\.barChart\.innerHTML = html;'
new_agg = """// Add aggregates
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
        }

        this.dom.barChart.innerHTML = html;"""

js = re.sub(pattern, new_agg, js, flags=re.DOTALL)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
