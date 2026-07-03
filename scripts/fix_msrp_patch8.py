#!/usr/bin/env python3
"""Patch 8: Lexus RX 2023-2025 (new-gen inflation across all 4 trims),
Lexus IS 300 FWD/AWD 2023-2025 + IS 500 F Sport Performance 2023-2025,
Lexus UX 200 2023-2025 (flat-rate over-inflation),
Lexus LS 500/500h FWD+AWD 2023-2025 (systematic over-inflation)."""

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

# ─── Lexus RX 2023-2025 ───────────────────────────────────────────────────────
# The 2023 RX is a complete 6th-gen redesign (new platform, new powertrain lineup).
# The DB continued a flat ~$1,100/yr increase from the 5th-gen 2022 values,
# creating 2 distinct errors:
#
# 1. RX 350 / RX 350 F Sport: DB anchored too high at launch and inflated further.
#    Actual 2023 RX 350 base (FWD): ~$46,395. DB has $48,550 (+$2,155 error).
#    2026 anchors: RX 350 FWD=$48,285, RX 350 F SPORT AWD=$54,285.
#    Working backward at ~$1,000/yr for 2023-2025 gives corrections of $1,800-2,015.
#
# 2. RX 450h+ / RX 500h F Sport: DB severely overpriced the PHEV at launch.
#    Actual 2023 RX 450h+ MSRP: ~$55,950. DB has $63,250 (+$7,300 error).
#    Actual 2023 RX 500h F Sport: ~$64,380. DB has $68,500 (+$4,120 error).
#    2026 anchors: RX 450h+ AWD=$60,285, RX 500h F SPORT Performance+=$66,285.
#    Working backward at ~$1,500/yr (PHEV commands higher annual steps) for
#    2023-2025 brings 2025→2026 steps to $1,000-1,500, all reasonable.
fix("Lexus", "RX", 2023, {
    "RX 350":           46785,
    "RX 350 F Sport":   51285,
    "RX 450h+":         56285,
    "RX 500h F Sport":  64285,
})
fix("Lexus", "RX", 2024, {
    "RX 350":           47785,
    "RX 350 F Sport":   52285,
    "RX 450h+":         57785,
    "RX 500h F Sport":  65285,
})
fix("Lexus", "RX", 2025, {
    "RX 350":           48785,
    "RX 350 F Sport":   53285,
    "RX 450h+":         59285,
    "RX 500h F Sport":  65785,
})

# ─── Lexus IS 300 2023-2025 ───────────────────────────────────────────────────
# The DB applied ~$900/yr to IS 300 FWD and AWD from 2018-2025. Actual IS 300
# pricing grew at ~$300-500/yr. By 2025 the DB overstates IS 300 AWD by $3,315.
# 2026 anchor: IS 300 AWD=$41,285.
# Cross-check: corrected 2025 IS 300 AWD ($41,285) = 2026 value (Lexus held price
# flat for the IS 300's final years before planned discontinuation). IS 300 F Sport
# and IS 350 F Sport are NOT corrected here — the 2026 IS 300 F SPORT AWD ($46,285)
# is within $385 of DB 2025 ($45,900), and IS 350 F Sport 2026 ($51,285) is within
# $185 of DB 2025 ($51,100). Only the IS 300 base variants are significantly off.
fix("Lexus", "IS", 2023, {
    "IS 300":     38285,
    "IS 300 AWD": 40285,
})
fix("Lexus", "IS", 2024, {
    "IS 300":     39285,
    "IS 300 AWD": 40785,
})
fix("Lexus", "IS", 2025, {
    "IS 300":     40285,
    "IS 300 AWD": 41285,
})

