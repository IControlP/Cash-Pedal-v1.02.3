#!/usr/bin/env python3
"""Patch 10: Lexus NX 350/F Sport/450h+ 2022-2025 (systematic over-inflation since
3rd-gen launch), VW Golf GTI S/SE and Golf R 2022-2025 (flat $300/yr from 7th-gen
baseline, completely missed 8th-gen price jump at 2022 launch)."""

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

# ─── Lexus NX 2022-2025 ───────────────────────────────────────────────────────
# The 3rd-gen NX launched for 2022. The DB got the NX 250 FWD entry price right
# ($39,000 ≈ actual $39,025), but over-inflated the AWD and premium variants
# at launch, then continued adding ~$900/yr vs Lexus's actual ~$200-500/yr.
#
# 2026 NX anchors (all gain "AWD" suffix in restructured lineup):
#   NX 350 AWD=$45,285, NX 350 F SPORT AWD=$49,285, NX 450h+ AWD=$57,285.
#
# NX 350: actual 2022 AWD MSRP ~$44,025-44,525 (DB: $44,900, +$375-875 high).
#   Corrections grow at ~$500/yr to reach 2026=$45,285 flat—Lexus held price.
# NX 350 F Sport Performance: actual 2022 AWD ~$47,025 (DB: $49,650, +$2,625).
#   DB 2025→2026 step would be −$3,165 if left uncorrected—impossible.
# NX 450h+: actual 2022 AWD ~$54,025-54,285 (DB: $57,500, +$3,215-3,475).
#   DB 2025→2026 step would be −$3,015 if left uncorrected—impossible.
#   PHEV held nearly flat into 2026 ($57,285) reflecting competition from NX 350h.
# NX 250 is NOT corrected: DB 2022=$39,000 ≈ actual $39,025, and 2025→2026 drop
#   is only −$515 (rounding difference from lineup restructure), acceptable.

fix("Lexus", "NX", 2022, {
    "NX 350":        44285,
    "NX 350 F Sport": 47025,
    "NX 450h+":      54285,
})
fix("Lexus", "NX", 2023, {
    "NX 350":        44785,
    "NX 350 F Sport": 47785,
    "NX 450h+":      55285,
})
fix("Lexus", "NX", 2024, {
    "NX 350":        45285,
    "NX 350 F Sport": 48285,
    "NX 450h+":      56285,
})
fix("Lexus", "NX", 2025, {
    "NX 350":        45285,   # flat 2024→2025, consistent with 2025→2026 anchor
    "NX 350 F Sport": 48785,
    "NX 450h+":      57285,   # equals 2026 anchor — Lexus held PHEV price flat
})

# ─── VW Golf GTI S/SE and Golf R 2022-2025 ───────────────────────────────────
# The US-market 8th-gen Golf/GTI/R launched as 2022 models with significantly
# higher MSRPs than the outgoing 7.5-gen. The DB continued the old $300/yr
# flat-rate from 2021 (7th-gen) instead of resetting to 8th-gen launch prices:
#
#   GTI S  2021=$28,895 → DB 2022=$29,195 (+$300) vs actual 8th-gen $30,540 (+$1,645 miss)
#   GTI SE 2021=$32,895 → DB 2022=$33,195 (+$300) vs actual $34,540 (+$1,345 miss)
#   Golf R  2021=$40,695 → DB 2022=$40,995 (+$300) vs actual $43,640-44,640 (+$2,945 miss)
#
# The error compounded by $300/yr: by 2025, the GTI S is underpriced by ~$2,900
# and the Golf R by ~$4,700. The 2026 DB correctly shows the 8th-gen pricing:
#   Golf GTI S=$33,495, Golf GTI SE=$36,495, Golf R=$47,495.
#
# Working backward from 2026 at ~$1,000/yr for GTI S/SE and ~$1,000/yr for R:
#   GTI S:  2025=$32,995 → 2026=$33,495 (+$500, slight content-adjusted step)
#   GTI SE: 2025=$36,995 → 2026=$36,495 (−$500 rebalance, plausible for SE tier)
#   Golf R:  2025=$46,595 → 2026=$47,495 (+$900, reasonable for performance halo)
# Cross-check: corrected 2022 GTI S ($30,295) vs actual 8th-gen launch ($30,540) ✓
# Cross-check: corrected 2022 Golf R ($43,595) vs actual launch ($43,640+) ✓

fix("Volkswagen", "Golf", 2022, {
    "Golf GTI S":  30295,
    "Golf GTI SE": 34295,
    "Golf R":      43595,
})
fix("Volkswagen", "Golf", 2023, {
    "Golf GTI S":  31295,
    "Golf GTI SE": 35295,
    "Golf R":      44595,
})
fix("Volkswagen", "Golf", 2024, {
    "Golf GTI S":  32295,
    "Golf GTI SE": 36295,
    "Golf R":      45595,
})
fix("Volkswagen", "Golf", 2025, {
    "Golf GTI S":  32995,
    "Golf GTI SE": 36995,
    "Golf R":      46595,
})

# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 10: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
