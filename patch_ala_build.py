import sys

py_file = 'common/scripts/ala_build.py'
with open(py_file, 'r') as f:
    content = f.read()

# Add argument
import re
content = re.sub(
    r"parser\.add_argument\('--output-species', help=\"Optional output species JSON path\"\)",
    "parser.add_argument('--output-species', help=\"Optional output species JSON path\")\n    parser.add_argument('--start-date', help=\"Optional fixed start date (ISO string) to override the first record date\")",
    content
)

# Update start_date parsing
old_parse = """    start_date = parse_date(records[0]['date_ms'])
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)"""

new_parse = """    if args.start_date:
        start_date = parse_date(args.start_date)
    else:
        start_date = parse_date(records[0]['date_ms'])
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)"""

content = content.replace(old_parse, new_parse)

# Filter out records that are BEFORE start_date if a strict start date is enforced!
# Wait, if start_date is set to Aug 1, and there are records in July (if any?), they will have negative day_diff!
# Actually, the user says "there are little recordings before then". The ALA sync might return some if we aren't careful?
# Wait, ala_sync ALREADY filters by `--start-date`, so records[0] is guaranteed to be >= start_date!
# So day_diff will always be >= 0.

with open(py_file, 'w') as f:
    f.write(content)
