#!/usr/bin/env python3
"""Patch 18: prior-year corrections surfaced by the MY2027 refresh.

Run from the repo root after patch 17: python3 scripts/patches/fix_catalog_patch18.py

Adding sourced 2027 prices (patch 17) made the validator flag year-over-year
jumps and drops against 2025/2026 rows that turned out to be extrapolated, not
sourced (see docs/PRICING_DATA_REBUILD_PLAN.md). Each row below replaces the
flagged values with sourced figures. Prices are base MSRP excluding
destination; destination-inclusive sources are converted as noted.
"""
import copy
import json

SRC = "src/data/vehicles.json"
with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []


def set_year(make, model, year, trims):
    m = corrected[make][model]
    m["trims_by_year"][str(year)] = trims
    changes.append(f"  {make} {model} {year}: replaced ({len(trims)} trims)")


def set_trims(make, model, year, trims):
    row = corrected[make][model]["trims_by_year"][str(year)]
    for trim, price in trims.items():
        changes.append(f"  {make} {model} {year} '{trim}': {row.get(trim)} -> {price}")
        row[trim] = price


def drop_year(make, model, year):
    corrected[make][model]["trims_by_year"].pop(str(year))
    changes.append(f"  {make} {model}: removed MY{year}")


# GMC Terrain: the third generation launched for MY2025 as a single Elevation
# trim ($31,395 incl. $1,395 destination; Cars.com, GM Authority Oct 2024);
# AT4 and Denali joined for 2026 (GM Authority, incl. $1,995 destination).
# The old rows carried second-generation trims (Pro/SLE/SLT) at invented prices.
set_year("GMC", "Terrain", 2025, {"Terrain Elevation": 30000})
set_year("GMC", "Terrain", 2026, {"Terrain Elevation": 30200, "Terrain AT4": 39400, "Terrain Denali": 41900})

# GMC Acadia 2026: GM Authority '2026 GMC Acadia pricing uncovered' plus the
# Dec 2025 increase (FWD where offered; $1,995 destination removed).
set_year("GMC", "Acadia", 2026, {"Acadia Elevation": 43800, "Acadia AT4": 52500, "Acadia Denali": 55900, "Acadia Denali Ultimate": 63100})

# Honda CR-V: the Sport trims are hybrid-only; the old rows listed gas "Sport"
# trims that never existed. 2025: Main Line Honda / TrueCar base MSRPs. 2026:
# TrueCar (incl. $1,395 destination, removed here).
set_year("Honda", "CR-V", 2025, {"CR-V LX": 30100, "CR-V EX": 32350, "CR-V EX-L": 35000, "CR-V Hybrid Sport": 34650, "CR-V Hybrid Sport-L": 37650, "CR-V Hybrid Sport Touring": 41100})
set_year("Honda", "CR-V", 2026, {"CR-V LX": 30975, "CR-V EX": 33205, "CR-V EX-L": 35455, "CR-V Hybrid Sport": 35685, "CR-V Hybrid Sport-L": 38780, "CR-V Hybrid TrailSport": 38855, "CR-V Hybrid Sport Touring": 42305})

# Honda Odyssey 2025: iSeeCars/Carscoops base MSRPs (the 2025 refresh dropped
# the LX, so it is removed rather than carried).
set_year("Honda", "Odyssey", 2025, {"Odyssey EX-L": 42220, "Odyssey Sport-L": 43370, "Odyssey Touring": 46910, "Odyssey Elite": 51180})

# Kia Sportage 2026: Kia America '2026 Sportage pricing' (excl. $1,395 destination).
set_trims("Kia", "Sportage", 2026, {"Sportage SX Prestige": 36290, "Sportage X-Pro Prestige": 39590})

# Kia Telluride: Kia built no MY2026 Telluride; it sold first-generation 2025s
# through 2026 and launched the redesign as a 2027 (EPA has no 2026 listing).
drop_year("Kia", "Telluride", 2026)

# Subaru Ascent 2026: Subaru of America press release 2340, Jul 24 2025.
set_trims("Subaru", "Ascent", 2026, {"Limited": 47885, "Touring": 51165})

# Chevrolet Corvette 2026: GM Authority '2026 Corvette pricing uncovered'
# (1LT/1LZ, excl. $1,995 destination).
set_trims("Chevrolet", "Corvette", 2026, {"Corvette Stingray": 70000, "Corvette Stingray Convertible": 77000, "Corvette E-Ray": 108600, "Corvette Z06": 117700, "Corvette Z06 Convertible": 124700, "Corvette ZR1": 180400})

# Toyota Prius 2026 Limited: KBB/Cars.com ($35,565 FWD). 2027 is +$205 per
# Carscoops, which matches.
set_trims("Toyota", "Prius", 2026, {"Prius Limited": 35565})

# Jeep Grand Cherokee 2026 Laredo: 2027 starts $600 higher at $39,520 (KBB),
# so 2026 was $38,920.
set_trims("Jeep", "Grand Cherokee", 2026, {"Grand Cherokee Laredo": 38920})

with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 18: {len(changes)} change(s):")
for c in changes:
    print(c)
