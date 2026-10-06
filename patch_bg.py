import sys

py_file = 'bogong/index.html'
with open(py_file, 'r') as f:
    content = f.read()

start_marker = "<!-- Playback Controls -->"
end_marker = "<div class=\"attribution\">"

idx1 = content.find(start_marker)
idx2 = content.find(end_marker)

new_content = """<!-- Stats Bar -->
    <header id="stats-bar" class="glass hidden" style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div class="stat">
            <span class="stat-label">📅 DATE</span>
            <span class="stat-value" id="stat-date">—</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-label">
              <svg class="moth-icon" viewBox="0 0 24 24" stroke="none">
                <path d="M12 4c-1-2-4-2-4-2s1 1 2 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M12 4c1-2 4-2 4-2s-1 1-2 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <ellipse cx="12" cy="11" rx="2" ry="7" />
                <path d="M10 6C5 4 2 7 2 12c0 4 3 7 8 2V6z" opacity="0.9"/>
                <path d="M14 6c5-2 8 1 8 6 0 4-3 7-8 2V6z" opacity="0.9"/>
              </svg> BOGONG MOTH
            </span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">sightings</span>
          </div>
          <div class="stat-divider"></div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <a href="../" class="ctrl-btn home-nav-inline" title="Back to Visualisations" style="text-decoration: none;">🏠</a>
            <button id="btn-rewind" class="ctrl-btn" title="Restart (Home)">⏮</button>
            <button id="btn-play" class="ctrl-btn play-btn" title="Play / Pause (Space)">▶</button>
          </div>
        </div>
        <label for="mobile-toggle" class="mobile-toggle-btn" id="btn-settings">⚙️ Settings</label>
      </div>
      <div class="controls-row" style="margin-bottom: 2px;">
        <input type="range" id="scrubber" class="scrubber" min="0" max="100" value="0" aria-label="Timeline">
      </div>
    </header>

    <!-- Playback Controls -->
    <footer id="controls" class="glass hidden" style="margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px;">
        <div class="speed-ctrl" style="margin: 0;">
          <span style="font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.65);">SPEED</span>
          <input type="range" id="speed" min="1" max="10" value="10" step="1" aria-label="Speed" style="width: 70px;">
          <span id="speed-val" style="font-size: 11px;">10×</span>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <label class="fade-toggle" title="Fade old recordings">
            <input type="checkbox" id="fade-toggle" checked>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="fade-label">Fade</span>
          </label>
        </div>
      </div>
    </footer>
    
    """

content = content[:idx1] + new_content + content[idx2:]

with open(py_file, 'w') as f:
    f.write(content)
