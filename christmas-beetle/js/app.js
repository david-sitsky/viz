import { makeDraggable } from '../../common/js/draggable.js';
import { loadData } from '../../common/js/engine_data.js?v=202610070112';
import { EngineMap } from '../../common/js/engine_map.js?v=202610070112';

class App {
  constructor() {
    this.data = null;
    this.map = null;
    this.speciesInfo = [];
    this.currentDay = 0;
    this.playing = false;
    this.speed = 10;
    this.tickTimer = null;
    this.dom = {};
    
    this.palette = [];
  }

  async init() {
    this._cacheDom();
    try {
      const speciesRes = await fetch('data/species_info.json');
      this.speciesInfo = await speciesRes.json();
      
      for (let i = 0; i < this.speciesInfo.length; i++) {
        const hue = (i * 137.508) % 360; 
        this.palette.push(this._hslToRgb(hue / 360, 0.7, 0.6));
      }

      this.data = await loadData(
        'data/metadata.json',
        'data/data.bin',
        'ala-v2',
        this.palette,
        (phase, pct) => this._updateLoading(phase, pct),
      );

      this.map = new EngineMap(
        'map-container',
        this.data,
        (recordIdx, info) => this._showHoverPopup(recordIdx, info)
      );

      this._setupControls();
      this._setupFilter();
      
      const closeBtn = this.dom.hoverPanel.querySelector('.panel-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this._isPopupDragged = false;
          this.dom.hoverPanel.classList.add('hidden');
        });
      }
      makeDraggable(this.dom.hoverPanel, this.dom.hoverPanel, () => { this._isPopupDragged = true; });
      
      this.dom.hoverPanel.addEventListener('mouseenter', () => {
        this._isHoveringPopup = true;
        if (this._hideTooltipTimeout) {
          clearTimeout(this._hideTooltipTimeout);
          this._hideTooltipTimeout = null;
        }
      });
      this.dom.hoverPanel.addEventListener('mouseleave', () => {
        this._isHoveringPopup = false;
        this._showHoverPopup(-1, null);
      });

