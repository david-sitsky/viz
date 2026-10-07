
# Test Execution Rules
- Always run npm tests synchronously by increasing the timeout threshold (e.g. WaitMsBeforeAsync).
- Ensure you never leave test processes running in the background.

# Git and GitHub Rules
- Never automatically push commits to GitHub (e.g. `git push`) without explicit permission from the user. Always present the changes and ask for approval before pushing.

- **Git Push Protocol:** Always run `git pull --rebase origin main` *before* starting work, and *right before* executing a `git push`. Since GitHub Actions (like the data pipeline and test runners) routinely push version-stamp and metadata updates to files like `index.html` and `energy_app.js`, failing to pull first will cause complex merge conflicts. If a conflict does occur with `?v=` version strings, abort the rebase, use `git merge` or discard the local changes, and rely on `python3 common/scripts/update_html_version.py` to rebuild them cleanly before pushing.
