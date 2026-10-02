import { loadData } from './energy_data.js?v=3';
import { EngineMap } from './energy_map.js?v=3';

class EngineApp {
  constructor() {
    this.data = null;
    this.map  = null;
    this.currentDay  = 0;
    this.playing     = false;
    this.speed       = 10;
    this.tickTimer   = null;
    this.dom = {};
  }

  async init() {
    this._cacheDom();
    try {
      this.data = await loadData(
        'data_energy/metadata.json?v=13',
        'data_energy/energy.bin?v=13',
        'energy-v13',
        [
          [17, 17, 17],    // 0: coal
          [244, 142, 27],  // 1: gas
          [69, 130, 180],  // 2: hydro
          [65, 118, 12],   // 3: wind
          [243, 199, 70],  // 4: commercial solar
          [248, 231, 28],  // 5: rooftop solar
        ],
        (phase, pct) => this._updateLoading(phase, pct),
      );
      
      this.facilities = await fetch('data_energy/facilities.json?v=13').then(r => r.json());
      this.facilityMap = new Map();
      for(let f of this.facilities) this.facilityMap.set(f.id, f);

      this.map = new EngineMap(
        'map-container',
        this.data,
        (recordIdx, x, y) => this._onHover(recordIdx, x, y)
      );

      this._setupControls();
      this._setupMapStyleSwitcher();
      this._setupGesturePrevention();
      this._setupHoverPanelClose();

      this._hideLoading();
      ['statsBar','controls','mapStyleSelector'].forEach(k => {
        if(this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      this._setDay(0);

    } catch (err) {
      console.error('Init failed:', err);
      this.dom.loadingStatus.textContent = `Error: ${err.message}`;
      this.dom.loadingStatus.style.color = '#f87171';
    }
  }

  _onHover(recordIdx, x, y) {
    if (this._hideTooltipTimeout) {
      clearTimeout(this._hideTooltipTimeout);
      this._hideTooltipTimeout = null;
    }
    
    if (recordIdx < 0) {
      this._hideTooltipTimeout = setTimeout(() => {
        if (this.dom && this.dom.tooltip) {
          this.dom.tooltip.classList.add('hidden');
        }
      }, 250);
      return;
    }
    const fId = this.data.facilityIds[recordIdx];
    const gen = this.data.generation[recordIdx];
    const catIdx = this.data.categoryIndices[recordIdx];
    const fac = this.facilityMap.get(fId);
    if (!fac) return;

    this.dom.hoverName.textContent = fac.name;
    this.dom.hoverType.textContent = fac.type.replace('_', ' ').toUpperCase();
    this.dom.hoverGen.textContent = Math.round(gen).toLocaleString() + ' MWh this month';
    
    // Set border color
    const c = this.data.palette[catIdx];
    this.dom.hoverPanel.style.borderLeftColor = `rgb(${c[0]},${c[1]},${c[2]})`;
    
    if (fac.oe_id) {
      this.dom.hoverLink.href = `https://openelectricity.org.au/facility/${fac.oe_id}`;
      this.dom.hoverLink.style.display = 'block';
    } else {
      this.dom.hoverLink.style.display = 'none';
    }
    
    this.dom.hoverPanel.classList.remove('hidden');
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
      btnRewind:        $('btn-rewind'),
      btnPlay:          $('btn-play'),
      scrubber:         $('scrubber'),
      speedSlider:      $('speed'),
      speedVal:         $('speed-val'),
      dayInfo:          $('day-info'),
      todayInfo:        $('today-info'),
      fadeToggle:       $('fade-toggle'),
      mapStyleSelector: $('map-style-selector'),
      hoverPanel:       $('hover-panel'),
      hoverName:        $('hover-name'),
      hoverType:        $('hover-type'),
      hoverGen:         $('hover-gen'),
      hoverLink:        $('hover-link'),
    };
  }

  _setupHoverPanelClose() {
    this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {
      this.dom.hoverPanel.classList.add('hidden');
      this.map._lastHoveredRecord = -1;
    });
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
    }, 500);
  }

  _setupControls() {
    this.dom.btnRewind.addEventListener('click', () => {
      this._pause();
      this._setDay(0);
    });
    this.dom.btnPlay.addEventListener('click', () => this._togglePlay());

    this.dom.scrubber.max = this.data.metadata.totalDays - 1;
    this.dom.scrubber.addEventListener('input', () => {
      this._pause();
      this._setDay(parseInt(this.dom.scrubber.value, 10));
    });

    this.dom.speedSlider.addEventListener('input', () => {
      this.speed = parseInt(this.dom.speedSlider.value, 10);
      this.dom.speedVal.textContent = `${this.speed}×`;
      if (this.playing) { clearTimeout(this.tickTimer); this._scheduleTick(); }
    });

    this.dom.fadeToggle.addEventListener('change', () =>
      this.map.setFadeMode(this.dom.fadeToggle.checked));

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const max = this.data.metadata.totalDays - 1;
      switch (e.code) {
        case 'Space':      e.preventDefault(); this._togglePlay(); break;
        case 'ArrowLeft':  e.preventDefault(); this._pause(); this._setDay(Math.max(0,   this.currentDay - (e.shiftKey?7:1))); break;
        case 'ArrowRight': e.preventDefault(); this._pause(); this._setDay(Math.min(max, this.currentDay + (e.shiftKey?7:1))); break;
        case 'Home':       e.preventDefault(); this._pause(); this._setDay(0); break;
        case 'End':        e.preventDefault(); this._pause(); this._setDay(max); break;
        case 'ArrowUp':    e.preventDefault(); this.speed = Math.min(10, this.speed+1); this.dom.speedSlider.value=this.speed; this.dom.speedVal.textContent=`${this.speed}×`; break;
        case 'ArrowDown':  e.preventDefault(); this.speed = Math.max(1,  this.speed-1); this.dom.speedSlider.value=this.speed; this.dom.speedVal.textContent=`${this.speed}×`; break;
      }
    });
  }

  _setupGesturePrevention() {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        e.preventDefault();
      }, { passive: false });
    });
  }

  _togglePlay() { this.playing ? this._pause() : this._play(); }
  _play() {
    if (this.currentDay >= this.data.metadata.totalDays - 1) this._setDay(0);
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
    if (this.currentDay >= this.data.metadata.totalDays - 1) { this._pause(); return; }
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
    d.setMonth(d.getMonth() + this.currentDay);
    this.dom.statDate.textContent   = d.toLocaleDateString('en-AU', { month:'long', year:'numeric' });

    const { generation, categoryIndices, palette, dayOffsets } = this.data;
    const dayStart = dayOffsets[this.currentDay] ?? 0;
    const endIdx = (this.currentDay + 1 < dayOffsets.length) ? dayOffsets[this.currentDay + 1] : metadata.recordCount;
    
    // Accumulate power by category
    const catTotals = new Array(metadata.fuelTypes.length).fill(0);
    let maxTotal = 0;
    for (let i = dayStart; i < endIdx; i++) {
        const catIdx = categoryIndices[i];
        if (catIdx >= 0 && catIdx < catTotals.length) {
            catTotals[catIdx] += generation[i];
        }
    }
    
    // Build array of objects for sorting
    let chartData = [];
    for (let i = 0; i < metadata.fuelTypes.length; i++) {
        if (catTotals[i] > maxTotal) maxTotal = catTotals[i];
        chartData.push({
            name: metadata.fuelTypes[i],
            total: catTotals[i],
            color: palette[i]
        });
    }
    
    // Sort highest to lowest
    chartData.sort((a, b) => b.total - a.total);
    
    // Render HTML
    if (!this.dom.barChart) this.dom.barChart = document.getElementById('bar-chart');
    if (this.dom.barChart) {
        let html = '';
        for (const item of chartData) {
            const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            const label = item.name.replace('_', ' ');
            const valStr = Math.round(item.total).toLocaleString() + ' MWh';
            
            html += `
              <div class="bar-row">
                <div class="bar-label">${label}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background: ${colorStr};"></div>
                </div>
                <div class="bar-value">${valStr}</div>
              </div>
            `;
        }
        this.dom.barChart.innerHTML = html;
        document.getElementById('bottom-panel').classList.remove('hidden');
    }

    const counts = this.map.getVisibleCounts();
    this.dom.statRecords.textContent = counts.total.toLocaleString() + ' records';
    this.dom.todayInfo.textContent   = `${counts.today.toLocaleString()} facilities`;
    this.dom.dayInfo.textContent     = `Month ${(this.currentDay+1).toLocaleString()} of ${metadata.totalDays.toLocaleString()}`;
    this.dom.scrubber.value          = this.currentDay;
  }

  _setupMapStyleSwitcher() {
    if (!this.dom.mapStyleSelector) return;
    this.dom.mapStyleSelector.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.mapStyleSelector.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.map.setMapStyle(btn.dataset.style);
      });
    });
  }
}

const app = new EngineApp();
app.init();
