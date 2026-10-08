import urllib.request
import json
import csv
import os
import sys
import time
import argparse

def fetch_all_occurrences(query, start_date=None):
    base_url = "https://biocache-ws.ala.org.au/ws/occurrences/search"
    fq = ""
    if start_date:
        fq = f"&fq=eventDate:[{start_date}%20TO%20*]"
    
    import urllib.parse
    query_enc = urllib.parse.quote_plus(query) if " " in query else query
    
    url_query = f"?q={query_enc}{fq}&facet=off&pageSize=100"
    
    start_index = 0
    total_records = 1
    
    records = []
    
    print(f"Fetching ALA data for query: {query}...")
    while start_index < total_records:
        url = f"{base_url}{url_query}&startIndex={start_index}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        retries = 3
        success = False
        while retries > 0 and not success:
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode())
                    if start_index == 0:
                        total_records = data.get("totalRecords", 0)
                        print(f"Total records to fetch: {total_records}")
                    
                    for occ in data.get("occurrences", []):
                        dt = occ.get("eventDate")
                        lat = occ.get("decimalLatitude")
                        lon = occ.get("decimalLongitude")
                        species = occ.get("scientificName", "Unknown")
                        common_name = occ.get("vernacularName", "")
                        
                        if dt and lat is not None and lon is not None:
                            records.append({
                                "date_ms": dt,
                                "lat": lat,
                                "lon": lon,
                                "species": species,
                                "common_name": common_name
                            })
                    
                    start_index += 100
                    success = True
                    time.sleep(0.5)
            except Exception as e:
                print(f"Error fetching data (retries left {retries-1}): {e}")
                retries -= 1
                time.sleep(2)
        if not success:
            print("Failed to fetch all data.")
            break
            
    return records

def main():
    parser = argparse.ArgumentParser(description="Download ALA occurrences to CSV")
    parser.add_argument('--query', required=True, help="ALA search query (e.g. genus:Anoplognathus)")
    parser.add_argument('--start-date', help="Start date in ISO format")
    parser.add_argument('--output', required=True, help="Output CSV path")
    args = parser.parse_args()


    start_date_str = args.start_date
    if not start_date_str and os.path.exists(args.output):
        max_ms = 0
        with open(args.output, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if int(row['date_ms']) > max_ms:
                    max_ms = int(row['date_ms'])
        if max_ms > 0:
            import datetime
            # go back 7 days just to be safe for late entries
            start_date_str = (datetime.datetime.fromtimestamp(max_ms/1000) - datetime.timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
            print(f"Auto-detected start date from existing data: {start_date_str}")
            
    records = fetch_all_occurrences(args.query, start_date_str)

    
    if not records:
        print("No records found.")
        sys.exit(0)
        
    print(f"Valid records parsed: {len(records)}")
    

    records.sort(key=lambda x: x["date_ms"])
    
    out_file = args.output
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    
    existing_records = {}
    if os.path.exists(out_file):
        with open(out_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Use a unique key
                key = f"{row['date_ms']}_{row['lat']}_{row['lon']}_{row['species']}"
                existing_records[key] = row

    for r in records:
        key = f"{r['date_ms']}_{r['lat']}_{r['lon']}_{r['species']}"
        existing_records[key] = {
            'date_ms': r['date_ms'],
            'lat': r['lat'],
            'lon': r['lon'],
            'species': r['species'],
            'common_name': r['common_name']
        }
        
    final_records = list(existing_records.values())
    final_records.sort(key=lambda x: int(x['date_ms']))
    
    import io
    mem_file = io.StringIO()
    writer = csv.writer(mem_file)
    writer.writerow(['date_ms', 'lat', 'lon', 'species', 'common_name'])
    for r in final_records:
        writer.writerow([r['date_ms'], r['lat'], r['lon'], r['species'], r.get('common_name', '')])
        
    new_content = mem_file.getvalue()
    
    existing_content = ""
    if os.path.exists(out_file):
        with open(out_file, 'r', encoding='utf-8') as f:
            existing_content = f.read()

    if new_content == existing_content:
        print("No new records since last update. Exiting.")
    else:
        print(f"Writing updated data to {out_file}...")
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Done!")

if __name__ == '__main__':
    main()
