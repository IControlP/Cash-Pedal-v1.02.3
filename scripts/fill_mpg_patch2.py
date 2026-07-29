#!/usr/bin/env python3
"""Patch 2 of the specs backfill: per-trim horsepower/MPG overrides.

Patch 1 gave every model an `mpg` block for its **base** powertrain. That is
the right default for equipment-level trims (LX/EX/Touring all share an
engine) but badly wrong for trims that change the powertrain: a Pacifica
Hybrid is not a 22 MPG van, and a Challenger SRT Hellcat is not a 23 MPG
coupe.

This patch adds a `trim_specs` block to those models:

    "trim_specs": {
      "SRT Hellcat": {
        "horsepower": 717,
        "mpg": { "city": 13, "highway": 22, "combined": 16 }
      }
    }

Keys are exact trim names, matching `trims_by_year`, so a consumer can look a
trim up directly and fall back to the model-level `specs`/`mpg` when there is
no entry. Equipment-only trims deliberately get **no** entry — the model
default is already correct for them, and the validator rejects an override
that merely restates it.

The table below is written as regex rules per model rather than as ~700 hand
written trim keys: trim naming drifts year to year ("Accord Hybrid EX-L" in
one year, "Accord EX-L Hybrid" in another), so matching on the powertrain
token is what keeps coverage complete. The rules are expanded against the
trim names actually present in the database and written out as explicit keys,
so the committed JSON stays flat and greppable. Rules are tried in order and
the first match wins, so specific patterns must precede general ones
("Hellcat Redeye" before "Hellcat").

Plug-in hybrids carry `plugin_hybrid: true` alongside **both** figures: the
charge-sustaining gasoline MPG (what the TCO calculator bills fuel at, since
`is_ev` stays false) and the EPA blended MPGe. Trims that do not exist in the
US market and therefore have no EPA rating are listed in SKIPPED below rather
than given invented numbers.

Run:  python3 scripts/fill_mpg_patch2.py [--dry-run]
"""
import argparse
import copy
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data" / "vehicles.json"


def gas(city, highway, combined, **extra):
    return {"mpg": {"city": city, "highway": highway, "combined": combined}, **extra}


def ev(mpge, **extra):
    return {"mpg": {"mpge_combined": mpge}, **extra}


def phev(city, highway, combined, mpge, **extra):
    """Charge-sustaining gas MPG plus EPA blended MPGe."""
    return {
        "mpg": {
            "city": city,
            "highway": highway,
            "combined": combined,
            "mpge_combined": mpge,
        },
        "plugin_hybrid": True,
        **extra,
    }


# Trims present in the database that are not US-market vehicles and so carry no
# EPA rating. Left inheriting the model default rather than given invented data.
SKIPPED = [
    "Hyundai Kona Hybrid * (not sold in the US)",
    "Kia K5 Hybrid * (not sold in the US; the Optima Hybrid was its predecessor)",
]

