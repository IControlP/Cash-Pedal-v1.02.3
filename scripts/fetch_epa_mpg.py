#!/usr/bin/env python3
"""Fetch official EPA ratings from fueleconomy.gov and diff them against
src/data/vehicles.json.

The MPG figures in the database were authored from knowledge, not fetched --
the environment that produced them could not reach fueleconomy.gov. This
script replaces that estimate with the authoritative source, and reports
where the two disagree.

It never writes vehicles.json. It produces three artifacts for review:

  epa_report.json      every EPA configuration found, per model, raw
  epa_diff.md          model-level disagreements, largest first
  epa_drivetrain.md    2WD vs AWD spread per model -- the input for adding
                       drivetrain-specific trim overrides

and, with --emit-patch, a draft patch script in the same shape as
fill_mpg_patch1.py that you can review and run.

Requires network access to fueleconomy.gov. If the environment's policy
blocks it every request fails with a CONNECT 403 and the script stops early
with instructions rather than writing a half-empty report.

Note the API exposes efficiency, displacement, cylinders, transmission and
drive -- but **not horsepower**. Horsepower stays hand-maintained.

Usage
-----
  python3 scripts/fetch_epa_mpg.py                      # all models
  python3 scripts/fetch_epa_mpg.py --make Toyota        # one make
  python3 scripts/fetch_epa_mpg.py --make Kia --model Niro
  python3 scripts/fetch_epa_mpg.py --emit-patch         # + draft patch script
  python3 scripts/fetch_epa_mpg.py --threshold 3        # only bigger deltas

Responses are cached under .epa-cache/ so re-runs cost no requests. Delete
that directory to force a refresh.
"""
import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "src" / "data" / "vehicles.json"
CACHE = REPO / ".epa-cache"
BASE = "https://www.fueleconomy.gov/ws/rest"

# EPA's own naming differs from ours in ways normalization can't bridge.
# Extend this when the unmatched-models report names something real.
MODEL_ALIASES = {
    ("Chevrolet", "Silverado"): "Silverado 1500",
    ("Dodge", "Ram 1500"): "Ram 1500 Pickup",
    ("Ford", "F-150"): "F150 Pickup",
    ("Ford", "F-250"): "F250",
    ("Ram", "1500"): "1500 Pickup",
    ("Ram", "2500"): "2500 Pickup",
    ("Ram", "3500"): "3500 Pickup",
    ("Mazda", "MX-5 Miata"): "MX-5",
    ("Chevrolet", "Silverado 1500"): "Silverado 1500",
    ("GMC", "Sierra 1500"): "Sierra 1500",
    ("Toyota", "GR86"): "GR 86",
    ("Subaru", "STI"): "WRX STI",
    ("Mercedes-Benz", "AMG GT"): "AMG GT",
}

# Vehicles over 8,500 lb GVWR that EPA does not rate. Absence of data for
# these is expected, not a matching failure.
UNRATED = {
    ("Ford", "F-250"),
    ("Ram", "2500"),
    ("Ram", "3500"),
    ("Ram", "ProMaster"),
}


# ── HTTP ──────────────────────────────────────────────────────────────────

class Blocked(Exception):
    """The egress policy is refusing fueleconomy.gov."""


def http_json(path, params=None, sleep=0.2, retries=3):
    url = f"{BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    key = hashlib.sha256(url.encode()).hexdigest()[:32]
    cached = CACHE / f"{key}.json"
    if cached.exists():
        return json.loads(cached.read_text())

    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "cash-pedal-vehicle-data/1.0",
    })
    last = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                payload = json.loads(r.read().decode("utf-8") or "{}")
            CACHE.mkdir(exist_ok=True)
            cached.write_text(json.dumps(payload))
            time.sleep(sleep)
            return payload
        except urllib.error.HTTPError as e:
            # The egress proxy answers 403 to a denied CONNECT. Retrying that
            # is pointless and the fix is a config change, not a backoff.
            if e.code in (403, 407):
                raise Blocked(
                    f"{url} -> HTTP {e.code}. The environment's network policy "
                    f"is blocking fueleconomy.gov.\n"
                    f"Set the cloud environment's Network access to Custom, add "
                    f"'fueleconomy.gov' and '*.fueleconomy.gov' to Allowed "
                    f"domains, keep 'Also include default list of common package "
                    f"managers' checked, then start a new session."
                ) from e
            last = e
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last = e
        time.sleep(2 ** attempt)
    raise RuntimeError(f"{url} failed after {retries} attempts: {last}")


