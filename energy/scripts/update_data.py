import asyncio
import aiohttp
import json
import csv
import os
from datetime import datetime, timedelta

API_KEY = os.environ.get("OPENELECTRICITY_API_KEY")

async def fetch_facility(session, semaphore, fac_id, start_dt, end_dt):
    url = f"https://api.openelectricity.org.au/v4/data/facility/{fac_id}"
    
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
                pass
    return fac_id, day_sums

async def fetch_rooftop(network_code, start_dt, end_dt, network_region=None):
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
            if network_region:
                params["network_region"] = network_region
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
    # 1. Read existing records to find the latest date
    existing_records = {} # (date, fac_id) -> gen
    latest_date_str = "2024-11-01"
    
    print("Reading existing raw_events.csv...")
    if os.path.exists('data/raw_events.csv'):
        with open('data/raw_events.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                d = row['date']
                fid = int(row['facility_id'])
                gen = float(row['generation'])
                existing_records[(d, fid)] = gen
                if d > latest_date_str:
                    latest_date_str = d
    
    start_date = datetime.strptime(latest_date_str, "%Y-%m-%d") - timedelta(days=7) # Look back 7 days to overlap
    end_date = datetime.now() + timedelta(days=1)
    
    print(f"Fetching data from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

    # Load facilities list to know what to query
    with open('data/facilities.json', 'r') as f:
        facilities = json.load(f)
        
    fac_lookup = {f['oe_id']: f['id'] for f in facilities}
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    facility_data = {}
    semaphore = asyncio.Semaphore(15)
    
    async with aiohttp.ClientSession(headers=headers) as session:
        tasks = []
        for fac in facilities:
            if fac['oe_id'].startswith("ROOFTOP_"):
                continue
            tasks.append(fetch_facility(session, semaphore, fac['oe_id'], start_date, end_date))
        
        results = await asyncio.gather(*tasks)
        for fac_id, res in results:
            if res:
                facility_data[fac_id] = res

    # Fetch rooftop
    nem_regions = [
        ("NSW1", "NSW/ACT Rooftop Solar", "NSW/ACT"),
        ("QLD1", "QLD Rooftop Solar", "QLD"),
        ("SA1", "SA Rooftop Solar", "SA"),
        ("TAS1", "TAS Rooftop Solar", "TAS"),
        ("VIC1", "VIC Rooftop Solar", "VIC")
    ]
    for reg_code, reg_name, reg_state in nem_regions:
        rooftop_data = await fetch_rooftop("NEM", start_date, end_date, network_region=reg_code)
        fac_id = f"ROOFTOP_{reg_code}"
        facility_data[fac_id] = rooftop_data

    rooftop_wem = await fetch_rooftop("WEM", start_date, end_date)
    facility_data["ROOFTOP_WEM"] = rooftop_wem
    
    new_count = 0
    updated_count = 0
    
    for fac_id, days in facility_data.items():
        db_id = fac_lookup.get(fac_id)
        if not db_id: continue
        
        for date_str, gen in days.items():
            key = (date_str, db_id)
            if key in existing_records:
                if abs(existing_records[key] - gen) > 0.001:
                    existing_records[key] = gen
                    updated_count += 1
            else:
                existing_records[key] = gen
                new_count += 1
                
    print(f"Fetch complete. Added {new_count} new records, updated {updated_count} existing records.")
    
    # Save back to CSV sorted by date then facility
    print("Writing updated raw_events.csv...")
    sorted_keys = sorted(existing_records.keys())
    with open('data/raw_events.csv', 'w') as f:
        f.write("date,facility_id,generation\n")
        for k in sorted_keys:
            f.write(f"{k[0]},{k[1]},{existing_records[k]:.3f}\n")
            
    print("Done!")

if __name__ == '__main__':
    asyncio.run(main())
