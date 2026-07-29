#!/usr/bin/env python3
"""Patch 1 of the specs backfill: give every model an `mpg` block.

Before this patch 241 of 280 models had `mpg: null`, which meant the TCO
calculator fell back to a flat category average (28 MPG / 100 MPGe) for 86% of
the catalog, and `Affordability` hid its "Most Efficient" sort entirely
(see the comment on SORT_OPTIONS in src/utils/affordability.js).

Convention — the same one the 39 pre-existing entries already follow:

* Model-level `mpg` describes the **base powertrain** of the model, matching
  the configuration the model-level `specs.horsepower` was recorded for, in
  the most common drivetrain (FWD/RWD where the model offers a choice).
  Trim-level departures (hybrids, V8s, AWD) are handled separately in
  `trim_specs` — see fill_mpg_patch2.py.
* Gas/hybrid models: `{city, highway, combined}` — EPA combined is the
  harmonic-mean figure EPA publishes, not the average of city and highway.
* Electric models (`is_ev: true`): `{mpge_combined}` — EPA combined MPGe.

Heavy-duty pickups (F-250, Ram 2500/3500) and the ProMaster cargo van are over
8,500 lb GVWR and therefore **not EPA-rated**. They are marked
`"estimated": true` and carry manufacturer/observed real-world figures so fuel
cost is not silently modelled at the 28 MPG category default; consumers should
treat them as approximations.

Run:  python3 scripts/fill_mpg_patch1.py [--dry-run]
"""
import argparse
import copy
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data" / "vehicles.json"

