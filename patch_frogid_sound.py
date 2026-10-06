import sys

py_file = 'frogid/index.html'
with open(py_file, 'r') as f:
    content = f.read()

sound_btn_block = """          <div class="sound-btn-container" style="margin: 0;">
            <button id="btn-sound" class="ctrl-btn sound-btn" title="Toggle Sound (M)">🔇</button>
            <div id="sound-hint" class="sound-hint hidden">
              <div class="sound-hint-arrow"></div>
              <span>Let the frogs croak! 🔊</span>
              <button id="sound-hint-close" class="sound-hint-close" title="Dismiss">✕</button>
            </div>
          </div>
"""

# Remove sound block from old location
if sound_btn_block in content:
    content = content.replace(sound_btn_block, "")
else:
    print("Could not find sound block exactly!")
    
# Add sound block after btn-play
play_btn = '<button id="btn-play" class="ctrl-btn play-btn" title="Play / Pause (Space)">▶</button>'
new_play_btn = play_btn + '\n' + sound_btn_block.replace('          ', '            ')

content = content.replace(play_btn, new_play_btn)

with open(py_file, 'w') as f:
    f.write(content)

