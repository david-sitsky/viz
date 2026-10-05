import sys
css_file = 'common/styles.css'
with open(css_file, 'r') as f:
    content = f.read()

old_block = """/* Desktop: Show by default, hide when checked */
@media (min-width: 769px) {
  .energy-viz #mobile-toggle:checked ~ #top-left-panel #controls,
  .energy-viz #mobile-toggle:checked ~ #top-left-panel #filter-panel,
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #controls,
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #species-filter {
    display: none !important;
  }
}"""

new_block = """/* Desktop: Show by default, hide when checked */
@media (min-width: 769px) {
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #controls,
  .beetle-viz #mobile-toggle:checked ~ #top-left-panel #species-filter {
    display: none !important;
  }
}"""

content = content.replace(old_block, new_block)

with open(css_file, 'w') as f:
    f.write(content)
