with open("js/energy_map.js", "r") as f:
    content = f.read()
import re
content = re.sub(r"\} else \{\n\s*const histStart = info\.layer\.props\._histStart \?\? 0;\n\s*activeIdx = histStart \+ info\.index;\n\s*\} else \{", "} else {", content)
with open("js/energy_map.js", "w") as f:
    f.write(content)
