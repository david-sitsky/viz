import re

with open('generate_from_oe.py', 'r') as f:
    text = f.read()

# Remove the json.dump from its current position
text = re.sub(r'    with open\(\'data_energy/facilities.json\', \'w\'\) as f:\n        json.dump\(facilities, f, indent=2\)\n', '', text)

# Add it back after appending the rooftop facilities (just before fuel_types)
add_back = """
    with open('data_energy/facilities.json', 'w') as f:
        json.dump(facilities, f, indent=2)

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
"""
text = text.replace('    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]', add_back.strip('\n'))

with open('generate_from_oe.py', 'w') as f:
    f.write(text)
