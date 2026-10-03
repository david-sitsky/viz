import re

with open('js/energy_map.js', 'r') as f:
    js = f.read()

# Remove the faulty initialization in applyStateFilter
old_init = """    if (!this.data.filteredGeneration) {
        this.data.filteredGeneration = new Float32Array(this.data.generation.length);
        this.data.filteredPositions = new Float32Array(this.data.positions.length);
    }"""
new_init = """    if (!this.data.filteredPositions) {
        this.data.filteredPositions = new Float32Array(this.data.positions.length);
    }
    if (!this.data.filteredGeneration) {
        this.data.filteredGeneration = new Float32Array(this.data.generation.length);
    }"""
js = js.replace(old_init, new_init)

with open('js/energy_map.js', 'w') as f:
    f.write(js)
