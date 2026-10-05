import { loadData } from '../../common/js/engine_data.js?v=2';
import { EngineMap } from '../../common/js/engine_map.js?v=2';

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
    
    // Auto-assigned colors for species
    this.palette = [];
  }

  async init() {
    this._cacheDom();
    try {
      // 1. Fetch species info
      const speciesRes = await fetch('data/species_info.json');
      this.speciesInfo = await speciesRes.json();
      
      // Build palette dynamically
      for (let i = 0; i < this.speciesInfo.length; i++) {
        // HSL to RGB basic distinct colors
        const hue = (i * 137.508) % 360; 
        this.palette.push(this._hslToRgb(hue / 360, 0.7, 0.6));
      }

      this.data = await loadData(
        'data/metadata.json',
        'data/data.bin',
        'ala-v1',
        this.palette,
        (phase, pct) => this._updateLoading(phase, pct),
      );

      this.map = new EngineMap(
        'map-container',
        this.data,
        (recordIdx) => this._showHoverPopup(recordIdx)
      );

      this._setupControls();
      this._setupFilter();

      this._hideLoading();
      ['statsBar','controls','topPanel'].forEach(k => {
        if(this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      this._setDay(0);

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
      dayInfo:          $('day-info'),
      todayInfo:        $('today-info'),
      
      // Hover Panel
      hoverPanel:       $('hover-panel'),
      hoverImg:         $('hover-img'),
      hoverCommon:      $('hover-common'),
      hoverSci:         $('hover-sci'),
      hoverLink:        $('hover-link'),
      
      // Filter
      speciesFilter:    $('species-filter'),
      filterInput:      $('filter-input'),
      filterDropdown:   $('filter-dropdown'),
      filterPills:      $('filter-pills'),
      filterClear:      $('filter-clear'),
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
  
  _showHoverPopup(recordIdx) {
    if (recordIdx < 0) return;
    const catIdx = this.data.categoryIndices[recordIdx];
    const sp = this.speciesInfo[catIdx];
    if (!sp) return;

    this.dom.hoverCommon.textContent = sp.common_name || sp.scientific_name;
    if (this.dom.hoverSci) this.dom.hoverSci.textContent = sp.scientific_name;
    
    if (sp.image) {
      this.dom.hoverImg.src = sp.image;
      this.dom.hoverImg.style.display = 'block';
    } else {
      this.dom.hoverImg.style.display = 'none';
    }
    
    this.dom.hoverLink.href = `https://bie.ala.org.au/species/${encodeURIComponent(sp.scientific_name)}`;
    this.dom.hoverPanel.classList.remove('hidden');
  }

  _setupFilter() {
    let activeFilters = new Set();
    const updateMapFilter = () => {
      if (activeFilters.size === 0) {
        this.map.setFilter(new Set()); // all
      } else {
        this.map.setFilter(activeFilters);
      }
      this._updateUI();
    };

    const addFilter = (sp) => {
      activeFilters.add(sp.id);
      this.dom.filterInput.value = '';
      this.dom.filterDropdown.classList.add('hidden');
      renderPills();
      updateMapFilter();
    };

    const removeFilter = (id) => {
      activeFilters.delete(id);
      renderPills();
      updateMapFilter();
    };

    const renderPills = () => {
      this.dom.filterPills.innerHTML = '';
      if (activeFilters.size > 0) this.dom.filterClear.classList.remove('hidden');
      else this.dom.filterClear.classList.add('hidden');

      for (const id of activeFilters) {
        const sp = this.speciesInfo[id];
        const pill = document.createElement('div');
        pill.className = 'filter-pill';
        pill.innerHTML = `<span>${sp.common_name || sp.scientific_name}</span><button class="remove" title="Remove filter">✕</button>`;
        pill.querySelector('.remove').addEventListener('click', () => removeFilter(id));
        this.dom.filterPills.appendChild(pill);
      }
    };

    this.dom.filterClear.addEventListener('click', () => {
      activeFilters.clear();
      renderPills();
      updateMapFilter();
    });

    this.dom.filterInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      if (!q) {
        this.dom.filterDropdown.classList.add('hidden');
        return;
      }
      const matches = this.speciesInfo.filter(s => 
        s && !activeFilters.has(s.id) && 
        ((s.common_name && s.common_name.toLowerCase().includes(q)) || 
         (s.scientific_name && s.scientific_name.toLowerCase().includes(q)))
      ).slice(0, 10);

      if (matches.length > 0) {
        this.dom.filterDropdown.innerHTML = '';
        matches.forEach(m => {
          const div = document.createElement('div');
          div.className = 'filter-dropdown-item';
          div.innerHTML = `<strong>${m.common_name || m.scientific_name}</strong> <em>${m.scientific_name}</em>`;
          div.addEventListener('click', () => addFilter(m));
          this.dom.filterDropdown.appendChild(div);
        });
        this.dom.filterDropdown.classList.remove('hidden');
      } else {
        this.dom.filterDropdown.classList.add('hidden');
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.dom.speciesFilter.contains(e.target) && e.target.id !== 'hover-panel' && !this.dom.hoverPanel.contains(e.target)) {
        this.dom.filterDropdown.classList.add('hidden');
        if (e.target.dataset.action === 'close-hover') {
          this.dom.hoverPanel.classList.add('hidden');
        }
      }
    });
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
    this.map.setDay(day);
    this._updateUI();
  }
  _updateUI() {
    const { metadata } = this.data;
    const d = new Date(metadata.startDate + 'T00:00:00');
    d.setDate(d.getDate() + this.currentDay);
    if(this.dom.statDate) this.dom.statDate.textContent = d.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
    
    const counts = this.map.getVisibleCounts();
    if(this.dom.statRecords) this.dom.statRecords.textContent = counts.total.toLocaleString();
    if(this.dom.todayInfo) this.dom.todayInfo.textContent = `${counts.today.toLocaleString()} today`;
    if(this.dom.dayInfo) this.dom.dayInfo.textContent = `Day ${(this.currentDay+1).toLocaleString()} of ${metadata.totalDays.toLocaleString()}`;
    
    this.dom.scrubber.value = this.currentDay;
  }
}

const app = new App();
app.init();
