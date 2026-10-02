import json
import struct
import asyncio
import aiohttp
import os
from datetime import datetime, timedelta

API_KEY = os.environ.get("OPENELECTRICITY_API_KEY", "REMOVED_API_KEY")

async def fetch_facility(session, semaphore, fac_id, start_str, end_str):
    url = "https://api.openelectricity.org.au/v4/data/network/NEM"
    params = {
        "metrics": "energy",
        "interval": "1M",
        "date_start": start_str,
        "date_end": end_str,
        "facility_code": fac_id
    }
    
    async with semaphore:
        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    results = []
                    for item in data.get("data", []):
                        for r in item.get("results", []):
                            for row in r.get("data", []):
                                date_str = row[0][:7] # YYYY-MM
                                val = row[1]
                                results.append((date_str, val))
                    return fac_id, results
                else:
                    return fac_id, None
        except Exception:
            return fac_id, None

async def main():
    with open('oe_full_stations.json', 'r') as f:
        source_data = json.load(f)

    stations = []
    for s in source_data:
        fuel = s.get('fueltech', '').lower()
        if 'battery' in fuel or 'storage' in fuel:
            continue
        stations.append(s)

    # 730 days ago is ~2024-10-02
    start_date = datetime(2024, 11, 1)
    end_date = datetime(2026, 10, 1)
    start_str = start_date.strftime("%Y-%m-%dT%H:%M:%S")
    end_str = end_date.strftime("%Y-%m-%dT%H:%M:%S")

    print(f"Fetching real generation data for {len(stations)} facilities from {start_str} to {end_str}...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    facility_data = {}
    semaphore = asyncio.Semaphore(15)
    
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch_facility(session, semaphore, s['code'], start_str, end_str) for s in stations]
        results = await asyncio.gather(*tasks)
        
        for fac_id, res in results:
            if res:
                facility_data[fac_id] = { k:v for k,v in res }
            else:
                facility_data[fac_id] = {}

    fuel_tech_map = {
        "coal_black": "coal",
        "coal_brown": "coal",
        "gas_ccgt": "gas",
        "gas_ocgt": "gas",
        "gas_recip": "gas",
        "gas_steam": "gas",
        "gas_wcmg": "gas",
        "hydro": "hydro",
        "wind": "wind",
        "solar_utility": "commercial_solar",
        "solar_rooftop": "rooftop_solar",
        "bioenergy_biogas": "gas",
        "bioenergy_biomass": "gas",
        "distillate": "gas"
    }

    facilities = []
    for idx, s in enumerate(stations):
        mapped_type = fuel_tech_map.get(s.get('fueltech'), 'other')
        f = {
            "id": idx + 1,
            "oe_id": s['code'],
            "name": s['name'],
            "lat": s['lat'],
            "lon": s['lon'],
            "type": mapped_type,
            "capacity_mw": s['capacity_mw'],
            "start_year": s['start_year']
        }
        facilities.append(f)

    with open('data_energy/facilities.json', 'w') as f:
        json.dump(facilities, f, indent=2)

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
    fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}

    num_months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1

    records = []
    day_offsets = []

    current_offset = 0

    for month_idx in range(num_months):
        day_offsets.append(len(records))
        
        y = start_date.year + (start_date.month - 1 + month_idx) // 12
        m = 1 + (start_date.month - 1 + month_idx) % 12
        date_str = f"{y:04d}-{m:02d}"
        
        current_offset += 1 

        for idx, s in enumerate(facilities):
            if y < s['start_year']:
                continue
                
            fac_id = s['oe_id']
            energy = 0
            
            if fac_id in facility_data and date_str in facility_data[fac_id]:
                val = facility_data[fac_id][date_str]
                if val is not None:
                    energy = val
            
            if energy > 0:
                fid = fuel_type_to_id.get(s['type'], 1) 
                
                records.append({
                    "facility_id": idx + 1,
                    "lon": s['lon'],
                    "lat": s['lat'],
                    "cat_idx": fid,
                    "generation": energy
                })

    with open('data_energy/energy.bin', 'wb') as f:
        for r in records:
            f.write(struct.pack('<HffBf', r['facility_id'], r['lon'], r['lat'], r['cat_idx'], r['generation']))

    metadata = {
        "startDate": f"{start_date.year:04d}-{start_date.month:02d}-01",
        "totalDays": num_months,
        "recordCount": len(records),
        "dayOffsets": day_offsets,
        "fuelTypes": fuel_types
    }
    with open('data_energy/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print("Generation complete.")

if __name__ == "__main__":
    asyncio.run(main())
