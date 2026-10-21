import { loadData } from './parkrun_data.js';
import { ParkrunMap, getRunnerColor } from './map.js';
import { GrowthLineChart } from './growth_chart.js';
import { makeDraggable } from '../../common/js/draggable.js';

class ParkrunApp {
  constructor() {
    this.data = null;
    this.map = null;
    this.growthChart = null;
    this.growthChartBottom = null;
    this.weeklyChart = null;
    this.weeklyChartBottom = null;
    this.cumulativeSeries = null;
    this.weeklySeries = null;
    this.currentWeek = 0;
    this.playing = false;
    this.hasStartedAnimation = false;
    this.speed = 20; // Default 20x
    this.selectedStateIds = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
    this.selectedEventId = null;
    this.tickTimer = null;
    this._isPopupDragged = false;
    this._lastPinnedEventId = null;
    this.currentDisplayedYear = null;
    this.yearWatermarkTimeout = null;
    this.dom = {};
  }

  async init() {
    this._cacheDom();
    try {
      this.data = await loadData(
        'data/metadata.json',
        'data/parkrun.bin',
        'parkrun-v6',
        (phase, pct) => this._updateLoading(phase, pct)
      );

      this.map = new ParkrunMap('map-container', this.data, (record, x, y, isPinned) => {
        this._updateTooltip(record, x, y, isPinned);
      });

      if (this.dom.yearWatermarkContainer && this.map?.map && globalThis.maplibregl) {
        new globalThis.maplibregl.Marker({
          element: this.dom.yearWatermarkContainer,
          anchor: 'center'
        })
          .setLngLat([133.8, -25.5])
          .addTo(this.map.map);
      }

      if (this.dom.growthCanvas) {
        this.growthChart = new GrowthLineChart(this.dom.growthCanvas, {
          onSeek: (w) => this._setWeek(w, true)
        });
      }
      if (this.dom.growthCanvasBottom) {
        this.growthChartBottom = new GrowthLineChart(this.dom.growthCanvasBottom, {
          onSeek: (w) => this._setWeek(w, true)
        });
      }

      const weeklyPlotOptions = {
        onSeek: (w) => this._setWeek(w, true),
        lineColors: ['#06b6d4', '#22d3ee', '#38bdf8'],
        areaColorStops: [
          { stop: 0, color: 'rgba(6, 182, 212, 0.32)' },
          { stop: 0.7, color: 'rgba(6, 182, 212, 0.08)' },
          { stop: 1, color: 'rgba(6, 182, 212, 0.0)' }
        ],
        glowColor: 'rgba(6, 182, 212, 0.4)',
        headRingColor: '#22d3ee'
      };

      if (this.dom.weeklyCanvas) {
        this.weeklyChart = new GrowthLineChart(this.dom.weeklyCanvas, weeklyPlotOptions);
      }
      if (this.dom.weeklyCanvasBottom) {
        this.weeklyChartBottom = new GrowthLineChart(this.dom.weeklyCanvasBottom, weeklyPlotOptions);
      }

      this._recomputePeaks();
      this._setupControls();
      this._setupBottomPanelTabs();
      this._setupStateFilter();
      this._setupMapStyleSwitcher();
      this._setupKeyboard();
      this._setupDraggableTooltip();
      this._setupHelpTour();

      this._hideLoading();
      ['statsBar', 'controls', 'mapStyleSelector', 'weeklyStatsCard', 'legendCard', 'growthCard', 'weeklyChartCard', 'bottomPanel', 'filterPanel'].forEach(k => {
        if (this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      if (this.dom.scrubber) {
        this.dom.scrubber.min = 0;
        this.dom.scrubber.max = this.data.metadata.totalWeeks - 1;
        this.dom.scrubber.value = 0;
      }

      this._setWeek(0);

    } catch (err) {
      console.error('Initialization failed:', err);
      if (this.dom.loadingStatus) {
        this.dom.loadingStatus.textContent = `Error: ${err.message}`;
        this.dom.loadingStatus.style.color = '#f87171';
      }
    }
  }

  _cacheDom() {
    const $ = id => document.getElementById(id);
    this.dom = {
      loadingOverlay:    $('loading-overlay'),
      loadingStatus:     $('loading-status'),
      progressFill:      $('progress-fill'),
      statsBar:          $('stats-bar'),
      statDate:          $('stat-date'),
      statFinishers:     $('stat-finishers'),
      statActive:        $('stat-active'),
      statCumulative:    $('stat-cumulative'),
      statEstablished:   $('stat-established'),
      controls:          $('controls'),
      btnRewind:         $('btn-rewind'),
      btnPlay:           $('btn-play'),
      scrubber:          $('scrubber'),
      speedSlider:       $('speed'),
      speedVal:          $('speed-val'),
      mapStyleSelector:  $('map-style-selector'),
      weeklyStatsCard:   $('weekly-stats-card'),
      legendCard:        $('legend-card'),
      tooltip:              $('map-tooltip'),
      tooltipTitle:         $('tooltip-title'),
      tooltipClose:         $('tooltip-close'),
      tooltipDot:           $('tooltip-dot'),
      tooltipFinishers:     $('tooltip-finishers'),
      tooltipLabel:         $('tooltip-label'),
      tooltipDate:          $('tooltip-date'),
      tooltipLink:          $('tooltip-link'),
      tooltipLinkContainer: $('tooltip-link-container'),
      bottomPanel:          $('bottom-panel'),
      filterPanel:          $('filter-panel'),
      barFillActive:        $('bar-fill-active'),
      barValActive:         $('bar-val-active'),
      barFillFinishers:     $('bar-fill-finishers'),
      barValFinishers:      $('bar-val-finishers'),
      barFillCumulative:      $('bar-fill-cumulative'),
      barValCumulative:       $('bar-val-cumulative'),
      yearWatermarkContainer: $('year-watermark-container'),
      yearWatermark:          $('year-watermark'),
      growthCard:             $('growth-card'),
      growthCardVal:          $('growth-card-val'),
      growthCanvas:           $('growth-canvas'),
      weeklyChartCard:        $('weekly-chart-card'),
      weeklyCardVal:          $('weekly-card-val'),
      weeklyCanvas:           $('weekly-canvas'),
      tabBtnWeekly:           $('tab-btn-weekly'),
      tabBtnGrowth:           $('tab-btn-growth'),
      tabBtnWeeklyPlot:       $('tab-btn-weekly-plot'),
      bottomViewWeekly:       $('bottom-view-weekly'),
      bottomViewGrowth:       $('bottom-view-growth'),
      bottomViewWeeklyPlot:   $('bottom-view-weekly-plot'),
      growthBottomVal:        $('growth-bottom-val'),
      growthCanvasBottom:     $('growth-canvas-bottom'),
      weeklyBottomVal:        $('weekly-bottom-val'),
      weeklyCanvasBottom:     $('weekly-canvas-bottom'),
      chartSubLabel:          $('chart-sub-label'),
    };
  }

  _updateLoading(phase, pct) {
    if (this.dom.progressFill) {
      this.dom.progressFill.style.width = `${Math.round(pct * 100)}%`;
    }
    if (this.dom.loadingStatus) {
      const msgs = {
        'download': 'Downloading Parkrun data...',
        'cache-check': 'Checking local cache...',
        'cache-hit': 'Loaded from local cache!',
        'parse': 'Decoding binary events...'
      };
      this.dom.loadingStatus.textContent = msgs[phase] || 'Loading...';
    }
  }

  _hideLoading() {
    if (this.dom.loadingOverlay) {
      this.dom.loadingOverlay.style.opacity = '0';
      this.dom.loadingOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        this.dom.loadingOverlay.style.display = 'none';
      }, 400);
    }
  }

  _setupControls() {
    if (this.dom.btnPlay) {
      this.dom.btnPlay.addEventListener('click', () => {
        this.hasStartedAnimation = true;
        this._togglePlay();
      });
    }

    if (this.dom.btnRewind) {
      this.dom.btnRewind.addEventListener('click', () => {
        this.hasStartedAnimation = false;
        const startWeek = this._getEarliestFilteredWeek();
        this._setWeek(startWeek, true);
      });
    }

    if (this.dom.scrubber) {
      this.dom.scrubber.addEventListener('input', (e) => {
        this.hasStartedAnimation = true;
        const w = parseInt(e.target.value, 10);
        this._setWeek(w, false);
      });
    }

    if (this.dom.speedSlider) {
      this.dom.speedSlider.addEventListener('input', () => {
        this.speed = parseInt(this.dom.speedSlider.value, 10) || 10;
        if (this.dom.speedVal) {
          this.dom.speedVal.textContent = `${this.speed}×`;
        }
        if (this.playing) {
          this._startPlaybackTimer();
        }
      });
    }
  }

  _setupBottomPanelTabs() {
    if (!this.dom.tabBtnWeekly || !this.dom.tabBtnGrowth || !this.dom.tabBtnWeeklyPlot) return;

    const setTab = (activeTab) => {
      [this.dom.tabBtnWeekly, this.dom.tabBtnGrowth, this.dom.tabBtnWeeklyPlot].forEach(b => {
        if (b) b.classList.toggle('active', b === activeTab);
      });

      if (this.dom.bottomViewWeekly) {
        this.dom.bottomViewWeekly.style.display = (activeTab === this.dom.tabBtnWeekly) ? 'block' : 'none';
      }
      if (this.dom.bottomViewGrowth) {
        this.dom.bottomViewGrowth.style.display = (activeTab === this.dom.tabBtnGrowth) ? 'block' : 'none';
      }
      if (this.dom.bottomViewWeeklyPlot) {
        this.dom.bottomViewWeeklyPlot.style.display = (activeTab === this.dom.tabBtnWeeklyPlot) ? 'block' : 'none';
      }

      this._updateChartSubLabel();

      if (activeTab === this.dom.tabBtnGrowth && this.growthChartBottom) {
        this.growthChartBottom.render();
      }
      if (activeTab === this.dom.tabBtnWeeklyPlot && this.weeklyChartBottom) {
        this.weeklyChartBottom.render();
      }
    };

    this.dom.tabBtnWeekly.addEventListener('click', () => setTab(this.dom.tabBtnWeekly));
    this.dom.tabBtnGrowth.addEventListener('click', () => setTab(this.dom.tabBtnGrowth));
    this.dom.tabBtnWeeklyPlot.addEventListener('click', () => setTab(this.dom.tabBtnWeeklyPlot));
  }

  _updateChartSubLabel() {
    if (!this.dom.chartSubLabel) return;
    if (this.dom.tabBtnGrowth?.classList.contains('active')) {
      this.dom.chartSubLabel.textContent = 'All-Time Trajectory';
    } else if (this.dom.tabBtnWeeklyPlot?.classList.contains('active')) {
      this.dom.chartSubLabel.textContent = 'Weekly Turnout History';
    } else if (this.selectedEventId !== null) {
      const evMeta = this.data.eventMap?.get(this.selectedEventId);
      const vName = evMeta ? (evMeta.shortName || evMeta.longName) : 'Venue';
      this.dom.chartSubLabel.textContent = `${vName} Peak (100%)`;
    } else {
      this.dom.chartSubLabel.textContent = 'Scaled to Peak (100%)';
    }
  }

  _getEarliestFilteredWeek() {
    if (this.selectedEventId !== null && this.data?.eventFirstWeek) {
      const fw = this.data.eventFirstWeek.get(this.selectedEventId);
      if (fw !== undefined && fw >= 0) return fw;
    }
    if (!this.data || !this.selectedStateIds || this.selectedStateIds.size === 0) return 0;
    const { weeklyActiveByState } = this.data;
    const totalWeeks = this.data.metadata.totalWeeks;
    if (weeklyActiveByState) {
      for (let w = 0; w < totalWeeks; w++) {
        for (const sid of this.selectedStateIds) {
          if (weeklyActiveByState[w * 8 + sid] > 0) {
            return w;
          }
        }
      }
    }
    return 0;
  }

  _recomputePeaks() {
    const totalWeeks = this.data.metadata.totalWeeks;

    if (this.selectedEventId !== null) {
      const eid = this.selectedEventId;
      const venueFinArr = this.data.eventWeeklyFinishers?.get(eid);
      const venueCumArr = this.data.eventWeeklyCumulative?.get(eid);
      const peakFin = this.data.eventPeakFinishers?.get(eid) || 1;
      const allTimeFin = venueCumArr ? venueCumArr[totalWeeks - 1] : 1;

      this.cumulativeSeries = venueCumArr || new Int32Array(totalWeeks);
      this.weeklySeries = venueFinArr || new Uint16Array(totalWeeks);
      this.maxActiveLocations = 1;
      this.maxWeeklyFinishers = Math.max(1, peakFin);
      this.maxCumulativeFinishers = Math.max(1, allTimeFin);

      if (this.growthChart) {
        this.growthChart.setData(this.data.metadata, this.cumulativeSeries, this.maxCumulativeFinishers);
      }
      if (this.growthChartBottom) {
        this.growthChartBottom.setData(this.data.metadata, this.cumulativeSeries, this.maxCumulativeFinishers);
      }
      if (this.weeklyChart) {
        this.weeklyChart.setData(this.data.metadata, this.weeklySeries, this.maxWeeklyFinishers);
      }
      if (this.weeklyChartBottom) {
        this.weeklyChartBottom.setData(this.data.metadata, this.weeklySeries, this.maxWeeklyFinishers);
      }
      return;
    }

    const { weeklyActiveByState, weeklyFinishersByState, weeklyCumulativeByState } = this.data;
    
    let maxAct = 0;
    let maxFin = 0;
    let maxCum = 0;

    const cumulativeSeries = new Int32Array(totalWeeks);
    const weeklySeries = new Int32Array(totalWeeks);

    if (weeklyActiveByState) {
      for (let w = 0; w < totalWeeks; w++) {
        let wAct = 0;
        let wFin = 0;
        let wCum = 0;
        for (const sid of this.selectedStateIds) {
          wAct += weeklyActiveByState[w * 8 + sid];
          wFin += weeklyFinishersByState[w * 8 + sid];
          wCum += weeklyCumulativeByState[w * 8 + sid];
        }
        if (wAct > maxAct) maxAct = wAct;
        if (wFin > maxFin) maxFin = wFin;
        cumulativeSeries[w] = wCum;
        weeklySeries[w] = wFin;
      }
      for (const sid of this.selectedStateIds) {
        maxCum += weeklyCumulativeByState[(totalWeeks - 1) * 8 + sid];
      }
    }

    this.cumulativeSeries = cumulativeSeries;
    this.weeklySeries = weeklySeries;
    this.maxActiveLocations = Math.max(1, maxAct);
    this.maxWeeklyFinishers = Math.max(1, maxFin);
    this.maxCumulativeFinishers = Math.max(1, maxCum);

    if (this.growthChart) {
      this.growthChart.setData(this.data.metadata, cumulativeSeries, this.maxCumulativeFinishers);
    }
    if (this.growthChartBottom) {
      this.growthChartBottom.setData(this.data.metadata, cumulativeSeries, this.maxCumulativeFinishers);
    }
    if (this.weeklyChart) {
      this.weeklyChart.setData(this.data.metadata, weeklySeries, this.maxWeeklyFinishers);
    }
    if (this.weeklyChartBottom) {
      this.weeklyChartBottom.setData(this.data.metadata, weeklySeries, this.maxWeeklyFinishers);
    }
  }

  _setupStateFilter() {
    const filterContent = document.getElementById('filter-content');
    const states = this.data.metadata.states || ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
    
    if (filterContent) {
      let html = '';
      states.forEach((s, idx) => {
        html += `<label style="cursor: pointer; display: flex; align-items: center; gap: 4px;"><input type="checkbox" value="${idx}" checked> ${s}</label>`;
      });
      filterContent.innerHTML = html;

      filterContent.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          const sid = parseInt(e.target.value, 10);
          if (e.target.checked) this.selectedStateIds.add(sid);
          else this.selectedStateIds.delete(sid);
          this._onStateFilterChanged();
        }
      });

