import sys

py_file = 'common/styles.css'
with open(py_file, 'r') as f:
    content = f.read()

# Remove the old toggle logic
old_toggle_logic = """  /* Mobile: Hide by default, show when checked */
  .energy-viz #mobile-toggle:not(:checked) ~ #top-left-panel #controls,
  .energy-viz #mobile-toggle:not(:checked) ~ #top-left-panel #filter-panel,
  .beetle-viz #mobile-toggle:not(:checked) ~ #top-left-panel #controls,
  .beetle-viz #mobile-toggle:not(:checked) ~ #top-left-panel #species-filter {
    display: none !important;
  }
}

/* Desktop: Show by default, hide when checked */
@media (min-width: 769px) {
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #controls,
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #species-filter {
    display: none !important;
  }
}"""

new_toggle_logic = """}

/* Unified Settings Toggle: Hide advanced options (controls/filters) by default */
#mobile-toggle:not(:checked) ~ #top-left-panel #controls,
#mobile-toggle:not(:checked) ~ #top-left-panel #species-filter,
#mobile-toggle:not(:checked) ~ #top-left-panel #filter-panel {
  display: none !important;
}"""

content = content.replace(old_toggle_logic, new_toggle_logic)

with open(py_file, 'w') as f:
    f.write(content)
