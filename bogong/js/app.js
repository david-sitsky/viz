import { makeDraggable } from '../../common/js/draggable.js';
import { loadData } from '../../common/js/engine_data.js?v=202610070112';
import { EngineMap } from '../../common/js/engine_map.js?v=202610070112';

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
        'data/metadata.json',
        'data/data.bin',
        'bogong-v3',
        [[240, 140, 50]],
        (phase, pct) => this._updateLoading(phase, pct),
      );

      this.map = new EngineMap(
        'map-container',
        this.data
      );

      this._setupControls();
      this._setupMapStyleSwitcher();
      this._setupGesturePrevention();

      this._hideLoading();
      ['statsBar','controls','mapStyleSelector'].forEach(k => {
        if(this.dom[k]) this.dom[k].classList.remove('hidden');
      });

      this._setDay(0);

      // Initialize Bogong Moth Tour
      if (window.driver && window.driver.js && !localStorage.getItem('hasSeenBogongTour')) {
        const d = window.driver.js.driver({
          showProgress: true,
          popoverClass: 'driverjs-theme',
          onHighlightStarted: (element, step, options) => {
            const hiddenEls = ['#chart-view-mode', '#speed', '#filter-input'];
            if (hiddenEls.includes(step.element)) {
              const toggle = document.getElementById('mobile-toggle');
              if (toggle && !toggle.checked) toggle.checked = true;
            }
          },
          steps: [
            { element: '.viz-title', popover: { title: 'Welcome', description: 'This interactive map animates historical and recent sightings of the Bogong moth across Australia. There has been a recent resurgence of sightings which is exciting! They can travel up to 1,000 kilometres every summer to reach the cool caves in the Australian Alps, navigating using Earth\'s magnetic field and the stars.', side: 'bottom', align: 'start' } },
            { element: '#btn-play', popover: { title: 'Play the Timeline', description: 'Click play to start animating through the Bogong Moth sightings.', side: 'bottom', align: 'start' } },
            { element: '#speed', popover: { title: 'Adjust Speed', description: 'Control how fast the timeline progresses using this slider.', side: 'top', align: 'start' } },
            { popover: { title: 'Help Track Bogong Moths', description: 'Upload your Bogong moth images to <a href="https://www.zoo.org.au/moth-tracker" target="_blank">Moth Tracker</a> or use <a href="https://www.inaturalist.org/" target="_blank">iNaturalist</a>!' } }
          ],
          onDestroyStarted: () => {
            localStorage.setItem('hasSeenBogongTour', 'true');
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

  _cacheDom() {
    const $ = id => document.getElementById(id);
    this.dom = {
      loadingOverlay:   $('loading-overlay'),
      bogongPanel: $('bogong-panel'),
      btnInfo: $('btn-info'),
      bogongPanelClose: $('bogong-panel-close'),
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
      fadeToggle:       $('fade-toggle'),
      mapStyleSelector: $('map-style-selector'),
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
    }, 500);
  }

  _setupControls() {
    this.dom.btnRewind.addEventListener('click', () => {
      this._pause();
      this._setDay(0);
    });
    this.dom.btnPlay.addEventListener('click', () => this._togglePlay());

    if (this.dom.bogongPanel) {
      makeDraggable(this.dom.bogongPanel);
    }
    if (this.dom.bogongPanelClose && this.dom.bogongPanel) {
      this.dom.bogongPanelClose.addEventListener('click', () => {
        this.dom.bogongPanel.classList.add('hidden');
      });
    }
    if (this.dom.btnInfo && this.dom.bogongPanel) {
      this.dom.btnInfo.addEventListener('click', () => {
        this.dom.bogongPanel.classList.toggle('hidden');
      });
    }

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
    d.setDate(d.getDate() + this.currentDay);
    this.dom.statDate.textContent   = d.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
    const counts = this.map.getVisibleCounts();
    this.dom.statRecords.textContent = counts.total.toLocaleString();
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
