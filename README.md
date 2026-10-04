# Interactive Visualisations

A collection of interactive geospatial web visualisations powered by `deck.gl`.

## Visualisations

This repository currently hosts three separate visualization projects:

1. **[Energy Dashboard](energy/)**: An interactive timeline of Australia's energy generation network powered by OpenElectricity data.
2. **[FrogID Explorer](frogid/)**: Visualise acoustic frog calls and citizen science data across Australia over time.
3. **[Bogong Moth Tracker](bogong/)**: Track the migration and observation patterns of the Bogong Moth.

## Project Structure

The repository is built on a highly modular architecture:

* `common/` - Shared assets, UI stylesheets (`styles.css`), base JS engines (`engine_data.js`, `engine_map.js`), and global Playwright tests.
* `energy/` - Energy dashboard app, including its own `js/`, `data/`, `tests/`, and Python `scripts/`.
* `frogid/` - FrogID app module.
* `bogong/` - Bogong Moth app module.

## Automated Data Pipeline
The **Energy Dashboard** is kept up to date automatically via a GitHub Actions pipeline (`.github/workflows/daily-update.yml`). The Action runs daily, fetches the latest generation data from the OpenElectricity API, intelligently appends it to the Git-tracked `energy/data/raw_events.csv`, and then dynamically compiles the efficient `.bin` arrays directly into the GitHub Pages deployment artifact. 

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
