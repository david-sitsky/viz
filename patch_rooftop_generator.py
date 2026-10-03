import re

with open('generate_from_oe.py', 'r') as f:
    script = f.read()

# Update fetch_rooftop to support network_region
old_fetch = """async def fetch_rooftop(network_code, start_dt, end_dt):
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
"""

new_fetch = """async def fetch_rooftop(network_code, start_dt, end_dt, network_region=None):
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
"""

script = script.replace(old_fetch, new_fetch)

# Update main() to fetch per-state
old_main_rooftop = """    # Append rooftop solar data
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
        "state": "NEM (Multi-state)",
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
        "state": "WA",
        "capacity_mw": 0,
        "start_year": 2000
    })"""


new_main_rooftop = """    # Append rooftop solar data
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
        
        facilities.append({
            "id": 0,
            "oe_id": fac_id,
            "name": reg_name,
            "lat": -90.0,
            "lon": 0.0,
            "type": "rooftop_solar",
            "state": reg_state,
            "capacity_mw": 0,
            "start_year": 2000
        })

    rooftop_wem = await fetch_rooftop("WEM", start_date, end_date)
    facility_data["ROOFTOP_WEM"] = rooftop_wem
    facilities.append({
        "id": 0,
        "oe_id": "ROOFTOP_WEM",
        "name": "WA Rooftop Solar",
        "lat": -90.0,
        "lon": 0.0,
        "type": "rooftop_solar",
        "state": "WA",
        "capacity_mw": 0,
        "start_year": 2000
    })"""

script = script.replace(old_main_rooftop, new_main_rooftop)

with open('generate_from_oe.py', 'w') as f:
    f.write(script)
