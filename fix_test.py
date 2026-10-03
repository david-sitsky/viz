import re

with open('tests/energy.spec.js', 'r') as f:
    text = f.read()

# Remove the closing }); from before the test
text = text.replace("  });\n});\n\n  test('should display correct metadata", "  });\n\n  test('should display correct metadata")

# Add the closing }); at the very end
text += "\n});\n"

with open('tests/energy.spec.js', 'w') as f:
    f.write(text)
