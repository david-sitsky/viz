import re

files = [
    'christmas-beetle/js/app.js',
    'frogid/js/app.js',
    'bogong/js/app.js',
    'energy/js/energy_app.js'
]

for fpath in files:
    with open(fpath, 'r') as f:
        content = f.read()

    # 1. Add import if not exists
    if "import { makeDraggable }" not in content:
        content = "import { makeDraggable } from '../common/js/draggable.js';\n" + content

    # 2. Add to closeBtn listener
    close_find = r"(closeBtn\.addEventListener\('click', \(\) => {\n\s*)(this\.dom\.hoverPanel\.classList\.add\('hidden'\);)"
    if not "this._isPopupDragged = false;" in content:
        content = re.sub(close_find, r"\1this._isPopupDragged = false;\n          \2", content)

    # 3. Add makeDraggable where hoverPanel is cached or controls are setup
    # A safe place is right after closeBtn listener is added.
    drag_setup = r"this\.dom\.hoverPanel\.classList\.add\('hidden'\);\n\s*}\);\n\s*}"
    if "makeDraggable(" not in content:
        content = re.sub(drag_setup, r"this.dom.hoverPanel.classList.add('hidden');\n        });\n      }\n      makeDraggable(this.dom.hoverPanel, this.dom.hoverPanel, () => { this._isPopupDragged = true; });", content)

    # 4. Wrap positioning logic in `if (!this._isPopupDragged) { ... }`
    # The positioning logic usually starts with `if (this._lastPopupRecordIdx !== recordIdx) {` or `this.dom.hoverPanel.style.position = 'fixed';`
    if 'energy_app' in fpath:
        pos_code = r"(this\.dom\.hoverPanel\.style\.position = 'fixed';\n\s*this\.dom\.hoverPanel\.style\.left = \(x \+ 15\) \+ 'px';\n\s*this\.dom\.hoverPanel\.style\.top = \(y \+ 15\) \+ 'px';\n\s*this\.dom\.hoverPanel\.style\.right = 'auto';)"
        content = re.sub(pos_code, r"if (!this._isPopupDragged) {\n      \1\n    }", content)
    else:
        # for christmas-beetle, frogid, bogong:
        # it is usually:
        # if (this._lastPopupRecordIdx !== recordIdx) {
        #   this.dom.hoverPanel.style.position = 'absolute';
        pos_code = r"(if \(this\._lastPopupRecordIdx !== recordIdx\) {\n\s*this\.dom\.hoverPanel\.style\.position = 'absolute';.*?this\._lastPopupRecordIdx = recordIdx;\n\s*})"
        content = re.sub(pos_code, r"if (!this._isPopupDragged) {\n      \1\n    }", content, flags=re.DOTALL)

    with open(fpath, 'w') as f:
        f.write(content)

