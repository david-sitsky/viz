import sys

py_file = 'christmas-beetle/js/app.js'
with open(py_file, 'r') as f:
    content = f.read()

old_btn_all = """    btnAll.addEventListener('click', () => {
      activeFilters = new Set(sorted.map(s => s.id));
      checkboxes.forEach(cb => cb.checked = true);
      updateMapFilter();
    });"""
new_btn_all = """    btnAll.addEventListener('click', () => {
      activeFilters = new Set(sorted.filter(s => s && s.scientific_name !== 'Unknown').map(s => s.id));
      checkboxes.forEach(cb => cb.checked = true);
      updateMapFilter();
    });"""
content = content.replace(old_btn_all, new_btn_all)

with open(py_file, 'w') as f:
    f.write(content)
