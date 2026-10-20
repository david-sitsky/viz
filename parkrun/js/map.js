const maplibregl = globalThis.maplibregl;
const MapboxOverlay = globalThis.deck.MapboxOverlay || globalThis.deck.MapLibreOverlay;
const ScatterplotLayer = globalThis.deck.ScatterplotLayer;

export const MAP_STYLES = {
  dark:      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  streets:   'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite: '../common/data/satellite-style.json',
};

// Color ramp: Cyan -> Lime -> Amber -> Orange -> Crimson
const COLOR_STOPS = [
  { val: 0,   rgb: [34, 211, 238] },  // Cyan (#22d3ee)
  { val: 60,  rgb: [45, 212, 191] },  // Teal
  { val: 120, rgb: [132, 204, 22] },  // Lime (#84cc16)
  { val: 220, rgb: [245, 158, 11] },  // Amber (#f59e0b)
  { val: 380, rgb: [249, 115, 22] },  // Bright Orange (#f97316)
  { val: 600, rgb: [225, 29, 72] }    // Crimson/Rose (#e11d48)
];

export function getRunnerColor(finishers, alpha = 210) {
  if (finishers <= COLOR_STOPS[0].val) {
    const c = COLOR_STOPS[0].rgb;
    return [c[0], c[1], c[2], alpha];
  }
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const s1 = COLOR_STOPS[i];
    const s2 = COLOR_STOPS[i + 1];
    if (finishers <= s2.val) {
      const t = (finishers - s1.val) / (s2.val - s1.val);
      const r = Math.round(s1.rgb[0] + t * (s2.rgb[0] - s1.rgb[0]));
      const g = Math.round(s1.rgb[1] + t * (s2.rgb[1] - s1.rgb[1]));
      const b = Math.round(s1.rgb[2] + t * (s2.rgb[2] - s1.rgb[2]));
      return [r, g, b, alpha];
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1].rgb;
  return [last[0], last[1], last[2], alpha];
}

function calculateOptimalAustraliaViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobilePortrait = (w <= 600 && h > w);
  const centerLng = 133.5;
  const centerLat = isMobilePortrait ? -25.5 : -27.6;
  let zoom;
  if (w <= 450) zoom = isMobilePortrait ? 2.15 : 2.4;
  else if (w <= 650) zoom = isMobilePortrait ? 2.45 : 2.7;
  else if (w <= 1000) zoom = 3.0;
  else if (w <= 1400) zoom = 3.35;
  else zoom = 3.5;
  
  return { longitude: centerLng, latitude: centerLat, zoom };
}

