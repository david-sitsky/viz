import re

with open('generate_from_oe.py', 'r') as f:
    text = f.read()

text = text.replace('url = "https://api.openelectricity.org.au/v4/data/network/NEM"', 'url = "https://api.openelectricity.org.au/v4/data/facilities/AU"')

# Fix summing logic
sum_logic = """
                    data = await resp.json()
                    month_sums = {}
                    for item in data.get("data", []):
                        for r in item.get("results", []):
                            for row in r.get("data", []):
                                date_str = row[0][:7]
                                val = row[1] or 0
                                month_sums[date_str] = month_sums.get(date_str, 0) + val
                    return fac_id, month_sums
"""

text = re.sub(r'                    data = await resp.json().*?return fac_id, results', sum_logic.strip(), text, flags=re.DOTALL)

with open('generate_from_oe.py', 'w') as f:
    f.write(text)
