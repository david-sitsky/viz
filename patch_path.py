with open("generate_aemo.py", "r") as f:
    lines = f.readlines()
with open("generate_aemo.py", "w") as f:
    for line in lines:
        if "sys.path.insert" not in line:
            f.write(line)
