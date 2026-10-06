# Interactive Visualisations

A collection of interactive geospatial web visualisations powered by `deck.gl`.

## Visualisations

This repository currently hosts three separate visualization projects:

1. **[Energy Dashboard](energy/)**: An interactive timeline of Australia's energy generation network powered by OpenElectricity data.
2. **[FrogID Explorer](frogid/)**: Visualise acoustic frog calls and citizen science data across Australia over time.
3. **[Bogong Moth Tracker](bogong/)**: Track the migration and observation patterns of the Bogong Moth.
4. **[Christmas Beetle Tracker](christmas-beetle/)**: Track citizen observations of the Australian Christmas Beetle over time.

## Project Structure

The repository is built on a highly modular architecture:

* `common/` - Shared assets, UI stylesheets (`styles.css`), base JS engines (`engine_data.js`, `engine_map.js`), and global Playwright tests. Shared Python utilities (`ala_sync.py`, `ala_build.py`) reside in `common/scripts/`.
* `energy/` - Energy dashboard app, including its own `js/`, `data/`, `tests/`, and Python `scripts/`.
* `frogid/` - FrogID app module.
* `bogong/` - Bogong Moth app module.
* `christmas-beetle/` - Christmas Beetle app module.

## Automated Data Pipeline
The visualisations are kept up to date automatically via a GitHub Actions pipeline (`.github/workflows/daily-update.yml`):
- **Energy Dashboard**: Fetches the latest generation data from the OpenElectricity API, appends it to `energy/data/raw_events.csv`, and compiles `.bin` arrays.
- **ALA Datasets (Bogong & Christmas Beetle)**: Uses `common/scripts/ala_sync.py` to query the Atlas of Living Australia API for new occurrences. Then `common/scripts/ala_build.py` compresses the occurrences into `.bin` and `.json` artifacts and fetches hi-res species thumbnails and common names from the iNaturalist API.

The Action runs daily. It dynamically compiles the data directly into the GitHub Pages deployment artifact and updates browser caching via `update_html_version.py`.

## Local Development

To run the site locally:

1. Install Python dependencies: `pip install aiohttp`
2. Start the local server: `python3 common/scripts/server.py`
3. Visit `http://127.0.0.1:8889` in your browser.

## Testing

Tests are written using Playwright. To run the suite locally:

```bash
npm install
npx playwright test
```
