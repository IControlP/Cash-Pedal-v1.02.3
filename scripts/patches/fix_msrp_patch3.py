#!/usr/bin/env python3
"""Patch 3: Kia Telluride 2022 redesign jump, Toyota Prius 2023-2024 new-gen,
Toyota Tacoma 2024 new-gen base, Jeep Grand Cherokee 2022 redesign jump."""

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

# ─── Kia Telluride 2022 ───────────────────────────────────────────────────────
# DB incrementally added ~$300/yr but the 2022 model saw a ~$3,000 across-the-board
# price jump driven by supply constraints and strong demand.
# Confirmed 2022 MSRPs: LX $35,490, S $38,490, EX $41,490 (SX not corrected due to
# uncertainty about the exact delta for that trim).
fix("Kia", "Telluride", 2022, {
    "Telluride LX": 35490,
    "Telluride S":  38490,
    "Telluride EX": 41490,
})

# ─── Toyota Prius 2023-2024 (5th-generation, new design) ─────────────────────
# The 2023 Prius was completely redesigned; the new base prices are noticeably
# higher than the DB's linear extrapolation from the outgoing 4th-gen values.
fix("Toyota", "Prius", 2023, {
    "Prius LE":  27450,
    "Prius XLE": 29990,
})
fix("Toyota", "Prius", 2024, {
    "Prius LE":  28545,
    "Prius XLE": 30990,
})

# ─── Toyota Tacoma 2024 (all-new 4th generation) ─────────────────────────────
# The 2024 Tacoma launched on a completely new platform; base SR price jumped from
# ~$27,750 (2023 final-year 3rd-gen) to ~$31,550. DB continues the old trajectory.
fix("Toyota", "Tacoma", 2024, {
    "SR": 31550,
})

# ─── Jeep Grand Cherokee 2022 (5th generation, WL platform) ──────────────────
# The 2022 GC was fully redesigned; Laredo moved from ~$32,390 (2021 WK2) to $37,995.
# Only the Laredo is corrected here — other trim deltas are less certain.
fix("Jeep", "Grand Cherokee", 2022, {
    "Grand Cherokee Laredo": 37995,
})

# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 3: {len(changes)} corrections:\n")
for c in sorted(changes):
    print(c)
