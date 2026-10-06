import sys

py_file = 'christmas-beetle/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

# 1. Update updateMapFilter to pass [-1] when size === 0 (to show none)
old_update = """    const updateMapFilter = () => {
      if (activeFilters.size === 0) {
        this.map.setFilter(new Set()); // all
      } else {
        this.map.setFilter(activeFilters);
      }
      this._updateUI();
    };"""
new_update = """    const updateMapFilter = () => {
      if (activeFilters.size === 0) {
        this.map.setFilter(new Set([-1])); // none
      } else {
        this.map.setFilter(activeFilters);
      }
      this._updateUI();
    };"""
content = content.replace(old_update, new_update)

# 2. Check checkboxes by default and add to activeFilters
old_cb = """      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = sp.id;
      cb.addEventListener('change', (e) => {"""
new_cb = """      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = sp.id;
      cb.checked = true;
      activeFilters.add(sp.id);
      cb.addEventListener('change', (e) => {"""
content = content.replace(old_cb, new_cb)

with open(py_file, 'w') as f:
    f.write(content)
