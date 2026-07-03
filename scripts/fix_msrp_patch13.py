#!/usr/bin/env python3
"""Patch 13: Structural corrections and 2026 DB underpricing fixes:
- Honda Civic 2022 'Civic Type R' removed (no US 2022 MY Type R; FK8 ended 2021,
  FL5 launched 2023; DB 2023 $43,990 is the correct FL5 launch price)
- Honda Ridgeline 2026 RTL-E and Black Edition (dropped exactly -$2,795 while all
  other trims increased; inverted hierarchy vs TrailSport confirms DB error)
- Subaru Impreza 2019-2026 WRX/STI trims removed (standalone WRX and STI models
  exist in the DB with correct pricing; Impreza entries are exact duplicates)
- Lexus LX 600 2026 (DB values $11.6K-$32.7K too low; 2022-2025 showed consistent
  +$1,800/yr; corrected by continuing that rate)
- Lexus GX 550 2026 (DB values $9K-$12K too low; 2024-2025 showed +$1,400/yr;
  corrected by continuing that rate for the renamed '+' trims)
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
        f"  {make} {model} {y} '{trim}': {old_price:,} -> REMOVED"
    )


# ─── Honda Civic 2022 Type R ──────────────────────────────────────────────────
# The FK8 Civic Type R's final US model year was 2021. The FL5 (11th-gen)
# Type R launched as a 2023 MY. There was no 2022 Civic Type R sold in the US.
# The DB 2022 'Civic Type R' at $43,000 is a phantom year; 2023 at $43,990
# correctly represents the FL5 launch.
remove_trim("Honda", "Civic", 2022, "Civic Type R")

# ─── Honda Ridgeline 2026 RTL-E and Black Edition ────────────────────────────
# RTL-E and Black Edition each dropped exactly -$2,795 in 2026 while Sport
# (+$2,705), RTL (+$2,205), and TrailSport (+$205) all increased. The drops
# inverted the trim hierarchy (RTL-E now below TrailSport). Corrected to
# 2025 values + ~$2,200 (matching RTL's increment).
fix("Honda", "Ridgeline", 2026, {
    "Ridgeline RTL-E":        51990,   # DB: $46,995 (off -$5,000)
    "Ridgeline Black Edition": 53990,   # DB: $48,995 (off -$5,000)
})

# ─── Subaru Impreza WRX/STI trims 2019-2026 ──────────────────────────────────
# The WRX has been a standalone Subaru model since 2015, and the STI since 2004.
# The Impreza model in the DB incorrectly carries WRX and STI trims for 2019-2021,
# and WRX/WRX Premium/WRX Limited for 2022-2026. These are exact duplicates of the
# standalone WRX model's pricing. Removing them leaves only genuine Impreza trims.
for yr in [2019, 2020, 2021]:
    remove_trim("Subaru", "Impreza", yr, "WRX")
    remove_trim("Subaru", "Impreza", yr, "STI")

for yr in [2022, 2023, 2024, 2025, 2026]:
    remove_trim("Subaru", "Impreza", yr, "WRX")
    remove_trim("Subaru", "Impreza", yr, "WRX Premium")
    remove_trim("Subaru", "Impreza", yr, "WRX Limited")

# ─── Lexus LX 600 2026 ───────────────────────────────────────────────────────
# DB 2022-2025 shows consistent +$1,800-$1,900/yr across all LX 600 trims.
# DB 2026 values dropped $11.6K-$32.7K with new trim names — clearly DB errors.
# Corrected to 2025 values + $1,800. The 'F SPORT Performance' is a new trim
# not in 2025; estimated between corrected Luxury ($110,200) and Ultra Luxury
# ($137,800), at ~$119,000 based on typical F SPORT premium of ~$9K over Luxury.
fix("Lexus", "LX", 2026, {
    "LX 600 Premium":            102700,   # DB: $89,285 (= 2025 $100,900 + $1,800)
    "LX 600 Luxury":             110200,   # DB: $96,285 (= 2025 $108,400 + $1,800)
    "LX 600 F SPORT Performance": 119000,  # DB: $99,285 (new trim; est. $110,200 + $8,800)
    "LX 600 Ultra Luxury":       137800,   # DB: $103,285 (= 2025 $136,000 + $1,800)
})

# ─── Lexus GX 550 2026 '+' trims ─────────────────────────────────────────────
# DB 2024-2025 shows +$1,400/yr on all GX 550 trims. DB 2026 introduced '+' suffix
# trims but values are $9K-$12K too low. Corrected to 2025 values + $1,400.
# 'F SPORT Performance+' is new (not in 2025); estimated ~$5,000 above Overtrail+
# based on typical F SPORT positioning.
fix("Lexus", "GX", 2026, {
    "GX 550 Premium+":              71300,   # DB: $59,285 (= 2025 Premium $69,900 + $1,400)
    "GX 550 Luxury+":               74600,   # DB: $65,285 (= 2025 Luxury $73,200 + $1,400)
    "GX 550 Overtrail+":            78300,   # DB: $68,285 (= 2025 Overtrail $76,900 + $1,400)
    "GX 550 F SPORT Performance+":  83300,   # DB: $70,285 (new trim; est. $78,300 + $5,000)
})


# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 13: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
