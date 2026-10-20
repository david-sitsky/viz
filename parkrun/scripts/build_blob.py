import os
import json
import csv
import struct
from datetime import datetime, timedelta

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data'))
EVENTS_DIR = os.path.join(DATA_DIR, 'events')
CATALOG_FILE = os.path.join(DATA_DIR, 'events_catalog.json')
BIN_FILE = os.path.join(DATA_DIR, 'parkrun.bin')
METADATA_FILE = os.path.join(DATA_DIR, 'metadata.json')
RAW_EVENTS_FILE = os.path.join(DATA_DIR, 'raw_events.csv')

# State bounding boxes / heuristics
STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]
STATE_TO_ID = {s: i for i, s in enumerate(STATES)}
NAME_TO_STATE = {
    'New South Wales': 'NSW', 'Victoria': 'VIC', 'Queensland': 'QLD',
    'South Australia': 'SA', 'Western Australia': 'WA', 'Tasmania': 'TAS',
    'Northern Territory': 'NT', 'Australian Capital Territory': 'ACT'
}

def load_state_geometries():
    states_geojson_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../energy/data/states.geojson'))
    if not os.path.exists(states_geojson_path):
        return None
    with open(states_geojson_path, 'r', encoding='utf-8') as f:
        return json.load(f)['features']

STATE_FEATURES = load_state_geometries()