export class ParkrunMap {
  constructor(containerId, data, onSelectRecord = null) {
    this.data = data;
    this.onSelectRecord = onSelectRecord;
    this.currentWeek = 0;
    this.showAllEstablished = true;
    this.pinnedRecord = null;
    this.hoveredRecord = null;
    this.lastHoverPos = null;
    this.lastPinnedPos = null;
    this.selectedStateIds = new Set([0, 1, 2, 3, 4, 5, 6, 7]);

    const initialView = calculateOptimalAustraliaViewport();

    this.map = new maplibregl.Map({
      container: containerId,
      style: MAP_STYLES.dark,
      center: [initialView.longitude, initialView.latitude],
      zoom: initialView.zoom,
      minZoom: 2,
      maxZoom: 18,
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
      pickingRadius: 14,
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

    // Dismiss pinned tooltip when clicking bare map
    this.map.on('click', (e) => {
      // If clicked on empty map space
      if (!this._lastPickedObject) {
        if (this.pinnedRecord) {
          this.clearPin();
        }
      }
      this._lastPickedObject = null;
    });

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

  setStyle(styleKey) {
    const styleUrl = MAP_STYLES[styleKey] || MAP_STYLES.dark;
    this.map.setStyle(styleUrl);
  }

  setWeek(weekIdx) {
    this.currentWeek = Math.max(0, Math.min(weekIdx, this.data.metadata.totalWeeks - 1));
    this._updateLayers();
  }

  toggleEstablishedMarkers(show) {
    this.showAllEstablished = show;
    this._updateLayers();
  }

  setSelectedStates(stateIdsSet) {
    this.selectedStateIds = stateIdsSet;
    const target = this.pinnedRecord || this.hoveredRecord;
    if (target && this.selectedStateIds) {
      const stateId = (target.stateId !== undefined) ? target.stateId : this.data.eventMap.get(target.eventId)?.state_id;
      if (stateId !== undefined && !this.selectedStateIds.has(stateId)) {
        this.clearPin();
      }
    }
    this._updateLayers();
  }

  clearPin() {
    this.pinnedRecord = null;
    this.lastPinnedPos = null;
    this._lastPickedObject = null;
    if (this.onSelectRecord) this.onSelectRecord(null);
    this._updateLayers();
  }

  _handleHover(info) {
    if (this.map && (this.map.isMoving() || this.map.isZooming())) return;
    if (this.pinnedRecord) return; // Keep pinned popup open

    const container = document.getElementById(this.map.getContainer().id);
    if (!info || info.index < 0 || !info.object) {
      if (container) container.style.cursor = '';
      this.hoveredRecord = null;
      this.lastHoverPos = null;
      if (this.onSelectRecord) this.onSelectRecord(null);
      return;
    }

    if (container) container.style.cursor = 'pointer';
    this.hoveredRecord = info.object;
    this.lastHoverPos = { x: info.x, y: info.y };
    if (this.onSelectRecord) {
      this.onSelectRecord(info.object, info.x, info.y, false);
    }
  }

  _handleClick(info) {
    if (!info || info.index < 0 || !info.object) return;
    this._lastPickedObject = info.object;
    this.pinnedRecord = info.object;
    this.lastPinnedPos = { x: info.x, y: info.y };
    if (this.onSelectRecord) {
      this.onSelectRecord(info.object, info.x, info.y, true);
    }
    this._updateLayers();
  }

  _updateLayers() {
    const { weekOffsets, totalWeeks, weekStats } = this.data.metadata;
    const w = this.currentWeek;
    const startIdx = weekOffsets[w] || 0;
    const endIdx = (w + 1 < weekOffsets.length) ? weekOffsets[w + 1] : startIdx;
    const weekDate = weekStats[w] ? weekStats[w].date : '';

    const isMobile = window.innerWidth <= 600;
    const radiusScale = isMobile ? 0.85 : 1.15;

    const activeRecords = [];
    for (let i = startIdx; i < endIdx; i++) {
      const sid = this.data.stateIds[i];
      if (this.selectedStateIds && !this.selectedStateIds.has(sid)) {
        continue;
      }
      const evId = this.data.eventIds[i];
      const evMeta = this.data.eventMap.get(evId);
      const placename = evMeta ? (evMeta.shortName || evMeta.longName.replace(/\s+parkrun.*/i, '')) : `Event #${evId}`;
      activeRecords.push({
        recordIndex: i,
        eventId: evId,
        eventNumber: this.data.eventNumbers ? this.data.eventNumbers[i] : null,
        stateId: sid,
        lon: this.data.positions[i * 2],
        lat: this.data.positions[i * 2 + 1],
        finishers: this.data.finishers[i],
        date: weekDate,
        placename: placename,
        name: evMeta ? evMeta.longName : `Event #${evId}`,
        location: evMeta ? evMeta.location : '',
        eventname: evMeta ? evMeta.eventname : ''
      });
    }

    const layers = [];

    // Layer 1: Established past locations (dim gray background dots)
    if (this.showAllEstablished && startIdx > 0) {
      const currentActiveIds = new Set(activeRecords.map(r => r.eventId));
      const establishedEvents = [];
      const seenIds = new Set();
      
      for (let i = 0; i < startIdx; i++) {
        const id = this.data.eventIds[i];
        const sid = this.data.stateIds[i];
        if (this.selectedStateIds && !this.selectedStateIds.has(sid)) {
          continue;
        }
        if (!seenIds.has(id)) {
          seenIds.add(id);
          if (!currentActiveIds.has(id)) {
            const evMeta = this.data.eventMap.get(id);
            if (evMeta) {
              const placename = evMeta.shortName || evMeta.longName.replace(/\s+parkrun.*/i, '');
              establishedEvents.push({
                eventId: id,
                stateId: sid,
                lon: evMeta.lon,
                lat: evMeta.lat,
                placename: placename,
                name: evMeta.longName,
                location: evMeta.location,
                eventname: evMeta.eventname,
                isPastVenue: true,
                isInactiveThisWeek: true,
                date: weekDate,
                finishers: 0,
                eventNumber: null
              });
            }
          }
        }
      }

      if (establishedEvents.length > 0) {
        layers.push(
          new ScatterplotLayer({
            id: 'established-locations',
            data: establishedEvents,
            getPosition: d => [d.lon, d.lat],
            getRadius: 3.5,
            radiusUnits: 'pixels',
            radiusMinPixels: 2.5,
            radiusMaxPixels: 6,
            getFillColor: [140, 150, 165, 80],
            stroked: true,
            getLineColor: [200, 215, 230, 140],
            getLineWidth: 0.8,
            lineWidthUnits: 'pixels',
            pickable: true,
            updateTriggers: {
              data: [w]
            }
          })
        );
      }
    }

    // Layer 2: Pulse glow halo with color graduation matching turnout
    layers.push(
      new ScatterplotLayer({
        id: 'active-events-glow',
        data: activeRecords,
        getPosition: d => [d.lon, d.lat],
        getRadius: d => Math.sqrt(Math.max(1, d.finishers)) * (radiusScale * 1.7),
        radiusUnits: 'pixels',
        radiusMinPixels: 4,
        radiusMaxPixels: 55,
        getFillColor: d => getRunnerColor(d.finishers, 45),
        stroked: false,
        pickable: false,
        transitions: {
          getRadius: 250
        },
        updateTriggers: {
          data: [w]
        }
      })
    );

    // Layer 3: Main active event circles sized by sqrt(finishers) in PIXELS
    // so that Circle Area on screen is strictly proportional to runner count!
    layers.push(
      new ScatterplotLayer({
        id: 'active-events',
        data: activeRecords,
        getPosition: d => [d.lon, d.lat],
        getRadius: d => Math.sqrt(Math.max(1, d.finishers)) * radiusScale,
        radiusUnits: 'pixels',
        radiusMinPixels: 3,
        radiusMaxPixels: 38,
        getFillColor: d => getRunnerColor(d.finishers, 225),
        getLineColor: [255, 255, 255, 240],
        getLineWidth: 1.2,
        lineWidthUnits: 'pixels',
        stroked: true,
        pickable: true,
        transitions: {
          getRadius: 250
        },
        updateTriggers: {
          data: [w]
        }
      })
    );

    // Layer 4: Pinned event highlight ring (shows which venue is currently filtered)
    if (this.pinnedRecord && this.pinnedRecord.lon && this.pinnedRecord.lat) {
      const p = this.pinnedRecord;
      layers.push(
        new ScatterplotLayer({
          id: 'pinned-event-highlight',
          data: [p],
          getPosition: d => [d.lon, d.lat],
          getRadius: d => Math.max(14, (Math.sqrt(Math.max(1, d.finishers || 0)) * radiusScale) + 5),
          radiusUnits: 'pixels',
          stroked: true,
          filled: false,
          getLineColor: [255, 255, 255, 250],
          getLineWidth: 2.5,
          lineWidthUnits: 'pixels',
          pickable: false,
          updateTriggers: {
            data: [p.eventId, p.finishers]
          }
        })
      );
    }

    // Update live hovered or pinned popup with current week's turnout
    const target = this.pinnedRecord || this.hoveredRecord;
    if (target && this.onSelectRecord) {
      const isPinned = !!this.pinnedRecord;
      const targetStateId = (target.stateId !== undefined) ? target.stateId : this.data.eventMap.get(target.eventId)?.state_id;
      if (this.selectedStateIds && targetStateId !== undefined && !this.selectedStateIds.has(targetStateId)) {
        this.clearPin();
        this.overlay.setProps({ layers });
        return;
      }
      const matched = activeRecords.find(r => r.eventId === target.eventId);
      if (matched) {
        if (isPinned) this.pinnedRecord = matched;
        else this.hoveredRecord = matched;
        const pt = (this.map && matched.lon && matched.lat)
          ? this.map.project([matched.lon, matched.lat])
          : (isPinned ? this.lastPinnedPos : this.lastHoverPos);
        this.onSelectRecord(matched, pt ? pt.x : 0, pt ? pt.y : 0, isPinned);
      } else {
        const evMeta = this.data.eventMap.get(target.eventId);
        const inactiveRecord = {
          eventId: target.eventId,
          eventNumber: null,
          finishers: 0,
          isInactive: true,
          isPastVenue: true,
          date: weekDate,
          placename: target.placename,
          name: target.name,
          location: target.location,
          eventname: target.eventname,
          lon: target.lon || (evMeta ? evMeta.lon : 0),
          lat: target.lat || (evMeta ? evMeta.lat : 0)
        };
        if (isPinned) this.pinnedRecord = inactiveRecord;
        else this.hoveredRecord = inactiveRecord;
        const pt = (this.map && inactiveRecord.lon && inactiveRecord.lat)
          ? this.map.project([inactiveRecord.lon, inactiveRecord.lat])
          : (isPinned ? this.lastPinnedPos : this.lastHoverPos);
        this.onSelectRecord(inactiveRecord, pt ? pt.x : 0, pt ? pt.y : 0, isPinned);
      }
    }

    this.overlay.setProps({ layers });
  }
}
