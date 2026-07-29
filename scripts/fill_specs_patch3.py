#!/usr/bin/env python3
"""Patch 3 of the specs backfill: per-trim seats and cargo volume.

Patch 2 gave powertrain-distinct trims their own horsepower and MPG. This
patch covers the other axis on which a trim departs from its model: **body
style and cab configuration**, which change how many people fit and how much
they can carry.

A Ford Bronco 2-Door seats 4 with 22.4 cu ft behind the seats; the 4-door
seats 5 with 35.6. An Escalade ESV carries 42.9 cu ft against the standard
car's 25.5 — a 68% difference the pick-list "Most Cargo Space" sort was
blind to. Convertibles lose trunk space to the folding roof, coupes lose a
seat, and every pickup's seat count is set by its cab.

This patch **merges into** the `trim_specs` written by patch 2 rather than
replacing it, so a Bronco Raptor 2-Door ends up with the Raptor's engine and
the 2-door's body. Run the patches in order: 1, then 2, then 3.

Scope discipline — only what the trim name reliably determines:

* Pickup **bed** volume is not encoded in the trim name (a SuperCrew can be
  ordered with either bed), so cab trims set `seats` only.
* Captain's-chair and third-row-delete options change seat count without
  changing the trim name, so they are not inferred.
* Where a body style matches the model default (a 4-door Bronco, a Crew Cab
  Ram, an A5 Coupe's seat count) no entry is written — the model figure is
  already right, and the validator rejects an override that restates it.

Run:  python3 scripts/fill_specs_patch3.py [--dry-run]
"""
import argparse
import copy
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data" / "vehicles.json"


def body(seats=None, cargo_cu_ft=None, **extra):
    out = dict(extra)
    if seats is not None:
        out["seats"] = seats
    if cargo_cu_ft is not None:
        out["cargo_cu_ft"] = cargo_cu_ft
    return out