def point_in_poly(x, y, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def dist_to_segment(px, py, x1, y1, x2, y2):
    import math
    dx = x2 - x1
    dy = y2 - y1
    if dx == dy == 0:
        return math.hypot(px - x1, py - y1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

def min_dist_to_feature(lon, lat, geometry):
    gtype = geometry['type']
    coords = geometry['coordinates']
    rings = coords if gtype == 'Polygon' else [ring for poly in coords for ring in poly]
    min_d = float('inf')
    for ring in rings:
        for i in range(len(ring) - 1):
            d = dist_to_segment(lon, lat, ring[i][0], ring[i][1], ring[i+1][0], ring[i+1][1])
            if d < min_d: min_d = d
    return min_d

def detect_state(lat, lon, location_str=""):
    if STATE_FEATURES:
        # Check ACT explicitly first to avoid enclosure conflicts
        for feat in STATE_FEATURES:
            if feat['properties']['STATE_NAME'] == 'Australian Capital Territory':
                if point_in_poly(lon, lat, feat['geometry']['coordinates'][0]):
                    return STATE_TO_ID['ACT']

        # Point in polygon check
        for feat in STATE_FEATURES:
            gtype = feat['geometry']['type']
            coords = feat['geometry']['coordinates']
            inside = False
            if gtype == 'Polygon':
                inside = point_in_poly(lon, lat, coords[0])
            elif gtype == 'MultiPolygon':
                for p in coords:
                    if point_in_poly(lon, lat, p[0]):
                        inside = True
                        break
            if inside:
                s_name = NAME_TO_STATE.get(feat['properties']['STATE_NAME'])
                if s_name: return STATE_TO_ID[s_name]

        # Nearest boundary for coastal / beach events
        best_state, best_dist = 'NSW', float('inf')
        for feat in STATE_FEATURES:
            d = min_dist_to_feature(lon, lat, feat['geometry'])
            if d < best_dist:
                best_dist = d
                best_state = NAME_TO_STATE.get(feat['properties']['STATE_NAME'], 'NSW')
        return STATE_TO_ID[best_state]

    # Fallback if states.geojson missing
    if lon < 129.0: return STATE_TO_ID["WA"]
    if lat < -40.0: return STATE_TO_ID["TAS"]
    if lat < -28.0 and lon > 138.0: return STATE_TO_ID["QLD"]
    return STATE_TO_ID["NSW"]

def main():
    if not os.path.exists(CATALOG_FILE):
        print(f"Error: {CATALOG_FILE} not found. Run scrape_parkrun.js first.")
        return

    with open(CATALOG_FILE, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    # Filter strictly to Saturday events (seriesid == 1, exclude juniors)
    saturday_catalog = []
    for ev in catalog:
        if ev.get('seriesid', 1) != 1:
            continue
        if '-juniors' in ev['eventname']:
            continue
        state_id = detect_state(ev['lat'], ev['lon'], ev.get('location', ''))
        ev['state_id'] = state_id
        ev['state'] = STATES[state_id]
        saturday_catalog.append(ev)

    print(f"Loaded {len(saturday_catalog)} Saturday events from catalog (excluded junior events).")

    event_map = {ev['eventname']: ev for ev in saturday_catalog}

    # Read all CSVs
    raw_events = []
    earliest_date = None
    latest_date = None

    csv_files = [f for f in os.listdir(EVENTS_DIR) if f.endswith('.csv')]
    print(f"Found {len(csv_files)} event CSV files in {EVENTS_DIR}...")

    matched_events = 0
    for fname in csv_files:
        eventname = fname[:-4]
        ev_meta = event_map.get(eventname)
        if not ev_meta:
            continue
        matched_events += 1

        filepath = os.path.join(EVENTS_DIR, fname)
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    d_str = row['date']
                    d_obj = datetime.strptime(d_str, '%Y-%m-%d')
                except Exception:
                    continue

                if d_obj.weekday() != 5:
                    # Filter strictly to Saturday events (exclude Christmas Day/New Year non-Saturday events)
                    continue

                if earliest_date is None or d_obj < earliest_date:
                    earliest_date = d_obj
                if latest_date is None or d_obj > latest_date:
                    latest_date = d_obj

                finishers = int(row.get('finishers', 0) or 0)
                event_num = int(row.get('event_number', 0) or 0)

                raw_events.append({
                    'event_id': ev_meta['id'],
                    'eventname': eventname,
                    'event_number': event_num,
                    'date': d_str,
                    'date_obj': d_obj,
                    'lon': ev_meta['lon'],
                    'lat': ev_meta['lat'],
                    'state_id': ev_meta['state_id'],
                    'finishers': finishers
                })

    if not raw_events:
        print("No raw events found!")
        return

    print(f"Loaded {len(raw_events)} Saturday runs from {matched_events} events.")
    print(f"Date range: {earliest_date.strftime('%Y-%m-%d')} to {latest_date.strftime('%Y-%m-%d')}")

    # Align start_date to the Saturday of earliest_date
    days_to_subtract = (earliest_date.weekday() - 5) % 7
    start_saturday = earliest_date - timedelta(days=days_to_subtract)
    
    total_days = (latest_date - start_saturday).days + 1
    total_weeks = (total_days + 6) // 7

    print(f"Weekly alignment: {total_weeks} weeks starting {start_saturday.strftime('%Y-%m-%d')}")

    # Bucket events by week
    weeks = [[] for _ in range(total_weeks)]
    for rev in raw_events:
        diff_days = (rev['date_obj'] - start_saturday).days
        w_idx = diff_days // 7
        if 0 <= w_idx < total_weeks:
            weeks[w_idx].append(rev)

    # Sort each week by event_id for consistent ordering
    for w in weeks:
        w.sort(key=lambda r: r['event_id'])

    # Write consolidated raw_events.csv (Saturday events only)
    print(f"Writing consolidated {RAW_EVENTS_FILE}...")
    with open(RAW_EVENTS_FILE, 'w', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'eventname', 'event_id', 'finishers', 'state_id'])
        for w in weeks:
            for r in w:
                writer.writerow([r['date'], r['eventname'], r['event_id'], r['finishers'], r['state_id']])

    # Binary blob record struct: '<HBxffHxx' = 16 bytes:
    #   H: event_id (uint16, 2 bytes)
    #   B: state_id (uint8, 1 byte)
    #   x: 1 byte reserved / alignment
    #   f: lon (float32, 4 bytes)
    #   f: lat (float32, 4 bytes)
    #   H: finishers (uint16, 2 bytes)
    #   xx: 2 bytes padding
    # Total = 16 bytes.
    RECORD_SIZE = 16
    print(f"Building binary blob {BIN_FILE} (Record size = {RECORD_SIZE} bytes)...")

    week_offsets = []
    week_stats = []
    all_binary_records = []
    running_cumulative_finishers = 0
    active_events_seen = set()

    for w_idx in range(total_weeks):
        week_offsets.append(len(all_binary_records))
        w_events = weeks[w_idx]
        w_finishers = sum(r['finishers'] for r in w_events)
        running_cumulative_finishers += w_finishers

        for r in w_events:
            active_events_seen.add(r['event_id'])
            all_binary_records.append(r)

        saturday_dt = start_saturday + timedelta(days=w_idx * 7)
        week_stats.append({
            'date': saturday_dt.strftime('%Y-%m-%d'),
            'finishers': w_finishers,
            'activeEvents': len(w_events),
            'cumulativeFinishers': running_cumulative_finishers,
            'totalEventsEstablished': len(active_events_seen)
        })

    week_offsets.append(len(all_binary_records))

    with open(BIN_FILE, 'wb') as f:
        for r in all_binary_records:
            f.write(struct.pack('<HBxffHH',
                r['event_id'],
                r['state_id'],
                r['lon'],
                r['lat'],
                r['finishers'],
                r['event_number']
            ))

    bin_size = os.path.getsize(BIN_FILE)
    print(f"Packed {len(all_binary_records)} records into {BIN_FILE} ({bin_size / 1024 / 1024:.2f} MB).")

    # Metadata file
    metadata = {
        'startDate': start_saturday.strftime('%Y-%m-%d'),
        'endDate': latest_date.strftime('%Y-%m-%d'),
        'totalWeeks': total_weeks,
        'recordCount': len(all_binary_records),
        'recordSize': RECORD_SIZE,
        'weekOffsets': week_offsets,
        'weekStats': week_stats,
        'states': STATES,
        'events': saturday_catalog
    }

    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"Metadata written to {METADATA_FILE}.")
    print("Done!")

if __name__ == '__main__':
    main()
