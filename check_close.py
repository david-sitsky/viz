import json
import math
with open("data_energy/facilities.json") as f:
    facs = json.load(f)
for i in range(len(facs)):
    for j in range(i+1, len(facs)):
        f1 = facs[i]
        f2 = facs[j]
        if f1["type"] != f2["type"]:
            dist = math.hypot(f1["lat"]-f2["lat"], f1["lon"]-f2["lon"])
            if dist < 0.1:
                print(f"Close: {f1['name']} ({f1['type']}) and {f2['name']} ({f2['type']}) - dist {dist:.3f}")