# (city, highway, combined) for combustion/hybrid, or ("mpge", combined) for EV.
GAS = {
    # ── Acura ──
    ("Acura", "ADX"): (26, 31, 28),
    ("Acura", "ILX"): (24, 34, 28),
    ("Acura", "Integra"): (30, 37, 33),
    ("Acura", "MDX"): (19, 26, 22),
    ("Acura", "RDX"): (22, 28, 24),
    ("Acura", "TLX"): (22, 31, 25),
    # NSX is a non-plug-in hybrid supercar; see IS_EV_FIXES below.
    ("Acura", "NSX"): (21, 22, 21),
    # ── Alfa Romeo ──
    ("Alfa Romeo", "4C"): (24, 34, 28),
    ("Alfa Romeo", "Giulia"): (24, 33, 27),
    ("Alfa Romeo", "Stelvio"): (22, 28, 24),
    # ── Audi ──
    ("Audi", "A3"): (28, 36, 31),
    ("Audi", "A5"): (24, 31, 27),
    ("Audi", "A6"): (24, 33, 27),
    ("Audi", "A7"): (22, 29, 25),
    ("Audi", "A8"): (19, 27, 22),
    ("Audi", "Q3"): (20, 28, 23),
    ("Audi", "Q5 Sportback"): (23, 28, 25),
    ("Audi", "Q7"): (19, 25, 21),
    ("Audi", "Q8"): (17, 22, 19),
    ("Audi", "R8"): (14, 23, 17),
    ("Audi", "RS7"): (15, 22, 17),
    ("Audi", "S4"): (19, 28, 22),
    ("Audi", "S5"): (19, 28, 22),
    # ── BMW ──
    ("BMW", "328i"): (23, 35, 27),
    ("BMW", "330i"): (26, 36, 30),
    ("BMW", "340i"): (22, 32, 25),
    ("BMW", "530i"): (25, 33, 28),
    ("BMW", "540i"): (22, 30, 25),
    ("BMW", "750i"): (17, 25, 20),
    ("BMW", "M3"): (16, 23, 19),
    ("BMW", "M4"): (16, 23, 19),
    ("BMW", "M5"): (15, 21, 17),
    ("BMW", "M8"): (15, 21, 17),
    ("BMW", "X1"): (25, 34, 28),
    ("BMW", "X5"): (21, 26, 23),
    ("BMW", "X7"): (20, 25, 22),
    # ── Buick ──
    ("Buick", "Enclave"): (18, 26, 21),
    ("Buick", "Encore"): (25, 33, 28),
    ("Buick", "Encore GX"): (26, 30, 28),
    ("Buick", "Envision"): (24, 31, 26),
    ("Buick", "LaCrosse"): (21, 31, 25),
    ("Buick", "Regal"): (22, 32, 26),
    # ── Cadillac ──
    ("Cadillac", "ATS"): (22, 31, 25),
    ("Cadillac", "CT4"): (23, 34, 27),
    ("Cadillac", "CT5"): (23, 32, 26),
    ("Cadillac", "CTS"): (22, 30, 25),
    ("Cadillac", "Escalade"): (15, 20, 17),
    ("Cadillac", "SRX"): (17, 24, 20),
    ("Cadillac", "XT4"): (24, 30, 26),
    ("Cadillac", "XT5"): (19, 26, 22),
    ("Cadillac", "XT6"): (19, 26, 22),
    # ── Chevrolet ──
    ("Chevrolet", "Blazer"): (22, 29, 25),
    ("Chevrolet", "Camaro"): (22, 31, 25),
    ("Chevrolet", "Colorado"): (19, 25, 21),
    ("Chevrolet", "Cruze"): (30, 38, 33),
    ("Chevrolet", "Impala"): (19, 28, 22),
    ("Chevrolet", "Silverado"): (19, 22, 20),
    ("Chevrolet", "Sonic"): (27, 34, 30),
    ("Chevrolet", "Spark"): (30, 38, 33),
    ("Chevrolet", "Suburban"): (16, 20, 18),
    ("Chevrolet", "Tahoe"): (16, 20, 18),
    ("Chevrolet", "Traverse"): (18, 27, 21),
    ("Chevrolet", "Trax"): (28, 32, 30),
    # ── Chrysler ──
    ("Chrysler", "300"): (19, 30, 23),
    ("Chrysler", "Pacifica"): (19, 28, 22),
    ("Chrysler", "Voyager"): (19, 28, 22),
    # ── Dodge ──
    ("Dodge", "Challenger"): (19, 30, 23),
    ("Dodge", "Charger"): (19, 30, 23),
    ("Dodge", "Dart"): (24, 34, 28),
    ("Dodge", "Durango"): (19, 26, 21),
    ("Dodge", "Grand Caravan"): (17, 25, 20),
    ("Dodge", "Journey"): (19, 25, 21),
    ("Dodge", "Ram 1500"): (17, 25, 20),
    ("Dodge", "Viper"): (12, 21, 15),
    # ── Fiat ──
    ("Fiat", "124 Spider"): (26, 35, 30),
    ("Fiat", "500"): (28, 33, 30),
    ("Fiat", "500L"): (22, 30, 25),
    ("Fiat", "500X"): (21, 29, 24),
    # ── Ford ──
    ("Ford", "Bronco"): (20, 21, 20),
    ("Ford", "Edge"): (21, 29, 24),
    ("Ford", "Escape"): (27, 33, 30),
    ("Ford", "Expedition"): (17, 23, 19),
    ("Ford", "Focus"): (26, 36, 30),
    ("Ford", "Fusion"): (23, 34, 27),
    ("Ford", "Taurus"): (18, 27, 21),
    # ── GMC ──
    ("GMC", "Acadia"): (22, 29, 25),
    ("GMC", "Canyon"): (19, 25, 21),
    ("GMC", "Sierra 1500"): (19, 22, 20),
    ("GMC", "Terrain"): (26, 30, 28),
    ("GMC", "Yukon"): (16, 20, 18),
    # ── Genesis ──
    ("Genesis", "G70"): (22, 30, 25),
    ("Genesis", "G80"): (23, 32, 26),
    ("Genesis", "G90"): (18, 25, 21),
    ("Genesis", "GV70"): (22, 28, 24),
    ("Genesis", "GV80"): (21, 25, 22),
    # ── Honda ──
    ("Honda", "Insight"): (55, 49, 52),
    ("Honda", "Odyssey"): (19, 28, 22),
    ("Honda", "Passport"): (19, 24, 21),
    ("Honda", "Ridgeline"): (18, 24, 21),
    # ── Hyundai ──
    ("Hyundai", "Genesis"): (18, 29, 22),
    ("Hyundai", "Ioniq"): (55, 54, 55),
    ("Hyundai", "Kona"): (28, 34, 31),
    ("Hyundai", "Palisade"): (19, 27, 22),
    ("Hyundai", "Sonata"): (28, 38, 32),
    ("Hyundai", "Tucson"): (26, 33, 29),
    ("Hyundai", "Veloster"): (27, 34, 30),
    # ── Infiniti ──
    ("Infiniti", "Q50"): (22, 29, 25),
    ("Infiniti", "Q60"): (22, 30, 25),
    ("Infiniti", "QX50"): (24, 30, 26),
    ("Infiniti", "QX60"): (20, 27, 23),
    ("Infiniti", "QX80"): (14, 20, 16),
    # ── Jaguar ──
    ("Jaguar", "E-PACE"): (21, 27, 23),
    ("Jaguar", "F-PACE"): (21, 26, 23),
    ("Jaguar", "F-TYPE"): (23, 30, 26),
    ("Jaguar", "XE"): (23, 32, 26),
    ("Jaguar", "XF"): (24, 33, 27),
    ("Jaguar", "XJ"): (18, 27, 21),
    # ── Jeep ──
    ("Jeep", "Cherokee"): (22, 30, 25),
    ("Jeep", "Compass"): (22, 31, 25),
    ("Jeep", "Gladiator"): (17, 22, 19),
    ("Jeep", "Grand Cherokee"): (19, 26, 22),
    ("Jeep", "Renegade"): (22, 30, 25),
    ("Jeep", "Wrangler"): (18, 23, 20),
    # ── Kia ──
    ("Kia", "Forte"): (31, 41, 35),
    ("Kia", "K4"): (29, 38, 33),
    ("Kia", "K5"): (27, 37, 31),
    ("Kia", "Niro"): (53, 54, 53),
    ("Kia", "Optima"): (25, 35, 29),
    ("Kia", "Seltos"): (29, 34, 31),
    ("Kia", "Sorento"): (24, 29, 26),
    ("Kia", "Soul"): (29, 35, 31),
    ("Kia", "Sportage"): (25, 32, 28),
    ("Kia", "Stinger"): (22, 29, 25),
    ("Kia", "Telluride"): (20, 26, 23),
    # ── Lexus ──
    ("Lexus", "GX"): (15, 21, 17),
    ("Lexus", "IS"): (21, 31, 25),
    ("Lexus", "LS"): (19, 30, 23),
    ("Lexus", "LX"): (17, 22, 19),
    ("Lexus", "NX"): (26, 33, 28),
    ("Lexus", "UX"): (29, 37, 33),
    # ── Lincoln ──
    ("Lincoln", "Continental"): (17, 26, 20),
    ("Lincoln", "MKC"): (20, 29, 23),
    ("Lincoln", "MKX"): (17, 25, 20),
    ("Lincoln", "MKZ"): (21, 31, 25),
    # ── Mazda ──
    ("Mazda", "CX-3"): (29, 34, 31),
    ("Mazda", "CX-30"): (26, 32, 28),
    ("Mazda", "CX-5"): (25, 31, 28),
    ("Mazda", "CX-50"): (24, 30, 27),
    ("Mazda", "CX-9"): (22, 28, 24),
    ("Mazda", "CX-90"): (23, 28, 25),
    ("Mazda", "MX-5 Miata"): (26, 34, 29),
    ("Mazda", "Mazda3"): (27, 35, 30),
    ("Mazda", "Mazda6"): (26, 35, 29),
    # ── Mercedes-Benz ──
    ("Mercedes-Benz", "A-Class"): (24, 35, 28),
    ("Mercedes-Benz", "AMG GT"): (16, 22, 18),
    ("Mercedes-Benz", "CLA"): (24, 35, 28),
    ("Mercedes-Benz", "G-Class"): (13, 17, 15),
    ("Mercedes-Benz", "GLC"): (22, 29, 25),
    ("Mercedes-Benz", "GLS"): (19, 24, 21),
    ("Mercedes-Benz", "S-Class"): (21, 29, 24),
    # ── Mini ──
    ("Mini", "Clubman"): (24, 33, 27),
    ("Mini", "Cooper"): (28, 37, 32),
    ("Mini", "Countryman"): (25, 33, 28),
    # ── Mitsubishi ──
    ("Mitsubishi", "Eclipse Cross"): (25, 28, 26),
    ("Mitsubishi", "Mirage"): (36, 43, 39),
    ("Mitsubishi", "Outlander"): (24, 30, 27),
    # ── Nissan ──
    ("Nissan", "370Z"): (18, 26, 21),
    ("Nissan", "Maxima"): (20, 30, 24),
    ("Nissan", "Murano"): (20, 28, 23),
    ("Nissan", "Pathfinder"): (21, 27, 23),
    ("Nissan", "Sentra"): (29, 39, 33),
    ("Nissan", "Titan"): (16, 21, 18),
    # ── Porsche ──
    ("Porsche", "718"): (21, 27, 24),
    ("Porsche", "911"): (18, 25, 21),
    ("Porsche", "Boxster"): (20, 28, 23),
    ("Porsche", "Cayenne"): (19, 23, 21),
    ("Porsche", "Cayman"): (20, 28, 23),
    ("Porsche", "Macan"): (20, 25, 22),
    ("Porsche", "Panamera"): (20, 27, 23),
    # ── Ram ──
    ("Ram", "1500"): (20, 25, 22),
    # ── Subaru ──
    ("Subaru", "Ascent"): (21, 27, 23),
    ("Subaru", "BRZ"): (20, 27, 22),
    ("Subaru", "Crosstrek"): (28, 33, 30),
    ("Subaru", "Forester"): (26, 33, 29),
    ("Subaru", "Impreza"): (28, 36, 31),
    ("Subaru", "Legacy"): (27, 35, 30),
    ("Subaru", "Outback"): (26, 32, 28),
    ("Subaru", "STI"): (16, 22, 19),
    ("Subaru", "WRX"): (19, 26, 22),
    # ── Toyota ──
    ("Toyota", "4Runner"): (17, 20, 18),
    ("Toyota", "Avalon"): (22, 32, 26),
    ("Toyota", "C-HR"): (27, 31, 29),
    ("Toyota", "GR Supra"): (22, 30, 25),
    ("Toyota", "GR86"): (20, 27, 22),
    ("Toyota", "Land Cruiser"): (22, 25, 23),
    ("Toyota", "Sequoia"): (20, 24, 22),
    ("Toyota", "Sienna"): (36, 36, 36),
    ("Toyota", "Tacoma"): (21, 26, 23),
    ("Toyota", "Tundra"): (18, 24, 20),
    ("Toyota", "Venza"): (40, 37, 39),
    # ── Volkswagen ──
    ("Volkswagen", "Atlas"): (21, 25, 23),
    ("Volkswagen", "Golf"): (24, 34, 28),
    ("Volkswagen", "Jetta"): (29, 40, 33),
    ("Volkswagen", "Passat"): (24, 36, 29),
    ("Volkswagen", "Tiguan"): (23, 30, 26),
    # ── Volvo ──
    ("Volvo", "S60"): (25, 34, 28),
    ("Volvo", "V90"): (23, 31, 26),
    ("Volvo", "XC40"): (23, 31, 26),
    ("Volvo", "XC60"): (22, 29, 25),
    ("Volvo", "XC90"): (21, 28, 24),
}

