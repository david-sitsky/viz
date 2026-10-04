# Testing Guidelines
Always run all tests (`npm run test`) and ensure they pass before committing any changes. This automatically spins up the local server and runs the entire Playwright suite, including the `smoke_404.spec.js` global link checker, ensuring no 404s or broken paths are committed. If tests fail, fix them or update them to reflect intentional changes before creating the commit.
Whenever we fix a bug, we should add a test.
If Playwright tests fail or hang open serving an HTML report, ALWAYS ensure you kill lingering processes using `pkill -f 'playwright test'` so they don't block subsequent commands.

## Repository Hygiene
1. **Never commit third-party site-packages** (e.g. `aiohttp`, `idna`, `pycparser`, etc.) or `__pycache__` directories directly into the repository. Let `pip` handle them via a `requirements.txt` or install them globally in your environment.
2. **Never commit scratch scripts** (e.g. `test_*.py`, `patch_*.js`, `dump.py`, `download_aemo.js`). Any scratch files used to prototype code or test solutions should be stored exclusively outside the tracked tree or deleted entirely before concluding the interaction.
3. **Keep binary files out of Git history** (wherever possible) unless they are static assets. Fast-moving generated data blobs should be handled by CI/CD artifacts to avoid bloating the Git `.pack` files.
