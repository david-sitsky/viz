import sys
sys.path.insert(0, "/home/sits/.local/lib/python3.10/site-packages")
import pandas as pd
df = pd.read_excel('aemo.xls', sheet_name=None)
print(df.keys())
