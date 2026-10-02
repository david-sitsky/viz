with open("generate_aemo.py", "r") as f:
    content = f.read()
with open("generate_aemo.py", "w") as f:
    f.write("import sys\nimport os\nsys.path.insert(0, os.path.abspath('.'))\n" + content)