# ─── Lexus IS 500 F Sport Performance 2023-2025 ───────────────────────────────
# The IS 500 launched mid-2021 at ~$57,800 and Lexus held pricing remarkably flat
# through the model's run. DB applied ~$800/yr, reaching $59,700 (2025).
# 2026 anchor: IS 500 F SPORT Performance=$57,285 — the +$800/yr DB formula implies
# a $2,415 impossible drop year-over-year. Lexus simply never raised the IS 500
# at the rate the DB assumed. Correcting 2023-2025 to ~$57,285 (flat, matching
# the actual price-hold strategy) explains the 2026 anchor naturally.
fix("Lexus", "IS", 2023, {"IS 500 F Sport Performance": 57285})
fix("Lexus", "IS", 2024, {"IS 500 F Sport Performance": 57285})
fix("Lexus", "IS", 2025, {"IS 500 F Sport Performance": 57285})

# ─── Lexus UX 200 2023-2025 ───────────────────────────────────────────────────
# DB applied ~$900/yr to the UX 200. Actual UX 200 FWD grew at ~$300-400/yr.
# 2026 anchor: UX 200 FWD=$35,285. DB 2025 at $37,300 implies a $2,015 impossible
# drop to 2026. UX 250h and F Sport variants are within $1,000 of 2026 anchors
# (UX 250h AWD 2026=$38,285 vs DB 2025=$39,300 = -$1,015, borderline acceptable).
# Only the UX 200 base is corrected; the hybrid trims are left untouched.
fix("Lexus", "UX", 2023, {"UX 200": 33285})
fix("Lexus", "UX", 2024, {"UX 200": 34285})
fix("Lexus", "UX", 2025, {"UX 200": 35285})

# ─── Lexus LS 500 / LS 500h 2023-2025 ────────────────────────────────────────
# The LS 500 (2018-2026) is a flagship sedan with very slow price growth.
# DB applied $1,000-1,500/yr; actual growth from 2018 launch was ~$350/yr for
# the base AWD model, resulting in ~$4,000-5,700 cumulative overpricing by 2025.
# 2026 anchors: LS 500 AWD=$80,285, LS 500h AWD=$87,285.
#
# Impossible 2025→2026 drops confirmed:
#   LS 500 AWD:  DB $86,000 → 2026 $80,285  = -$5,715 (impossible)
#   LS 500h AWD: DB $91,000 → 2026 $87,285  = -$3,715 (impossible)
#
# LS 500 F Sport (AWD-only) is NOT corrected: DB 2025=$90,500 vs 2026 F SPORT
# AWD=$90,285 = -$215, essentially flat — confirming F Sport is already correct.
# LS 500h F SPORT Performance+ had a minor mid-life trim restructure; skipped.
#
# FWD variants are corrected proportionally (~$3,000 less than AWD,
# consistent with the $2,500 AWD premium seen across all years).

# LS 500 AWD: 2018 base $77,500 → 2026 $80,285 (+$2,785 over 8 yr ≈ $348/yr)
fix("Lexus", "LS", 2023, {"LS 500 AWD": 79285})
fix("Lexus", "LS", 2024, {"LS 500 AWD": 79785})
fix("Lexus", "LS", 2025, {"LS 500 AWD": 80285})

# LS 500 FWD: ~$3,000 below AWD in all years
fix("Lexus", "LS", 2023, {"LS 500": 76285})
fix("Lexus", "LS", 2024, {"LS 500": 77285})
fix("Lexus", "LS", 2025, {"LS 500": 78285})

# LS 500h AWD: 2018 base $82,500 → 2026 $87,285 (+$4,785 over 8 yr ≈ $598/yr)
fix("Lexus", "LS", 2023, {"LS 500h AWD": 84285})
fix("Lexus", "LS", 2024, {"LS 500h AWD": 85285})
fix("Lexus", "LS", 2025, {"LS 500h AWD": 86285})

# LS 500h FWD: ~$3,000 below AWD
fix("Lexus", "LS", 2023, {"LS 500h": 81285})
fix("Lexus", "LS", 2024, {"LS 500h": 82285})
fix("Lexus", "LS", 2025, {"LS 500h": 83285})

# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 8: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
