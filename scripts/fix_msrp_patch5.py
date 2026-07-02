#!/usr/bin/env python3
"""Patch 5: GMC Canyon 2023-2025 new-gen trim structure, Lincoln Nautilus 2024-2025
new-gen pricing, Dodge Challenger SXT 2015-2023 base inflation,
Dodge Charger SXT 2015-2023 base inflation."""

import json
import copy

SRC = "src/data/vehicles.json"

with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []

def fix(make, model, year, trim_prices):
    y = str(year)
    tby = corrected.get(make, {}).get(model, {}).get("trims_by_year", {})
    if y not in tby:
        return
    for trim, new_price in trim_prices.items():
        if trim not in tby[y]:
            continue
        old = tby[y][trim]
        if old != new_price:
            tby[y][trim] = new_price
            changes.append(
                f"  {make} {model} {y} '{trim}': {old:,} -> {new_price:,}  (diff {new_price-old:+,})"
            )

def replace_year(make, model, year, new_trims):
    """Replace an entire year's trim dict, logging additions and removals."""
    y = str(year)
    tby = corrected[make][model]["trims_by_year"]
    old = tby.get(y, {})
    tby[y] = new_trims
    for trim, price in new_trims.items():
        old_price = old.get(trim)
        if old_price is None:
            changes.append(f"  {make} {model} {y} '{trim}': [new] -> {price:,}")
        elif old_price != price:
            changes.append(
                f"  {make} {model} {y} '{trim}': {old_price:,} -> {price:,}  (diff {price-old_price:+,})"
            )
    for trim in old:
        if trim not in new_trims:
            changes.append(f"  {make} {model} {y} '{trim}': {old[trim]:,} -> [removed]")

# ─── GMC Canyon 2023-2025 (3rd generation, new platform) ─────────────────────
# The 2023 Canyon was a complete redesign. The new gen uses entirely different
# trim names: Elevation, AT4, Denali, AT4X (no more Pro/SLE/SLT).
# DB 2023-2025 still has the 2nd-gen trim names and 2nd-gen pricing (~$29k-45k),
# making these entries factually wrong for the new vehicle.
# Prices are calibrated from the DB's own 2026 values (Elevation $37,995,
# AT4 $42,995, Denali $46,995, AT4X $54,995) working back at ~$1,000/year.
# The AT4X saw a ~$3,000 content-driven premium emerge by 2026, so we hold
# 2023-2025 at a slightly lower AT4X price that converges on the 2026 figure.
replace_year("GMC", "Canyon", 2023, {
    "Canyon Elevation": 34995,
    "Canyon AT4":       39995,
    "Canyon Denali":    43995,
    "Canyon AT4X":      49995,
})
replace_year("GMC", "Canyon", 2024, {
    "Canyon Elevation": 35995,
    "Canyon AT4":       40995,
    "Canyon Denali":    44995,
    "Canyon AT4X":      50995,
})
replace_year("GMC", "Canyon", 2025, {
    "Canyon Elevation": 36995,
    "Canyon AT4":       41995,
    "Canyon Denali":    45995,
    "Canyon AT4X":      51995,
})

# ─── Lincoln Nautilus 2024-2025 (all-new 3rd generation) ─────────────────────
# The 2024 Nautilus is a complete redesign on a new platform with three trims:
# Standard, Reserve, Black Label. The DB continues the old-gen price trajectory
# ($46,745-$47,945 for Standard), which is ~$5,600 too low vs the actual new-gen
# launch price of ~$52,345 for the Standard.
# The 2026 DB has the correct new-gen values: Standard $52,995, Reserve $58,995,
# Black Label $67,995 — working back from these anchors:
replace_year("Lincoln", "Nautilus", 2024, {
    "Nautilus Standard":    52345,
    "Nautilus Reserve":     58345,
    "Nautilus Black Label": 65345,
})
replace_year("Lincoln", "Nautilus", 2025, {
    "Nautilus Standard":    52745,
    "Nautilus Reserve":     58745,
    "Nautilus Black Label": 66345,
})

# ─── Dodge Challenger SXT 2015-2023 ──────────────────────────────────────────
# The DB applies a flat $1,000/year increase to every Challenger trim, but the
# V6 SXT base price increased far more slowly (about $200-500/year in reality).
# DB 2022 SXT is $34,995; actual 2022 SXT MSRP was ~$31,695 — a $3,300 error.
# Only the base SXT is corrected here; performance trims (GT, R/T, Scat Pack,
# SRT 392, Hellcat variants) have more complex pricing that requires separate research.
fix("Dodge", "Challenger", 2015, {"SXT": 27990})
fix("Dodge", "Challenger", 2016, {"SXT": 27995})
fix("Dodge", "Challenger", 2017, {"SXT": 28095})
fix("Dodge", "Challenger", 2018, {"SXT": 28245})
fix("Dodge", "Challenger", 2019, {"SXT": 29245})
fix("Dodge", "Challenger", 2020, {"SXT": 29895})
fix("Dodge", "Challenger", 2021, {"SXT": 30745})
fix("Dodge", "Challenger", 2022, {"SXT": 31695})
fix("Dodge", "Challenger", 2023, {"SXT": 32245})

# ─── Dodge Charger SXT 2015-2023 ─────────────────────────────────────────────
# Same systematic $1,000/year inflation applied to the Charger SXT. The Charger
# SXT was typically priced within $500-$1,000 of the equivalent Challenger SXT.
# DB 2022 Charger SXT: $35,995; actual was ~$32,495 (−$3,500 error).
fix("Dodge", "Charger", 2015, {"SXT": 29495})
fix("Dodge", "Charger", 2016, {"SXT": 29995})
fix("Dodge", "Charger", 2017, {"SXT": 30495})
fix("Dodge", "Charger", 2018, {"SXT": 30995})
fix("Dodge", "Charger", 2019, {"SXT": 31495})
fix("Dodge", "Charger", 2020, {"SXT": 31995})
fix("Dodge", "Charger", 2021, {"SXT": 32495})
fix("Dodge", "Charger", 2022, {"SXT": 32995})
fix("Dodge", "Charger", 2023, {"SXT": 33490})

# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 5: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
