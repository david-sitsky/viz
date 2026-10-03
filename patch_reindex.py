import re

with open('generate_from_oe.py', 'r') as f:
    text = f.read()

reindex_code = """
    for i, f in enumerate(facilities):
        f['id'] = i + 1

    with open('data_energy/facilities.json', 'w') as f:
"""

text = text.replace("    with open('data_energy/facilities.json', 'w') as f:", reindex_code.lstrip('\n'))

with open('generate_from_oe.py', 'w') as f:
    f.write(text)
