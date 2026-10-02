import json
import struct
import random
from datetime import datetime

with open('oe_full_stations.json', 'r') as f:
    raw_stations = json.load(f)

def map_fuel_type(fuel):
    fuel = str(fuel).lower()
    if 'coal' in fuel: return 'coal'
    if 'battery' in fuel: return 'gas' # Treat battery as gas for orange/yellow color? Actually gas is orange.
    if 'gas' in fuel or 'diesel' in fuel or 'distillate' in fuel or 'liquid' in fuel: return 'gas'
    if 'water' in fuel or 'hydro' in fuel: return 'hydro'
    if 'wind' in fuel: return 'wind'
    if 'solar' in fuel: return 'commercial_solar'
    if 'biomass' in fuel: return 'coal' # Biomass as coal (dark)
    return 'gas'

stations = []
id_counter = 1
for r in raw_stations:
    cap = r['capacity_mw']
    if cap <= 0: cap = 50
    if 'battery' in str(r['fueltech']).lower(): continue
    cat = map_fuel_type(r['fueltech'])
    
    stations.append({
        'id': id_counter,
        'oe_id': r['code'],
        'name': r['name'],
        'lat': r['lat'],
        'lon': r['lon'],
        'type': cat,
        'capacity_mw': cap,
        'start_year': r['start_year']
    })
    id_counter += 1

print(f"Loaded {len(stations)} real stations from OpenElectricity.")

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
        
        cap = s['capacity_mw']
        cf = 0.5
        if s['type'] == 'commercial_solar': cf = 0.25 * solar_factor
        elif s['type'] == 'hydro': cf = 0.3 * hydro_factor
        elif s['type'] == 'wind': cf = 0.35
        elif s['type'] == 'coal': cf = 0.7
        
        # INCREASE random noise so the circles jitter more visibly (0.3 to 1.7)
        noise = random.uniform(0.3, 1.7)
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
    "totalDays": num_months,
    "recordCount": len(records),
    "dayOffsets": day_offsets,
    "fuelTypes": fuel_types
}
with open('data_energy/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

with open('data_energy/energy.bin', 'wb') as f:
    for r in records:
        f.write(struct.pack('<HffBf', r['facility_id'], r['lon'], r['lat'], r['cat_idx'], r['generation']))

print("Done.")