# (make, model) -> [(trim-name regex, override), ...]; first match wins.
# Comments record the model-level figure each override departs from.
RULES = {
    # ── Convertibles, coupes and other body styles ──
    # A3 sedan seats 5 / 10.0 cu ft; the cabriolet loses the middle seat and
    # trunk space to the folding roof.
    ("Audi", "A3"): [(r"Cabriolet", body(seats=4, cargo_cu_ft=9.9))],
    # A5 base entry is the cabriolet (4 seats / 12.6). The Sportback is a
    # five-seat hatch; the coupe keeps 4 seats but a smaller trunk.
    ("Audi", "A5"): [
        (r"Sportback", body(seats=5, cargo_cu_ft=21.8)),
        (r"Coupe", body(cargo_cu_ft=11.6)),
    ],
    ("Audi", "S5"): [
        (r"Sportback", body(seats=5, cargo_cu_ft=21.8)),
        (r"Coupe", body(cargo_cu_ft=11.6)),
    ],
    ("BMW", "M4"): [(r"Convertible", body(cargo_cu_ft=9.9))],
    # M8 base entry is the coupe's 4 seats / 12.4 cu ft.
    ("BMW", "M8"): [
        (r"Gran Coupe", body(seats=5, cargo_cu_ft=15.5)),
        (r"Convertible", body(cargo_cu_ft=7.6)),
        (r"Coupe", body(cargo_cu_ft=14.8)),
    ],
    # ATS base entry is the 5-seat sedan.
    ("Cadillac", "ATS"): [(r"Coupe", body(seats=4))],
    ("Chevrolet", "Camaro"): [(r"Convertible", body(cargo_cu_ft=7.3))],
    # Mustang base entry is the fastback's 13.5 cu ft.
    ("Ford", "Mustang"): [(r"Convertible", body(cargo_cu_ft=11.4))],
    # GV80 base entry is the 7-seat wagon; the coupe drops the third row.
    ("Genesis", "GV80"): [(r"Coupe", body(seats=5))],
    ("Nissan", "370Z"): [(r"Roadster", body(cargo_cu_ft=4.2))],
    ("Porsche", "Cayenne"): [(r"Coupe", body(cargo_cu_ft=25.1))],
    # Taycan base entry is the sedan; the Turismo bodies are wagons.
    ("Porsche", "Taycan"): [(r"Turismo", body(cargo_cu_ft=15.7))],

    # ── Long-wheelbase SUV variants ──
    # Escalade 25.5 -> ESV 42.9, and the longer body gains a seat.
    ("Cadillac", "Escalade"): [(r"ESV", body(seats=8, cargo_cu_ft=42.9))],
    # Expedition 19.3 -> Max 36.0 (seat count is unchanged at 8).
    ("Ford", "Expedition"): [(r"Max", body(cargo_cu_ft=36.0))],
    # Yukon 25.5 -> XL 41.5.
    ("GMC", "Yukon"): [(r"\bXL\b", body(cargo_cu_ft=41.5))],
    # Bronco base entry is the 4-door.
    ("Ford", "Bronco"): [(r"2-Door", body(seats=4, cargo_cu_ft=22.4))],

    # ── Pickup cab configurations (seats only; see the note above) ──
    # F-150/F-250 base entry is the 3-seat regular cab.
    ("Ford", "F-150"): [(r"SuperCab|SuperCrew", body(seats=6))],
    ("Ford", "F-250"): [(r"SuperCab|SuperCrew|Crew Cab", body(seats=6))],
    # Silverado/Sierra base entry is the 3-seat regular cab.
    ("Chevrolet", "Silverado"): [(r"Double Cab|Crew Cab", body(seats=6))],
    ("Chevrolet", "Silverado 1500"): [(r"Double Cab|Crew Cab", body(seats=6))],
    ("GMC", "Sierra 1500"): [(r"Double Cab|Crew Cab", body(seats=6))],
    # Colorado base entry is the 5-seat crew cab.
    ("Chevrolet", "Colorado"): [
        (r"Regular Cab", body(seats=2)),
        (r"Extended Cab", body(seats=4)),
    ],
    # Tacoma base entry is the 5-seat double cab.
    ("Toyota", "Tacoma"): [
        (r"Regular Cab", body(seats=3)),
        (r"Access Cab", body(seats=4)),
    ],
    # Ram base entry is the 6-seat crew/quad cab. The TRX is also a different
    # engine entirely - a supercharged 6.2 V8 in place of the 3.6 V6.
    ("Ram", "1500"): [
        (r"TRX", dict(
            body(seats=5),
            horsepower=702,
            mpg={"city": 10, "highway": 14, "combined": 12},
        )),
        (r"Regular Cab", body(seats=3)),
    ],
    ("Ram", "2500"): [(r"Regular Cab", body(seats=3))],
    ("Ram", "3500"): [(r"Regular Cab", body(seats=3))],

    # ── Seat-count variants on EVs ──
    # EV9 base entry is the 7-seat bench; GT-Line is captain's chairs.
    ("Kia", "EV9"): [(r"GT-Line", body(seats=6))],
}


def fix(db):
    changes = []
    for (make, model), rules in RULES.items():
        entry = db[make][model]
        compiled = [(re.compile(pat), override) for pat, override in rules]
        existing = entry.get("trim_specs") or {}
        merged = copy.deepcopy(existing)
        matched = 0

        trims = sorted({t for y in entry["trims_by_year"].values() for t in y})
        for trim in trims:
            for pattern, override in compiled:
                if pattern.search(trim):
                    matched += 1
                    merged.setdefault(trim, {})
                    merged[trim].update(copy.deepcopy(override))
                    break

        if not matched:
            changes.append(f"WARNING {make} {model}: no trim matched any rule")
            continue
        if merged != existing:
            entry["trim_specs"] = dict(sorted(merged.items()))
            new_keys = len(merged) - len(existing)
            changes.append(
                f"{make} {model}: {matched} trim(s) given body specs "
                f"({new_keys} new trim_specs entries)"
            )
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
    print(f"\n{len(changes) - len(warnings)} models updated, "
          f"{total} trim overrides in the database")
    if warnings:
        return 1

    if not args.dry_run:
        DATA.write_text(json.dumps(updated, indent=2) + "\n")
        print(f"\nwrote {DATA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
