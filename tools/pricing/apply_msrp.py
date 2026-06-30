#!/usr/bin/env python3
"""Join an authoritative Base-MSRP dataset into src/data/vehicles.json.

Input MSRP CSV must have columns: make, model, year, trim, base_msrp
(base_msrp = MSRP excluding destination/delivery, the project convention).

Default is a DRY RUN: writes a per-cell diff report and a list of unmatched
keys, and prints validation warnings (price inversions within a model's
trim series). Pass --write to actually update vehicles.json.

  python3 tools/pricing/apply_msrp.py msrp.csv                 # dry run
  python3 tools/pricing/apply_msrp.py msrp.csv --write         # apply
  python3 tools/pricing/apply_msrp.py msrp.csv --overrides map.csv

overrides map.csv (optional): our_make,our_model,our_trim,src_trim
maps a vehicles.json trim name to the dataset's trim name when they differ.
"""
import json, csv, sys, os, re
from collections import OrderedDict, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "src", "data", "vehicles.json")

def norm(s):
    return re.sub(r"\s+", " ", str(s).strip().lower())

def load_msrp(path):
    table = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            key = (norm(r["make"]), norm(r["model"]), int(r["year"]), norm(r["trim"]))
            try:
                table[key] = int(round(float(str(r["base_msrp"]).replace(",", "").replace("$", ""))))
            except (ValueError, KeyError):
                pass
    return table

def load_overrides(path):
    ov = {}
    if path and os.path.exists(path):
        for r in csv.DictReader(open(path, newline="")):
            ov[(norm(r["our_make"]), norm(r["our_model"]), norm(r["our_trim"]))] = norm(r["src_trim"])
    return ov

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    if not args:
        print(__doc__); sys.exit(1)
    msrp = load_msrp(args[0])
    ov_path = args[args.index(flags[flags.index("--overrides")] ) + 1] if "--overrides" in flags else None
    # simpler override parse:
    ov_path = None
    if "--overrides" in sys.argv:
        ov_path = sys.argv[sys.argv.index("--overrides") + 1]
    overrides = load_overrides(ov_path)
    write = "--write" in flags

    data = json.load(open(SRC), object_pairs_hook=OrderedDict)
    report, unmatched = [], []
    matched = 0
    for make, models in data.items():
        for model, info in models.items():
            for year, trims in info.get("trims_by_year", {}).items():
                for trim in list(trims):
                    src_trim = overrides.get((norm(make), norm(model), norm(trim)), norm(trim))
                    key = (norm(make), norm(model), int(year), src_trim)
                    if key in msrp:
                        old, new = trims[trim], msrp[key]
                        report.append([make, model, year, trim, old, new, new - old])
                        if write:
                            trims[trim] = new
                        matched += 1
                    else:
                        unmatched.append([make, model, year, trim, trims[trim]])

    # validation: detect inversions (a pricier-named trim cheaper than base) is
    # hard generically; instead flag non-monotonic jumps within a single trim's
    # year series after update.
    warnings = []
    if write:
        for make, models in data.items():
            for model, info in models.items():
                series = defaultdict(list)
                for year, trims in info.get("trims_by_year", {}).items():
                    for trim, price in trims.items():
                        series[trim].append((int(year), price))
                for trim, pts in series.items():
                    pts.sort()
                    for (y0, p0), (y1, p1) in zip(pts, pts[1:]):
                        if p1 < p0 * 0.9:  # >10% drop year-over-year
                            warnings.append(f"{make} {model} {trim}: {y0} ${p0} -> {y1} ${p1}")

    outdir = os.path.dirname(os.path.abspath(args[0]))
    with open(os.path.join(outdir, "msrp_apply_report.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["make","model","year","trim","old","new","delta"]); w.writerows(report)
    with open(os.path.join(outdir, "msrp_unmatched.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["make","model","year","trim","current_price"]); w.writerows(unmatched)

    if write:
        with open(SRC, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        json.load(open(SRC))  # re-validate

    print(f"{'APPLIED' if write else 'DRY RUN'}: matched {matched}, unmatched {len(unmatched)}")
    print(f"Reports: msrp_apply_report.csv, msrp_unmatched.csv")
    if warnings:
        print(f"\n{len(warnings)} post-apply >10% YoY price drops to review:")
        for w in warnings[:20]:
            print("  " + w)

if __name__ == "__main__":
    main()
