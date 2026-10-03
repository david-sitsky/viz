with open('js/energy_app.js', 'r') as f:
    js = f.read()

js = js.replace("'data_energy/facilities.json'", "'data_energy/facilities.json?v=2'")
js = js.replace("'data_energy/metadata.json'", "'data_energy/metadata.json?v=2'")
js = js.replace("'data_energy/energy.bin'", "'data_energy/energy.bin?v=2'")

with open('js/energy_app.js', 'w') as f:
    f.write(js)
