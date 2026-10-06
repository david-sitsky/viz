import json
import math
import os
import struct
from datetime import datetime, timedelta

# Realistic Australian Power Stations
STATIONS = [
    {"id": 1, "oe_id": "LYA", "name": "Loy Yang A", "lat": -38.25, "lon": 146.57, "type": "coal", "capacity_mw": 2210},
    {"id": 2, "oe_id": "LYB", "name": "Loy Yang B", "lat": -38.25, "lon": 146.58, "type": "coal", "capacity_mw": 1050},
    {"id": 3, "oe_id": "YWPS", "name": "Yallourn", "lat": -38.17, "lon": 146.33, "type": "coal", "capacity_mw": 1450},
    {"id": 4, "oe_id": "LIDDELL", "name": "Liddell", "lat": -32.37, "lon": 150.97, "type": "coal", "capacity_mw": 2000, "closure_year": 2023},
    {"id": 5, "oe_id": "BWPS", "name": "Bayswater", "lat": -32.39, "lon": 150.98, "type": "coal", "capacity_mw": 2640},
    {"id": 6, "oe_id": "ERARING", "name": "Eraring", "lat": -33.06, "lon": 151.52, "type": "coal", "capacity_mw": 2880},
    {"id": 7, "oe_id": "GLADSTONE", "name": "Gladstone", "lat": -23.82, "lon": 151.21, "type": "coal", "capacity_mw": 1680},
    {"id": 8, "oe_id": "TARONG", "name": "Tarong", "lat": -26.77, "lon": 151.91, "type": "coal", "capacity_mw": 1400},
    {"id": 9, "oe_id": "PELICAN", "name": "Pelican Point", "lat": -34.78, "lon": 138.49, "type": "gas", "capacity_mw": 478},
    {"id": 10, "oe_id": "TALLAWARRA", "name": "Tallawarra", "lat": -34.55, "lon": 150.78, "type": "gas", "capacity_mw": 435},
    {"id": 11, "oe_id": "MORTLAKE", "name": "Mortlake", "lat": -38.08, "lon": 142.79, "type": "gas", "capacity_mw": 566},
    {"id": 12, "oe_id": "TUMUT3", "name": "Tumut 3 (Snowy)", "lat": -35.61, "lon": 148.22, "type": "hydro", "capacity_mw": 1800},
    {"id": 13, "oe_id": "MURRAY", "name": "Murray 1 (Snowy)", "lat": -36.23, "lon": 148.04, "type": "hydro", "capacity_mw": 950},
    {"id": 14, "oe_id": "GORDON", "name": "Gordon (Tas)", "lat": -42.73, "lon": 145.97, "type": "hydro", "capacity_mw": 432},
    {"id": 15, "oe_id": "POATINA", "name": "Poatina (Tas)", "lat": -41.79, "lon": 146.88, "type": "hydro", "capacity_mw": 300},
    {"id": 16, "oe_id": "MACARTH", "name": "Macarthur Wind", "lat": -38.05, "lon": 142.02, "type": "wind", "capacity_mw": 420, "start_year": 2013},
    {"id": 17, "oe_id": "SNOWTWN", "name": "Snowtown", "lat": -33.78, "lon": 138.19, "type": "wind", "capacity_mw": 369, "start_year": 2008},
    {"id": 18, "oe_id": "HALLETT", "name": "Hallett", "lat": -33.37, "lon": 138.74, "type": "wind", "capacity_mw": 350, "start_year": 2009},
    {"id": 19, "oe_id": "SAPPHIRE", "name": "Sapphire", "lat": -29.77, "lon": 151.58, "type": "wind", "capacity_mw": 270, "start_year": 2018},
    {"id": 20, "oe_id": "COOPERS", "name": "Coopers Gap", "lat": -26.72, "lon": 151.27, "type": "wind", "capacity_mw": 453, "start_year": 2020},
    {"id": 21, "oe_id": "NYNGAN", "name": "Nyngan Solar", "lat": -31.55, "lon": 147.11, "type": "commercial_solar", "capacity_mw": 102, "start_year": 2015},
    {"id": 22, "oe_id": "COLEAMBLY", "name": "Coleambally Solar", "lat": -34.78, "lon": 145.95, "type": "commercial_solar", "capacity_mw": 150, "start_year": 2018},
    {"id": 23, "oe_id": "LIMONDALE", "name": "Limondale Solar", "lat": -34.78, "lon": 143.46, "type": "commercial_solar", "capacity_mw": 349, "start_year": 2020},
    {"id": 24, "oe_id": "DARLINGTON", "name": "Darlington Point", "lat": -34.61, "lon": 145.98, "type": "commercial_solar", "capacity_mw": 275, "start_year": 2020},
]

