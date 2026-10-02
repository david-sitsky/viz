import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import pandas as pd

try:
    df = pd.read_excel('aemo.xls', sheet_name='Generators and Scheduled Loads', engine='openpyxl')
    print("Columns:", list(df.columns))
    print(df.head())
except Exception as e:
    print(e)
