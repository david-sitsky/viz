import sys

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    target = "popoverClass: 'driverjs-theme',"
    replacement = """popoverClass: 'driverjs-theme',
          onHighlightStarted: (element, step, options) => {
            const hiddenEls = ['#chart-view-mode', '#speed', '#filter-input'];
            if (hiddenEls.includes(step.element)) {
              const toggle = document.getElementById('mobile-toggle');
              if (toggle && !toggle.checked) toggle.checked = true;
            }
          },"""
          
    if target in content and "onHighlightStarted:" not in content:
        content = content.replace(target, replacement)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

patch_file('energy/js/energy_app.js')
patch_file('bogong/js/app.js')
patch_file('frogid/js/app.js')
