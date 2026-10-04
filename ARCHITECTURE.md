# Visualization Engine Architecture

This document serves as a knowledge base for the visualization engine, summarizing the highly modular architecture, core engines, and critical WebGL lessons learned.

## System Overview

The engine is a static HTML/JS/CSS application designed to render millions of data points over time on an interactive map. It uses:
- **MapLibre GL JS** for the base map rendering.
- **Deck.gl** (specifically `MapboxOverlay` with `interleaved: false`) to overlay WebGL data layers (e.g., `ScatterplotLayer`) on top of the map.
- **Vanilla JavaScript & CSS** for the UI components. No modern framework (React/Vue) is used, keeping the project lightweight and fast.

### Core Modules (`common/js/`)
To prevent code duplication across visualisations, all apps share a core engine located in `common/js/`:
- `engine_data.js`: Responsible for fetching and parsing custom binary payload formats (`.bin`) using `DataView` for extreme memory efficiency and parsing speed.
- `engine_map.js`: Manages the MapLibre instance, map style toggling (Light/Dark/Satellite), and the Deck.gl overlay lifecycle.

### App-Specific Modules (e.g., `energy/js/`)
Each visualization houses its own specialized logic:
- `app.js`: The main controller. Handles DOM caching, UI event listeners (play, pause, rewind, scrubber), and orchestrates the app lifecycle.
- `map.js` (Optional overrides): Custom layer rendering (e.g. GeoJson layers for state borders, dynamic sizing for energy facilities).

### Binary Preprocessing (e.g., `energy/scripts/build_blob.py`)
Large raw datasets (e.g., CSVs) are completely unsuited for browser-based animation. Each visualization uses a Python build script to pack raw data into a contiguous binary representation (`.bin`) that identically maps to `engine_data.js` for instant browser decoding.

## Critical Lessons Learned & Gotchas

1. **MapLibre vs Deck.gl Touch Events (Mobile):**
   - Deck.gl captures interactions by intercepting MapLibre's synthesized events. MapLibre MUST have exclusive control over the raw touch events. 
   - Invisible UI wrappers (e.g., flex containers stretching across the screen) MUST have `pointer-events: none` in CSS, while their interactive children get `pointer-events: auto`. Without this, invisible empty spaces will block the map from receiving touch/pan gestures.
   - Using `touch-action: pan-y` on full-width wrapper divs will strictly enforce vertical scrolling on mobile and completely break horizontal map panning beneath it.

2. **MapLibre Map Resize Infinite Loop:**
   - Never call `this.map.resize()` inside a callback bound to the `this.map.on('resize', ...)` event. This triggers an infinite recursion loop that crashes the browser. Keep UI sync functions and resize triggers strictly separated.

3. **MapLibre Diagonal Pinch Zoom:**
   - If map rotation is disabled (`disableRotation()`), MapLibre sometimes ignores diagonal pinch zooms because the natural twist of fingers triggers the "rotate" threshold before the "zoom" threshold. Fix this by explicitly setting a low zoom threshold: `map.touchZoomRotate.setZoomThreshold(0.01)`.

4. **Playwright and Silent 404s:**
   - Playwright's `page.goto()` does *not* throw an error if secondary assets (like `styles.css` or `app.js`) return a 404 Not Found. Tests will pass if they only check for DOM existence. This is why our global `common/tests/smoke_404.spec.js` explicitly intercepts `page.on('response')` to aggressively catch broken links.