ROOFTOP = [
    {"id": 101, "name": "Sydney Metro Rooftop", "lat": -33.86, "lon": 151.20, "type": "rooftop_solar", "capacity_mw": 2500, "start_year": 2010},
    {"id": 102, "name": "Melbourne Metro Rooftop", "lat": -37.81, "lon": 144.96, "type": "rooftop_solar", "capacity_mw": 2000, "start_year": 2010},
    {"id": 103, "name": "Brisbane Metro Rooftop", "lat": -27.47, "lon": 153.02, "type": "rooftop_solar", "capacity_mw": 1800, "start_year": 2010},
    {"id": 104, "name": "Adelaide Metro Rooftop", "lat": -34.92, "lon": 138.60, "type": "rooftop_solar", "capacity_mw": 1200, "start_year": 2010},
    {"id": 105, "name": "Perth Metro Rooftop", "lat": -31.95, "lon": 115.86, "type": "rooftop_solar", "capacity_mw": 1500, "start_year": 2010},
]

ALL_STATIONS = STATIONS + ROOFTOP
FUEL_TYPES = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
FUEL_TYPE_IDX = {f: i for i, f in enumerate(FUEL_TYPES)}

def generate_monthly_generation(station, year, month):
    capacity = station["capacity_mw"]
    st_type = station["type"]
    start = station.get("start_year", 1900)
    end = station.get("closure_year", 2100)
    if year < start or year > end:
        return 0.0
        
    years_since_2000 = year - 2000
    cf = 0.5
    if st_type == "coal": cf = 0.85 - (years_since_2000 * 0.015)
    elif st_type == "gas": cf = 0.2 + (math.sin(years_since_2000) * 0.05)
    elif st_type == "hydro": cf = 0.3 + (math.cos((month/12.0)*2*math.pi) * 0.1)
    elif st_type == "wind": cf = 0.35 * min(1.0, max(0.0, (year - start) / 5.0))
    elif "solar" in st_type: cf = 0.25 * min(1.0, max(0.0, (year - start) / 5.0)) * (1.0 + math.cos((month-6)/12.0 * 2*math.pi)*0.3)
    
    return max(0.0, capacity * 24 * 30 * cf)

def main():
    start_date = datetime(2000, 1, 1)
    end_date = datetime(2026, 12, 31)
    records = []
    current_date = start_date
    month_idx = 0
    day_offsets = []
    
    while current_date < end_date:
        day_offsets.append(len(records))
        year = current_date.year
        month = current_date.month
        
        for st in ALL_STATIONS:
            gen = generate_monthly_generation(st, year, month)
            if gen > 0:
                records.append({
                    "id": st["id"], "lat": st["lat"], "lon": st["lon"],
                    "cat": FUEL_TYPE_IDX[st["type"]], "gen": gen
                })
                
        if month == 12: current_date = current_date.replace(year=year+1, month=1)
        else: current_date = current_date.replace(month=month+1)
        month_idx += 1
        
    out_bin = "data_energy/energy.bin"
    with open(out_bin, "wb") as f:
        for r in records:
            f.write(struct.pack("<HffBf", r["id"], r["lon"], r["lat"], r["cat"], r["gen"]))
            
    meta = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "totalDays": month_idx,
        "recordCount": len(records),
        "dayOffsets": day_offsets,
        "fuelTypes": FUEL_TYPES
    }
    with open("data_energy/metadata.json", "w") as f: json.dump(meta, f, indent=2)
    with open("data_energy/facilities.json", "w") as f: json.dump(ALL_STATIONS, f, indent=2)
    print(f"Generated {len(records)} records across {month_idx} months.")

if __name__ == "__main__":
    main()
