#!/usr/bin/env python3
"""Patch 2: Fix Silverado (legacy name), Ram 1500, GMC Sierra 1500 with correct trim names."""

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
            changes.append(f"  {make} {model} {y} '{trim}': {old:,} -> {new_price:,}  (diff {new_price-old:+,})")

# ─── Chevrolet Silverado (legacy model entry, same prices as Silverado 1500) ───
for year, prices in {
    2021: {"Silverado Regular Cab Work Truck": 31700, "Silverado Double Cab LT": 40200,
           "Silverado Crew Cab LT": 42700, "Silverado Crew Cab LTZ": 49200, "Silverado High Country": 59200},
    2022: {"Silverado Regular Cab Work Truck": 32400, "Silverado Double Cab LT": 40700,
           "Silverado Crew Cab LT": 43200, "Silverado Crew Cab LTZ": 49700, "Silverado High Country": 59700},
    2023: {"Silverado Regular Cab Work Truck": 34095, "Silverado Double Cab LT": 42700,
           "Silverado Crew Cab LT": 45200, "Silverado Crew Cab LTZ": 51700, "Silverado High Country": 61700},
    2024: {"Silverado Regular Cab Work Truck": 36295, "Silverado Double Cab LT": 44700,
           "Silverado Crew Cab LT": 47200, "Silverado Crew Cab LTZ": 53700, "Silverado High Country": 63700},
    2025: {"Silverado Regular Cab Work Truck": 37800, "Silverado Double Cab LT": 46200,
           "Silverado Crew Cab LT": 48700, "Silverado Crew Cab LTZ": 55200, "Silverado High Country": 65200},
    2026: {"Silverado Regular Cab Work Truck": 38745, "Silverado Double Cab LT": 47355,
           "Silverado Crew Cab LT": 49935, "Silverado Crew Cab LTZ": 56580, "Silverado High Country": 66830},
}.items():
    fix("Chevrolet", "Silverado", year, prices)

# ─── Ram 1500 (base prices slightly low; TRX significantly under-priced) ───
for year, prices in {
    2022: {"Regular Cab Tradesman": 33595, "Regular Cab Express": 35595,
           "Quad Cab Express": 38095, "Crew Cab Express": 40095,
           "Crew Cab Big Horn": 42095, "Crew Cab Laramie": 46095,
           "Crew Cab Longhorn": 53095, "Crew Cab Limited": 56595,
           "Crew Cab TRX": 71690},
    2023: {"Regular Cab Tradesman": 34990, "Regular Cab Express": 36990,
           "Quad Cab Express": 39490, "Crew Cab Express": 41490,
           "Crew Cab Big Horn": 43490, "Crew Cab Laramie": 47490,
           "Crew Cab Longhorn": 54490, "Crew Cab Limited": 57990,
           "Crew Cab TRX": 76995},
    2024: {"Regular Cab Tradesman": 36490, "Regular Cab Express": 38490,
           "Quad Cab Express": 40990, "Crew Cab Express": 42990,
           "Crew Cab Big Horn": 44990, "Crew Cab Laramie": 48990,
           "Crew Cab Longhorn": 55990, "Crew Cab Limited": 59490,
           "Crew Cab TRX": 81995},
    2025: {"Regular Cab Tradesman": 37990, "Regular Cab Express": 39990,
           "Quad Cab Express": 42490, "Crew Cab Express": 44490,
           "Crew Cab Big Horn": 46490, "Crew Cab Laramie": 50490,
           "Crew Cab Longhorn": 57490, "Crew Cab Limited": 60990,
           "Crew Cab TRX": 84995},
}.items():
    fix("Ram", "1500", year, prices)

# ─── GMC Sierra 1500 (base Pro trim slightly low; Denali close) ───
for year, prices in {
    2022: {"Regular Cab Pro": 33990, "Double Cab SLE": 40490, "Double Cab SLT": 45490,
           "Double Cab AT4": 48490, "Crew Cab SLE": 43490, "Crew Cab SLT": 48490,
           "Crew Cab AT4": 51490, "Denali": 59490},
    2023: {"Regular Cab Pro": 35490, "Double Cab SLE": 41990, "Double Cab SLT": 46990,
           "Double Cab AT4": 49990, "Crew Cab SLE": 44990, "Crew Cab SLT": 49990,
           "Crew Cab AT4": 52990, "Denali": 61490},
    2024: {"Regular Cab Pro": 37290, "Double Cab SLE": 43490, "Double Cab SLT": 48490,
           "Double Cab AT4": 51490, "Crew Cab SLE": 46490, "Crew Cab SLT": 51490,
           "Crew Cab AT4": 54490, "Denali": 63490},
    2025: {"Regular Cab Pro": 38590, "Double Cab SLE": 44990, "Double Cab SLT": 49990,
           "Double Cab AT4": 52990, "Crew Cab SLE": 47990, "Crew Cab SLT": 52990,
           "Crew Cab AT4": 55990, "Denali": 64990},
    2026: {"Regular Cab Pro": 39555, "Double Cab SLE": 46115, "Double Cab SLT": 51240,
           "Double Cab AT4": 54315, "Crew Cab SLE": 49165, "Crew Cab SLT": 54315,
           "Crew Cab AT4": 57390, "Denali": 66615},
}.items():
    fix("GMC", "Sierra 1500", year, prices)

# ─── Write output ───
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 2: {len(changes)} additional corrections:\n")
for c in sorted(changes):
    print(c)
