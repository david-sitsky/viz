import struct
import json

with open("data_energy/facilities.json") as f:
    facs = {fac["id"]: fac for fac in json.load(f)}

with open("data_energy/energy.bin", "rb") as f:
    data = f.read()

record_size = 15
num_records = len(data) // record_size

fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]

misaligned = 0
for i in range(num_records):
    offset = i * record_size
    fid, lon, lat, cat_idx, gen = struct.unpack_from('<HffBf', data, offset)
    
    fac = facs.get(fid)
    if fac:
        expected_type = fac["type"]
        actual_type = fuel_types[cat_idx]
        if expected_type != actual_type and expected_type.replace("commercial_solar", "solar_utility") != actual_type:
            print(f"Misaligned at {i}: fid={fid} expected={expected_type} actual_cat={actual_type}")
            misaligned += 1
            if misaligned > 5:
                break
if misaligned == 0:
    print("All records perfectly aligned.")
