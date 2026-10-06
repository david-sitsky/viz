import sys

py_file = 'energy/js/energy_app.js'
with open(py_file, 'r') as f:
    content = f.read()

# 1. Add this.hasStarted = false; to constructor
content = content.replace("this.speed       = 1;", "this.speed       = 1;\n    this.hasStarted  = false;")

# 2. Set to true in _play() and scrubber input
content = content.replace("this.playing = true;", "this.playing = true;\n    this.hasStarted = true;")
content = content.replace("this._pause();\n      this._setDay(parseInt(this.dom.scrubber.value, 10));", "this.hasStarted = true;\n      this._pause();\n      this._setDay(parseInt(this.dom.scrubber.value, 10));")

# 3. Update the aggregatesHtml generation
fossil_target = """            if (fossilTotal > 0) {
                const fossilPct = aggMax > 0 ? (fossilTotal / aggMax) * 100 : 0;
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${Math.round(fossilTotal / 1000).toLocaleString()} GWh</div>
                  </div>
                `;
            }"""

fossil_repl = """            if (fossilTotal > 0) {
                const fossilPct = this.hasStarted && aggMax > 0 ? (fossilTotal / aggMax) * 100 : 0;
                const fVal = this.hasStarted ? Math.round(fossilTotal / 1000).toLocaleString() + ' GWh' : '';
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${fVal}</div>
                  </div>
                `;
            }"""
content = content.replace(fossil_target, fossil_repl)

ren_target = """            if (renewableTotal > 0) {
                const renPct = aggMax > 0 ? (renewableTotal / aggMax) * 100 : 0;
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">RENEWABLES</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${renPct}%; background: #4CAF50;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${Math.round(renewableTotal / 1000).toLocaleString()} GWh</div>
                  </div>
                `;
            }"""

ren_repl = """            if (renewableTotal > 0) {
                const renPct = this.hasStarted && aggMax > 0 ? (renewableTotal / aggMax) * 100 : 0;
                const rVal = this.hasStarted ? Math.round(renewableTotal / 1000).toLocaleString() + ' GWh' : '';
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">RENEWABLES</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${renPct}%; background: #4CAF50;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${rVal}</div>
                  </div>
                `;
            }"""
content = content.replace(ren_target, ren_repl)

# 4. Update the bar chart loop
loop_target = """        for (const item of chartData) {
            if (item.total === 0) continue;
            const pct = currentMax > 0 ? (item.total / currentMax) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            let label = item.name.replace('_', ' ').toUpperCase();
            if (window.innerWidth <= 768) {
                if (label === 'COMMERCIAL SOLAR') label = 'COMM SOLAR';
                if (label === 'ROOFTOP SOLAR') label = 'ROOF SOLAR';
            }
            let valStr;
            if (this.chartViewMode === 'state_renewables_pct') {
                valStr = item.total.toFixed(1) + '%';
            } else {
                valStr = Math.round(item.total / 1000).toLocaleString() + ' GWh';
            }"""

loop_repl = """        for (const item of chartData) {
            if (item.total === 0 && this.hasStarted) continue;
            
            const pct = this.hasStarted && currentMax > 0 ? (item.total / currentMax) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            let label = item.name.replace('_', ' ').toUpperCase();
            if (window.innerWidth <= 768) {
                if (label === 'COMMERCIAL SOLAR') label = 'COMM SOLAR';
                if (label === 'ROOFTOP SOLAR') label = 'ROOF SOLAR';
            }
            let valStr = '';
            if (this.hasStarted) {
                if (this.chartViewMode === 'state_renewables_pct') {
                    valStr = item.total.toFixed(1) + '%';
                } else {
                    valStr = Math.round(item.total / 1000).toLocaleString() + ' GWh';
                }
            }"""

content = content.replace(loop_target, loop_repl)

with open(py_file, 'w') as f:
    f.write(content)

