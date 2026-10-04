import json
import struct
import csv
from datetime import datetime, timedelta

def main():
    with open('data_energy/facilities.json', 'r') as f:
        facilities = json.load(f)
        
    fac_map = {}
    for fac in facilities:
        fac_map[fac['id']] = fac

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
    fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}

    print("Reading raw_events.csv...")
    records_by_day = {}
    
    start_date = None
    end_date = None
    
    with open('data_energy/raw_events.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            d_str = row['date']
            d_obj = datetime.strptime(d_str, "%Y-%m-%d")
            if start_date is None or d_obj < start_date:
                start_date = d_obj
            if end_date is None or d_obj > end_date:
                end_date = d_obj
                
            if d_str not in records_by_day:
                records_by_day[d_str] = []
                
            records_by_day[d_str].append({
                'facility_id': int(row['facility_id']),
                'generation': float(row['generation'])
            })
            
    num_days = (end_date - start_date).days + 1
    
    records = []
    day_offsets = []
    
    print("Compiling binary blob...")
    for day_idx in range(num_days):
        day_offsets.append(len(records))
        current_date = start_date + timedelta(days=day_idx)
        date_str = current_date.strftime("%Y-%m-%d")
        
        day_records = records_by_day.get(date_str, [])
        for r in day_records:
            fac = fac_map.get(r['facility_id'])
            if not fac:
                continue
            fid = fuel_type_to_id.get(fac['type'], 1)
            records.append({
                "facility_id": r['facility_id'],
                "lon": fac['lon'],
                "lat": fac['lat'],
                "cat_idx": fid,
                "generation": r['generation']
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

if __name__ == '__main__':
    main()