# (make, model) -> [(trim-name regex, override), ...]; first match wins.
RULES = {
    # ── Acura ──
    ("Acura", "Integra"): [(r"Type S", gas(21, 28, 24, horsepower=320))],
    ("Acura", "MDX"): [
        (r"Sport Hybrid", gas(26, 27, 27, horsepower=321)),
        (r"Type S", gas(17, 21, 19, horsepower=355)),
    ],
    ("Acura", "TLX"): [
        (r"Type S", gas(19, 25, 21, horsepower=355)),
        (r"SH-AWD", gas(21, 29, 24)),
    ],
    # ── Audi ──
    ("Audi", "Q8 e-tron"): [(r"^SQ8", ev(74, horsepower=496))],
    ("Audi", "R8"): [(r"4\.2 V8", gas(13, 20, 16, horsepower=430))],
    # ── BMW ──
    ("BMW", "3 Series"): [(r"M3 Competition", gas(16, 22, 18, horsepower=503))],
    ("BMW", "M3"): [(r"Competition", gas(16, 22, 18, horsepower=503))],
    ("BMW", "M4"): [(r"Competition", gas(16, 22, 18, horsepower=503))],
    ("BMW", "M5"): [(r"Competition", {"horsepower": 617})],
    ("BMW", "M8"): [(r"Competition", {"horsepower": 617})],
    ("BMW", "X3"): [
        (r"X3 M Competition", gas(14, 19, 16, horsepower=503)),
        (r"M50", gas(21, 27, 23, horsepower=393)),
    ],
    ("BMW", "X5"): [(r"X5 M Competition", gas(13, 18, 15, horsepower=617))],
    ("BMW", "i4"): [(r"M50", ev(80, horsepower=536))],
    # ── Chevrolet ──
    ("Chevrolet", "Blazer EV"): [(r"SS", ev(78, horsepower=615))],
    ("Chevrolet", "Camaro"): [
        (r"ZL1", gas(13, 21, 16, horsepower=650)),
        (r"SS", gas(16, 27, 20, horsepower=455)),
    ],
    ("Chevrolet", "Cruze"): [(r"Diesel", gas(31, 47, 37, horsepower=137))],
    ("Chevrolet", "Equinox EV"): [(r"AWD", ev(96, horsepower=288))],
    ("Chevrolet", "Malibu"): [(r"Hybrid", gas(49, 43, 46, horsepower=182))],
    # ── Chrysler ──
    ("Chrysler", "Pacifica"): [(r"Hybrid", phev(30, 30, 30, 82, horsepower=260))],
    # ── Dodge ──
    ("Dodge", "Challenger"): [
        (r"Hellcat Redeye", gas(12, 21, 15, horsepower=797)),
        (r"Demon", gas(13, 21, 16, horsepower=808)),
        (r"Hellcat", gas(13, 22, 16, horsepower=717)),
        (r"Scat Pack|SRT 392", gas(15, 24, 18, horsepower=485)),
        (r"R/T", gas(16, 25, 19, horsepower=375)),
        (r"^GT$", gas(18, 27, 21)),
    ],
    ("Dodge", "Charger"): [
        (r"Hellcat Redeye", gas(12, 21, 15, horsepower=797)),
        (r"Hellcat", gas(13, 22, 16, horsepower=717)),
        (r"Scat Pack|SRT 392", gas(15, 24, 18, horsepower=485)),
        (r"R/T", gas(16, 25, 19, horsepower=375)),
        (r"^GT$", gas(18, 27, 21)),
    ],
    ("Dodge", "Charger Daytona"): [(r"Scat Pack", ev(74, horsepower=670))],
    ("Dodge", "Durango"): [
        (r"SRT Hellcat", gas(12, 17, 14, horsepower=710)),
        (r"SRT", gas(13, 19, 15, horsepower=475)),
        (r"R/T", gas(14, 22, 17, horsepower=360)),
    ],
    # ── Ford ──
    ("Ford", "Bronco"): [(r"Raptor", gas(15, 16, 15, horsepower=418))],
    ("Ford", "Escape"): [
        (r"Plug-In Hybrid", phev(44, 41, 42, 101, horsepower=210)),
        (r"Hybrid", gas(44, 37, 41, horsepower=200)),
    ],
    ("Ford", "F-150"): [
        (r"Raptor R", gas(10, 15, 12, horsepower=700)),
        (r"Raptor", gas(15, 18, 16, horsepower=450)),
    ],
    ("Ford", "Fusion"): [(r"Hybrid", gas(43, 41, 42, horsepower=188))],
    ("Ford", "Mustang"): [(r"\bGT\b", gas(15, 24, 18, horsepower=450))],
    ("Ford", "Mustang Mach-E"): [
        (r"Rally", ev(79, horsepower=480)),
        (r"GT", ev(90, horsepower=480)),
        (r"AWD", ev(90, horsepower=346)),
    ],
    # ── Genesis ──
    ("Genesis", "G80"): [(r"5\.0", gas(16, 25, 19, horsepower=420))],
    ("Genesis", "G90"): [(r"5\.0", gas(16, 24, 19, horsepower=420))],
    ("Genesis", "GV60"): [(r"Performance", ev(90, horsepower=429))],
    # ── Honda ──
    ("Honda", "Accord"): [
        (r"Touring|Sport-L", gas(44, 41, 43, horsepower=204)),
        (r"Hybrid", gas(46, 41, 44, horsepower=204)),
    ],
    ("Honda", "CR-V"): [
        (r"Hybrid", gas(43, 36, 40, horsepower=204)),
        (r"EX AWD|EX-L AWD", gas(27, 32, 29)),
    ],
    ("Honda", "Civic"): [(r"Hybrid", gas(50, 47, 49, horsepower=200))],
    # ── Hyundai ──
    ("Hyundai", "Genesis"): [(r"5\.0", gas(15, 23, 18, horsepower=420))],
    ("Hyundai", "Ioniq"): [
        (r"Plug-in Hybrid", phev(54, 50, 52, 119, horsepower=156)),
    ],
    ("Hyundai", "Ioniq 9"): [(r"AWD", ev(88, horsepower=303))],
    ("Hyundai", "Santa Fe"): [(r"Hybrid", gas(36, 31, 34, horsepower=226))],
    ("Hyundai", "Sonata"): [
        (r"Hybrid Blue", gas(50, 54, 52, horsepower=192)),
        (r"Hybrid", gas(45, 51, 47, horsepower=192)),
    ],
    ("Hyundai", "Tucson"): [(r"Hybrid", gas(38, 38, 38, horsepower=226))],
    # ── Infiniti ──
    ("Infiniti", "QX60"): [(r"Hybrid", gas(25, 28, 26, horsepower=250))],
    # ── Jaguar ──
    ("Jaguar", "F-TYPE"): [
        (r"V8 S", gas(16, 23, 18, horsepower=495)),
        (r"F-TYPE S", gas(19, 27, 22, horsepower=380)),
    ],
    # ── Jeep ──
    ("Jeep", "Grand Cherokee"): [
        (r"Trackhawk", gas(11, 17, 13, horsepower=707)),
        (r"SRT", gas(13, 19, 15, horsepower=475)),
    ],
    # ── Kia ──
    ("Kia", "EV6"): [
        (r"GT AWD", ev(79, horsepower=576)),
        (r"AWD", ev(105, horsepower=320)),
    ],
    ("Kia", "EV9"): [(r"AWD", ev(80, horsepower=379))],
    ("Kia", "Forte"): [(r"Forte GT$", gas(27, 35, 30, horsepower=201))],
    ("Kia", "K5"): [(r"K5 GT$", gas(24, 32, 27, horsepower=290))],
    ("Kia", "Niro"): [
        (r"Plug-In Hybrid", phev(48, 48, 48, 105, horsepower=139)),
        (r"Niro EV", ev(113, horsepower=201)),
    ],
    ("Kia", "Optima"): [(r"Hybrid", gas(39, 46, 42, horsepower=192))],
    ("Kia", "Sorento"): [
        (r"Plug-In Hybrid", phev(35, 33, 34, 79, horsepower=261)),
        (r"Hybrid", gas(39, 35, 37, horsepower=227)),
    ],
    ("Kia", "Soul"): [(r"Soul EV", ev(114, horsepower=201))],
    ("Kia", "Sportage"): [
        (r"Plug-In Hybrid", phev(35, 35, 35, 84, horsepower=261)),
        (r"Hybrid", gas(42, 44, 43, horsepower=227)),
    ],
    ("Kia", "Stinger"): [(r"Stinger GT$", gas(18, 25, 21, horsepower=365))],
    # ── Lexus ──
    ("Lexus", "ES"): [
        (r"300h", gas(43, 44, 44, horsepower=215)),
        (r"350", gas(22, 32, 26, horsepower=302)),
        (r"250 AWD", gas(25, 34, 28)),
    ],
    ("Lexus", "IS"): [
        (r"IS 500", gas(17, 25, 20, horsepower=472)),
        (r"IS 350", gas(20, 27, 23, horsepower=311)),
        (r"IS 300 AWD|IS 300 F SPORT AWD", gas(19, 26, 22, horsepower=260)),
    ],
    ("Lexus", "LS"): [
        (r"500h", gas(23, 31, 26, horsepower=354)),
        (r"LS 500 AWD|LS 500 F SPORT AWD", gas(18, 27, 21)),
    ],
    ("Lexus", "NX"): [
        (r"450h\+", phev(36, 36, 36, 84, horsepower=302)),
        (r"350h", gas(41, 37, 39, horsepower=240)),
        (r"NX 350", gas(22, 28, 24, horsepower=275)),
        (r"NX 250 AWD", gas(25, 32, 28)),
    ],
    ("Lexus", "RX"): [
        (r"450h\+", phev(35, 35, 35, 83, horsepower=304)),
        (r"500h", gas(27, 28, 27, horsepower=366)),
        (r"350h", gas(37, 34, 36, horsepower=246)),
    ],
    ("Lexus", "UX"): [(r"250h", gas(41, 38, 39, horsepower=181))],
    # ── Lincoln ──
    ("Lincoln", "Aviator"): [
        (r"Grand Touring", phev(23, 23, 23, 56, horsepower=494)),
    ],
    ("Lincoln", "Corsair"): [
        (r"Grand Touring", phev(34, 32, 33, 78, horsepower=266)),
    ],
    ("Lincoln", "MKZ"): [(r"Hybrid", gas(41, 38, 40, horsepower=188))],
    # ── Mazda ──
    ("Mazda", "CX-90"): [(r"PHEV", phev(25, 25, 25, 56, horsepower=323))],
    # ── Mercedes-Benz ──
    ("Mercedes-Benz", "A-Class"): [(r"AMG A 35", gas(22, 30, 25, horsepower=302))],
    ("Mercedes-Benz", "AMG GT"): [
        (r"Black Series", gas(15, 20, 17, horsepower=720)),
        (r"63 S", gas(15, 20, 17, horsepower=630)),
        (r"GT R", gas(15, 20, 17, horsepower=577)),
        (r"GT C", gas(15, 20, 17, horsepower=550)),
        (r"GT S", gas(16, 22, 18, horsepower=515)),
    ],
    ("Mercedes-Benz", "C-Class"): [
        (r"C 63 S", gas(16, 22, 18, horsepower=503)),
        (r"C 63", gas(16, 22, 18, horsepower=469)),
        (r"C 43", gas(21, 29, 24, horsepower=385)),
    ],
    ("Mercedes-Benz", "CLA"): [
        (r"CLA 45", gas(21, 28, 24, horsepower=382)),
        (r"CLA 35", gas(22, 30, 25, horsepower=302)),
    ],
    ("Mercedes-Benz", "E-Class"): [
        (r"E 63", gas(16, 22, 18, horsepower=603)),
        (r"E 53", gas(21, 28, 24, horsepower=429)),
        (r"E 43", gas(18, 25, 21, horsepower=396)),
    ],
    ("Mercedes-Benz", "G-Class"): [(r"G 63", gas(13, 16, 14, horsepower=577))],
    ("Mercedes-Benz", "GLC"): [
        (r"GLC 63", gas(16, 22, 18, horsepower=503)),
        (r"GLC 43", gas(19, 25, 21, horsepower=385)),
    ],
    ("Mercedes-Benz", "GLS"): [(r"GLS 63", gas(14, 18, 15, horsepower=603))],
    ("Mercedes-Benz", "S-Class"): [
        (r"S 65", gas(13, 21, 16, horsepower=621)),
        (r"S 63", gas(15, 23, 18, horsepower=603)),
    ],
    # ── Nissan ──
    ("Nissan", "Altima"): [
        (r"^3\.5", gas(22, 32, 26, horsepower=270)),
        (r"AWD", gas(26, 36, 30)),
    ],
    ("Nissan", "Rogue"): [(r"AWD", gas(28, 34, 30))],
    # ── Porsche ──
    ("Porsche", "718"): [(r"GTS 4\.0", gas(17, 24, 20, horsepower=394))],
    ("Porsche", "911"): [
        (r"Turbo S", gas(15, 20, 17, horsepower=640)),
        (r"GTS", gas(17, 24, 20, horsepower=473)),
    ],
    ("Porsche", "Cayenne"): [
        (r"Turbo GT|Turbo S", gas(14, 19, 16, horsepower=631)),
        (r"E-Hybrid", phev(22, 22, 22, 46, horsepower=455)),
        (r"GTS", gas(16, 21, 18, horsepower=453)),
    ],
    ("Porsche", "Panamera"): [
        (r"Turbo S E-Hybrid", phev(17, 17, 17, 48, horsepower=690)),
        (r"Turbo S", gas(15, 22, 18, horsepower=620)),
        (r"E-Hybrid", phev(22, 22, 22, 50, horsepower=455)),
        (r"GTS", gas(16, 23, 19, horsepower=473)),
    ],
    ("Porsche", "Taycan"): [
        (r"Turbo S", ev(76, horsepower=750)),
        (r"GTS", ev(78, horsepower=590)),
    ],
    # ── Rivian ──
    ("Rivian", "R1S"): [(r"Dual-Motor", ev(72, horsepower=665))],
    ("Rivian", "R1T"): [(r"Dual-Motor", ev(73, horsepower=665))],
    # ── Subaru ──
    ("Subaru", "Crosstrek"): [
        (r"Plug-in Hybrid", phev(35, 33, 35, 90, horsepower=148)),
        (r"Hybrid", gas(31, 33, 31, horsepower=160)),
    ],
    # ── Tesla ──
    ("Tesla", "Model 3"): [
        (r"Performance", ev(113, horsepower=510)),
        (r"Long Range", ev(131, horsepower=394)),
    ],
    ("Tesla", "Model S"): [
        (r"Plaid", ev(101, horsepower=1020)),
        (r"Performance", ev(104, horsepower=778)),
        (r"Long Range", ev(120, horsepower=670)),
    ],
    ("Tesla", "Model X"): [
        (r"Plaid", ev(98, horsepower=1020)),
        (r"Performance", ev(96, horsepower=778)),
        (r"Long Range", ev(105, horsepower=670)),
    ],
    ("Tesla", "Model Y"): [
        (r"Performance", ev(111, horsepower=456)),
        (r"Long Range", ev(122, horsepower=384)),
    ],
    # ── Toyota ──
    ("Toyota", "Avalon"): [(r"Hybrid", gas(43, 44, 43, horsepower=215))],
    ("Toyota", "Camry"): [
        (r"Hybrid LE", gas(51, 53, 52, horsepower=208)),
        (r"Hybrid", gas(44, 47, 46, horsepower=208)),
    ],
    ("Toyota", "Highlander"): [(r"Hybrid", gas(36, 35, 36, horsepower=243))],
    ("Toyota", "Prius"): [(r"Prime", phev(53, 51, 52, 127, horsepower=220))],
    ("Toyota", "RAV4"): [
        (r"Prime", phev(38, 38, 38, 94, horsepower=302)),
        (r"Hybrid", gas(41, 38, 39, horsepower=219)),
    ],
    ("Toyota", "bZ4X"): [(r"AWD", ev(102, horsepower=214))],
    # ── Volvo ──
    ("Volvo", "XC60"): [(r"Recharge", phev(28, 28, 28, 63, horsepower=455))],
    ("Volvo", "XC90"): [(r"Recharge", phev(27, 27, 27, 58, horsepower=455))],
}


