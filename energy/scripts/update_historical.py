import os
import json
import struct
import asyncio
import aiohttp
from datetime import datetime

API_KEY = os.environ.get("OPENELECTRICITY_API_KEY", "REMOVED_API_KEY")

async def fetch_facility(session, semaphore, s):
    fac_id = s['oe_id']
    url = "https://api.openelectricity.org.au/v4/data/network/NEM"
    params = {
        "metrics": "energy",
        "interval": "1M",
        "date_start": "2024-09-01T00:00:00",
        "date_end": "2026-09-01T00:00:00",
        "facility_code": fac_id
    }
    
    async with semaphore:
        async with session.get(url, params=params) as resp:
            if resp.status == 200:
                data = await resp.json()
                results = []
                for item in data.get("data", []):
                    for r in item.get("results", []):
                        for row in r.get("data", []):
                            # row is ["2024-09-01T00:00:00+10:00", 12345.6]
                            date_str = row[0][:7] # YYYY-MM
                            val = row[1]
                            results.append((date_str, val))
                return fac_id, results
            else:
                return fac_id, None

async def update_energy_bin():
    with open('data_energy/facilities.json', 'r') as f:
        stations = json.load(f)

    # Temporary slice for testing 20 items first!
    # stations = stations[:20]

    print(f"Fetching real generation data for {len(stations)} facilities for 2024-2026...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    facility_data = {}
    
    semaphore = asyncio.Semaphore(10) # 10 concurrent requests
    
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = [fetch_facility(session, semaphore, s) for s in stations]
        results = await asyncio.gather(*tasks)
        
        for fac_id, res in results:
            if res:
                facility_data[fac_id] = { k:v for k,v in res }
            else:
                facility_data[fac_id] = {}

    # Now rewrite energy.bin!
    # Our original script generated 26 * 12 = 312 months (2000 to 2026).
    # Since we only fetched 2024-2026, we will set all other months to 0 or simulated.
    # The user asked: "If we can't for now, we can focus on the last few years worst case."
    # We will 0 out everything before 2024-09, and use real data for 2024-09 onwards.
    
    start_date = datetime(2000, 1, 1)
    end_date = datetime(2026, 12, 31)
    num_months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
    fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}
    
    records = []
    
    for month_idx in range(num_months):
        y = 2000 + (month_idx // 12)
        m = 1 + (month_idx % 12)
        date_str = f"{y:04d}-{m:02d}"
        
        for idx, s in enumerate(stations):
            fac_id = s['oe_id']
            capacity = s.get('max_capacity', 0)
            start_year = s['start_year']
            
            if y < start_year:
                continue
                
            # If it's a battery, skip it
            is_battery = any(tag in s['fuel_tech'].lower() for tag in ['battery', 'storage'])
            if is_battery:
                continue

            energy = 0
            if fac_id in facility_data and date_str in facility_data[fac_id]:
                # Real data! It's MWh. 
                val = facility_data[fac_id][date_str]
                if val is not None:
                    # Sometimes val might be None?
                    energy = val
            
            if energy > 0:
                fid = fuel_type_to_id.get(s['fuel_tech'], 1)
                records.append(struct.pack('<IffH', idx, energy, energy, fid))
        
        records.append(struct.pack('<IffH', 0xFFFFFFFF, 0, 0, 0)) # End of month marker
        
    with open("data_energy/energy.bin", "wb") as f:
        for r in records:
            f.write(r)
            
    print("Successfully compiled real energy data to data_energy/energy.bin!")

if __name__ == "__main__":
    asyncio.run(update_energy_bin())
