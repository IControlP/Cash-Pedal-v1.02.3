#!/usr/bin/env python3
"""Patch 15: Ram 1500 TRX 2022 MSRP correction

The DB had the 2022 TRX at $71,690 (only +$395 from the 2021 launch price of
$71,295). In reality, Ram raised the TRX MSRP significantly for MY2022 to
$76,880, a fact confirmed by AutoEvolution, Autoblog, MoparInsiders, and
multiple dealer sites. The $71,690 figure is clearly a data error — every
other Ram 1500 trim received a $1,300–$5,300 increase in 2022, and the 2023
TRX in the DB is already at $76,995 (consistent with a ~$115 step from $76,880).
"""
import json, copy

SRC = "src/data/vehicles.json"
with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []

def fix(make, model, year, trim_prices):
    y = str(year)
    for trim, price in trim_prices.items():
        old = corrected[make][model]["trims_by_year"][y].get(trim)
        corrected[make][model]["trims_by_year"][y][trim] = price
        changes.append(f"  {make} {model} {year} '{trim}': {old} → {price}")

# 2022 Ram 1500 TRX: $71,690 → $76,880
# Source: AutoEvolution "MSRP Now Starts at $76,880", Autoblog "MSRP up another $2,795",
# MoparInsiders, multiple dealer listings. The 2023 DB value ($76,995) is consistent
# with a ~$115 step from this corrected 2022 price.
fix("Ram", "1500", 2022, {"Crew Cab TRX": 76880})

with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 15: {len(changes)} change(s):")
for c in sorted(changes):
    print(c)
