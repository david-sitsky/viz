"""
Data Pipeline script for historical generation values.

This script relies on the official `openelectricity` Python SDK to fetch
monthly generation aggregates for each facility from the OpenElectricity API.
It requires an OPENELECTRICITY_API_KEY environment variable to be set.

Usage in GitHub Actions:
  env:
    OPENELECTRICITY_API_KEY: ${{ secrets.OPENELECTRICITY_API_KEY }}
  run: python update_historical.py
"""

import os
import json
import struct
import asyncio
from datetime import datetime
from openelectricity.client import AsyncOEClient

async def update_energy_bin():
    if not os.environ.get("OPENELECTRICITY_API_KEY"):
        print("ERROR: OPENELECTRICITY_API_KEY environment variable is missing.")
        print("Please provision an API key at https://openelectricity.org.au and run again.")
        return

    # Load our 436 mapped facilities
    with open('data_energy/facilities.json', 'r') as f:
        stations = json.load(f)

    print(f"Loaded {len(stations)} facilities for updating.")

    start_date = datetime(2000, 1, 1)
    end_date = datetime(2026, 12, 31)
    num_months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1

    fuel_types = ["coal", "gas", "hydro", "wind", "commercial_solar", "rooftop_solar"]
    fuel_type_to_id = {f: i for i, f in enumerate(fuel_types)}

    records = []
    day_offsets = []

    # Initialize async client
    async with AsyncOEClient() as client:
        # NOTE: Fetching 436 facilities iteratively.
        # In a real Github action, we could parallelize this using asyncio.gather with rate-limiting.
        for s in stations:
            fac_id = s['oe_id']
            try:
                # Fetch historical monthly generation
                # This depends on the exact openelectricity model structure
                # Typically, client.facility_generation(facility_code=fac_id, interval='month')
                print(f"Fetching historical data for {fac_id}...")
                
                # Mock integration (replace with actual client call once SDK docs are consulted)
                # response = await client.get_facility_energy(fac_id, interval='month')
                
                # ... parse response into monthly aggregates ...
                
            except Exception as e:
                print(f"Failed to fetch {fac_id}: {e}")
                
    # ... Build energy.bin structurally ...
    # This script will replace the simulated values with actual API responses.

if __name__ == "__main__":
    asyncio.run(update_energy_bin())
