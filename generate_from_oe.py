import json
import struct
import asyncio
import aiohttp
import os
from datetime import datetime, timedelta

API_KEY = os.environ.get("OPENELECTRICITY_API_KEY", "REMOVED_API_KEY")

async def fetch_facility(session, semaphore, fac_id, start_str, end_str):
    url = "https://api.openelectricity.org.au/v4/data/facilities/AU"
    
    start_dt = datetime.strptime(start_str, "%Y-%m-%dT%H:%M:%S")
    end_dt = datetime.strptime(end_str, "%Y-%m-%dT%H:%M:%S")
    
    chunks = []
    curr = start_dt
    while curr < end_dt:
        chunk_end = min(curr + timedelta(days=365), end_dt)
        chunks.append((curr.strftime("%Y-%m-%dT%H:%M:%S"), chunk_end.strftime("%Y-%m-%dT%H:%M:%S")))
        curr = chunk_end
        
    day_sums = {}
    async with semaphore:
        for c_start, c_end in chunks:
            params = {
                "metrics": "energy",
                "interval": "1d",
                "date_start": c_start,
                "date_end": c_end,
                "facility_code": fac_id
            }
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for item in data.get("data", []):
                            for r in item.get("results", []):
                                for row in r.get("data", []):
                                    date_str = row[0][:10]
                                    val = row[1] or 0
                                    day_sums[date_str] = day_sums.get(date_str, 0) + val
            except Exception as e:
                print("Exception in fetch_rooftop:", e)
                pass
    return fac_id, day_sums

async def fetch_rooftop(network_code, start_dt, end_dt):
    url = f"https://api.openelectricity.org.au/v4/data/network/{network_code}"
    
    chunks = []
    curr = start_dt
    while curr < end_dt:
        chunk_end = min(curr + timedelta(days=365), end_dt)
        chunks.append((curr.strftime("%Y-%m-%dT%H:%M:%S"), chunk_end.strftime("%Y-%m-%dT%H:%M:%S")))
        curr = chunk_end
        
    day_sums = {}
    headers = {"Authorization": f"Bearer {API_KEY}"}
    async with aiohttp.ClientSession(headers=headers) as session:
        for c_start, c_end in chunks:
            params = {
                "metrics": "energy",
                "interval": "1d",
                "date_start": c_start,
                "date_end": c_end,
                "fueltech": "solar_rooftop"
            }
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for item in data.get("data", []):
                            for r in item.get("results", []):
                                for row in r.get("data", []):
                                    date_str = row[0][:10]
                                    val = row[1] or 0
                                    day_sums[date_str] = day_sums.get(date_str, 0) + val
            except Exception as e:
                pass
    return day_sums

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
                facility_data[fac_id] = res
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
    }

    facilities = []
    for idx, s in enumerate(stations):
        mapped_type = fuel_tech_map.get(s.get('fueltech'), 'other')
        if mapped_type == 'other':
            continue
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


    # Append rooftop solar data
    rooftop_nem = await fetch_rooftop("NEM", start_date, end_date)
    rooftop_wem = await fetch_rooftop("WEM", start_date, end_date)
    
    facility_data["ROOFTOP_NEM"] = rooftop_nem
    facility_data["ROOFTOP_WEM"] = rooftop_wem
    
    facilities.append({
        "id": len(facilities) + 1,
        "oe_id": "ROOFTOP_NEM",
        "name": "NEM Rooftop Solar",
        "lat": -90.0,
        "lon": 0.0,
        "type": "rooftop_solar",
        "capacity_mw": 0,
        "start_year": 2000
    })
    facilities.append({
        "id": len(facilities) + 1,
        "oe_id": "ROOFTOP_WEM",
        "name": "WEM Rooftop Solar",
        "lat": -90.0,
        "lon": 0.0,
        "type": "rooftop_solar",
        "capacity_mw": 0,
        "start_year": 2000
    })
    
    for i, f in enumerate(facilities):
        f['id'] = i + 1

    with open('data_energy/facilities.json', 'w') as f:

        json.dump(facilities, f, indent=2)

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
    fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}

    num_days = (end_date - start_date).days
    
    records = []
    day_offsets = []

    for day_idx in range(num_days):
        day_offsets.append(len(records))
        current_date = start_date + timedelta(days=day_idx)
        y = current_date.year
        date_str = current_date.strftime("%Y-%m-%d")

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
                    "facility_id": s['id'],
                    "lon": s['lon'],
                    "lat": s['lat'],
                    "cat_idx": fid,
                    "generation": energy
                })

    with open('data_energy/energy.bin', 'wb') as f:
        for r in records:
            f.write(struct.pack('<HffBf', r['facility_id'], r['lon'], r['lat'], r['cat_idx'], r['generation']))

    metadata = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "totalDays": num_days,
        "recordCount": len(records),
        "dayOffsets": day_offsets,
        "fuelTypes": fuel_types
    }
    with open('data_energy/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print("Generation complete.")

if __name__ == "__main__":
    asyncio.run(main())
