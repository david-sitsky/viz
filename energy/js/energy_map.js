const maplibregl = globalThis.maplibregl;
const MapboxOverlay = globalThis.deck.MapboxOverlay || globalThis.deck.MapLibreOverlay;
const ScatterplotLayer = globalThis.deck.ScatterplotLayer;
const GeoJsonLayer = globalThis.deck.GeoJsonLayer;

const MAP_STYLES = {
  dark:      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  streets:   'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite: '../common/data/satellite-style.json',
};

const FADE_WINDOW = 60; // days

function calculateOptimalAustraliaViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobilePortrait = (w <= 600 && h > w);
  const centerLng = 133.5;
  const centerLat = isMobilePortrait ? -38.0 : -35.0;
  let zoom;
  if (w <= 450) zoom = 2.15;
  else if (w <= 650) zoom = 2.45;
  else if (w <= 1000) zoom = 3.0;
  else if (w <= 1350) zoom = 3.35;
  else zoom = 3.6;
  
  return { longitude: centerLng, latitude: centerLat, zoom };
}

export class EngineMap {
  constructor(containerId, data, onRecord = null, statesGeojson = null) {
    this.statesGeojson = statesGeojson;
    this.data = data;
    this.data.filteredGeneration = new Float32Array(this.data.generationRadii || this.data.generation);
    this.onRecord = onRecord;
    this.currentDay = 0;
    this.fadeMode = true;
    this.activeFilters = new Set();
    
    this._lastHoveredRecord = -1;
    this._hoverTimer = null;

    const initialView = calculateOptimalAustraliaViewport();

    this.map = new maplibregl.Map({
      container: containerId,
      style: MAP_STYLES.streets,
      center: [initialView.longitude, initialView.latitude],
      zoom: initialView.zoom,
      minZoom: 1,
      maxZoom: 19,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: true,
    });

    if (this.map.touchZoomRotate) {
      this.map.touchZoomRotate.disableRotation();
      if (typeof this.map.touchZoomRotate.setZoomThreshold === 'function') {
        this.map.touchZoomRotate.setZoomThreshold(0.01);
      }
    }

    this.overlay = new MapboxOverlay({
      interleaved: false,
      pickingRadius: 15,
      onClick: (info) => this._handleClick(info),
      onHover: (info) => this._handleHover(info),
    });

    this.map.addControl(this.overlay);

    const syncDeck = () => {
      this._updateLayers();
    };

    this.map.on('load', syncDeck);
    this.map.on('styledata', syncDeck);
    this.map.on('resize', syncDeck);

    const mapContainer = document.getElementById(containerId);
    if (mapContainer && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        this.map.resize();
      });
      ro.observe(mapContainer);
    }
    window.addEventListener('resize', () => {
      this.map.resize();
    });
  }

  setDay(day) {
    this.currentDay = day;
    this._updateLayers();
  }

  setFadeMode(enabled) {
    this.fadeMode = enabled;
    this._updateLayers();
  }

  setMapStyle(styleName) {
    const url = MAP_STYLES[styleName];
    if (!url) return;
    this.map.setStyle(url);
  }

  setFilter(categoryIndices) {
    this.activeFilters = categoryIndices;
    this._rebuildFilteredData();
    this._updateLayers();
  }

  applyStateFilter(facilityMap, selectedStates) {
    if (!this.data || !this.data.generation) return;
    
    if (!this.data.filteredPositions) {
        this.data.filteredPositions = new Float32Array(this.data.positions.length);
    }
    if (!this.data.filteredGeneration) {
        this.data.filteredGeneration = new Float32Array(this.data.generation.length);
    }
    
    const ROOFTOP_CENTROIDS = {
        'NSW/ACT': [-32.0, 145.0],
        'VIC': [-36.5, 143.0],
        'QLD': [-22.0, 144.0],
        'SA': [-30.0, 135.0],
        'WA': [-25.0, 122.0],
        'TAS': [-42.0, 146.0]
    };
    
    const rooftopMode = this.delegate ? this.delegate.rooftopMode : 'polygon';

    for (let i = 0; i < this.data.metadata.recordCount; i++) {
        const fac = facilityMap.get(this.data.facilityIds[i]);
        if (fac && selectedStates.has(fac.state)) {
            this.data.filteredGeneration[i] = this.data.generationRadii ? this.data.generationRadii[i] : this.data.generation[i];
            
            if (fac.type === 'rooftop_solar' && rooftopMode === 'centroid' && ROOFTOP_CENTROIDS[fac.state]) {
                this.data.filteredPositions[i*2] = ROOFTOP_CENTROIDS[fac.state][1]; // lon
                this.data.filteredPositions[i*2+1] = ROOFTOP_CENTROIDS[fac.state][0]; // lat
            } else if (fac.type === 'rooftop_solar' && rooftopMode === 'polygon') {
                this.data.filteredPositions[i*2] = 0;
                this.data.filteredPositions[i*2+1] = -90;
            } else {
                this.data.filteredPositions[i*2] = this.data.positions[i*2];
                this.data.filteredPositions[i*2+1] = this.data.positions[i*2+1];
            }
        } else {
            this.data.filteredGeneration[i] = 0;
            // Move off-map so it doesn't render as a 2px circle due to radiusMinPixels
            this.data.filteredPositions[i*2] = 0;
            this.data.filteredPositions[i*2+1] = -90;
        }
    }
    
    // Also update the filtered subset if active
    if (this._filteredIndices) {
        if (!this._filteredFilteredGeneration) this._filteredFilteredGeneration = new Float32Array(this._filteredGeneration);
        for (let j = 0; j < this._filteredIndices.length; j++) {
            const originalIdx = this._filteredIndices[j];
            this._filteredFilteredGeneration[j] = this.data.filteredGeneration[originalIdx];
            
            // We also need to update the _filteredPositions! 
            // BUT wait! _buildFilteredData ALREADY re-copies from this.data.filteredPositions when called!
            // BUT we are NOT calling _buildFilteredData here! We just need to update it in place!
            this._filteredPositions[j*2] = this.data.filteredPositions[originalIdx*2];
            this._filteredPositions[j*2+1] = this.data.filteredPositions[originalIdx*2+1];
        }
    }
    
    this._updateLayers();
  }

  getVisibleCounts() {
    const active = this._getActiveData();
    const day = this.currentDay;
    const offsets = active.dayOffsets;
    const dayStart = offsets[day] || 0;
    const dayEnd = (day + 1 < offsets.length) ? offsets[day + 1] : active.facilityIds.length;
    
    let today = 0;
    if (this.delegate && this.delegate.selectedStates) {
        for (let i = dayStart; i < dayEnd; i++) {
            const fac = this.delegate.facilityMap.get(active.facilityIds[i]);
            if (fac && this.delegate.selectedStates.has(fac.state)) {
                today++;
            }
        }
    } else {
        today = dayEnd - dayStart;
    }
    
    return { total: dayEnd, today };
  }

  _handleHover(info) {
    if (this.map && (this.map.isMoving() || this.map.isZooming())) return;
    
    const src = info?.srcEvent;
    if (src && (src.pointerType === 'touch' || src.type?.startsWith('touch'))) {
      return;
    }

    const container = document.getElementById('map-container');
    if (!info || info.index < 0 || !info.layer || info.layer.id === 'glow') {
      if (container) container.style.cursor = '';
      if (this._hoverDelayTimer) clearTimeout(this._hoverDelayTimer);
      if (this._lastHoveredRecord !== -1) {
          this._lastHoveredRecord = -1;
          if (this.onRecord) this.onRecord(-1, 0, 0);
      }
      return;
    }

    if (container) container.style.cursor = 'pointer';
    const recordIdx = this._resolveRecordIndex(info);
    if (recordIdx < 0) return;

    if (recordIdx === this._lastHoveredRecord) return;
    this._lastHoveredRecord = recordIdx;
    
    if (this._hoverDelayTimer) clearTimeout(this._hoverDelayTimer);
    this._hoverDelayTimer = setTimeout(() => {
        if (this.onRecord && this._lastHoveredRecord === recordIdx) {
            this.onRecord(recordIdx, info.x, info.y);
        }
    }, 500);
  }

  _handleClick(info) {
    if (!info || info.index < 0 || !info.layer || info.layer.id === 'glow') {
      return;
    }
    const recordIdx = this._resolveRecordIndex(info);
    if (recordIdx < 0) return;

    if (this._hoverDelayTimer) clearTimeout(this._hoverDelayTimer);
    this._lastHoveredRecord = recordIdx;
    if (this.onRecord) this.onRecord(recordIdx, info.x, info.y);
  }

  _rebuildFilteredData() {
    if (this.activeFilters.size === 0) {
      this._filteredIndices = null;
      this._filteredPositions = null;
      this._filteredColors = null;
      this._filteredPulseColors = null;
      this._filteredCategoryIndices = null;
      this._filteredFilteredGeneration = null;
      this._filteredDayOffsets = null;
      return;
    }

    const { categoryIndices, positions, colors, pulseColors, metadata } = this.data;
    const n = metadata.recordCount;
    const filtered = [];
    for (let i = 0; i < n; i++) {
      if (this.activeFilters.has(categoryIndices[i])) filtered.push(i);
    }

    const fn = filtered.length;
    this._filteredIndices       = filtered;
    this._filteredFacilityIds   = new Uint16Array(fn);
    this._filteredPositions     = new Float32Array(fn * 2);
    this._filteredColors        = new Uint8Array(fn * 4);
    this._filteredPulseColors   = new Uint8Array(fn * 4);
    this._filteredCategoryIndices = new Uint8Array(fn);
    this._filteredGeneration    = new Float32Array(fn);
    this._filteredFilteredGeneration = new Float32Array(fn);

    const sourcePositions = this.data.filteredPositions || positions;
    for (let j = 0; j < fn; j++) {
      const i = filtered[j];
      this._filteredPositions[j*2]   = sourcePositions[i*2];
      this._filteredPositions[j*2+1] = sourcePositions[i*2+1];
      for (let c = 0; c < 4; c++) {
        this._filteredColors[j*4+c]      = colors[i*4+c];
        this._filteredPulseColors[j*4+c] = pulseColors[i*4+c];
      }
      this._filteredFacilityIds[j]     = this.data.facilityIds[i];
      this._filteredCategoryIndices[j] = categoryIndices[i];
      this._filteredGeneration[j]      = this.data.generation[i];
      this._filteredFilteredGeneration[j] = this.data.filteredGeneration[i];
    }

    this._filteredDayOffsets = new Array(metadata.dayOffsets.length);
    let fi = 0;
    for (let d = 0; d < metadata.dayOffsets.length; d++) {
      const origOffset = metadata.dayOffsets[d];
      while (fi < fn && filtered[fi] < origOffset) fi++;
      this._filteredDayOffsets[d] = fi;
    }
  }

  _getActiveData() {
    if (this._filteredIndices) {
      return {
        positions:       this._filteredPositions,
        colors:          this._filteredColors,
        pulseColors:     this._filteredPulseColors,
        facilityIds:     this._filteredFacilityIds,
        categoryIndices: this._filteredCategoryIndices,
        generation:      this._filteredGeneration,
        filteredGeneration: this._filteredFilteredGeneration,
        dayOffsets:      this._filteredDayOffsets,
        recordCount:     this._filteredIndices.length,
        originalIndices: this._filteredIndices,
      };
    }
    return {
      facilityIds:     this.data.facilityIds,
      positions:       this.data.positions,
      filteredPositions: this.data.filteredPositions,
      colors:          this.data.colors,
      pulseColors:     this.data.pulseColors,
      categoryIndices: this.data.categoryIndices,
      generation:      this.data.generation,
      filteredGeneration: this.data.filteredGeneration || this.data.generation,
      dayOffsets:      this.data.metadata.dayOffsets,
      recordCount:     this.data.metadata.recordCount,
      originalIndices: null,
    };
  }

  _updateLayers() {
    const active = this._getActiveData();
    const day = this.currentDay;
    const offsets = active.dayOffsets;
let dayStart = offsets[day] ?? 0;
    let endIdx   = (day + 1 < offsets.length) ? offsets[day + 1] : active.recordCount;
    let todayCount = endIdx - dayStart;
    
    // If there is no data for this day (e.g. at the very end of the timeline),
    // fallback to the last day that actually had data so we don't blank out.
    const avgCount = offsets.length > 0 ? (active.recordCount / offsets.length) : 0;
    const threshold = Math.max(1, avgCount * 0.5);

    if (todayCount < threshold) {
        let fallbackDay = day - 1;
        while (fallbackDay >= 0) {
            let s = offsets[fallbackDay] ?? 0;
            let e = (fallbackDay + 1 < offsets.length) ? offsets[fallbackDay + 1] : active.recordCount;
            if (e - s >= threshold) {
                dayStart = s;
                endIdx = e;
                todayCount = endIdx - dayStart;
                break;
            }
            fallbackDay--;
        }
    }
    const dayEnd = endIdx;

    let layers = [];

    let stateRooftopGen = { 'NSW': 0, 'VIC': 0, 'QLD': 0, 'SA': 0, 'WA': 0, 'TAS': 0, 'NT': 0 };
    if (this.delegate && this.delegate.facilityMap && this.statesGeojson && this.delegate.rooftopMode === "polygon") {
        for (let i = dayStart; i < dayEnd; i++) {
            if (active.categoryIndices[i] === 5) {
                const facId = active.facilityIds[i];
                const fac = this.delegate.facilityMap.get(facId);
                if (fac && fac.state) {
                    let state = fac.state;
                    if (state === 'NSW/ACT') state = 'NSW';
                    stateRooftopGen[state] = (stateRooftopGen[state] || 0) + active.generation[i];
                }
            }
        }
        
        const STATE_ABBR = {
            'New South Wales': 'NSW', 'Australian Capital Territory': 'NSW',
            'Victoria': 'VIC', 'Queensland': 'QLD', 'South Australia': 'SA',
            'Western Australia': 'WA', 'Tasmania': 'TAS', 'Northern Territory': 'NT'
        };

        layers.push(new GeoJsonLayer({
            id: 'state-rooftop',
            data: this.statesGeojson,
            getFillColor: d => {
                const abbr = STATE_ABBR[d.properties.STATE_NAME];
                if (!abbr) return [0,0,0,0];
                if (this.delegate.selectedStates && !this.delegate.selectedStates.has(abbr === 'NSW' ? 'NSW/ACT' : abbr)) {
                    return [0,0,0,0];
                }
                const gen = stateRooftopGen[abbr] || 0;
                let intensity = Math.min(255, (gen / 30000) * 255);
                return [255, 200, 0, intensity * 0.4];
            },
            getLineColor: [255, 255, 255, 60],
            lineWidthMinPixels: 1,
            pickable: false,
            updateTriggers: {
                getFillColor: [stateRooftopGen, this.delegate.selectedStates]
            }
        }));
    }

    if (todayCount > 0) {
      // Glow layer for active generation
      layers.push(new ScatterplotLayer({
        id: 'glow',
        data: {
          length: todayCount,
          attributes: {
            getPosition: { value: (active.filteredPositions || active.positions).subarray(dayStart*2, dayEnd*2), size: 2 },
            getRadius:   { value: active.filteredGeneration.subarray(dayStart, dayEnd),    size: 1 },
          },
        },
        radiusUnits: 'pixels', radiusScale: (window.innerWidth <= 600 ? 0.15 : 0.25), radiusMinPixels: 2, radiusMaxPixels: 50,
        getFillColor: [255, 255, 255, 40], opacity: 0.5,
        pickable: false, parameters: { depthTest: false },
      }));

      // Main station layer
      layers.push(new ScatterplotLayer({
        id: 'stations',
        data: {
          length: todayCount,
          attributes: {
            getPosition: { value: (active.filteredPositions || active.positions).subarray(dayStart*2, dayEnd*2), size: 2 },
            getFillColor:{ value: active.colors.subarray(dayStart*4, dayEnd*4), size: 4 },
            getRadius:   { value: active.filteredGeneration.subarray(dayStart, dayEnd),    size: 1 },
          },
        },
        radiusUnits: 'pixels', radiusScale: (window.innerWidth <= 600 ? 0.12 : 0.2), radiusMinPixels: 2, radiusMaxPixels: 40,
        opacity: 0.95, pickable: true, parameters: { depthTest: false },
        _dayStart: dayStart,
      }));
    }

    this.overlay.setProps({ layers });
  }

  _resolveRecordIndex(info) {
    const active = this._getActiveData();
    let activeIdx;
    if (info.layer.id === 'stations') {
      const dayStart = info.layer.props._dayStart ?? active.dayOffsets[this.currentDay];
      activeIdx = dayStart + info.index;
    } else {
      return -1;
    }
    if (active.originalIndices) {
      return (activeIdx >= 0 && activeIdx < active.originalIndices.length)
        ? active.originalIndices[activeIdx] : -1;
    }
    return activeIdx;
  }
}
