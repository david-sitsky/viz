import json
from bs4 import BeautifulSoup

with open('oe_facilities.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

script = soup.find('script', id='__NEXT_DATA__')
if script:
    data = json.loads(script.string)
    # the facilities are usually in props.pageProps
    try:
        facilities = data['props']['pageProps']['facilities']
        print(f"Found {len(facilities)} facilities!")
        with open('oe_extracted.json', 'w') as out:
            json.dump(facilities, out, indent=2)
    except KeyError as e:
        print("KeyError:", e)
        # Maybe let's just dump the whole JSON to see the structure
        with open('oe_full.json', 'w') as out:
            json.dump(data, out, indent=2)
else:
    print("No __NEXT_DATA__ found.")
