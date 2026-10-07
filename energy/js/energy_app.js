import { makeDraggable } from '../../common/js/draggable.js';
import { loadData } from './energy_data.js?v=202610070544';
import { EngineMap } from './energy_map.js?v=202610070544';

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
        'data/metadata.json?v=23',
        'data/energy.bin?v=23',
        'energy-v23',
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
      
      this.facilities = await fetch('data/facilities.json?v=23').then(r => r.json());
      this.facilityMap = new Map();
      for(let f of this.facilities) this.facilityMap.set(f.id, f);
      
      this.statesGeojson = await fetch('data/states.geojson?v=1').then(r => r.json());

      this.map = new EngineMap(
        'map-container',
        this.data,
        (recordIdx, x, y) => this._onHover(recordIdx, x, y),
        this.statesGeojson
      );

      this.map.delegate = this;
      this._setupControls();
      this._setupGesturePrevention();
      this._setupHoverPanelClose();

      this._hideLoading();
      ['statsBar','controls','mapStyleSelector','filterPanel'].forEach(k => {
        if(this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      
      // Setup state filter
      this.selectedStates = new Set();
      const states = new Set();
      for (const fac of this.facilityMap.values()) {
          if (fac.state) states.add(fac.state);
      }
      
      const sortedStates = Array.from(states).sort();
      sortedStates.forEach(s => this.selectedStates.add(s));
      
      
      const filterContent = document.getElementById('filter-content');
      
      if (filterContent) {
          let html = '';
          sortedStates.forEach(s => {
              html += `<label><input type="checkbox" value="${s}" checked> ${s}</label>`;
          });
          filterContent.innerHTML = html;
          filterContent.addEventListener('change', (e) => {
              if (e.target.type === 'checkbox') {
                  if (e.target.checked) this.selectedStates.add(e.target.value);
                  else this.selectedStates.delete(e.target.value);
                  
                  
                  this._absoluteMaxTotal = undefined;
                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
                  this._updateUI();
              }
          });
          
          const updateAllStates = (checked) => {
              const checkboxes = filterContent.querySelectorAll('input[type="checkbox"]');
              checkboxes.forEach(cb => {
                  cb.checked = checked;
                  if (checked) this.selectedStates.add(cb.value);
                  else this.selectedStates.delete(cb.value);
              });
              
              if (this.map && this.map.applyStateFilter) {
                  this.map.applyStateFilter(this.facilityMap, this.selectedStates);
              }
              this._absoluteMaxTotal = undefined;
              this._updateUI();
          };
          
          const btnAll = document.getElementById('btn-select-all');
          const btnNone = document.getElementById('btn-deselect-all');
          if (btnAll) btnAll.addEventListener('click', () => updateAllStates(true));
          if (btnNone) btnNone.addEventListener('click', () => updateAllStates(false));
          
          }
          this.rooftopMode = 'centroid';
          const rooftopSelect = document.getElementById('rooftop-mode');
          if (rooftopSelect) {
              rooftopSelect.addEventListener('change', (e) => {
                  this.rooftopMode = e.target.value;
                  if (this.map && this.map.applyStateFilter) {
                      this.map.applyStateFilter(this.facilityMap, this.selectedStates);
                  }
              });
          }
      if (this.map && this.map.applyStateFilter) {
          this.map.applyStateFilter(this.facilityMap, this.selectedStates);
      }
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
      if (this._isHoveringPopup) return;
      this._hideTooltipTimeout = setTimeout(() => {
        if (this.dom && this.dom.hoverPanel) {
          this.dom.hoverPanel.classList.add('faded');
        }
      }, 1500);
      return;
    }
    const fId = this.data.facilityIds[recordIdx];
    const gen = this.data.generation[recordIdx];
    const catIdx = this.data.categoryIndices[recordIdx];
    const fac = this.facilityMap.get(fId);
    if (!fac) return;

    this.dom.hoverName.textContent = fac.name;
    this.dom.hoverType.textContent = fac.type.replace('_', ' ').toUpperCase();
    this.dom.hoverCap.textContent = fac.capacity_mw > 0 ? ('Capacity: ' + fac.capacity_mw + ' MW') : 'Capacity: N/A';
    this.dom.hoverGen.textContent = 'Produced: ' + Math.round(gen / 1000).toLocaleString() + ' GWh this day';
    
    // Set border color
    const c = this.data.palette[catIdx];
    this.dom.hoverPanel.style.borderLeftColor = `rgb(${c[0]},${c[1]},${c[2]})`;
    
    if (fac.type === 'rooftop_solar') {
      this.dom.hoverLink.style.display = 'none';
      if (this.dom.hoverImg) this.dom.hoverImg.classList.add('hidden');
      this.dom.hoverName.style.display = 'block';
      this.dom.hoverType.style.display = 'block';
      this.dom.hoverCap.style.display = 'block';
    } else {
      if (fac.oe_id) {
        this.dom.hoverLink.href = `https://openelectricity.org.au/facility/${fac.oe_id}`;
        this.dom.hoverLink.style.display = 'block';
        if (this.dom.hoverImg) {
          this.dom.hoverImg.src = `https://openelectricity.org.au/og/facility/${fac.oe_id}.jpg`;
          this.dom.hoverImg.classList.remove('hidden');
        }
        this.dom.hoverName.style.display = 'none';
        this.dom.hoverType.style.display = 'none';
        this.dom.hoverCap.style.display = 'none';
      } else {
        this.dom.hoverLink.style.display = 'none';
        if (this.dom.hoverImg) this.dom.hoverImg.classList.add('hidden');
        this.dom.hoverName.style.display = 'block';
        this.dom.hoverType.style.display = 'block';
        this.dom.hoverCap.style.display = 'block';
      }
    }

    if (!this._isPopupDragged) {
      this.dom.hoverPanel.style.position = 'fixed';
    this.dom.hoverPanel.style.left = (x + 15) + 'px';
    this.dom.hoverPanel.style.top = (y + 15) + 'px';
    this.dom.hoverPanel.style.right = 'auto';
    }
    this.dom.hoverPanel.classList.remove('hidden', 'faded');
  }

  _cacheDom() {
    const $ = id => document.getElementById(id);
    this.dom = {
      loadingOverlay:   $('loading-overlay'),
      loadingStatus:    $('loading-status'),
      progressFill:     $('progress-fill'),
      statsBar:         $('stats-bar'),
      filterPanel:      $('filter-panel'),
      statDate:         $('stat-date'),
      controls:         $('controls'),
      btnRewind:        $('btn-rewind'),
      btnPlay:          $('btn-play'),
      scrubber:         $('scrubber'),
      speedSlider:      $('speed'),
      speedVal:         $('speed-val'),
      hoverPanel:       $('hover-panel'),
      hoverImg:         $('hover-img'),
      hoverName:        $('hover-name'),
      hoverType:        $('hover-type'),
      hoverGen:         $('hover-gen'),
      hoverCap:         $('hover-cap'),
      chartViewMode:    $('chart-view-mode'),
      hoverLink:        $('hover-link'),
    };
  }

  _setupHoverPanelClose() {
    makeDraggable(this.dom.hoverPanel, this.dom.hoverPanel, () => { this._isPopupDragged = true; });
    this.dom.hoverPanel.querySelector('.panel-close').addEventListener('click', () => {
      this._isPopupDragged = false;
      this.dom.hoverPanel.classList.add('hidden');
      this.map._lastHoveredRecord = -1;
    });
    this.dom.hoverPanel.addEventListener('mouseenter', () => {
      this._isHoveringPopup = true;
      if (this._hideTooltipTimeout) {
        clearTimeout(this._hideTooltipTimeout);
        this._hideTooltipTimeout = null;
      }
    });
    this.dom.hoverPanel.addEventListener('mouseleave', () => {
      this._isHoveringPopup = false;
      this._onHover(-1, 0, 0); // Start fade timer if we aren't hovering a dot
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
      
      if (!localStorage.getItem('hasSeenTour') && window.driver && window.driver.js) {
          localStorage.setItem('hasSeenTour', 'true');
          const d = window.driver.js.driver({
              showProgress: false,
              popoverClass: 'driverjs-theme',
          onHighlightStarted: (element, step, options) => {
            const hiddenEls = ['#chart-view-mode', '#speed', '#filter-input'];
            if (hiddenEls.includes(step.element)) {
              const toggle = document.getElementById('mobile-toggle');
              if (toggle && !toggle.checked) toggle.checked = true;
            }
          },
              onDestroyStarted: () => {
                  const toggle = document.getElementById('mobile-toggle');
                  if (toggle && toggle.checked) toggle.checked = false;
                  d.destroy();
              },
              steps: [
                  { element: '.viz-title', popover: { title: 'Welcome', description: 'This interactive map animates the daily generation of electricity across Australia\'s National Electricity Market (NEM), highlighting the ongoing transition from fossil fuels to renewable energy. Note that the Northern Territory (NT) is not connected to the NEM so its data is not available.', side: 'bottom', align: 'start' } },
                  { element: '#btn-play', popover: { title: 'Play Animation', description: 'Click play to start the timeline animation.', side: 'bottom', align: 'start' } },
                  { element: '#btn-settings', popover: { title: 'Settings & Filters', description: 'Click here for extra options and state filtering.', side: 'bottom', align: 'end' } },
                  { element: '#chart-view-mode', popover: { title: 'Power Generation', description: 'Use this dropdown to compare specific fuel sources across states.', side: 'top', align: 'end' } }
              ]
          });
          setTimeout(() => d.drive(), 500);
      }
    }, 500);
  }

  _setupControls() {
    this.chartMode = 'cumulative';
    this.chartViewMode = 'all_sources';
    
    if (this.dom.chartViewMode) {
        this.dom.chartViewMode.addEventListener('change', (e) => {
            this.chartViewMode = e.target.value;
            this._updateUI();
            
            // Update map filters
            if (this.map && this.map.setFilter) {
                if (this.chartViewMode === 'all_sources' || this.chartViewMode === 'state_renewables_pct') {
                    this.map.setFilter(new Set());
                } else if (this.chartViewMode === 'state_renewables') {
                    const renIndices = [];
                    this.data.metadata.fuelTypes.forEach((fType, idx) => {
                        if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renIndices.push(idx);
                    });
                    this.map.setFilter(new Set(renIndices));
                } else if (this.chartViewMode === 'state_fossil_fuels') {
                    const fosIndices = [];
                    this.data.metadata.fuelTypes.forEach((fType, idx) => {
                        if (['coal', 'gas'].includes(fType)) fosIndices.push(idx);
                    });
                    this.map.setFilter(new Set(fosIndices));
                } else {
                    const targetType = this.chartViewMode.replace('state_', '');
                    const targetCatIdx = this.data.metadata.fuelTypes.indexOf(targetType);
                    this.map.setFilter(new Set([targetCatIdx]));
                }
            }
        });
    }

    this.dom.btnRewind.addEventListener('click', () => {
      this._pause();
      
      this._setDay(0);

    });
    this.dom.btnPlay.addEventListener('click', () => this._togglePlay());

    this.dom.scrubber.max = this.data.metadata.totalDays - 1;
    this.dom.scrubber.addEventListener('input', () => {
      this.hasStarted = true;
      this._pause();
      this._setDay(parseInt(this.dom.scrubber.value, 10));
    });

    this.dom.speedSlider.addEventListener('input', () => {
      this.speed = parseInt(this.dom.speedSlider.value, 10);
      this.dom.speedVal.textContent = `${this.speed}×`;
      if (this.playing) { clearTimeout(this.tickTimer); this._scheduleTick(); }
    });


    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const max = this.data.metadata.totalDays - 1;
      switch (e.code) {
        case 'Space':      e.preventDefault(); this._togglePlay(); break;
        case 'ArrowLeft':  e.preventDefault(); this._pause(); this._setDay(Math.max(0,   this.currentDay - (e.shiftKey?7:1))); break;
        case 'ArrowRight': e.preventDefault(); this._pause(); this._setDay(Math.min(max, this.currentDay + (e.shiftKey?7:1))); break;
        case 'Home':       e.preventDefault(); this._pause(); 
      this._setDay(0);
 break;
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
    if (this.currentDay >= this.data.metadata.totalDays - 1) 
      this._setDay(0);

    this.playing = true;
    this.hasStarted = true;
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
    const ms = Math.max(4, Math.round(300 * Math.pow(0.65, this.speed - 1)));
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
    d.setDate(d.getDate() + this.currentDay);
    this.dom.statDate.textContent   = d.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });

    const { generation, categoryIndices, palette } = this.data;
    const dayOffsets = metadata.dayOffsets;
let dayStart = dayOffsets[this.currentDay] ?? 0;
    let endIdx = (this.currentDay + 1 < dayOffsets.length) ? dayOffsets[this.currentDay + 1] : metadata.recordCount;
    
    // Fallback if no data for the current view mode
    const checkHasData = (s, e) => {
        const mode = this.chartViewMode || 'all_sources';
        const avg = metadata.recordCount / dayOffsets.length;
        
        if (mode === 'all_sources' || mode === 'state_renewables_pct') {
            const threshold = Math.max(1, avg * 0.5);
            return (e - s) >= threshold;
        }
        
        let targetIndices = [];
        if (mode === 'state_renewables') {
            metadata.fuelTypes.forEach((fType, idx) => {
                if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) targetIndices.push(idx);
            });
        } else if (mode === 'state_fossil_fuels') {
            metadata.fuelTypes.forEach((fType, idx) => {
                if (['coal', 'gas'].includes(fType)) targetIndices.push(idx);
            });
        } else {
            const targetType = mode.replace('state_', '');
            targetIndices.push(metadata.fuelTypes.indexOf(targetType));
        }
        
        if (!this._avgModeCounts) this._avgModeCounts = {};
        if (this._avgModeCounts[mode] === undefined) {
            let totalMatch = 0;
            for (let i = 0; i < metadata.recordCount; i++) {
                if (targetIndices.includes(categoryIndices[i])) totalMatch++;
            }
            this._avgModeCounts[mode] = totalMatch / dayOffsets.length;
        }
        
        const threshold = Math.max(1, this._avgModeCounts[mode] * 0.5);
        let matchCount = 0;
        for (let i = s; i < e; i++) {
            if (targetIndices.includes(categoryIndices[i])) matchCount++;
        }
        return matchCount >= threshold;
    };

    if (!checkHasData(dayStart, endIdx)) {
        let fallbackDay = this.currentDay - 1;
        while (fallbackDay >= 0) {
            let s = dayOffsets[fallbackDay] ?? 0;
            let e = (fallbackDay + 1 < dayOffsets.length) ? dayOffsets[fallbackDay + 1] : metadata.recordCount;
            if (checkHasData(s, e)) {
                dayStart = s;
                endIdx = e;
                break;
            }
            fallbackDay--;
        }
    }
    