def as_list(payload, key="menuItem"):
    """The service returns a bare object when a result set has one entry."""
    if not payload:
        return []
    items = payload.get(key, []) if isinstance(payload, dict) else payload
    if isinstance(items, dict):
        return [items]
    return items or []


# ── EPA endpoints ─────────────────────────────────────────────────────────

def epa_makes(year, **kw):
    return [m["value"] for m in as_list(http_json("/vehicle/menu/make",
                                                  {"year": year}, **kw))]


def epa_models(year, make, **kw):
    return [m["value"] for m in as_list(http_json(
        "/vehicle/menu/model", {"year": year, "make": make}, **kw))]


def epa_options(year, make, model, **kw):
    return as_list(http_json("/vehicle/menu/options",
                             {"year": year, "make": make, "model": model}, **kw))


def epa_vehicle(vid, **kw):
    return http_json(f"/vehicle/{vid}", **kw)


# ── Name matching ─────────────────────────────────────────────────────────

def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


# EPA appends a drivetrain to many model names ("Grand Cherokee 4WD").
DRIVE_SUFFIX = re.compile(
    r"\s*(2wd|4wd|awd|fwd|rwd|4x2|4x4|pickup)\s*$", re.I)


def strip_drive(name):
    prev = None
    while prev != name:
        prev = name
        name = DRIVE_SUFFIX.sub("", name).strip()
    return name


def match_models(our_model, candidates, make=None):
    """EPA model names that correspond to ours.

    Exact normalized match wins outright. Otherwise accept candidates whose
    drivetrain-stripped name equals ours, then candidates that start with
    ours -- that is what pulls "Grand Cherokee 4WD" in for "Grand Cherokee"
    without also pulling in "Grand Cherokee L".
    """
    alias = MODEL_ALIASES.get((make, our_model), our_model)
    exact = [c for c in candidates if norm(c) == norm(alias)]
    if exact:
        return exact
    # Compare drivetrain-stripped on both sides, so an alias may be written
    # either way ("F150" or "F150 Pickup") and still match "F150 Pickup 2WD".
    target = norm(strip_drive(alias))
    stripped = [c for c in candidates if norm(strip_drive(c)) == target]
    if stripped:
        return stripped
    return [c for c in candidates if norm(strip_drive(c)).startswith(target)]


# ── Record interpretation ─────────────────────────────────────────────────

def num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f <= 0 else f


def classify(rec):
    """Reduce an EPA vehicle record to the fields the database stores.

    EPA puts the *alternative* fuel's ratings in the ...A08 fields. For a
    plug-in hybrid that means comb08 is the charge-sustaining gasoline figure
    and combA08 is the electric MPGe -- exactly the pair the database's
    plugin_hybrid entries carry. For a pure EV or a hydrogen FCV there is no
    second fuel and comb08 is itself the MPGe.
    """
    atv = (rec.get("atvType") or "").strip()
    fuel1 = (rec.get("fuelType1") or "").strip()
    electric_primary = atv in ("EV", "FCV") or fuel1.startswith("Electricity")

    out = {
        "id": rec.get("id"),
        "atv_type": atv or None,
        "drive": (rec.get("drive") or "").strip() or None,
        "displ": rec.get("displ") or None,
        "cylinders": rec.get("cylinders") or None,
        "trany": (rec.get("trany") or "").strip() or None,
        "is_ev": electric_primary,
        "plugin_hybrid": atv == "Plug-in Hybrid",
        "city": None, "highway": None, "combined": None, "mpge_combined": None,
    }

    if electric_primary:
        out["mpge_combined"] = num(rec.get("comb08"))
    else:
        out["city"] = num(rec.get("city08"))
        out["highway"] = num(rec.get("highway08"))
        out["combined"] = num(rec.get("comb08"))
        if out["plugin_hybrid"]:
            out["mpge_combined"] = num(rec.get("combA08"))
    return out


def is_two_wheel(drive):
    d = (drive or "").lower()
    return "front-wheel" in d or "rear-wheel" in d or "2-wheel" in d


