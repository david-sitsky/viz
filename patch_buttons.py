import sys

py_file = 'common/styles.css'
with open(py_file, 'r') as f:
    content = f.read()

# Make ctrl-btn uniform 32x32
content = content.replace("width: 28px; height: 28px;", "width: 32px; height: 32px;")
content = content.replace("font-size: 11px;", "font-size: 14px;", 1) # Only the first one inside .ctrl-btn

# Remove width/height/font overrides for play-btn
content = content.replace(".play-btn { width: 34px; height: 34px; font-size: 14px; background: #16a34a; color: #fff; }", ".play-btn { background: #16a34a; color: #fff; }")

# Remove width/height/font overrides for sound-btn
content = content.replace(".sound-btn { width: 34px; height: 34px; font-size: 14px; background: rgba(255,255,255,0.08); color: #a1a1aa; }", ".sound-btn { background: rgba(255,255,255,0.08); color: #a1a1aa; }")

# Also for Home button, it's a link using `.ctrl-btn`, but it might have text-decoration. I added `style="text-decoration: none;"`.
with open(py_file, 'w') as f:
    f.write(content)

