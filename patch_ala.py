import sys

py_file = 'common/scripts/ala_build.py'
with open(py_file, 'r') as f:
    content = f.read()

# Replace fetch_species_image
old_func = '''def fetch_species_image(species_name):
    if not species_name or species_name == "Unknown":
        return None
    url = f"https://api.inaturalist.org/v1/taxa?q={urllib.parse.quote(species_name)}&per_page=1"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data.get("results") and len(data["results"]) > 0:
                photo = data["results"][0].get("default_photo")
                if photo:
                    return photo.get("medium_url") or photo.get("square_url")
    except Exception as e:
        pass
    return None'''

new_func = '''def fetch_inaturalist_info(species_name):
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
    return info'''

content = content.replace(old_func, new_func)

old_loop = '''    if args.output_species:
        print("Fetching thumbnails for species...")
        for name, info in species_map.items():
            if name != "Unknown":
                info["image"] = fetch_species_image(name)'''

new_loop = '''    if args.output_species:
        print("Fetching thumbnails and common names from iNaturalist...")
        for name, info in species_map.items():
            if name != "Unknown":
                inat_info = fetch_inaturalist_info(name)
                info["image"] = inat_info["image"]
                if inat_info["common_name"]:
                    info["common_name"] = inat_info["common_name"]'''

content = content.replace(old_loop, new_loop)

with open(py_file, 'w') as f:
    f.write(content)
