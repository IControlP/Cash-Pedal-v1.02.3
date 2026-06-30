#!/usr/bin/env python3
"""Extract canonical (make, model, year, trim, current_price) rows from
src/data/vehicles.json. This CSV is the join key for an authoritative
Base-MSRP dataset and the exact coverage list to hand a data vendor.

Usage:  python3 tools/pricing/extract_keys.py [out.csv]
"""
import json, csv, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "src", "data", "vehicles.json")

def main(out):
    data = json.load(open(SRC))
    rows = []
    for make, models in data.items():
        for model, info in models.items():
            for year, trims in info.get("trims_by_year", {}).items():
                for trim, price in trims.items():
                    rows.append([make, model, int(year), trim, price])
    rows.sort(key=lambda r: (r[0], r[1], r[2], r[3]))
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["make", "model", "year", "trim", "current_price"])
        w.writerows(rows)
    print(f"Wrote {len(rows)} trim-year rows to {out}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vehicle_price_keys.csv")