def suggest_base(configs, is_ev):
    """Pick the configuration the model-level figure should describe.

    The database convention is the base powertrain in the most common
    drivetrain, so: drop the electrified variants unless the model is
    electrified throughout, prefer two-wheel drive, then take the smallest
    engine. For EVs there is no displacement to sort on, so the most
    efficient configuration stands in for the base trim -- which is what it
    usually is, since base trims get the smaller wheels and a single motor.
    """
    if not configs:
        return None

    if is_ev:
        evs = [c for c in configs if c["mpge_combined"]] or configs
        return max(evs, key=lambda c: c["mpge_combined"] or 0)

    plain = [c for c in configs if not c["is_ev"] and not c["plugin_hybrid"]
             and c["atv_type"] not in ("Hybrid",)]
    pool = plain or configs
    twowd = [c for c in pool if is_two_wheel(c["drive"])] or pool

    def displ(c):
        try:
            return float(c["displ"])
        except (TypeError, ValueError):
            return 99.0

    return min(twowd, key=lambda c: (displ(c), -(c["combined"] or 0)))


# ── Reporting ─────────────────────────────────────────────────────────────

def compare(current, suggested):
    """Signed deltas between the stored block and an EPA configuration."""
    if not current or not suggested:
        return {}
    out = {}
    for field in ("city", "highway", "combined", "mpge_combined"):
        have, want = current.get(field), suggested.get(field)
        if have is not None and want is not None:
            out[field] = round(want - have, 1)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--make", help="limit to one make")
    ap.add_argument("--model", help="limit to one model (needs --make)")
    ap.add_argument("--year", type=int,
                    help="model year to query (default: each model's newest "
                         "year in the database, capped at --max-year)")
    ap.add_argument("--max-year", type=int, default=2026,
                    help="newest model year EPA is likely to have (default 2026)")
    ap.add_argument("--threshold", type=float, default=2.0,
                    help="report a model when combined MPG differs by more "
                         "than this (default 2.0)")
    ap.add_argument("--sleep", type=float, default=0.2,
                    help="seconds between uncached requests (default 0.2)")
    ap.add_argument("--emit-patch", action="store_true",
                    help="write a draft patch script for the disagreements")
    ap.add_argument("--out-dir", default=str(REPO / "epa-report"))
    args = ap.parse_args()

    db = json.loads(DATA.read_text())
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    targets = []
    for make, models in sorted(db.items()):
        if args.make and make.lower() != args.make.lower():
            continue
        for model, md in sorted(models.items()):
            if args.model and model.lower() != args.model.lower():
                continue
            years = sorted(int(y) for y in md["trims_by_year"])
            year = args.year or min(years[-1], args.max_year)
            targets.append((make, model, md, year))

    if not targets:
        print("No models matched the filters.", file=sys.stderr)
        return 1

    print(f"Querying EPA for {len(targets)} model(s)…\n")

    report, diffs, drivetrain, unmatched = {}, [], [], []
    make_cache, model_cache = {}, {}

    try:
        for i, (make, model, md, year) in enumerate(targets, 1):
            label = f"{make} {model} (MY{year})"
            print(f"[{i}/{len(targets)}] {label}", flush=True)

            if year not in make_cache:
                make_cache[year] = epa_makes(year, sleep=args.sleep)
            epa_make = next(
                (m for m in make_cache[year] if norm(m) == norm(make)), None)
            if not epa_make:
                unmatched.append(f"{label}: make not in EPA's MY{year} list")
                continue

            ck = (year, epa_make)
            if ck not in model_cache:
                model_cache[ck] = epa_models(year, epa_make, sleep=args.sleep)
            names = match_models(model, model_cache[ck], make)
            if not names:
                if (make, model) not in UNRATED:
                    unmatched.append(f"{label}: no EPA model matched")
                continue

            configs = []
            for name in names:
                for opt in epa_options(year, epa_make, name, sleep=args.sleep):
                    rec = epa_vehicle(opt["value"], sleep=args.sleep)
                    c = classify(rec)
                    c["epa_model"] = name
                    c["option"] = opt.get("text")
                    configs.append(c)
            if not configs:
                unmatched.append(f"{label}: EPA listed no configurations")
                continue

            base = suggest_base(configs, md["is_ev"])
            delta = compare(md.get("mpg") or {}, base)
            report[label] = {
                "make": make, "model": model, "year": year,
                "epa_models": names,
                "current": md.get("mpg"),
                "suggested": base,
                "delta": delta,
                "configs": configs,
            }

            key = "mpge_combined" if md["is_ev"] else "combined"
            if abs(delta.get(key, 0)) > args.threshold:
                diffs.append((abs(delta[key]), label, md.get("mpg"), base, delta))

            # Isolate the drivetrain penalty: compare only configurations
            # sharing the base's powertrain. Comparing a gas FWD against a
            # hybrid AWD measures the hybrid system, not the driven wheels.
            peers = [c for c in configs
                     if c["atv_type"] == base["atv_type"]
                     and c["displ"] == base["displ"] and c[key]]
            twowd = [c for c in peers if is_two_wheel(c["drive"])]
            allwd = [c for c in peers
                     if c["drive"] and not is_two_wheel(c["drive"])]
            if twowd and allwd:
                hi = max(c[key] for c in twowd)
                lo = max(c[key] for c in allwd)
                if abs(hi - lo) >= 1:
                    drivetrain.append((label, hi, lo, round(lo - hi, 1)))
    except Blocked as e:
        print(f"\nBLOCKED: {e}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nInterrupted — writing what was collected so far.\n")

    (out_dir / "epa_report.json").write_text(json.dumps(report, indent=2) + "\n")

    diffs.sort(reverse=True)
    lines = ["# EPA vs. database — model-level disagreements", "",
             f"{len(diffs)} of {len(report)} models differ by more than "
             f"{args.threshold} MPG/MPGe combined.", ""]
    for _, label, cur, sug, delta in diffs:
        lines += [f"## {label}",
                  f"- stored:    `{json.dumps(cur)}`",
                  f"- EPA base:  {sug.get('option')} ({sug.get('drive')})",
                  f"- EPA says:  city {sug.get('city')} / hwy {sug.get('highway')} "
                  f"/ comb {sug.get('combined')} / MPGe {sug.get('mpge_combined')}",
                  f"- delta:     `{json.dumps(delta)}`", ""]
    (out_dir / "epa_diff.md").write_text("\n".join(lines))

    dlines = ["# Drivetrain spread (2WD vs AWD/4WD)", "",
              "Input for adding drivetrain-specific `trim_specs` overrides.",
              "A negative delta is the penalty AWD pays against the stored",
              "two-wheel-drive figure.", "",
              "| Model | best 2WD | best AWD/4WD | delta |",
              "|---|---:|---:|---:|"]
    for label, hi, lo, d in sorted(drivetrain, key=lambda r: r[3]):
        dlines.append(f"| {label} | {hi:g} | {lo:g} | {d:+g} |")
    (out_dir / "epa_drivetrain.md").write_text("\n".join(dlines) + "\n")

    if unmatched:
        (out_dir / "epa_unmatched.txt").write_text("\n".join(unmatched) + "\n")

    if args.emit_patch and diffs:
        emit_patch(out_dir / "fill_mpg_patch4_draft.py", diffs)

    print(f"\n{len(report)} models queried, {len(diffs)} past the threshold, "
          f"{len(drivetrain)} with a drivetrain spread, "
          f"{len(unmatched)} unmatched.")
    print(f"Artifacts in {out_dir}/")
    if unmatched:
        print(f"  Review epa_unmatched.txt — add real misses to MODEL_ALIASES.")
    return 0


