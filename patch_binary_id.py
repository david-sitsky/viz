import re

with open('generate_from_oe.py', 'r') as f:
    text = f.read()

# Replace "facility_id": idx + 1 with "facility_id": s['id']
text = text.replace('"facility_id": idx + 1,', '"facility_id": s[\'id\'],')

with open('generate_from_oe.py', 'w') as f:
    f.write(text)
