import sys
import re

with open("scripts/fetch_aemo_data.py", "r") as f:
    content = f.read()

# Add oe_id to each station
replacements = {
    '"name": "Loy Yang A"': '"oe_id": "LYA", "name": "Loy Yang A"',
    '"name": "Loy Yang B"': '"oe_id": "LYB", "name": "Loy Yang B"',
    '"name": "Yallourn"': '"oe_id": "YWPS", "name": "Yallourn"',
    '"name": "Liddell"': '"oe_id": "LIDDELL", "name": "Liddell"',
    '"name": "Bayswater"': '"oe_id": "BWPS", "name": "Bayswater"',
    '"name": "Eraring"': '"oe_id": "ERARING", "name": "Eraring"',
    '"name": "Gladstone"': '"oe_id": "GLADSTONE", "name": "Gladstone"',
    '"name": "Tarong"': '"oe_id": "TARONG", "name": "Tarong"',
    '"name": "Pelican Point"': '"oe_id": "PELICAN", "name": "Pelican Point"',
    '"name": "Tallawarra"': '"oe_id": "TALLAWARRA", "name": "Tallawarra"',
    '"name": "Mortlake"': '"oe_id": "MORTLAKE", "name": "Mortlake"',
    '"name": "Tumut 3 (Snowy)"': '"oe_id": "TUMUT3", "name": "Tumut 3 (Snowy)"',
    '"name": "Murray 1 (Snowy)"': '"oe_id": "MURRAY", "name": "Murray 1 (Snowy)"',
    '"name": "Gordon (Tas)"': '"oe_id": "GORDON", "name": "Gordon (Tas)"',
    '"name": "Poatina (Tas)"': '"oe_id": "POATINA", "name": "Poatina (Tas)"',
    '"name": "Macarthur Wind"': '"oe_id": "MACARTH", "name": "Macarthur Wind"',
    '"name": "Snowtown"': '"oe_id": "SNOWTWN", "name": "Snowtown"',
    '"name": "Hallett"': '"oe_id": "HALLETT", "name": "Hallett"',
    '"name": "Sapphire"': '"oe_id": "SAPPHIRE", "name": "Sapphire"',
    '"name": "Coopers Gap"': '"oe_id": "COOPERS", "name": "Coopers Gap"',
    '"name": "Nyngan Solar"': '"oe_id": "NYNGAN", "name": "Nyngan Solar"',
    '"name": "Coleambally Solar"': '"oe_id": "COLEAMBLY", "name": "Coleambally Solar"',
    '"name": "Limondale Solar"': '"oe_id": "LIMONDALE", "name": "Limondale Solar"',
    '"name": "Darlington Point"': '"oe_id": "DARLINGTON", "name": "Darlington Point"'
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open("scripts/fetch_aemo_data.py", "w") as f:
    f.write(content)
