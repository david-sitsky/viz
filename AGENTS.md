# Testing Guidelines
Always run all tests (`npm run test`) and ensure they pass before committing any changes. This automatically spins up the local server and runs the entire Playwright suite, including the `smoke_404.spec.js` global link checker, ensuring no 404s or broken paths are committed. If tests fail, fix them or update them to reflect intentional changes before creating the commit.
Whenever we fix a bug, we should add a test.
If Playwright tests fail or hang open serving an HTML report, ALWAYS ensure you kill lingering processes using `pkill -f 'playwright test'` so they don't block subsequent commands.

## Repository Hygiene
1. **Never commit third-party site-packages** (e.g. `aiohttp`, `idna`, `pycparser`, etc.) or `__pycache__` directories directly into the repository. Let `pip` handle them via a `requirements.txt` or install them globally in your environment.
2. **Never commit scratch scripts** (e.g. `test_*.py`, `patch_*.js`, `dump.py`, `download_aemo.js`). Any scratch files used to prototype code or test solutions should be stored exclusively outside the tracked tree or deleted entirely before concluding the interaction.
3. **Keep binary files out of Git history** (wherever possible) unless they are static assets. Fast-moving generated data blobs should be handled by CI/CD artifacts to avoid bloating the Git `.pack` files.

## Scaffolding a New Visualisation
When asked to create a new visualisation for this repository, follow this strictly modular architecture:
1. **Directory Structure**: Create a brand new top-level directory (e.g. `newapp/`). Inside it, create `data/`, `js/`, `scripts/`, and `tests/` directories.
2. **Shared Assets**: Always reuse the core engine logic and UI styles by linking to `../common/styles.css` and the JS engine files in `../common/js/`.
3. **Clean URLs**: Name the main HTML file `index.html` inside the app directory (e.g. `newapp/index.html`) so GitHub Pages serves it natively at `/viz/newapp/`.
4. **Landing Page Integration**: Update the root `/index.html` file to include a new `<a class="card" href="newapp/">` entry in the main grid so users can discover it.
5. **UI Navigation**: Ensure your app's `index.html` includes the standard inline "🏠" home button (`<a href="../" class="ctrl-btn home-nav-inline" title="Back to Visualisations" style="text-decoration: none;">🏠</a>`) integrated natively into the top-left-panel playback controls so the user can easily return to the root landing page.
6. **Testing**: Add the new route to `common/tests/smoke_404.spec.js` to strictly enforce that it loads without 404 broken path errors. Create a dedicated `newapp/tests/` suite for its specific UI logic.
7. **Automation**: If the visualization requires automated, scheduled data extraction, add the update script execution sequence to `.github/workflows/daily-update.yml` and ensure any heavy `.bin` payload is listed as an ignored deployment artifact.
