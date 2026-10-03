import re

with open('generate_from_oe.py', 'r') as f:
    text = f.read()

# We need to map network_region to a state string.
# SA1 -> SA, WEM/WA1 -> WA, QLD1 -> QLD, TAS1 -> TAS, VIC1 -> VIC, NSW1 -> NSW/ACT
state_map_code = """
        mapped_type = fuel_tech_map.get(s.get('fueltech'), 'other')
        if mapped_type == 'other':
            continue
            
        region = s.get('network_region', '')
        state = 'Other'
        if 'NSW' in region: state = 'NSW/ACT'
        elif 'QLD' in region: state = 'QLD'
        elif 'SA' in region: state = 'SA'
        elif 'TAS' in region: state = 'TAS'
        elif 'VIC' in region: state = 'VIC'
        elif 'WA' in region or 'WEM' in region: state = 'WA'
        elif 'NT' in region: state = 'NT'

        f = {
            "id": idx + 1,
            "oe_id": s['code'],
            "name": s['name'],
            "lat": s['lat'],
            "lon": s['lon'],
            "type": mapped_type,
            "state": state,
"""

# Replace the block that creates f
text = re.sub(
    r"        mapped_type = fuel_tech_map.get\(s\.get\('fueltech'\), 'other'\)\n        if mapped_type == 'other':\n            continue\n        f = {\n            \"id\": idx \+ 1,\n            \"oe_id\": s\['code'\],\n            \"name\": s\['name'\],\n            \"lat\": s\['lat'\],\n            \"lon\": s\['lon'\],\n            \"type\": mapped_type,",
    state_map_code.strip('\n'),
    text
)

# Also add state to the rooftop virtual facilities
text = text.replace(
    '"name": "NEM Rooftop Solar",\n        "lat": -90.0,\n        "lon": 0.0,\n        "type": "rooftop_solar",',
    '"name": "NEM Rooftop Solar",\n        "lat": -90.0,\n        "lon": 0.0,\n        "type": "rooftop_solar",\n        "state": "NEM (Multi-state)",'
)
text = text.replace(
    '"name": "WEM Rooftop Solar",\n        "lat": -90.0,\n        "lon": 0.0,\n        "type": "rooftop_solar",',
    '"name": "WEM Rooftop Solar",\n        "lat": -90.0,\n        "lon": 0.0,\n        "type": "rooftop_solar",\n        "state": "WA",'
)

with open('generate_from_oe.py', 'w') as f:
    f.write(text)
