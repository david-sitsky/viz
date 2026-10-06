import sys

js_file = 'christmas-beetle/js/app.js'
with open(js_file, 'r') as f:
    content = f.read()

# Add close listener
close_code = '''      this._setupControls();
      this._setupFilter();
      
      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dom.hoverPanel.classList.add('hidden');
        });
      }'''

content = content.replace('''      this._setupControls();
      this._setupFilter();''', close_code)

with open(js_file, 'w') as f:
    f.write(content)
