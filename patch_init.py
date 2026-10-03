import re

with open('js/energy_app.js', 'r') as f:
    js = f.read()

init_state_logic = """
      // Setup state filter
      this.selectedStates = new Set();
      const states = new Set();
      for (const fac of this.facilityMap.values()) {
          if (fac.state) states.add(fac.state);
      }
      
      const sortedStates = Array.from(states).sort();
      sortedStates.forEach(s => this.selectedStates.add(s));
      
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
                  
                  this._absoluteMaxTotal = undefined;
                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
                  this._updateUI();
              }
          });
      }
      if (this.map && this.map.applyStateFilter) {
          this.map.applyStateFilter(this.facilityMap, this.selectedStates);
      }
      this._setDay(0);
"""

js = js.replace('this._setDay(0);', init_state_logic)

with open('js/energy_app.js', 'w') as f:
    f.write(js)
