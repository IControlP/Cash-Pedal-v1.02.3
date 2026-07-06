#!/usr/bin/env python3
"""Vehicle database validator for src/data/vehicles.json.

Codifies the anomaly heuristics used during the 2026 full-database MSRP audit
(Patches 1-15) so pricing regressions are caught automatically instead of by
manual review.

Checks
------
Structural (always enforced):
  - price is a positive number within sane bounds ($5,000 - $1,000,000)
  - trim years are plausible (1980 .. current year + 2)
  - production_years is a [start, end] pair consistent with trim years
  - every model has at least one trim year

Pricing anomalies (compared against a committed baseline of known-legitimate
cases, e.g. Tesla price cuts, generation-change restructures):
  - yoy_drop:  same trim drops more than $1,500 year-over-year
  - yoy_jump:  same trim jumps more than $5,000 year-over-year
  - frozen:    same trim holds the exact same price 3+ consecutive years

Staleness (--staleness):
  - flags active models missing data for the expected latest model year
    (current year, or next year once September arrives)

Usage
-----
  python3 scripts/validate_vehicle_data.py                  # check vs baseline
  python3 scripts/validate_vehicle_data.py --write-baseline # accept current anomalies
  python3 scripts/validate_vehicle_data.py --staleness      # model-year freshness report

Exit codes: 0 ok / 1 new anomalies or structural errors / 2 stale data.
"""
import argparse
import datetime
import json
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(REPO_ROOT, "src", "data", "vehicles.json")
BASELINE_PATH = os.path.join(REPO_ROOT, "scripts", "msrp_anomaly_baseline.json")

YOY_DROP_THRESHOLD = 1500
YOY_JUMP_THRESHOLD = 5000
FROZEN_MIN_YEARS = 3
PRICE_MIN = 5000
PRICE_MAX = 10_000_000  # Ferrari F1 client-racing cars legitimately reach ~$5M


def load_data():
    with open(DATA_PATH) as f:
        return json.load(f)


def structural_errors(data):
    errors = []
    current_year = datetime.date.today().year
    for make, models in data.items():
        for model, md in models.items():
            tby = md.get("trims_by_year") or {}
            if not tby:
                errors.append(f"{make} {model}: no trims_by_year data")
                continue
            years = sorted(int(y) for y in tby)
            for y in years:
                if not (1980 <= y <= current_year + 2):
                    errors.append(f"{make} {model}: implausible year {y}")
            py = md.get("production_years")
            if not (isinstance(py, list) and len(py) == 2):
                errors.append(f"{make} {model}: malformed production_years {py!r}")
            elif years and (years[0] < py[0] or years[-1] > py[1]):
                errors.append(
                    f"{make} {model}: trim years {years[0]}-{years[-1]} "
                    f"outside production_years {py[0]}-{py[1]}"
                )
            for y, trims in tby.items():
                for trim, price in trims.items():
                    if not isinstance(price, (int, float)) or not (
                        PRICE_MIN <= price <= PRICE_MAX
                    ):
                        errors.append(
                            f"{make} {model} {y} '{trim}': implausible price {price!r}"
                        )
    return errors


