import urllib.request
import json
import csv
import os
import sys
import time

def fetch_all_occurrences():
    base_url = "https://biocache-ws.ala.org.au/ws/occurrences/search"
    query = "?q=Agrotis+infusa&fq=eventDate:[2020-08-01T00:00:00Z%20TO%20*]&facet=off&pageSize=100"
    
    start_index = 0
    total_records = 1 # updated after first request
    
    records = []
    
    print("Fetching ALA data...")
    while start_index < total_records:
        url = f"{base_url}{query}&startIndex={start_index}"
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
                        # We need valid date and coordinates
                        dt = occ.get("eventDate")
                        lat = occ.get("decimalLatitude")
                        lon = occ.get("decimalLongitude")
                        
                        if dt and lat is not None and lon is not None:
                            records.append({
                                "date_ms": dt,
                                "lat": lat,
                                "lon": lon
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
    records = fetch_all_occurrences()
    
    if not records:
        print("No records found.")
        sys.exit(1)
        
    print(f"Valid records parsed: {len(records)}")
    
    # Sort chronologically by date
    records.sort(key=lambda x: x["date_ms"])
    
    out_file = 'data/raw_events.csv'
    
    # Read existing if available to compare
    existing_content = ""
    if os.path.exists(out_file):
        with open(out_file, 'r', encoding='utf-8') as f:
            existing_content = f.read()
            
    # Write to memory first
    import io
    mem_file = io.StringIO()
    writer = csv.writer(mem_file)
    writer.writerow(['date_ms', 'lat', 'lon'])
    for r in records:
        writer.writerow([r['date_ms'], r['lat'], r['lon']])
        
    new_content = mem_file.getvalue()
    
    if new_content == existing_content:
        print("No new records since last update. Exiting.")
    else:
        print(f"Writing updated data to {out_file}...")
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Done!")

if __name__ == '__main__':
    main()
