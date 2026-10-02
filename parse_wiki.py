import pandas as pd
tables = pd.read_html('wikipedia.html')
print(f"Found {len(tables)} tables")
for i, t in enumerate(tables):
    if 'Coordinates' in t.columns or 'Location' in t.columns:
        print(f"Table {i}:", list(t.columns))