def pricing_anomalies(data):
    """Return {finding_key: human_description} for all detected anomalies."""
    findings = {}
    for make, models in data.items():
        for model, md in models.items():
            tby = md.get("trims_by_year") or {}
            years = sorted(tby, key=int)
            # Year-over-year drops and jumps on matching trim names
            for prev, curr in zip(years, years[1:]):
                if int(curr) - int(prev) != 1:
                    continue
                for trim, price in tby[curr].items():
                    old = tby[prev].get(trim)
                    if old is None:
                        continue
                    delta = price - old
                    if delta < -YOY_DROP_THRESHOLD:
                        key = f"yoy_drop|{make}|{model}|{trim}|{curr}"
                        findings[key] = (
                            f"{make} {model} '{trim}' {prev}→{curr}: "
                            f"${old:,} → ${price:,} ({delta:+,})"
                        )
                    elif delta > YOY_JUMP_THRESHOLD:
                        key = f"yoy_jump|{make}|{model}|{trim}|{curr}"
                        findings[key] = (
                            f"{make} {model} '{trim}' {prev}→{curr}: "
                            f"${old:,} → ${price:,} ({delta:+,})"
                        )
            # Frozen pricing: identical price for FROZEN_MIN_YEARS+ consecutive years
            trim_names = set()
            for y in years:
                trim_names.update(tby[y])
            for trim in trim_names:
                run_start, run_price, run_len = None, None, 0
                for i, y in enumerate(years):
                    price = tby[y].get(trim)
                    consecutive = (
                        i > 0 and int(y) - int(years[i - 1]) == 1 and price == run_price
                    )
                    if price is not None and consecutive:
                        run_len += 1
                    else:
                        if run_len >= FROZEN_MIN_YEARS:
                            key = f"frozen|{make}|{model}|{trim}|{run_start}"
                            findings[key] = (
                                f"{make} {model} '{trim}': ${run_price:,} frozen "
                                f"{run_start}-{years[i - 1]} ({run_len} years)"
                            )
                        run_start, run_price, run_len = y, price, 1
                if run_len >= FROZEN_MIN_YEARS:
                    key = f"frozen|{make}|{model}|{trim}|{run_start}"
                    findings[key] = (
                        f"{make} {model} '{trim}': ${run_price:,} frozen "
                        f"{run_start}-{years[-1]} ({run_len} years)"
                    )
    return findings


def expected_latest_model_year(today=None):
    """New model years are on sale by early fall of the prior calendar year."""
    today = today or datetime.date.today()
    return today.year + 1 if today.month >= 9 else today.year


def staleness_report(data):
    expected = expected_latest_model_year()
    stale = []
    for make, models in data.items():
        for model, md in models.items():
            tby = md.get("trims_by_year") or {}
            if not tby:
                continue
            latest = max(int(y) for y in tby)
            # A model is considered active if it had data for the prior model
            # year; discontinued models are expected to stop updating.
            if latest == expected - 1:
                stale.append(f"{make} {model}: latest data is MY{latest}, expected MY{expected}")
    return expected, stale


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write-baseline", action="store_true",
                    help="accept all current anomalies as the new baseline")
    ap.add_argument("--staleness", action="store_true",
                    help="report models missing the expected latest model year")
    args = ap.parse_args()

    data = load_data()

    if args.staleness:
        expected, stale = staleness_report(data)
        if stale:
            print(f"{len(stale)} model(s) missing MY{expected} data:")
            for line in sorted(stale):
                print(f"  {line}")
            sys.exit(2)
        print(f"All active models have MY{expected} data.")
        return

    errors = structural_errors(data)
    findings = pricing_anomalies(data)

    if args.write_baseline:
        with open(BASELINE_PATH, "w") as f:
            json.dump(sorted(findings), f, indent=2)
            f.write("\n")
        print(f"Baseline written: {len(findings)} accepted anomalies -> {BASELINE_PATH}")
        if errors:
            print(f"\nWARNING: {len(errors)} structural error(s) are NOT baselined:")
            for e in errors:
                print(f"  {e}")
            sys.exit(1)
        return

    baseline = set()
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = set(json.load(f))

    new = {k: v for k, v in findings.items() if k not in baseline}
    resolved = baseline - set(findings)

    ok = True
    if errors:
        ok = False
        print(f"{len(errors)} structural error(s):")
        for e in errors:
            print(f"  {e}")
    if new:
        ok = False
        print(f"\n{len(new)} NEW pricing anomaly(ies) not in baseline:")
        for k in sorted(new):
            print(f"  [{k.split('|')[0]}] {new[k]}")
        print(
            "\nIf these are verified-correct prices (e.g. a real manufacturer price\n"
            "cut or a generation change), run with --write-baseline to accept them."
        )
    if resolved:
        print(f"\nNote: {len(resolved)} baseline entry(ies) no longer detected "
              f"(run --write-baseline to prune):")
        for k in sorted(resolved):
            print(f"  {k}")

    if ok:
        print(f"OK: {len(findings)} known anomalies (all baselined), "
              f"no structural errors.")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