def emit_patch(path, diffs):
    """Write a draft patch in the shape of fill_mpg_patch1.py, for review."""
    gas, ev = [], []
    for _, label, _, sug, _ in diffs:
        make, model = label.rsplit(" (MY", 1)[0].split(" ", 1)
        note = f"  # EPA: {sug.get('option')} ({sug.get('drive')})"
        if sug.get("mpge_combined") and not sug.get("combined"):
            ev.append(f'    ("{make}", "{model}"): {sug["mpge_combined"]:g},{note}')
        elif sug.get("combined"):
            gas.append(
                f'    ("{make}", "{model}"): '
                f'({sug["city"]:g}, {sug["highway"]:g}, {sug["combined"]:g}),{note}')

    path.write_text(f'''#!/usr/bin/env python3
"""DRAFT — generated by scripts/fetch_epa_mpg.py. Review before running.

Replaces hand-authored MPG with official EPA ratings for the models where the
two disagreed. Each entry notes the EPA configuration it came from; check that
configuration is the base powertrain the database convention calls for before
accepting it, and delete any row where it is not.

Move this into scripts/ as fill_mpg_patch4.py once reviewed.
"""
GAS = {{
{chr(10).join(gas)}
}}

EV = {{
{chr(10).join(ev)}
}}

# Apply with the same fix()/main() structure as scripts/fill_mpg_patch1.py.
''')
    print(f"  Draft patch: {path}")


if __name__ == "__main__":
    sys.exit(main())