      const updateAll = (checked) => {
        const checkboxes = filterContent.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
          cb.checked = checked;
          const sid = parseInt(cb.value, 10);
          if (checked) this.selectedStateIds.add(sid);
          else this.selectedStateIds.delete(sid);
        });
        this._onStateFilterChanged();
      };

      const btnAll = document.getElementById('btn-select-all');
      const btnNone = document.getElementById('btn-deselect-all');
      if (btnAll) btnAll.addEventListener('click', () => updateAll(true));
      if (btnNone) btnNone.addEventListener('click', () => updateAll(false));
    }
  }

  _onStateFilterChanged() {
    this._recomputePeaks();
    if (this.map) {
      this.map.setSelectedStates(this.selectedStateIds);
    }
    const earliestWeek = this._getEarliestFilteredWeek();
    if (!this.hasStartedAnimation) {
      this._setWeek(earliestWeek, true);
    } else {
      if (this.currentWeek < earliestWeek) {
        this._setWeek(earliestWeek, true);
      } else {
        this._setWeek(this.currentWeek, false);
      }
    }
  }

  _setupMapStyleSwitcher() {
    const radios = document.querySelectorAll('input[name="map-style"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (this.map && e.target.checked) {
          this.map.setStyle(e.target.value);
        }
      });
    });
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      if (document.querySelector('.driver-popover')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.hasStartedAnimation = true;
        this._togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.hasStartedAnimation = true;
        this._setWeek(this.currentWeek - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.hasStartedAnimation = true;
        this._setWeek(this.currentWeek + 1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        this.hasStartedAnimation = false;
        const startWeek = this._getEarliestFilteredWeek();
        this._setWeek(startWeek, true);
      }
    });
  }

  _togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      this.hasStartedAnimation = true;
    }
    if (this.dom.btnPlay) {
      this.dom.btnPlay.textContent = this.playing ? '⏸' : '▶';
      this.dom.btnPlay.title = this.playing ? 'Pause (Space)' : 'Play (Space)';
    }

    if (this.playing) {
      if (this.currentWeek >= this.data.metadata.totalWeeks - 1) {
        this.currentWeek = this._getEarliestFilteredWeek();
      }
      this._startPlaybackTimer();
    } else {
      this._stopPlaybackTimer();
    }
  }

  _startPlaybackTimer() {
    this._stopPlaybackTimer();
    // At speed 10x: 100ms per week. Range 1x..20x = 1000ms..50ms
    const intervalMs = Math.max(25, Math.round(1000 / this.speed));
    this.tickTimer = setInterval(() => {
      if (this.currentWeek < this.data.metadata.totalWeeks - 1) {
        this._setWeek(this.currentWeek + 1);
      } else {
        this._togglePlay();
      }
    }, intervalMs);
  }

  _stopPlaybackTimer() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  _formatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    // Format without day-of-week prefix: e.g. "17 Oct 2026"
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  _setWeek(weekIdx, updateScrubber = true) {
    const totalWeeks = this.data.metadata.totalWeeks;
    this.currentWeek = Math.max(0, Math.min(weekIdx, totalWeeks - 1));

    if (this.dom.scrubber && updateScrubber) {
      this.dom.scrubber.value = this.currentWeek;
    }

    const stats = this.data.metadata.weekStats[this.currentWeek];
    if (stats) {
      if (stats.date) {
        const year = stats.date.slice(0, 4);
        if (this.currentDisplayedYear !== null && this.currentDisplayedYear !== year) {
          this._showYearWatermark(year);
        }
        this.currentDisplayedYear = year;
      }

      if (this.dom.statDate) {
        this.dom.statDate.textContent = this._formatDate(stats.date);
      }

      let finishers = 0;
      let activeEvents = 0;
      let cumulative = 0;
      let established = 0;

      if (this.selectedEventId !== null) {
        const eid = this.selectedEventId;
        const venueFin = this.data.eventWeeklyFinishers?.get(eid)?.[this.currentWeek] || 0;
        const venueCum = this.data.eventWeeklyCumulative?.get(eid)?.[this.currentWeek] || 0;
        const firstWeek = this.data.eventFirstWeek?.get(eid) ?? -1;

        finishers = venueFin;
        activeEvents = venueFin > 0 ? 1 : 0;
        cumulative = venueCum;
        established = (firstWeek !== -1 && this.currentWeek >= firstWeek) ? 1 : 0;
      } else {
        const { weeklyFinishersByState, weeklyActiveByState, weeklyCumulativeByState, weeklyEstablishedByState } = this.data;
        if (weeklyFinishersByState) {
          for (const sid of this.selectedStateIds) {
            const idx = this.currentWeek * 8 + sid;
            finishers += weeklyFinishersByState[idx];
            activeEvents += weeklyActiveByState[idx];
            cumulative += weeklyCumulativeByState[idx];
            established += weeklyEstablishedByState[idx];
          }
        } else {
          finishers = stats.finishers;
          activeEvents = stats.activeEvents;
          cumulative = stats.cumulativeFinishers;
          established = stats.totalEventsEstablished;
        }
      }

      if (this.dom.statFinishers) {
        this.dom.statFinishers.textContent = finishers.toLocaleString();
      }
      if (this.dom.statActive) {
        this.dom.statActive.textContent = activeEvents.toLocaleString();
      }
      if (this.dom.statCumulative) {
        this.dom.statCumulative.textContent = cumulative.toLocaleString();
      }
      if (this.dom.statEstablished) {
        this.dom.statEstablished.textContent = established.toLocaleString();
      }

      // Update bottom panel horizontal bar graphs
      if (this.dom.barFillActive) {
        const pct = Math.min(100, (activeEvents / this.maxActiveLocations) * 100);
        this.dom.barFillActive.style.width = `${pct.toFixed(1)}%`;
      }
      if (this.dom.barValActive) {
        this.dom.barValActive.textContent = `${activeEvents.toLocaleString()} venue${activeEvents === 1 ? '' : 's'}`;
      }

      if (this.dom.barFillFinishers) {
        const pct = Math.min(100, (finishers / this.maxWeeklyFinishers) * 100);
        this.dom.barFillFinishers.style.width = `${pct.toFixed(1)}%`;
      }
      if (this.dom.barValFinishers) {
        this.dom.barValFinishers.textContent = `${finishers.toLocaleString()} runner${finishers === 1 ? '' : 's'}`;
      }

      if (this.dom.growthCardVal) {
        this.dom.growthCardVal.textContent = cumulative.toLocaleString();
      }
      if (this.dom.growthBottomVal) {
        this.dom.growthBottomVal.textContent = cumulative.toLocaleString();
      }

      if (this.dom.weeklyCardVal) {
        this.dom.weeklyCardVal.textContent = finishers.toLocaleString();
      }
      if (this.dom.weeklyBottomVal) {
        this.dom.weeklyBottomVal.textContent = finishers.toLocaleString();
      }

      this._updateChartSubLabel();

    }

    if (this.growthChart) {
      this.growthChart.setWeek(this.currentWeek);
    }
    if (this.growthChartBottom) {
      this.growthChartBottom.setWeek(this.currentWeek);
    }
    if (this.weeklyChart) {
      this.weeklyChart.setWeek(this.currentWeek);
    }
    if (this.weeklyChartBottom) {
      this.weeklyChartBottom.setWeek(this.currentWeek);
    }

    if (this.map) {
      this.map.setWeek(this.currentWeek);
    }
  }

  _showYearWatermark(year) {
    if (!this.dom.yearWatermark) return;
    this.dom.yearWatermark.textContent = year;
    this.dom.yearWatermark.classList.remove('show');
    // Force layout reflow so animation retriggers cleanly
    void this.dom.yearWatermark.offsetWidth;

    // Scale transition and hold duration dynamically - twice as slow as base interval
    const baseIntervalMs = this.playing
      ? Math.max(30, Math.round(1000 / this.speed))
      : Math.max(200, Math.round(1000 / this.speed));
    const durationMs = baseIntervalMs * 2;

    const fadeInMs = Math.max(30, Math.round(durationMs * 0.25));
    const fadeOutMs = Math.max(30, Math.round(durationMs * 0.35));
    const holdMs = Math.max(20, durationMs - fadeOutMs);

    this.dom.yearWatermark.style.transition = `opacity ${fadeInMs}ms ease-out, transform ${fadeInMs}ms ease-out`;
    this.dom.yearWatermark.classList.add('show');

    if (this.yearWatermarkTimeout) {
      clearTimeout(this.yearWatermarkTimeout);
    }
    this.yearWatermarkTimeout = setTimeout(() => {
      if (this.dom.yearWatermark) {
        this.dom.yearWatermark.style.transition = `opacity ${fadeOutMs}ms ease-out, transform ${fadeOutMs}ms ease-out`;
        this.dom.yearWatermark.classList.remove('show');
      }
    }, holdMs);
  }

  _setupDraggableTooltip() {
    if (this.dom.tooltip) {
      makeDraggable(this.dom.tooltip, this.dom.tooltip, () => {
        this._isPopupDragged = true;
      });

      // Prevent clicks inside tooltip from bubbling to map canvas
      this.dom.tooltip.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (this.dom.tooltipClose) {
      this.dom.tooltipClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this._isPopupDragged = false;
        this._lastPinnedEventId = null;
        if (this.map) this.map.clearPin();
      });
    }
  }

  _updateTooltip(record, x, y, isPinned = false) {
    if (!this.dom.tooltip) return;
    if (!record) {
      this.dom.tooltip.style.display = 'none';
      this._isPopupDragged = false;
      this._lastPinnedEventId = null;
      if (this.selectedEventId !== null) {
        this.selectedEventId = null;
        this._recomputePeaks();
        this._setWeek(this.currentWeek, false);
      }
      return;
    }

    if (isPinned) {
      const eventId = record.eventId ?? null;
      if (eventId !== null) {
        const eventChanged = (this.selectedEventId !== eventId);
        this.selectedEventId = eventId;
        if (this._lastPinnedEventId !== eventId) {
          this._isPopupDragged = false;
          this._lastPinnedEventId = eventId;
        }
        if (eventChanged) {
          this._recomputePeaks();
          this._setWeek(this.currentWeek, false);
        }
      }
    } else {
      this._isPopupDragged = false;
      this._lastPinnedEventId = null;
    }

    const isInactive = record.isPastVenue || record.isInactive || record.finishers === 0;
    const formattedDate = this._formatDate(record.date);
    const titleText = record.placename || record.name;
    const eventNumPart = record.eventNumber ? `results/${record.eventNumber}/` : '';
    const hasHomepage = Boolean(record.eventname);
    const parkrunUrl = hasHomepage ? `https://www.parkrun.com.au/${record.eventname}/${eventNumPart}` : '';
    const linkText = record.eventNumber ? `View Event #${record.eventNumber} results ↗` : `Visit venue homepage ↗`;

    // 1. Title & Close Button
    if (this.dom.tooltipTitle) {
      this.dom.tooltipTitle.textContent = titleText;
    }
    if (this.dom.tooltipClose) {
      this.dom.tooltipClose.style.display = isPinned ? 'block' : 'none';
    }

    // 2. Stats
    if (isInactive) {
      const inactiveLabel = record.isPastVenue ? 'Past venue — not active on ' : 'No event held on ';
      if (this.dom.tooltipDot) {
        this.dom.tooltipDot.style.background = '#94a3b8';
        this.dom.tooltipDot.style.width = '8px';
        this.dom.tooltipDot.style.height = '8px';
      }
      if (this.dom.tooltipFinishers) {
        this.dom.tooltipFinishers.textContent = '';
        this.dom.tooltipFinishers.style.display = 'none';
      }
      if (this.dom.tooltipLabel) {
        this.dom.tooltipLabel.textContent = inactiveLabel;
      }
      if (this.dom.tooltipDate) {
        this.dom.tooltipDate.textContent = formattedDate;
        this.dom.tooltipDate.style.color = '#cbd5e1';
      }
    } else {
      const [r, g, b] = getRunnerColor(record.finishers);
      if (this.dom.tooltipDot) {
        this.dom.tooltipDot.style.background = `rgb(${r}, ${g}, ${b})`;
        this.dom.tooltipDot.style.width = '10px';
        this.dom.tooltipDot.style.height = '10px';
      }
      if (this.dom.tooltipFinishers) {
        this.dom.tooltipFinishers.textContent = record.finishers.toLocaleString();
        this.dom.tooltipFinishers.style.display = 'inline';
      }
      if (this.dom.tooltipLabel) {
        this.dom.tooltipLabel.textContent = (record.finishers === 1 ? ' runner on ' : ' runners on ');
      }
      if (this.dom.tooltipDate) {
        this.dom.tooltipDate.textContent = formattedDate;
        this.dom.tooltipDate.style.color = 'var(--parkrun-apricot)';
      }
    }

    // 3. Link
    if (this.dom.tooltipLink) {
      if (hasHomepage && parkrunUrl) {
        this.dom.tooltipLink.href = parkrunUrl;
        this.dom.tooltipLink.textContent = linkText;
        this.dom.tooltipLink.style.display = 'inline-flex';
      } else {
        this.dom.tooltipLink.style.display = 'none';
      }
    }

    // 4. Position
    if (!this._isPopupDragged) {
      const pad = 15;
      const tooltipWidth = 250;
      const posX = (x + tooltipWidth + pad > window.innerWidth) ? (x - tooltipWidth - pad) : (x + pad);
      const posY = Math.max(10, y - 50);

      this.dom.tooltip.style.left = `${posX}px`;
      this.dom.tooltip.style.top = `${posY}px`;
    }

    this.dom.tooltip.style.display = 'block';
  }

  _setupHelpTour() {
    // Auto-display for first-time visitors once loading finishes
    setTimeout(() => {
      try {
        if (!localStorage.getItem('hasSeenParkrunTour') && !localStorage.getItem('parkrun_help_seen')) {
          this._startTour();
        }
      } catch {}
    }, 600);
  }

  _startTour() {
    if (!window.driver || !window.driver.js) return;

    if (this.tourDriver) {
      this.tourDriver.destroy();
    }

    const d = window.driver.js.driver({
      showProgress: true,
      popoverClass: 'driverjs-theme',
      onHighlightStarted: (element, step, options) => {
        const toggle = document.getElementById('mobile-toggle');
        if (toggle) {
          if (step.element === '#filter-panel' || step.element === '#speed') {
            if (!toggle.checked) toggle.checked = true;
          } else {
            if (toggle.checked) toggle.checked = false;
          }
        }
      },
      steps: [
        {
          element: '.viz-title',
          popover: {
            title: 'Welcome',
            description: 'This interactive map animates weekly Saturday Parkrun events across Australia, tracking runner participation and venue growth from 2011 to today.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#btn-play',
          popover: {
            title: 'Play the Timeline',
            description: 'Click play to start animating through Saturday Parkrun events across Australia, or drag the scrubber below to jump to any week.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#btn-settings',
          popover: {
            title: 'Settings',
            description: 'Click here to open the settings drawer for speed control, basemap styles, and state & territory filtering.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '#filter-panel',
          popover: {
            title: 'Filter by State & Territory',
            description: 'Select individual states or territories. Statistics, graphs, and the earliest timeline start date automatically recalibrate to the selected regions.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '#speed',
          popover: {
            title: 'Adjust Speed',
            description: 'Control how fast the timeline progresses using this slider, from 1× up to 20× speed.',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '.home-nav-inline',
          popover: {
            title: 'Back to Home',
            description: 'Click here to go back to the list of interactive visualisations available.',
            side: 'bottom',
            align: 'start'
          }
        }
      ],
      onDestroyStarted: () => {
        try {
          localStorage.setItem('hasSeenParkrunTour', 'true');
          localStorage.setItem('parkrun_help_seen', '1');
        } catch {}
        const toggle = document.getElementById('mobile-toggle');
        if (toggle && toggle.checked) toggle.checked = false;
        d.destroy();
      }
    });

    this.tourDriver = d;
    d.drive();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new ParkrunApp();
  window.app = app;
  app.init();
});
