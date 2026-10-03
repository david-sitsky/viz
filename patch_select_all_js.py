import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

# Rename NEM
old_init_states = "for (const fac of this.facilityMap.values()) {\n          if (fac.state) states.add(fac.state);\n      }"
new_init_states = "for (const fac of this.facilityMap.values()) {\n          if (fac.state === 'NEM (Multi-state)') fac.state = 'NEM (Grid)';\n          if (fac.state) states.add(fac.state);\n      }"
js = js.replace(old_init_states, new_init_states)

# Add listeners
listener_insertion = """
          filterContent.addEventListener('change', (e) => {
              if (e.target.type === 'checkbox') {
                  if (e.target.checked) this.selectedStates.add(e.target.value);
                  else this.selectedStates.delete(e.target.value);
                  
                  this._absoluteMaxTotal = undefined;
                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
                  this._updateUI();
              }
          });
          
          const updateAllStates = (checked) => {
              const checkboxes = filterContent.querySelectorAll('input[type="checkbox"]');
              checkboxes.forEach(cb => {
                  cb.checked = checked;
                  if (checked) this.selectedStates.add(cb.value);
                  else this.selectedStates.delete(cb.value);
              });
              this._absoluteMaxTotal = undefined;
              if (this.map && this.map.applyStateFilter) {
                  this.map.applyStateFilter(this.facilityMap, this.selectedStates);
              }
              this._updateUI();
          };
          
          const btnAll = document.getElementById('btn-select-all');
          const btnNone = document.getElementById('btn-deselect-all');
          if (btnAll) btnAll.addEventListener('click', () => updateAllStates(true));
          if (btnNone) btnNone.addEventListener('click', () => updateAllStates(false));
"""

js = re.sub(r'\s*filterContent\.addEventListener\(\'change\', \(e\) => \{.*?\n          \}\);\s*', listener_insertion, js, flags=re.DOTALL)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