def fix(db):
    changes = []
    for (make, model), rules in RULES.items():
        entry = db[make][model]
        compiled = [(re.compile(pat), override) for pat, override in rules]

        trims = sorted({t for y in entry["trims_by_year"].values() for t in y})
        trim_specs = {}
        for trim in trims:
            for pattern, override in compiled:
                if pattern.search(trim):
                    trim_specs[trim] = copy.deepcopy(override)
                    break

        if not trim_specs:
            changes.append(f"WARNING {make} {model}: no trim matched any rule")
            continue
        if entry.get("trim_specs") != trim_specs:
            entry["trim_specs"] = trim_specs
            changes.append(f"{make} {model}: {len(trim_specs)} trim override(s)")
    return changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db = json.loads(DATA.read_text())

    known = {(mk, mo) for mk, models in db.items() for mo in models}
    missing = sorted(set(RULES) - known)
    if missing:
        print("Unknown make/model keys:", missing, file=sys.stderr)
        return 1

    updated = copy.deepcopy(db)
    changes = fix(updated)

    warnings = [c for c in changes if c.startswith("WARNING")]
    for line in changes:
        print(line)
    total = sum(
        len(v.get("trim_specs") or {})
        for models in updated.values()
        for v in models.values()
    )
    print(f"\n{len(changes) - len(warnings)} models updated, {total} trim overrides")
    if SKIPPED:
        print("\nDeliberately left on the model default (no EPA rating exists):")
        for line in SKIPPED:
            print(f"  {line}")
    if warnings:
        return 1

    if not args.dry_run:
        DATA.write_text(json.dumps(updated, indent=2) + "\n")
        print(f"\nwrote {DATA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
