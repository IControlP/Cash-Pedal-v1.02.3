#!/usr/bin/env python3
"""Patch 16: catalog structure corrections from the Oct 2026 database review.

Run from the repo root: python3 scripts/patches/fix_catalog_patch16.py

Prices follow the database convention (base MSRP, excluding destination). Every
removal of a model year below was confirmed against two official sources: the
EPA fueleconomy.gov model menus and the NHTSA vPIC model list for that year
(GetModelsForMakeYear). When neither lists the model, the year never existed.

1. Ferrari SF21 / SF-23 / SF-24 removed. These are Formula 1 race cars, not
   road cars (1 seat, $850k-$5.2M, 4 MPG); they distorted every calculator and
   topped the horsepower sort. Ferrari had no other models, so the make goes too.
2. Chevrolet "Silverado" merged into "Silverado 1500". The two carried
   identical 2019-2026 prices; "Silverado" only added 2015-2018, which move
   over with the trims renamed to the 1500 naming.
3. BMW 328i / 330i / 340i removed. Each duplicated trims already listed under
   "3 Series" (and the 330i's 2016 row was wrong: the 330i replaced the 328i
   for MY2017, which "3 Series" already reflects).
4. BMW 750i ends at MY2022. The G70 7 Series (MY2023+) has no 750i/750Li; its
   2023-2026 rows were extrapolated. The G70 is added as "7 Series".
   Sources (destination removed): 2023 Car and Driver/BMWBlog launch pricing
   (740i $94,295 and 760i $114,595 incl. $995); 2024 KBB/Rusnak BMW pricing;
   2025 Cars.com "How much is the 2025 BMW 7 Series" (incl. $1,175); 2026
   TrueCar/iSeeCars MSRP listings.
5. Audi: the B9 A4/S4 ended with MY2025 and the A5 Coupe/Cabriolet with
   MY2024 (Motor1 "The Audi A4 Is Dead", CarGurus 2025 A4 overview). For MY2026
   the A5 and S5 are the new sedan (EPA 2026: "A5 quattro", "S5 Sport Sedan").
   2026 A5/S5 sedan pricing from iSeeCars/Autofinder MSRP listings (excl.
   $1,295/$1,395 destination). The A7 also ended with MY2025.
6. Model years that never existed, removed (EPA + vPIC both absent):
   Acura TLX 2026, BMW M8 2026, Cadillac XT4/XT6 2026, Infiniti QX50 2026,
   Infiniti Q50 2025-2026, Jaguar E-PACE/XF 2025-2026, Kia Soul 2026,
   Porsche 718 2026, Volvo S60 2026.
7. Dodge Challenger production_years ended 2025 but the car ended with MY2023.
8. Segment fixes: Alfa Romeo 4C -> sports, Volvo XC40 -> suv, Toyota C-HR ->
   suv, Genesis Electrified G80 -> ev_sedan, Electrified GV70 -> ev_suv,
   Toyota Mirai -> ev_sedan.
9. Toyota Mirai gets "fuel_type": "hydrogen" so fuel is costed per kg of
   hydrogen instead of at electricity rates (see computeAnnualFuel).
"""
import copy
import json

SRC = "src/data/vehicles.json"
with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []


def drop_years(make, model, years, new_end):
    m = corrected[make][model]
    for y in years:
        if m["trims_by_year"].pop(str(y), None) is not None:
            changes.append(f"  {make} {model}: removed MY{y}")
    m["production_years"][1] = new_end
    changes.append(f"  {make} {model}: production_years end -> {new_end}")


def set_year(make, model, year, trims):
    corrected[make][model]["trims_by_year"][str(year)] = trims
    changes.append(f"  {make} {model} {year}: trims -> {trims}")


# 1. Ferrari race cars
del corrected["Ferrari"]
changes.append("  Ferrari: removed SF21, SF-23, SF-24 (F1 race cars) and the empty make")