# EPA combined MPGe, base/most-common configuration.
EV = {
    ("Audi", "Q8 e-tron"): 81,
    ("Audi", "e-tron"): 78,
    ("BMW", "i3"): 113,
    ("BMW", "i4"): 109,
    ("BMW", "i5"): 97,
    ("BMW", "iX"): 86,
    ("Chevrolet", "Blazer EV"): 89,
    ("Chevrolet", "Equinox EV"): 104,
    ("Dodge", "Charger Daytona"): 84,
    ("Ford", "Mustang Mach-E"): 100,
    ("Genesis", "Electrified G80"): 97,
    ("Genesis", "Electrified GV70"): 98,
    ("Genesis", "GV60"): 97,
    ("Honda", "Prologue"): 91,
    ("Hyundai", "Ioniq 5"): 114,
    ("Hyundai", "Ioniq 6"): 140,
    ("Hyundai", "Ioniq 9"): 96,
    ("Jaguar", "I-PACE"): 76,
    ("Kia", "EV6"): 117,
    ("Kia", "EV9"): 87,
    ("Lucid", "Air"): 131,
    ("Porsche", "Taycan"): 79,
    ("Rivian", "R1S"): 69,
    ("Rivian", "R1T"): 70,
    ("Tesla", "Cybertruck"): 66,
    ("Toyota", "Mirai"): 74,   # hydrogen FCEV — EPA rates it in MPGe
    ("Toyota", "bZ4X"): 119,
}

