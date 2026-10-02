with open("generate_aemo.py", "r") as f:
    content = f.read()

import re
old_bounds = """    bounds = {
        'NSW1': {'lat': (-36.0, -28.5), 'lon': (141.0, 153.5)},
        'QLD1': {'lat': (-28.5, -11.0), 'lon': (138.0, 153.5)},
        'VIC1': {'lat': (-39.0, -34.0), 'lon': (141.0, 150.0)},
        'SA1':  {'lat': (-38.0, -26.0), 'lon': (129.0, 141.0)},
        'TAS1': {'lat': (-43.5, -40.5), 'lon': (144.5, 148.5)},
        'NT1':  {'lat': (-25.0, -11.5), 'lon': (129.0, 138.0)},
        'WA1':  {'lat': (-35.0, -14.0), 'lon': (113.0, 129.0)},
    }"""
new_bounds = """    bounds = {
        'NSW1': {'lat': (-35.0, -29.0), 'lon': (142.0, 150.0)},
        'QLD1': {'lat': (-27.0, -15.0), 'lon': (141.0, 149.0)},
        'VIC1': {'lat': (-38.0, -35.0), 'lon': (142.0, 148.0)},
        'SA1':  {'lat': (-34.0, -28.0), 'lon': (135.0, 140.0)},
        'TAS1': {'lat': (-43.0, -41.0), 'lon': (145.0, 147.5)},
        'NT1':  {'lat': (-22.0, -13.0), 'lon': (130.0, 136.0)},
        'WA1':  {'lat': (-33.0, -20.0), 'lon': (116.0, 124.0)},
    }"""
content = content.replace(old_bounds, new_bounds)

with open("generate_aemo.py", "w") as f:
    f.write(content)
