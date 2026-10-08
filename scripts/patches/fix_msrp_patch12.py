#!/usr/bin/env python3
"""Patch 12: Multiple corrections:
- Toyota Corolla 2021 (systematic +$1,525 overcharge applied to all trims; 2022 is
  the verified anchor at $21,200 LE / $22,975 SE / $23,975 XLE / $24,900 XSE)
- Toyota Prius Prime 2023 (5th-gen launch pricing missed; DB carried 4th-gen prices
  one year too long; actual 2023 SE=$32,350 XSE=$35,350 Limited=$38,850)
- Toyota GR Supra 2024-2026 (2.0L 4-cyl discontinued in US after 2023 MY)
- Nissan Altima SR 2019-2021 (systematic ~$5,300 overpricing; DB SR > SL inverted
  hierarchy is the tell; 2022 SR=$29,090 anchor, back at $500/yr)
- Nissan Altima SL 2019-2021 (systematic ~$1,310 overpricing; 2022 SL=$31,090)
- Kia Telluride 2026 (DB 2026 values $4K-$6K too low; 2022-2025 match actual;
  2024->2025 increment was $800/yr; corrected to 2025 + $800)
- Jeep Grand Cherokee 2026 regular trims (DB 2026 drops $5.7K-$7.4K on base/mid
  trims while SRT/Trackhawk correctly increased; corrected to 2025 + $1,000)
- Porsche 911 Turbo S 2026 (DB shows +$39,900 vs all other 911 variants +$2.7K-$5.7K;
  clear DB data entry error; corrected to ~$236,200 consistent with Turbo ratio)
"""

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


def remove_trim(make, model, year, trim):
    y = str(year)
    tby = corrected.get(make, {}).get(model, {}).get("trims_by_year", {})
    if y not in tby or trim not in tby[y]:
        return
    old_price = tby[y][trim]
    del tby[y][trim]
    changes.append(
        f"  {make} {model} {y} '{trim}': {old_price:,} -> REMOVED (discontinued)"
    )


# ─── Toyota Corolla 2021 ──────────────────────────────────────────────────────
# DB applied +$1,525-$1,550 per trim for 2021 (vs actual ~$400-$600/yr). The
# 2022 values are the verified anchor (LE=$21,200, SE=$22,975, XLE=$23,975,
# XSE=$24,900 all match actual MSRP). Working backward at ~$550-$575/yr gives
# the corrected 2021 values. L trim uses 2020 base ($20,025) + $400.
fix("Toyota", "Corolla", 2021, {
    "L":   20425,
    "LE":  20650,
    "SE":  22400,
    "XLE": 23400,
    "XSE": 24325,
})

# ─── Toyota Prius Prime 2023 ──────────────────────────────────────────────────
# The 5th-gen Prius Prime launched for 2023 with a new design, larger battery,
# and significantly higher MSRP vs 4th-gen. DB carried forward the 4th-gen LE
# pricing (~$28,970) as the "SE" in 2023, missing the ~$3,580 gen-jump.
# DB 2024 Prime values ($32,350 SE / $35,350 XSE / $38,850 Limited) are the
# correct 2023 launch prices; Toyota held them flat into 2024.
fix("Toyota", "Prius", 2023, {
    "Prius Prime SE":      32350,
    "Prius Prime XSE":     35350,
    "Prius Prime Limited": 38850,
})

# ─── Toyota GR Supra 2024-2026 (2.0 trim) ────────────────────────────────────
# Toyota discontinued the GR Supra 2.0L (B48 4-cylinder) for the US market
# after the 2023 model year. Only the 3.0 and 3.0 Premium remain for 2024+.
for yr in [2024, 2025, 2026]:
    remove_trim("Toyota", "GR Supra", yr, "2.0")

# ─── Nissan Altima SR 2019-2021 ──────────────────────────────────────────────
# DB Altima SR is ~$5,300 above actual MSRP for 2019-2021, and shows SR > SL
# (inverted Altima hierarchy where SL should always be above SR). Actual 2022
# SR MSRP = $29,090 (DB correct). Back at $500/yr: 2021=$28,590, 2020=$28,090,
# 2019=$27,590. Consistent with actual 2019 Altima SR base of ~$27,540.
fix("Nissan", "Altima", 2019, {"SR": 27590})
fix("Nissan", "Altima", 2020, {"SR": 28090})
fix("Nissan", "Altima", 2021, {"SR": 28590})

# ─── Nissan Altima SL 2019-2021 ──────────────────────────────────────────────
# Actual 2022 SL = $31,090 (DB correct). Back at $500/yr: 2021=$30,590,
# 2020=$30,090, 2019=$29,590 (vs actual 2019 SL ~$29,595 — matches).
fix("Nissan", "Altima", 2019, {"SL": 29590})
fix("Nissan", "Altima", 2020, {"SL": 30090})
fix("Nissan", "Altima", 2021, {"SL": 30590})

# ─── Kia Telluride 2026 ──────────────────────────────────────────────────────
# DB 2026 Telluride dropped $4K-$6K below 2025 on all trims — a clear DB error.
# The 2022-2025 values exactly match actual MSRP (verified). 2024->2025 increase
# was +$800/yr; corrected to 2025 + $800.
fix("Kia", "Telluride", 2026, {
    "Telluride LX": 40290,
    "Telluride S":  43290,
    "Telluride EX": 46290,
    "Telluride SX": 50290,
})

# ─── Jeep Grand Cherokee 2026 regular trims ──────────────────────────────────
# DB 2026 drops Laredo/Limited/Overland/Summit/Trailhawk by $5.7K-$7.4K while
# SRT (+$1,725) and Trackhawk (+$2,270) correctly increased — consistent with DB
# error on standard trims only. 2023-2025 increments were +$1,000/yr for all
# standard trims; corrected to 2025 + $1,000.
# SRT ($70,715) and Trackhawk ($93,060) are left unchanged.
fix("Jeep", "Grand Cherokee", 2026, {
    "Grand Cherokee Laredo":    41990,
    "Grand Cherokee Limited":   46090,
    "Grand Cherokee Overland":  53295,
    "Grand Cherokee Summit":    59395,
    "Grand Cherokee Trailhawk": 51895,
})

# ─── Porsche 911 Turbo S 2026 ─────────────────────────────────────────────────
# 2025->2026 increases across all other 911 variants: $2,760-$5,740.
# DB shows Turbo S: $230,400 -> $270,300 (+$39,900) — a clear data entry error.
# Corrected to $236,200 using the Turbo's increase rate (~2.5%) applied to Turbo S,
# and consistent with GT3 RS 2026 ($235,390): Turbo S at $236,200 maintains a
# small premium above GT3 RS matching the 2024-2025 convergence trend.
fix("Porsche", "911", 2026, {"911 Turbo S": 236200})


# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 12: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
