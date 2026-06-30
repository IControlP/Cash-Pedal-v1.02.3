#!/usr/bin/env python3
"""Validate trim/model EXISTENCE in src/data/vehicles.json against NHTSA vPIC
(free, authoritative). Flags (make, model, year) entries whose model does not
appear in vPIC's model list for that make+year -- i.e. likely phantom entries
like the ones already fixed by hand (Stinger, Edge, etc.).

Requires outbound access to vpic.nhtsa.dot.gov (allowlist it in the
environment's Network access settings, then run in a NEW session).

  python3 tools/pricing/validate_vpic.py [out.csv]

vPIC has NO pricing data; this checks existence/specs only.
"""
import json, csv, sys, os, re, time, urllib.request, urllib.error, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "src", "data", "vehicles.json")
API = "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"

def norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())

def fetch_models(make, year, cache):
    key = (make.lower(), year)
    if key in cache:
        return cache[key]
    url = API.format(make=urllib.parse.quote(make), year=year)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            d = json.load(r)
        models = {norm(m["Model_Name"]) for m in d.get("Results", [])}
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError, TimeoutError) as e:
        models = None  # could not validate this make/year
        print(f"  ! {make} {year}: {e}", file=sys.stderr)
    cache[key] = models
    time.sleep(0.2)  # be polite to the gov API
    return models

def main(out):
    data = json.load(open(SRC))
    cache = {}
    flagged, unvalidated = [], 0
    for make, models in data.items():
        for model, info in models.items():
            for year in info.get("trims_by_year", {}):
                vp = fetch_models(make, int(year), cache)
                if vp is None:
                    unvalidated += 1
                    continue
                if vp and norm(model) not in vp:
                    # also accept partial match (vPIC sometimes splits trims into model)
                    if not any(norm(model) in vm or vm in norm(model) for vm in vp if vm):
                        flagged.append([make, model, year])
    with open(out, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["make", "model", "year"]); w.writerows(flagged)
    print(f"Flagged {len(flagged)} (make,model,year) not found in vPIC -> {out}")
    print(f"Unvalidated (fetch failures): {unvalidated}")
    print("Review each flag before deleting -- vPIC naming differs (e.g. trims "
          "folded into model), so some flags are false positives.")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vpic_existence_flags.csv")