      this._hideLoading();
      ['statsBar','controls','topPanel'].forEach(k => {
        if(this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      this._setDay(0);

      // Initialize Christmas Beetle Tour
      if (window.driver && window.driver.js && !localStorage.getItem('hasSeenBeetleTour')) {
        const d = window.driver.js.driver({
          showProgress: true,
          popoverClass: 'driverjs-theme',
          onHighlightStarted: (element, step, options) => {
            const hiddenEls = ['#chart-view-mode', '#speed', '#species-filter'];
            if (hiddenEls.includes(step.element)) {
              const toggle = document.getElementById('mobile-toggle');
              if (toggle && !toggle.checked) toggle.checked = true;
            }
          },
          steps: [
            { element: '.viz-title', popover: { title: 'Welcome', description: 'This interactive map animates verified sightings of the iconic Christmas Beetle across Australia, helping track population numbers and species distribution during their summer emergence.', side: 'bottom', align: 'start' } },
            { element: '#btn-play', popover: { title: 'Play the Timeline', description: 'Click play to start animating through the sightings.', side: 'bottom', align: 'start' } },
            { element: '#speed', popover: { title: 'Adjust Speed', description: 'Control how fast the timeline progresses using this slider.', side: 'top', align: 'start' } },
            { element: '#species-filter', popover: { title: 'Filter by Species', description: 'Search and select specific beetle species to isolate their sightings.', side: 'right', align: 'start' } },
            { popover: { title: 'Get Involved', description: 'Participate in the <a href="https://invertebratesaustralia.org/christmas-beetles" target="_blank">Christmas Beetle Count</a> from Invertebrates Australia.' } }
          ],
          onDestroyStarted: () => {
            localStorage.setItem('hasSeenBeetleTour', 'true');
            const toggle = document.getElementById('mobile-toggle');
            if (toggle && toggle.checked) toggle.checked = false;
            d.destroy();
          }
        });
        d.drive();
      }

    } catch (err) {
      console.error('Init failed:', err);
      this.dom.loadingStatus.textContent = `Error: ${err.message}`;
      this.dom.loadingStatus.style.color = '#f87171';
    }
  }

  _hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  _cacheDom() {
    const $ = id => document.getElementById(id);
    this.dom = {
      loadingOverlay:   $('loading-overlay'),
      loadingStatus:    $('loading-status'),
      progressFill:     $('progress-fill'),
      statsBar:         $('stats-bar'),
      statDate:         $('stat-date'),
      statRecords:      $('stat-records'),
      controls:         $('controls'),
      topPanel:         $('top-left-panel'),
      btnRewind:        $('btn-rewind'),
      btnPlay:          $('btn-play'),
      scrubber:         $('scrubber'),
      speedSlider:      $('speed'),
      speedVal:         $('speed-val'),


      fadeToggle:       $('fade-toggle'),
      mapStyleSelector: $('map-style-selector'),
      
      hoverPanel:       $('hover-panel'),
      hoverImg:         $('hover-img'),
      hoverCommon:      $('hover-common'),
      hoverSci:         $('hover-sci'),
      hoverDate:        $('hover-date'),
      hoverLink:        $('hover-link'),
      
      filterPreview:    $('filter-preview'),
      filterPreviewImg: $('filter-preview-img'),
      speciesFilter:    $('species-filter'),
      speciesList:      $('species-list'),
    };
  }

  _updateLoading(phase, pct) {
    const { loadingStatus: s, progressFill: p } = this.dom;
    switch (phase) {
      case 'cache-check': s.textContent = 'Checking local cache...';                          p.style.width='5%';               break;
      case 'cache-hit':   s.textContent = '✓ Loaded from cache';                              p.style.width='100%';             break;
      case 'download':    s.textContent = `Downloading data... ${Math.round(pct*100)}%`;      p.style.width=`${Math.round(pct*100)}%`; break;
      case 'parse':       s.textContent = 'Processing records...';                            p.style.width='100%';             break;
    }
  }

  _hideLoading() {
    this.dom.loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
      this.dom.loadingOverlay.classList.add('hidden');
      if (this.map && this.map.map) {
        this.map.map.resize();
        this.map._updateLayers();
      }
      this.dom.speciesFilter.classList.remove('hidden');
    }, 500);
  }
  
  _showHoverPopup(recordIdx, info) {
    if (recordIdx < 0 || !info) {
      if (this._isHoveringPopup) return;
      if (this._hideTooltipTimeout) clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = setTimeout(() => {
        if (this.dom && this.dom.hoverPanel) {
          this.dom.hoverPanel.classList.add('faded');
          setTimeout(() => {
            if (this.dom.hoverPanel.classList.contains('faded')) {
              this.dom.hoverPanel.classList.add('hidden');
            }
          }, 500); // Wait for CSS transition
        }
      }, 500);
      return;
    }

    if (this._hideTooltipTimeout) {
      clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = null;
    }

    const catIdx = this.data.categoryIndices[recordIdx];
    const sp = this.speciesInfo[catIdx];
    if (!sp) return;

    if (sp.common_name && sp.common_name.trim() !== "") {
      this.dom.hoverCommon.textContent = sp.common_name;
      this.dom.hoverSci.textContent = sp.scientific_name;
      this.dom.hoverSci.style.display = 'block';
    } else {
      this.dom.hoverCommon.textContent = sp.scientific_name;
      this.dom.hoverSci.style.display = 'none';
    }
    
    // Add colour accent
    const col = this.palette[catIdx];
    this.dom.hoverPanel.style.borderLeft = `4px solid rgb(${col[0]},${col[1]},${col[2]})`;
    
    // Find Date
    let d = new Date(this.data.metadata.startDate + 'T00:00:00');
    let dayOff = 0;
    for (let i = 0; i < this.data.metadata.dayOffsets.length; i++) {
      if (recordIdx < this.data.metadata.dayOffsets[i]) break;
      dayOff = i;
    }
    d.setDate(d.getDate() + dayOff);
    if (this.dom.hoverDate) this.dom.hoverDate.textContent = d.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
    
    if (sp.image) {
      this.dom.hoverImg.src = sp.image;
      this.dom.hoverImg.style.display = 'block';
    } else {
      this.dom.hoverImg.style.display = 'none';
    }
    
    this.dom.hoverLink.href = `https://bie.ala.org.au/species/${encodeURIComponent(sp.scientific_name)}`;
    
    if (!this._isPopupDragged) {
      if (this._lastPopupRecordIdx !== recordIdx) {
      this.dom.hoverPanel.style.position = 'absolute';
      this.dom.hoverPanel.style.top = (info.y + 15) + 'px';
      this.dom.hoverPanel.style.left = (info.x + 15) + 'px';
      this.dom.hoverPanel.style.transform = 'none';
      this.dom.hoverPanel.style.right = 'auto';
      this.dom.hoverPanel.style.bottom = 'auto';
      this._lastPopupRecordIdx = recordIdx;
    }
    }
    
    // Clear inline pointerEvents if any was left from old code
    this.dom.hoverPanel.style.pointerEvents = '';
    this.dom.hoverPanel.classList.remove('hidden', 'faded');
  }

  _setupFilter() {
    let activeFilters = new Set();
    const updateMapFilter = () => {
      if (activeFilters.size === 0) {
        this.map.setFilter(new Set([-1])); // none
      } else {
        this.map.setFilter(activeFilters);
      }
      this._updateUI();
    };

    this.dom.speciesList.innerHTML = '';
    
    // Add Select All / None buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';
    btnRow.style.marginBottom = '10px';
    
    const btnAll = document.createElement('button');
    btnAll.textContent = 'Select All';
    btnAll.className = 'ctrl-btn';
    btnAll.style.flex = '1';
    btnAll.style.fontSize = '12px';
    
    const btnNone = document.createElement('button');
    btnNone.textContent = 'Select None';
    btnNone.className = 'ctrl-btn';
    btnNone.style.flex = '1';
    btnNone.style.fontSize = '12px';
    
    btnRow.appendChild(btnAll);
    btnRow.appendChild(btnNone);
    this.dom.speciesList.appendChild(btnRow);

    const sorted = [...this.speciesInfo].filter(s => s).sort((a,b) => (b.count || 0) - (a.count || 0));
    
    const checkboxes = [];
    
    btnAll.addEventListener('click', () => {
      activeFilters = new Set(sorted.filter(s => s && s.scientific_name !== 'Unknown').map(s => s.id));
      checkboxes.forEach(cb => cb.checked = true);
      updateMapFilter();
    });
    
    btnNone.addEventListener('click', () => {
      activeFilters.clear();
      checkboxes.forEach(cb => cb.checked = false);
      updateMapFilter();
    });

    for (const sp of sorted) {
      if (!sp || sp.scientific_name === 'Unknown') continue;
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.cursor = 'pointer';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = sp.id;
      cb.checked = true;
      activeFilters.add(sp.id);
      cb.addEventListener('change', (e) => {
        if (e.target.checked) activeFilters.add(sp.id);
        else activeFilters.delete(sp.id);
        updateMapFilter();
      });
      checkboxes.push(cb);
      row.appendChild(cb);
      
      if (sp.image) {
        const img = document.createElement('img');
        img.src = sp.image;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        
        img.addEventListener('mouseenter', (e) => {
          this.dom.filterPreviewImg.src = sp.image.replace('square', 'medium');
          this.dom.filterPreview.classList.remove('hidden');
          const rect = img.getBoundingClientRect();
          this.dom.filterPreview.style.left = (rect.right + 15) + 'px';
          this.dom.filterPreview.style.top = (rect.top - 50) + 'px';
        });
        img.addEventListener('mouseleave', () => {
          this.dom.filterPreview.classList.add('hidden');
        });
        
        row.appendChild(img);
      } else {
        const img = document.createElement('div');
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.backgroundColor = 'rgba(255,255,255,0.1)';
        img.style.borderRadius = '4px';
        row.appendChild(img);
      }
      
      const text = document.createElement('div');
      text.style.flex = '1';
      text.style.lineHeight = '1.2';
      
      const col = this.palette[sp.id];
      const colorDot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(${col[0]},${col[1]},${col[2]});margin-right:4px;"></span>`;
      
      if (sp.common_name && sp.common_name.trim() !== "") {
        text.innerHTML = `<div style="font-size:12px; font-weight:bold;">${colorDot}${sp.common_name}</div>
                          <div style="font-size:10px; opacity:0.7;">${sp.scientific_name} • ${sp.count || 0} obs</div>`;
      } else {
        text.innerHTML = `<div style="font-size:12px; font-weight:bold;">${colorDot}${sp.scientific_name}</div>
                          <div style="font-size:10px; opacity:0.7;">${sp.count || 0} obs</div>`;
      }
      row.appendChild(text);
      
      this.dom.speciesList.appendChild(row);
    }
  }

  _setupControls() {
    this.dom.btnRewind.addEventListener('click', () => {
      this._pause();
      this._setDay(0);
    });
    this.dom.btnPlay.addEventListener('click', () => this._togglePlay());

    this.dom.scrubber.max = this.data.metadata.dayOffsets.length - 1;
    this.dom.scrubber.addEventListener('input', () => {
      this._pause();
      this._setDay(parseInt(this.dom.scrubber.value, 10));
    });

    this.dom.speedSlider.addEventListener('input', () => {
      this.speed = parseInt(this.dom.speedSlider.value, 10);
      this.dom.speedVal.textContent = `${this.speed}×`;
      if (this.playing) { clearTimeout(this.tickTimer); this._scheduleTick(); }
    });
    
    if (this.dom.fadeToggle) {
      this.dom.fadeToggle.addEventListener('change', () => {
        if (this.map) this.map.setFadeMode(this.dom.fadeToggle.checked);
      });
    }

    if (this.dom.mapStyleSelector) {
      this.dom.mapStyleSelector.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.dom.mapStyleSelector.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.map) this.map.setMapStyle(btn.dataset.style);
        });
      });
    }
  }

  _togglePlay() { this.playing ? this._pause() : this._play(); }
  _play() {
    if (this.currentDay >= this.data.metadata.dayOffsets.length - 1) this._setDay(0);
    this.playing = true;
    this.dom.btnPlay.textContent = '⏸';
    this._scheduleTick();
  }
  _pause() {
    this.playing = false;
    this.dom.btnPlay.textContent = '▶';
    clearTimeout(this.tickTimer); this.tickTimer = null;
  }
  _scheduleTick() {
    if (!this.playing) return;
    const ms = Math.max(16, Math.round(600 * Math.pow(0.65, this.speed - 1)));
    this.tickTimer = setTimeout(() => this._tick(), ms);
  }
  _tick() {
    if (!this.playing) return;
    if (this.currentDay >= this.data.metadata.dayOffsets.length - 1) { this._pause(); return; }
    this._setDay(this.currentDay + 1);
    this._scheduleTick();
  }
  _setDay(day) {
    this.currentDay = day;
    if (this.map) this.map.setDay(day);
    this._updateUI();
  }
  _updateUI() {
    const { metadata } = this.data;
    const d = new Date(metadata.startDate + 'T00:00:00');
    d.setDate(d.getDate() + this.currentDay);
    if(this.dom.statDate) this.dom.statDate.textContent = d.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
    
    const counts = this.map.getVisibleCounts();
    if(this.dom.statRecords) this.dom.statRecords.textContent = counts.total.toLocaleString();
    
    this.dom.scrubber.value = this.currentDay;
  }
}

const app = new App();
window.app = app;
app.init();
