from bs4 import BeautifulSoup
import re

html = open('oe_facilities.html').read()
soup = BeautifulSoup(html, 'html.parser')
tags = soup.find_all(True)
print(f"Total tags: {len(tags)}")

attrs_with_coords = set()
for tag in tags:
    for attr in tag.attrs:
        if 'lat' in attr.lower() or 'lon' in attr.lower() or 'coord' in attr.lower():
            attrs_with_coords.add(attr)
print("Attributes:", attrs_with_coords)