// 1. Calculate absolute max totals for the entire timeline (to prevent bouncing scales)
    if (this._absoluteMaxTotals === undefined) {
        this._absoluteMaxTotals = { all_sources: 0 };
        let absCatTotals = new Array(metadata.fuelTypes.length).fill(0);
        let absStateTotals = new Map();
        for (let i = 0; i < metadata.fuelTypes.length; i++) absStateTotals.set(i, new Map());
        
        for (let i = 0; i < metadata.recordCount; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const cIdx = categoryIndices[i];
            if (cIdx >= 0 && cIdx < absCatTotals.length) {
                absCatTotals[cIdx] += generation[i];
                let st = fac.state;
                if (st === 'NSW/ACT') st = 'NSW';
                const sMap = absStateTotals.get(cIdx);
                sMap.set(st, (sMap.get(st) || 0) + generation[i]);
            }
        }
        
        let fossilMax = 0, renMax = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilMax += absCatTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renMax += absCatTotals[i];
            
            const maxForCat = Math.max(0, ...Array.from(absStateTotals.get(i).values()));
            this._absoluteMaxTotals['state_' + fType] = maxForCat;
        }
        this._absoluteMaxTotals['all_sources'] = Math.max(...absCatTotals);
        this._absoluteAggregateMaxTotal = Math.max(fossilMax, renMax);
        
        let stateRenTotals = new Map();
        let stateFosTotals = new Map();
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            const isRen = ['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType);
            const isFos = ['coal', 'gas'].includes(fType);
            for (const [st, val] of absStateTotals.get(i).entries()) {
                if (isRen) stateRenTotals.set(st, (stateRenTotals.get(st) || 0) + val);
                if (isFos) stateFosTotals.set(st, (stateFosTotals.get(st) || 0) + val);
            }
        }
        this._absoluteMaxTotals['state_renewables'] = Math.max(0, ...Array.from(stateRenTotals.values()));
        this._absoluteMaxTotals['state_fossil_fuels'] = Math.max(0, ...Array.from(stateFosTotals.values()));
    }
    
    // Accumulate power up to current day
    const mode = this.chartViewMode || 'all_sources';
    let chartData = [];
    let aggregatesHtml = '';
    
    let currentMax = this._absoluteMaxTotals[mode] || 0;

    if (mode === 'all_sources') {
        const catTotals = new Array(metadata.fuelTypes.length).fill(0);
        
        let targetStart = this.chartMode === 'cumulative' ? 0 : dayStart;
        for (let i = targetStart; i < endIdx; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            const catIdx = categoryIndices[i];
            if (catIdx >= 0 && catIdx < catTotals.length) {
                catTotals[catIdx] += generation[i];
            }
        }
        
        let fossilTotal = 0, renewableTotal = 0;
        for (let i = 0; i < metadata.fuelTypes.length; i++) {
            const fType = metadata.fuelTypes[i];
            if (fType === 'coal' || fType === 'gas') fossilTotal += catTotals[i];
            else if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) renewableTotal += catTotals[i];
            
            chartData.push({
                name: fType,
                total: catTotals[i],
                color: palette[i]
            });
        }
        
        if (this.chartMode === 'snapshot') {
            currentMax = Math.max(...catTotals, fossilTotal, renewableTotal);
        }
        
        let aggMax = this._absoluteAggregateMaxTotal;
        if (this.chartMode === 'snapshot') {
            aggMax = Math.max(fossilTotal, renewableTotal);
        }
        
        if (fossilTotal > 0 || renewableTotal > 0) {
            aggregatesHtml += '<hr style="border: 1px solid #444; margin: 10px 0;">';
            if (fossilTotal > 0) {
                const fossilPct = this.hasStarted && aggMax > 0 ? (fossilTotal / aggMax) * 100 : 0;
                const fVal = this.hasStarted ? Math.round(fossilTotal / 1000).toLocaleString() + ' GWh' : '';
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">FOSSIL FUELS</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${fossilPct}%; background: #666;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${fVal}</div>
                  </div>
                `;
            }
            if (renewableTotal > 0) {
                const renPct = this.hasStarted && aggMax > 0 ? (renewableTotal / aggMax) * 100 : 0;
                const rVal = this.hasStarted ? Math.round(renewableTotal / 1000).toLocaleString() + ' GWh' : '';
                aggregatesHtml += `
                  <div class="bar-row">
                    <div class="bar-label" style="font-weight: bold;">RENEWABLES</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${renPct}%; background: #4CAF50;"></div>
                    </div>
                    <div class="bar-value" style="font-weight: bold;">${rVal}</div>
                  </div>
                `;
            }
        }
    } else if (mode === 'state_renewables_pct') {
        const stateRen = new Map();
        const stateAll = new Map();
        
        let targetStart = this.chartMode === 'cumulative' ? 0 : dayStart;
        for (let i = targetStart; i < endIdx; i++) {
            const fac = this.facilityMap.get(this.data.facilityIds[i]);
            if (!fac || !this.selectedStates.has(fac.state)) continue;
            
            let st = fac.state;
            if (st === 'NSW/ACT') st = 'NSW';
            
            const catIdx = categoryIndices[i];
            const fType = metadata.fuelTypes[catIdx];
            
            if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) {
                stateRen.set(st, (stateRen.get(st) || 0) + generation[i]);
            }
            if (fType) {
                stateAll.set(st, (stateAll.get(st) || 0) + generation[i]);
            }
        }
        
        currentMax = 100;
        
        for (const [state, totalAll] of stateAll.entries()) {
            if (totalAll === 0) continue;
            const ren = stateRen.get(state) || 0;
            const pct = (ren / totalAll) * 100;
            chartData.push({
                name: state,
                total: pct, // We store the percentage in total to sort it
                color: [76, 175, 80] // Green
            });
        }
    } else {
        let targetIndices = [];
        let targetColor = [255, 255, 255]; // fallback
        if (mode === 'state_renewables') {
            metadata.fuelTypes.forEach((fType, idx) => {
                if (['hydro', 'wind', 'commercial_solar', 'rooftop_solar'].includes(fType)) targetIndices.push(idx);
            });
            targetColor = [34, 197, 94]; // green
        } else if (mode === 'state_fossil_fuels') {
            metadata.fuelTypes.forEach((fType, idx) => {
                if (['coal', 'gas'].includes(fType)) targetIndices.push(idx);
            });
            targetColor = [161, 161, 170]; // zinc-400
        } else {
            const targetType = mode.replace('state_', '');
            const idx = metadata.fuelTypes.indexOf(targetType);
            targetIndices.push(idx);
            targetColor = palette[idx];
        }
        
        const stateTotals = new Map();
        
        let targetStart = this.chartMode === 'cumulative' ? 0 : dayStart;
        for (let i = targetStart; i < endIdx; i++) {
            if (targetIndices.includes(categoryIndices[i])) {
                const fac = this.facilityMap.get(this.data.facilityIds[i]);
                if (!fac || !this.selectedStates.has(fac.state)) continue;
                
                let st = fac.state;
                if (st === 'NSW/ACT') st = 'NSW';
                
                stateTotals.set(st, (stateTotals.get(st) || 0) + generation[i]);
            }
        }
        
        if (this.chartMode === 'snapshot') {
            currentMax = Math.max(0, ...Array.from(stateTotals.values()));
        }
        
        for (const [state, total] of stateTotals.entries()) {
            if (total > 0) {
                chartData.push({
                    name: state,
                    total: total,
                    color: targetColor
                });
            }
        }
    }
    
    // Sort highest to lowest
    chartData.sort((a, b) => b.total - a.total);
    
    // Render HTML
    if (!this.dom.barChart) this.dom.barChart = document.getElementById('bar-chart');
    if (this.dom.barChart) {
        let html = '';
        
        for (const item of chartData) {
            if (item.total === 0 && this.hasStarted) continue;
            
            const pct = this.hasStarted && currentMax > 0 ? (item.total / currentMax) * 100 : 0;
            const colorStr = `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`;
            let label = item.name.replace('_', ' ').toUpperCase();
            if (window.innerWidth <= 768) {
                if (label === 'COMMERCIAL SOLAR') label = 'COMM SOLAR';
                if (label === 'ROOFTOP SOLAR') label = 'ROOF SOLAR';
            }
            let valStr = '';
            if (this.hasStarted) {
                if (this.chartViewMode === 'state_renewables_pct') {
                    valStr = item.total.toFixed(1) + '%';
                } else {
                    let gwh = item.total / 1000;
                    if (gwh > 0 && gwh < 1) {
                        valStr = Math.round(item.total).toLocaleString() + ' MWh';
                    } else {
                        valStr = Math.round(gwh).toLocaleString() + ' GWh';
                    }
                }
            }
            
            let extraLabelStyle = '';
            if (this.chartViewMode !== 'all_sources' && window.innerWidth <= 768) {
                extraLabelStyle = 'width: 35px !important; text-align: left;';
            }
            
            html += `
              <div class="bar-row">
                <div class="bar-label" style="${extraLabelStyle}">${label}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background: ${colorStr};"></div>
                </div>
                <div class="bar-value">${valStr}</div>
              </div>
            `;
        }

        html += aggregatesHtml;

        this.dom.barChart.innerHTML = html;
        document.getElementById('bottom-panel').classList.remove('hidden');
    }

    const counts = this.map.getVisibleCounts();
    this.dom.scrubber.value          = this.currentDay;
  }

}

const app = new EngineApp();
  window.energyApp = app;
app.init();
window.app = app;
