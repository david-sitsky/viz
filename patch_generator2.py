with open("generate_from_oe.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "if cap <= 0: cap = 50" in line:
        new_lines.append(line)
        new_lines.append("    if 'battery' in str(r['fueltech']).lower(): continue\n")
    else:
        new_lines.append(line)

with open("generate_from_oe.py", "w") as f:
    f.writelines(new_lines)
