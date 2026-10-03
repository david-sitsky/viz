with open('/home/sits/.local/lib/python3.10/site-packages/openelectricity/client.py', 'r') as f:
    text = f.read()
import re
m = re.search(r'def _async_get_facility_data.*?def', text, re.DOTALL)
if m:
    print(m.group(0))
