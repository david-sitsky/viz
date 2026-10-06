import struct
import json
import csv
import sys
import os
import argparse
import urllib.request

def fetch_inaturalist_info(species_name):
    if not species_name or species_name == "Unknown":
        return {"image": None, "common_name": None}
    url = f"https://api.inaturalist.org/v1/taxa?q={urllib.parse.quote(species_name)}&per_page=1"
    info = {"image": None, "common_name": None}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data.get("results") and len(data["results"]) > 0:
                result = data["results"][0]
                photo = result.get("default_photo")
                if photo:
                    info["image"] = photo.get("medium_url") or photo.get("square_url")
                info["common_name"] = result.get("preferred_common_name")
    except Exception as e:
        pass
    return info

def main():
    parser = argparse.ArgumentParser(description="Compile ALA CSV into Engine Data")
    parser.add_argument('--input-csv', required=True, help="Input CSV path")
    parser.add_argument('--output-bin', required=True, help="Output bin path")
    parser.add_argument('--output-meta', required=True, help="Output metadata path")
    parser.add_argument('--output-species', help="Optional output species JSON path")
    parser.add_argument('--start-date', help="Optional fixed start date (ISO string) to override the first record date")
    args = parser.parse_args()

    if not os.path.exists(args.input_csv):
        print(f"File {args.input_csv} does not exist.")
        sys.exit(0)

    print("Reading raw events...")
    records = []
    species_map = {}
    next_species_id = 0

    with open(args.input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            species_name = row.get('species', 'Unknown')
            if species_name not in species_map:
                species_map[species_name] = {
                    "id": next_species_id,
                    "scientific_name": species_name,
                    "common_name": row.get('common_name', ''),
                    "image": None,
                    "count": 0
                }
                next_species_id += 1
            
            species_map[species_name]["count"] += 1
                
            records.append({
                "date_ms": row['date_ms'],
                "lat": float(row['lat']),
                "lon": float(row['lon']),
                "species_id": species_map[species_name]["id"]
            })

    if not records:
        print("No valid records found.")
        sys.exit(0)
        
    records.sort(key=lambda x: x["date_ms"])
    
    # Generate daily offsets
    import datetime
    day_offsets = []
    
    def parse_date(date_str):
        try:
            return datetime.datetime.fromtimestamp(int(date_str) / 1000.0, tz=datetime.timezone.utc)
        except ValueError:
            return datetime.datetime.fromisoformat(date_str.replace('Z', '+00:00'))

    if args.start_date:
        start_date = parse_date(args.start_date)
    else:
        start_date = parse_date(records[0]['date_ms'])
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    current_day = 0
    day_offsets.append(0)

    print("Compiling binary blob...")
    os.makedirs(os.path.dirname(args.output_bin), exist_ok=True)
    with open(args.output_bin, 'wb') as f:
        for i, r in enumerate(records):
            dt = parse_date(r['date_ms'])
            day_diff = (dt - start_date).days
            while day_diff > current_day:
                current_day += 1
                day_offsets.append(i)
                
            # Pack Float32, Float32, Uint8
            f.write(struct.pack("<ffB", r['lon'], r['lat'], min(255, r['species_id'])))

    # Write metadata
    os.makedirs(os.path.dirname(args.output_meta), exist_ok=True)
    with open(args.output_meta, 'w', encoding='utf-8') as f:
        json.dump({
            "recordCount": len(records),
            "dayOffsets": day_offsets,
            "startDate": start_date.strftime('%Y-%m-%d'),
            "totalDays": len(day_offsets)
        }, f)
        
    # Write species info if requested
    if args.output_species:
        print("Fetching thumbnails and common names from iNaturalist...")
        for name, info in species_map.items():
            if name != "Unknown":
                inat_info = fetch_inaturalist_info(name)
                info["image"] = inat_info["image"]
                if inat_info["common_name"]:
                    info["common_name"] = inat_info["common_name"]
        
        # Convert dictionary mapping to list ordered by ID
        species_list = [None] * next_species_id
        for name, info in species_map.items():
            species_list[info["id"]] = info
            
        os.makedirs(os.path.dirname(args.output_species), exist_ok=True)
        with open(args.output_species, 'w', encoding='utf-8') as f:
            json.dump(species_list, f, indent=2)

    print("Generation complete.")

if __name__ == '__main__':
    main()
