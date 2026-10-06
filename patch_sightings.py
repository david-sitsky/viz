import sys

def patch_cb():
    py_file = 'christmas-beetle/index.html'
    with open(py_file, 'r') as f:
        content = f.read()
    
    old_stat = """        <div class="stat">
            <span class="stat-label">🪲 OCCURRENCES</span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">recordings</span>
          </div>"""
    
    new_stat = """        <div class="stat" style="flex-direction: row; align-items: center; gap: 6px;">
            <span class="stat-label" style="font-size: 16px;">🪲</span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">recordings</span>
          </div>"""
    
    with open(py_file, 'w') as f:
        f.write(content.replace(old_stat, new_stat))

def patch_fg():
    py_file = 'frogid/index.html'
    with open(py_file, 'r') as f:
        content = f.read()
    
    old_stat = """        <div class="stat">
            <span class="stat-label">🐸 FROGID v7</span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">recordings</span>
          </div>"""
    
    new_stat = """        <div class="stat" style="flex-direction: row; align-items: center; gap: 6px;">
            <span class="stat-label" style="font-size: 16px;">🐸</span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">recordings</span>
          </div>"""
    
    with open(py_file, 'w') as f:
        f.write(content.replace(old_stat, new_stat))

def patch_bg():
    py_file = 'bogong/index.html'
    with open(py_file, 'r') as f:
        content = f.read()
    
    old_stat = """        <div class="stat">
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
          </div>"""
    
    new_stat = """        <div class="stat" style="flex-direction: row; align-items: center; gap: 6px;">
            <span class="stat-label" style="display: flex; align-items: center;">
              <svg class="moth-icon" viewBox="0 0 24 24" stroke="none" style="width: 24px; height: 24px;">
                <path d="M12 4c-1-2-4-2-4-2s1 1 2 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M12 4c1-2 4-2 4-2s-1 1-2 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <ellipse cx="12" cy="11" rx="2" ry="7" />
                <path d="M10 6C5 4 2 7 2 12c0 4 3 7 8 2V6z" opacity="0.9"/>
                <path d="M14 6c5-2 8 1 8 6 0 4-3 7-8 2V6z" opacity="0.9"/>
              </svg>
            </span>
            <span class="stat-value" id="stat-records">0</span>
            <span class="stat-sub">sightings</span>
          </div>"""
    
    with open(py_file, 'w') as f:
        f.write(content.replace(old_stat, new_stat))

patch_cb()
patch_fg()
patch_bg()
