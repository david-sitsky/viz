# Energy Visualisation (Australia's Power Grid)

This directory contains the code, data pipeline, and UI for the interactive Australian Energy Grid visualisation. 

## Data Pipeline

The data is sourced directly from the **OpenElectricity API** (`api.openelectricity.org.au`), tracking power generation across Australia's National Electricity Market (NEM).

The pipeline relies on three main Python scripts located in `scripts/`:

1. **`fetch_aemo_data.py`**:
   Maintains a static, hardcoded registry of major Australian power stations (Loy Yang, Eraring, Snowy Hydro, etc.), mapping their AEMO IDs (`oe_id`) to geographic coordinates and capacities. This script generates `data/facilities.json`.

2. **`update_data.py` / `update_historical.py`**:
   These scripts take the registry of facilities and asynchronously hit the OpenElectricity API using `aiohttp`. 
   - They fetch the `energy` metric aggregated at a `1d` (daily) interval.
   - To avoid rate limits, the data is fetched in chunks and saved incrementally to a flat text database: `data/raw_events.csv`.
   - **Environment Variable Requirement:** The scripts require `OPENELECTRICITY_API_KEY` to be set in the environment.

3. **`build_blob.py`**:
   To ensure the web UI loads instantly, we do not ship the raw CSV to the browser. Instead, this script reads `raw_events.csv` and `facilities.json`, and tightly packs the daily generation values into a highly optimized binary format: `data/energy.bin`. It also outputs a lightweight `data/metadata.json` containing the start/end timelines.

## GitHub Actions Automation

The entire pipeline is fully automated via the `.github/workflows/daily-update.yml` GitHub Action.

Because the `energy.bin` and `metadata.json` files update every single day, they are **intentionally gitignored** to prevent the Git repository history from bloating. 
Instead, the GitHub Action generates them on the fly during the CI run, and uploads them as temporary deployment artifacts directly to GitHub Pages.

## Frontend UI Architecture

- **Map Engine:** `deck.gl` combined with `MapLibre GL JS`.
- **Logic:** `js/energy_app.js` controls the timeline scrubbing and application state, while `js/energy_map.js` handles rendering the `deck.gl` layers (ScatterplotLayer for facilities, GeoJsonLayer for the states).
- **Rooftop Solar Integration:** A custom visualization mode handles rooftop solar, falling back to state-wide centroid bubbles when polygon rendering isn't active.
