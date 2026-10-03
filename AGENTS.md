# Testing Guidelines
Always run all tests (`npm run test`) and ensure they pass before committing any changes. If tests fail, fix them or update them to reflect intentional changes before creating the commit.
Whenever we fix a bug, we should add a test.
If Playwright tests fail or hang open serving an HTML report, ALWAYS ensure you kill lingering processes using `pkill -f 'playwright test'` so they don't block subsequent commands.
