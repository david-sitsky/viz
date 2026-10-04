# Nature Visualisations

A collection of interactive geospatial web visualisations powered by `deck.gl`.

## Visualisations

This repository currently hosts three separate visualization projects:

1. **[FrogID Explorer](frogid.html)**: Visualise acoustic frog calls and citizen science data across Australia over time.
2. **[Bogong Moth Tracker](bogong.html)**: Track the migration and observation patterns of the Bogong Moth.
3. **[Energy Dashboard](energy.html)**: An interactive timeline of Australia's energy generation network powered by OpenElectricity data.

## Project Structure

* `js/` - Frontend Javascript modules specific to each visualisation
* `scripts/` - Python utilities for data fetching, building, and cache-busting
* `data/` - Static assets and data files for each project (`frogid`, `bogong`, `energy`)
* `tests/` - Playwright end-to-end tests for UI and map rendering verification

## Automated Data Pipeline
The **Energy Dashboard** is kept up to date automatically via a GitHub Actions pipeline (`.github/workflows/daily-update.yml`). The Action runs daily, fetches the latest generation data from the OpenElectricity API, intelligently appends it to the Git-tracked `data/energy/raw_events.csv`, and then dynamically compiles the efficient `.bin` arrays directly into the GitHub Pages deployment artifact. 

## Local Development

To run the site locally:

1. Install Python dependencies: `pip install aiohttp`
2. Start the local server: `python3 scripts/server.py`
3. Visit `http://127.0.0.1:8889` in your browser.

## Testing

Tests are written using Playwright. To run the suite locally:

```bash
npm install
npx playwright test
```