# Over 8,500 lb GVWR, so EPA publishes no rating. Manufacturer/observed
# real-world figures, flagged so consumers can label them as estimates.
ESTIMATED = {
    ("Ford", "F-250"): (11, 15, 13),
    ("Ram", "2500"): (11, 15, 13),
    ("Ram", "3500"): (11, 15, 13),
    ("Ram", "ProMaster"): (15, 21, 17),
}

# `is_ev` corrections needed for the mpg block to mean anything. The Acura NSX
# is a hybrid with no plug — it burns premium gas and has an EPA MPG rating,
# not an MPGe one, so flagging it as an EV made the calculator price its fuel
# as household electricity.
IS_EV_FIXES = {("Acura", "NSX"): False}


def fix(db):
    changes = []

    for (make, model), is_ev in IS_EV_FIXES.items():
        entry = db[make][model]
        if entry["is_ev"] != is_ev:
            entry["is_ev"] = is_ev
            changes.append(f"{make} {model}: is_ev {not is_ev} -> {is_ev}")

    for table, estimated in ((GAS, False), (ESTIMATED, True)):
        for (make, model), (city, hwy, comb) in table.items():
            entry = db[make][model]
            mpg = {"city": city, "highway": hwy, "combined": comb}
            if estimated:
                mpg["estimated"] = True
            if entry["mpg"] != mpg:
                changes.append(f"{make} {model}: mpg {entry['mpg']} -> {mpg}")
                entry["mpg"] = mpg

    for (make, model), mpge in EV.items():
        entry = db[make][model]
        mpg = {"mpge_combined": mpge}
        if entry["mpg"] != mpg:
            changes.append(f"{make} {model}: mpg {entry['mpg']} -> {mpg}")
            entry["mpg"] = mpg

    return changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db = json.loads(DATA.read_text())

    # Every key in the tables must exist, or a rename has silently orphaned data.
    known = {(mk, mo) for mk, models in db.items() for mo in models}
    missing = sorted((set(GAS) | set(EV) | set(ESTIMATED) | set(IS_EV_FIXES)) - known)
    if missing:
        print("Unknown make/model keys:", missing, file=sys.stderr)
        return 1

    updated = copy.deepcopy(db)
    changes = fix(updated)

    still_null = sorted(
        f"{mk} {mo}"
        for mk, models in updated.items()
        for mo, v in models.items()
        if v["mpg"] is None
    )
    if still_null:
        print(f"{len(still_null)} models still missing mpg:", still_null, file=sys.stderr)
        return 1

    for line in changes:
        print(line)
    print(f"\n{len(changes)} changes")

    if not args.dry_run:
        DATA.write_text(json.dumps(updated, indent=2) + "\n")
        print(f"wrote {DATA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
