import sys
import glob

files = glob.glob('**/*.spec.js', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Replace click() with click({ force: true })
    content = content.replace("await settingsBtn.click();", "await settingsBtn.click({ force: true });")
    
    with open(file, 'w') as f:
        f.write(content)

