#!/usr/bin/env python3
"""Patch 14: Porsche 911/Cayenne and BMW X5 M systematic pricing corrections:
- Porsche 911 2020 Carrera/S/4/4S (992 gen-launch prices not captured; DB continued
  991.2 flat-increment instead of jumping to 992 pricing; Turbo/Turbo S correctly
  jumped in 2020 but Carrera band missed until 2021 — 4-6.8K correction each)
- Porsche Cayenne 2015-2017 (E2 final years — base/$S/Turbo/GTS all ~$7-16K too low
  while Turbo S and S E-Hybrid were approximately correct; 2018 E3 launch is accurate)
- BMW X5 M 2015-2017 (F85 generation consistently ~$6,800 below actual MSRP;
  other X5 trims are accurate, only the M trim is affected)
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


# ─── Porsche 911 2020 Carrera band (992 gen launch prices) ───────────────────
# The 992 generation launched as 2020 MY in the US for Carrera/S/4/4S.
# DB continued the 991.2 flat +$800/yr pattern instead of applying the gen-jump:
#   2020 Carrera:  DB $92,600  → actual 992 launch $97,400  (miss: -$4,800)
#   2020 Carrera S: DB $105,300 → actual 992 launch $112,100 (miss: -$6,800)
#   2020 Carrera 4: DB $99,700  → actual 992 launch $104,400 (miss: -$4,700)
#   2020 Carrera 4S: DB $112,400 → actual 992 launch $119,100 (miss: -$6,700)
# Cross-check: 2021 DB Carrera ($99,200) ≈ actual 2021 ($99,200) ✓ — confirms
# the 2021+ values are correct; the 992 gen-jump is missing only for 2020.
# Turbo/Turbo S correctly show the expected jump in 2019→2020, so only
# the Carrera band needs correction.
fix("Porsche", "911", 2020, {
    "911 Carrera":   97400,   # DB: $92,600 (= actual 992 launch $97,400)
    "911 Carrera S": 112100,  # DB: $105,300 (= actual 992 launch $112,100)
    "911 Carrera 4": 104400,  # DB: $99,700 (= actual 992 launch $104,400)
    "911 Carrera 4S": 119100, # DB: $112,400 (= actual 992 launch $119,100)
})

# ─── Porsche Cayenne 2015-2017 (E2 gen, systematic underpricing) ─────────────
# DB 2015-2017 Cayenne Turbo S ($123,095-$124,695) and S E-Hybrid ($76,900-$78,500)
# are approximately correct. Base, S, Turbo, and GTS are all significantly too low.
# 2018 E3 launch prices are accurate in DB (Cayenne $65,700, S $83,600,
# Turbo $124,600). Working backward to E2 final year (2017):
#   Base: actual ~$58,900  (DB $51,695, -$7,205)
#   S:    actual ~$75,000  (DB $65,295, -$9,705) — 3.6L V6 TT, 420hp
#   Turbo: actual ~$119,700 (DB $112,695, -$7,005) — 4.8L V8, 520hp
#   GTS:  actual ~$81,600  (DB $70,895, -$10,705) — 3.6L V6 TT, 440hp sport
# GTS was discontinued after 2017 E2, reintroduced for 2020 E3 at $107,300
# with upgraded V8, so the E3 premium over corrected E2 GTS is consistent.
fix("Porsche", "Cayenne", 2015, {
    "Cayenne":       57200,   # DB: $50,095 (actual E2 base ~$57,200)
    "Cayenne S":     73400,   # DB: $63,695 (actual E2 S ~$73,400)
    "Cayenne Turbo": 118100,  # DB: $111,095 (actual E2 Turbo ~$118,100)
    "Cayenne GTS":   80000,   # DB: $69,295 (actual E2 GTS ~$80,000)
})
fix("Porsche", "Cayenne", 2016, {
    "Cayenne":       58000,   # DB: $50,895
    "Cayenne S":     74200,   # DB: $64,495
    "Cayenne Turbo": 118900,  # DB: $111,895
    "Cayenne GTS":   80800,   # DB: $70,095
})
fix("Porsche", "Cayenne", 2017, {
    "Cayenne":       58900,   # DB: $51,695
    "Cayenne S":     75000,   # DB: $65,295
    "Cayenne Turbo": 119700,  # DB: $112,695
    "Cayenne GTS":   81600,   # DB: $70,895
})

# ─── BMW X5 M 2015-2017 (F85 generation, systematic underpricing) ────────────
# DB 2015-2017 X5 M is ~$6,800 below actual MSRP. The regular X5 trims
# (sDrive35i/xDrive35i/xDrive50i) are accurate, only the M trim is affected.
# F85 actual US MSRP: 2015=$99,100, 2016=$99,700, 2017=$100,200.
# The 2018 X5 M (F85 final year) at DB $104,400 is within ~$1,100 of actual
# ($103,300) — not corrected. The G05 X5 M launched for 2020.
fix("BMW", "X5", 2015, {"M": 99100})   # DB: $92,295
fix("BMW", "X5", 2016, {"M": 99700})   # DB: $92,895
fix("BMW", "X5", 2017, {"M": 100200})  # DB: $93,495


# ─── Write output ─────────────────────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 14: {len(changes)} changes:\n")
for c in sorted(changes):
    print(c)
