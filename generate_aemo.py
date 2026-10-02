import sys
import os
import sys
import os
import random
import pandas as pd
import json
with open('oe_real_coords.json', 'r') as f:
    oe_coords = {item['code']: (item['lat'], item['lon']) for item in json.load(f) if item['lat'] is not None}

import json
import struct
from datetime import datetime, timedelta

def get_state_coords(region):
    # Rough bounding boxes for Australian states
    bounds = {
        'NSW1': {'lat': (-35.0, -29.0), 'lon': (142.0, 150.0)},
        'QLD1': {'lat': (-27.0, -15.0), 'lon': (141.0, 149.0)},
        'VIC1': {'lat': (-38.0, -35.0), 'lon': (142.0, 148.0)},
        'SA1':  {'lat': (-34.0, -28.0), 'lon': (135.0, 140.0)},
        'TAS1': {'lat': (-43.0, -41.0), 'lon': (145.0, 147.5)},
        'NT1':  {'lat': (-22.0, -13.0), 'lon': (130.0, 136.0)},
        'WA1':  {'lat': (-33.0, -20.0), 'lon': (116.0, 124.0)},
    }
    b = bounds.get(region, bounds['NSW1'])
    lat = random.uniform(b['lat'][0], b['lat'][1])
    lon = random.uniform(b['lon'][0], b['lon'][1])
    return lat, lon

def map_fuel_type(fuel):
    fuel = str(fuel).lower()
    if 'coal' in fuel: return 'coal'
    if 'gas' in fuel or 'diesel' in fuel: return 'gas'
    if 'water' in fuel or 'hydro' in fuel: return 'hydro'
    if 'wind' in fuel: return 'wind'
    if 'solar' in fuel: return 'commercial_solar'
    return 'gas' # default

df = pd.read_excel('aemo.xls', sheet_name='PU and Scheduled Loads', engine='openpyxl')

# Filter columns
df = df.dropna(subset=['Station Name', 'Fuel Source - Primary', 'Region'])

stations = []
id_counter = 1
for idx, row in df.iterrows():
    name = str(row['Station Name']).strip()
    duid = str(row['DUID']).strip() if pd.notnull(row['DUID']) else ""
    region = str(row['Region']).strip()
    fuel = row['Fuel Source - Primary']
    cap = row['Max Cap generation (MW)']
    
    try:
        cap = float(cap)
        if cap <= 0: cap = 50
    except:
        cap = 50

    
    cat = map_fuel_type(fuel)
    if duid in oe_coords:
        lat, lon = oe_coords[duid]
    elif duid.rstrip('123456789') in oe_coords:
        lat, lon = oe_coords[duid.rstrip('123456789')]
    else:
        lat, lon = get_state_coords(region)

    
    stations.append({
        'id': id_counter,
        'oe_id': duid if duid else f"AEMO_{id_counter}",
        'name': name,
        'lat': lat,
        'lon': lon,
        'type': cat,
        'capacity_mw': float(cap),
        'start_year': 2000
    })
    id_counter += 1

print(f"Parsed {len(stations)} real stations from AEMO.")

# Save to facilities.json
with open('data_energy/facilities.json', 'w') as f:
    json.dump(stations, f, indent=2)

# Generate energy.bin and metadata.json
start_date = datetime(2000, 1, 1)
end_date = datetime(2026, 12, 31)
num_months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1

fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}

records = []
day_offsets = []

for month_idx in range(num_months):
    day_offsets.append(len(records))
    year = start_date.year + month_idx // 12
    
    # Seasonal factors
    month = 1 + (month_idx % 12)
    solar_factor = 1.0 + 0.4 * (1 if month in [11,12,1,2] else -1)
    hydro_factor = 1.0 + 0.4 * (1 if month in [6,7,8] else -1)
    
    for s in stations:
        if year < s['start_year']: continue
        
        # Generation model based on capacity
        cap = s['capacity_mw']
        cf = 0.5 # capacity factor
        if s['type'] == 'commercial_solar': cf = 0.25 * solar_factor
        elif s['type'] == 'hydro': cf = 0.3 * hydro_factor
        elif s['type'] == 'wind': cf = 0.35
        elif s['type'] == 'coal': cf = 0.7
        
        # Random noise
        noise = random.uniform(0.8, 1.2)
        gen = (cap * 24 * 30 * cf * noise)
        
        records.append({
            "facility_id": s['id'],
            "lon": s['lon'],
            "lat": s['lat'],
            "cat_idx": fuel_type_to_id.get(s['type'], 0),
            "generation": max(0, gen)
        })

print(f"Generated {len(records)} records across {num_months} months.")

metadata = {
    "startDate": "2000-01-01",
    "totalDays": num_months, # Actually months
    "recordCount": len(records),
    "dayOffsets": day_offsets,
    "fuelTypes": fuel_types
}
with open('data_energy/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

with open('data_energy/energy.bin', 'wb') as f:
    for r in records:
        f.write(struct.pack('<HffBf', r['facility_id'], r['lon'], r['lat'], r['cat_idx'], r['generation']))

print("Done. Wrote facilities.json, metadata.json, and energy.bin")
