with open("js/energy_map.js", "r") as f:
    content = f.read()

import re
content = content.replace(
    "if (this.onRecord) this.onRecord(recordIdx);",
    "if (this.onRecord) this.onRecord(recordIdx, info.x, info.y);"
)

with open("js/energy_map.js", "w") as f:
    f.write(content)
