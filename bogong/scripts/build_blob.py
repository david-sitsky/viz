import csv
import struct
import json
import datetime
import math
import os

def main():
    in_file = 'data/raw_events.csv'
    if not os.path.exists(in_file):
        print("No raw_events.csv found!")
        return

    records_by_day = {}
    start_date = None
    end_date = None
    
    with open(in_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                date_ms = int(row['date_ms'])
                lat = float(row['lat'])
                lon = float(row['lon'])
            except ValueError:
                continue
                
            # Convert ms to python datetime
            d_obj = datetime.datetime.fromtimestamp(date_ms / 1000.0, tz=datetime.timezone.utc).date()
            
            if start_date is None or d_obj < start_date:
                start_date = d_obj
            if end_date is None or d_obj > end_date:
                end_date = d_obj
                
            d_str = d_obj.strftime("%Y-%m-%d")
            if d_str not in records_by_day:
                records_by_day[d_str] = []
                
            records_by_day[d_str].append({
                'lat': lat,
                'lon': lon
            })
            
    if start_date is None:
        print("No valid dates found.")
        return
        
    num_days = (end_date - start_date).days + 1
    
    records = []
    day_offsets = []
    daily_counts = []
    
    print("Compiling binary blob...")
    for day_idx in range(num_days):
        day_offsets.append(len(records))
        current_date = start_date + datetime.timedelta(days=day_idx)
        date_str = current_date.strftime("%Y-%m-%d")
        
        day_records = records_by_day.get(date_str, [])
        daily_counts.append(len(day_records))
        for r in day_records:
            records.append({
                "lon": r['lon'],
                "lat": r['lat'],
                "cat_idx": 0 # Bogong only has one category
            })
            
    with open('data/data.bin', 'wb') as f:
        for r in records:
            # engine_data.js expects Float32(lon), Float32(lat), Uint8(cat_idx) -> <ffB
            f.write(struct.pack('<ffB', r['lon'], r['lat'], r['cat_idx']))

    metadata = {
        "startDate": start_date.strftime("%Y-%m-%d"),
        "totalDays": num_days,
        "recordCount": len(records),
        "dayOffsets": day_offsets,
        "dailyCounts": daily_counts
    }
    with open('data/metadata.json', 'w') as f:
        json.dump(metadata, f, separators=(',', ':'))

    print("Generation complete.")

if __name__ == '__main__':
    main()
