with open('energy.html', 'r') as f:
    html = f.read()

old_header = '<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: rgba(255,255,255,0.65); margin-bottom: 10px;">FILTER BY STATE</div>'
new_header = """<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: rgba(255,255,255,0.65);">FILTER BY STATE</div>
        <div>
          <button id="btn-select-all" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 3px; font-size: 10px; padding: 2px 6px; cursor: pointer; margin-right: 4px;">All</button>
          <button id="btn-deselect-all" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 3px; font-size: 10px; padding: 2px 6px; cursor: pointer;">None</button>
        </div>
      </div>"""

html = html.replace(old_header, new_header)

with open('energy.html', 'w') as f:
    f.write(html)