# 2. Silverado merge
chevy = corrected["Chevrolet"]
old = chevy.pop("Silverado")
merged = chevy["Silverado 1500"]
for y, trims in old["trims_by_year"].items():
    if y not in merged["trims_by_year"]:
        merged["trims_by_year"][y] = {
            t.replace("Silverado ", "Silverado 1500 ", 1): p for t, p in trims.items()
        }
merged["trims_by_year"] = dict(sorted(merged["trims_by_year"].items()))
merged["production_years"][0] = old["production_years"][0]
changes.append("  Chevrolet Silverado: merged 2015-2018 into Silverado 1500, entry removed")

# 3. BMW duplicates
for m in ("328i", "330i", "340i"):
    del corrected["BMW"][m]
    changes.append(f"  BMW {m}: removed (duplicate of 3 Series trims)")

# 4. BMW 750i -> 7 Series
drop_years("BMW", "750i", range(2023, 2027), 2022)
bmw = corrected["BMW"]
seven = {
    "type": "sedan",
    "is_ev": False,
    "production_years": [2023, 2026],
    "trims_by_year": {
        "2023": {"740i": 93300, "760i xDrive": 113600},
        "2024": {"740i": 96400, "740i xDrive": 99400, "750e xDrive": 107000, "760i xDrive": 121300},
        "2025": {"740i": 97300, "740i xDrive": 100300, "750e xDrive": 108000, "760i xDrive": 122400},
        "2026": {"740i": 99300, "740i xDrive": 102300, "750e xDrive": 110000, "760i xDrive": 124700},
    },
    "mpg": None,
    "specs": {"horsepower": 375, "seats": 5, "cargo_cu_ft": 13.7},
}
# keep the 7 Series next to the 750i in the file
bmw_items = list(bmw.items())
idx = [k for k, _ in bmw_items].index("750i") + 1
bmw_items.insert(idx, ("7 Series", seven))
corrected["BMW"] = dict(bmw_items)
changes.append("  BMW 7 Series: added G70 generation 2023-2026")

# 5. Audi A4/S4/A7/A5/S5
drop_years("Audi", "A4", [2026], 2025)
drop_years("Audi", "S4", [2026], 2025)
drop_years("Audi", "A7", [2026], 2025)
set_year("Audi", "A5", 2026, {"A5 Premium": 50200, "A5 Premium Plus": 52700, "A5 Prestige": 56700})
set_year("Audi", "S5", 2026, {"S5 Premium": 63300, "S5 Premium Plus": 66200, "S5 Prestige": 70900})

# 6. Phantom model years
drop_years("Acura", "TLX", [2026], 2025)
drop_years("BMW", "M8", [2026], 2025)
drop_years("Cadillac", "XT4", [2026], 2025)
drop_years("Cadillac", "XT6", [2026], 2025)
drop_years("Infiniti", "QX50", [2026], 2025)
drop_years("Infiniti", "Q50", [2025, 2026], 2024)
drop_years("Jaguar", "E-PACE", [2025, 2026], 2024)
drop_years("Jaguar", "XF", [2025, 2026], 2024)
drop_years("Kia", "Soul", [2026], 2025)
drop_years("Porsche", "718", [2026], 2025)
drop_years("Volvo", "S60", [2026], 2025)

# 7. Challenger
corrected["Dodge"]["Challenger"]["production_years"][1] = 2023
changes.append("  Dodge Challenger: production_years end -> 2023")

# 8. Segments
for make, model, new_type in [
    ("Alfa Romeo", "4C", "sports"),
    ("Volvo", "XC40", "suv"),
    ("Toyota", "C-HR", "suv"),
    ("Genesis", "Electrified G80", "ev_sedan"),
    ("Genesis", "Electrified GV70", "ev_suv"),
    ("Toyota", "Mirai", "ev_sedan"),
]:
    before = corrected[make][model]["type"]
    corrected[make][model]["type"] = new_type
    changes.append(f"  {make} {model}: type {before} -> {new_type}")

# 9. Hydrogen
corrected["Toyota"]["Mirai"]["fuel_type"] = "hydrogen"
changes.append("  Toyota Mirai: fuel_type -> hydrogen")

with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 16: {len(changes)} change(s):")
for c in changes:
    print(c)
