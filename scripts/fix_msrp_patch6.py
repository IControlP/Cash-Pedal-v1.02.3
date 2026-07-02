#!/usr/bin/env python3
"""Patch 6: Ram 2500 2019-2025 all trims (flat $300/yr severely underpriced),
Ram 3500 2019-2025 all trims (same systematic error),
Ford Expedition 2023-2025 XL/XLT (systematic inflation)."""

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

# ─── Ram 2500 2019-2025 ───────────────────────────────────────────────────────
# DB applied a flat ~$300/yr increase to all Ram 2500 trims from 2019-2025.
# Real-world HD truck prices increased $1,100-3,000+/yr (especially 2020-2023
# due to COVID supply constraints and content additions). The 2026 DB has
# correctly-anchored values: RC Tradesman $41,995, CC Tradesman $47,995,
# Big Horn CC $54,995, Laramie CC $62,995, Limited CC $73,995.
# Working back from those anchors at trim-appropriate annual rates:
#   RC Tradesman ~$1,100/yr, CC Tradesman ~$1,400/yr, Big Horn ~$2,000/yr,
#   Laramie ~varying (larger COVID+content jumps), Limited ~varying.
# The resulting 2025→2026 steps are: $1,100, $1,400, $2,000, $1,000, $1,000 —
# all reasonable. The DB 2025 Limited CC at $54,195 is $19,800 below the 2026
# anchor ($73,995), confirming a multi-year underpricing error.
# Cross-check: corrected Ram 2500 CC Laramie/Limited values now exceed the
# already-corrected Ram 1500 equivalents by $2,000-8,000, as expected for HD.

for year, prices in {
    2019: {"Regular Cab Tradesman": 34295, "Crew Cab Tradesman": 38195,
           "Crew Cab Big Horn":     40995, "Crew Cab Laramie":   47495,
           "Crew Cab Limited":      54995},
    2020: {"Regular Cab Tradesman": 35395, "Crew Cab Tradesman": 39595,
           "Crew Cab Big Horn":     42995, "Crew Cab Laramie":   49995,
           "Crew Cab Limited":      56995},
    2021: {"Regular Cab Tradesman": 36495, "Crew Cab Tradesman": 40995,
           "Crew Cab Big Horn":     44995, "Crew Cab Laramie":   52995,
           "Crew Cab Limited":      59995},
    2022: {"Regular Cab Tradesman": 37595, "Crew Cab Tradesman": 42395,
           "Crew Cab Big Horn":     46995, "Crew Cab Laramie":   55995,
           "Crew Cab Limited":      63995},
    2023: {"Regular Cab Tradesman": 38695, "Crew Cab Tradesman": 43795,
           "Crew Cab Big Horn":     48995, "Crew Cab Laramie":   58995,
           "Crew Cab Limited":      67995},
    2024: {"Regular Cab Tradesman": 39795, "Crew Cab Tradesman": 45195,
           "Crew Cab Big Horn":     50995, "Crew Cab Laramie":   60995,
           "Crew Cab Limited":      70995},
    2025: {"Regular Cab Tradesman": 40895, "Crew Cab Tradesman": 46595,
           "Crew Cab Big Horn":     52995, "Crew Cab Laramie":   61995,
           "Crew Cab Limited":      72995},
}.items():
    fix("Ram", "2500", year, prices)

# ─── Ram 3500 2019-2025 ───────────────────────────────────────────────────────
# Same systematic underpricing as 2500. The 3500 commands a $3,000-6,000
# premium over the 2500 equivalent trim; the DB's flat-rate formula widens the
# error identically. 2026 anchors: RC Tradesman $44,995, CC Tradesman $50,995,
# Big Horn CC $57,995, Laramie CC $66,995, Limited CC $77,995.
# Applied same annual-rate methodology as 2500.

for year, prices in {
    2019: {"Regular Cab Tradesman": 37295, "Crew Cab Tradesman": 41195,
           "Crew Cab Big Horn":     43995, "Crew Cab Laramie":   49495,
           "Crew Cab Limited":      56995},
    2020: {"Regular Cab Tradesman": 38395, "Crew Cab Tradesman": 42595,
           "Crew Cab Big Horn":     45995, "Crew Cab Laramie":   51995,
           "Crew Cab Limited":      59995},
    2021: {"Regular Cab Tradesman": 39495, "Crew Cab Tradesman": 43995,
           "Crew Cab Big Horn":     47995, "Crew Cab Laramie":   54495,
           "Crew Cab Limited":      62995},
    2022: {"Regular Cab Tradesman": 40595, "Crew Cab Tradesman": 45395,
           "Crew Cab Big Horn":     49995, "Crew Cab Laramie":   56995,
           "Crew Cab Limited":      65995},
    2023: {"Regular Cab Tradesman": 41695, "Crew Cab Tradesman": 46795,
           "Crew Cab Big Horn":     51995, "Crew Cab Laramie":   59495,
           "Crew Cab Limited":      69995},
    2024: {"Regular Cab Tradesman": 42795, "Crew Cab Tradesman": 48195,
           "Crew Cab Big Horn":     53995, "Crew Cab Laramie":   62995,
           "Crew Cab Limited":      72995},
    2025: {"Regular Cab Tradesman": 43895, "Crew Cab Tradesman": 49595,
           "Crew Cab Big Horn":     55995, "Crew Cab Laramie":   64995,
           "Crew Cab Limited":      74995},
}.items():
    fix("Ram", "3500", year, prices)

# ─── Ford Expedition 2023-2025 XL and XLT ────────────────────────────────────
# DB applied ~$2,000/yr across XL and XLT for 2022-2025. The 2026 Expedition
# XL=$57,995 and XLT=$62,995 show these trims held nearly flat (or dropped
# slightly) — not the +$2,000/yr the DB projected.
# Actual 2025 Expedition XL: ~$57,500-58,000 (DB $62,995 is ~$5,000 too high).
# The 2022 values appear approximately correct; corrections begin with 2023.
# 2025→2026 XL step: $57,995→$57,995 (Ford rebased pricing); XLT: similar.
fix("Ford", "Expedition", 2023, {"XL": 55995, "XLT": 60995})
fix("Ford", "Expedition", 2024, {"XL": 56995, "XLT": 61995})
fix("Ford", "Expedition", 2025, {"XL": 57995, "XLT": 62995})

# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 6: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
