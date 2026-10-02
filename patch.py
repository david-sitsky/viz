import sys
with open("generate_aemo.py", "r") as f:
    content = f.read()

content = content.replace("if pd.isnull(cap) or cap <= 0: cap = 50", """
    try:
        cap = float(cap)
        if cap <= 0: cap = 50
    except:
        cap = 50
""")

with open("generate_aemo.py", "w") as f:
    f.write(content)
