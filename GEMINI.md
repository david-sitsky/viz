
# Test Execution Rules
- Always run npm tests synchronously by increasing the timeout threshold (e.g. WaitMsBeforeAsync).
- Ensure you never leave test processes running in the background.

# Git and GitHub Rules
- Never automatically push commits to GitHub (e.g. `git push`) without explicit permission from the user. Always present the changes and ask for approval before pushing.
