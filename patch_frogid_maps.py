import sys

py_file = 'frogid/index.html'
with open(py_file, 'r') as f:
    content = f.read()

old_controls = """    <footer id="controls" class="glass hidden" style="margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px;">
        <div class="speed-ctrl" style="margin: 0;">
          <span style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.65);">SPEED</span>
          <input type="range" id="speed" min="1" max="10" value="10" step="1" aria-label="Speed" style="width: 70px;">
          <span id="speed-val" style="font-size: 11px;">10×</span>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="sound-btn-container" style="margin: 0;">
            <button id="btn-sound" class="ctrl-btn sound-btn" title="Toggle Sound (M)">🔇</button>
            <div id="sound-hint" class="sound-hint hidden">
              <div class="sound-hint-arrow"></div>
              <span>Let the frogs croak! 🔊</span>
              <button id="sound-hint-close" class="sound-hint-close" title="Dismiss">✕</button>
            </div>
          </div>
          <label class="fade-toggle" title="Fade old recordings">
            <input type="checkbox" id="fade-toggle" checked>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="fade-label">Fade</span>
          </label>
          <div id="map-style-selector" class="style-selector-inline">
            <button class="style-btn active" data-style="dark" title="Dark">🌙</button>
            <button class="style-btn" data-style="streets" title="Streets">🗺️</button>
            <button class="style-btn" data-style="satellite" title="Satellite">🛰️</button>
          </div>
        </div>
      </div>
    </footer>"""

new_controls = """    <footer id="controls" class="glass hidden" style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div class="speed-ctrl" style="margin: 0;">
          <span style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.65);">SPEED</span>
          <input type="range" id="speed" min="1" max="10" value="10" step="1" aria-label="Speed" style="width: 70px;">
          <span id="speed-val" style="font-size: 11px;">10×</span>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="sound-btn-container" style="margin: 0;">
            <button id="btn-sound" class="ctrl-btn sound-btn" title="Toggle Sound (M)">🔇</button>
            <div id="sound-hint" class="sound-hint hidden">
              <div class="sound-hint-arrow"></div>
              <span>Let the frogs croak! 🔊</span>
              <button id="sound-hint-close" class="sound-hint-close" title="Dismiss">✕</button>
            </div>
          </div>
          <label class="fade-toggle" title="Fade old recordings">
            <input type="checkbox" id="fade-toggle" checked>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="fade-label">Fade</span>
          </label>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; align-items: center;">
        <div id="map-style-selector" class="style-selector-inline">
          <button class="style-btn active" data-style="dark" title="Dark">🌙</button>
          <button class="style-btn" data-style="streets" title="Streets">🗺️</button>
          <button class="style-btn" data-style="satellite" title="Satellite">🛰️</button>
        </div>
      </div>
    </footer>"""

content = content.replace(old_controls, new_controls)
with open(py_file, 'w') as f:
    f.write(content)
