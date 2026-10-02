import re
import json

html = open('oe_facilities.html').read()
matches = re.findall(r'self\.__next_f\.push\((.*?)\)</script>', html)
print(f"Found {len(matches)} next_f chunks")

full_text = ""
for m in matches:
    # m is something like `[1, "payload"]`
    try:
        data = json.loads(m)
        if isinstance(data, list) and len(data) >= 2:
            if isinstance(data[1], str):
                full_text += data[1]
    except Exception as e:
        pass

print(f"Extracted string length: {len(full_text)}")
if "latitude" in full_text:
    print("Found 'latitude' in full_text!")
if "-37." in full_text:
    print("Found '-37.' in full_text!")

with open("next_f_extracted.txt", "w") as f:
    f.write(full_text)
