#!/usr/bin/env python3
"""EPA fuel-economy backfill helper for src/data/vehicles.json.

Only 39 of the 280 models in the vehicle database carry real `mpg` data; the
rest are `"mpg": null` and fall back to the hardcoded 28 MPG / 100 MPGe
defaults in `computeAnnualFuel` (src/utils/vehicleCosts.js). This script pulls
official numbers from the EPA's fueleconomy.gov web service and reports what it
would change, so the gaps can be filled from the authoritative source instead
of by hand.

It never writes to vehicles.json on its own. `--emit-patch` produces a draft
JSON patch for human review; `--apply` installs a reviewed draft.

How a model is resolved
-----------------------
EPA model names are variant-level ("RAV4 Hybrid AWD", "F150 Pickup 4WD"), while
vehicles.json keys are marketing names ("RAV4", "F-150"), so each of our models
maps to a *set* of EPA variants:

  1. Walk model years backwards from the model's last production year until a
     year has matching EPA variants (up to --year-window years).
  2. Match on normalized token prefix ("RAV4" -> "RAV4 Hybrid AWD") plus a
     squashed-string prefix so spacing/hyphen differences still match
     ("GR86" -> "GR 86", "F-150" -> "F150 Pickup 2WD").
  3. When several of our models match one EPA variant, the longest name wins,
     so "Q5" does not swallow "Q5 Sportback" and "Mustang" does not swallow
     "Mustang Mach-E".
  4. Classify each variant by fuel type and keep only the ones comparable to
     our entry: gas/hybrid/diesel for a normal model, electric/hydrogen for an
     `is_ev` model. This is what stops the F-150 from absorbing the F-150
     Lightning's MPGe.
  5. Report the median across the kept variants, plus the full spread so a
     reviewer can see how much the variants disagree.

Verdicts
--------
  fill      vehicles.json has no data and EPA does -> safe proposal
  agrees    existing values already match EPA (within --tolerance)
  differs   existing values disagree with EPA -> proposed only with
            --include-differs, since committed data may be deliberate
  no-match  no EPA variant matched -- a gap in MODEL_ALIASES worth chasing
  no-data   variants matched but none of a comparable fuel type
  unrated   EPA has no rating by design (F1 cars, >8,500 lb GVWR trucks), so an
            empty result is correct; see UNRATED_MODELS

Usage
-----
  python3 scripts/fetch_epa_mpg.py --make Toyota --model RAV4   # single-model probe
  python3 scripts/fetch_epa_mpg.py                             # full run, report only
  python3 scripts/fetch_epa_mpg.py --emit-patch                # full run + draft patch
  python3 scripts/fetch_epa_mpg.py --apply scripts/epa_mpg_patch.json

Responses are cached under --cache-dir (default .epa-cache/, gitignored) so
reruns cost no network. A full cold run is ~3,000 requests.

Exit codes: 0 ok / 1 usage or apply error / 2 network failures during the run.
"""
import argparse
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(REPO_ROOT, "src", "data", "vehicles.json")
DEFAULT_PATCH_PATH = os.path.join(REPO_ROOT, "scripts", "epa_mpg_patch.json")
DEFAULT_CACHE_DIR = os.path.join(REPO_ROOT, ".epa-cache")

EPA_BASE = "https://www.fueleconomy.gov/ws/rest"
USER_AGENT = "cash-pedal-epa-backfill/1.0 (+https://cashpedal.io)"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 4

# Model years EPA data is plausible for. fueleconomy.gov starts at 1984.
EPA_FIRST_YEAR = 1984

# Fuel classes we bucket EPA's fuelType1/atvType into.
CLASS_GAS = "gas"          # regular/premium/diesel, incl. conventional hybrids
CLASS_PHEV = "phev"        # blended MPG, not comparable to either column
CLASS_MPGE = "mpge"        # battery electric and hydrogen fuel cell

GAS_CLASSES = {CLASS_GAS}
MPGE_CLASSES = {CLASS_MPGE}

# combined-MPG spread across variants above which a reviewer should look
WIDE_SPREAD_MPG = 8
WIDE_SPREAD_MPGE = 25

# Models EPA names so differently that prefix matching cannot reach them. Values
# are EPA name prefixes, matched loosely (punctuation/spacing ignored, no token
# boundary required) because the list is curated rather than inferred. Keep the
# generic-name guard in mind: an alias here bypasses the "A4 must not match A45"
# boundary check, so aliases must be specific enough to only hit the intended
# variants.
MODEL_ALIASES = {
    # EPA drops the tonnage from GM's light-duty pickups.
    ("Chevrolet", "Silverado 1500"): ["Silverado 2WD", "Silverado 4WD",
                                      "Silverado Mud Terrain"],
    ("GMC", "Sierra 1500"): ["Sierra 2WD", "Sierra 4WD", "Sierra Mud Terrain"],
    # EPA lists BMW by engine badge, not series. Base sedan stands in for the line.
    ("BMW", "3 Series"): ["330i"],
    # EPA drops the "Mazda" brand prefix ("3 4-Door 2WD") and the "Miata" suffix.
    ("Mazda", "Mazda3"): ["3 4-Door", "3 5-Door"],
    ("Mazda", "Mazda6"): ["6 4-Door", "6 "],
    ("Mazda", "MX-5 Miata"): ["MX-5"],
    # EPA lists Mercedes by engine badge ("C300"), not by class.
    ("Mercedes-Benz", "A-Class"): ["A220", "A 220"],
    ("Mercedes-Benz", "C-Class"): ["C300", "C 300"],
    ("Mercedes-Benz", "E-Class"): ["E350", "E 350", "E450", "E 450"],
    ("Mercedes-Benz", "S-Class"): ["S500", "S 500", "S580", "S 580"],
    ("Mercedes-Benz", "G-Class"): ["G550", "G 550"],
    ("Mercedes-Benz", "GLC"): ["GLC300", "GLC 300"],
    ("Mercedes-Benz", "GLS"): ["GLS450", "GLS 450"],
    ("Mercedes-Benz", "CLA"): ["CLA250", "CLA 250"],
    # EPA prefixes every MINI with its Cooper trim.
    ("Mini", "Clubman"): ["Cooper Clubman", "Cooper S Clubman",
                          "John Cooper Works Clubman"],
    # EPA never listed a bare "STI"; it is a WRX variant.
    ("Subaru", "STI"): ["WRX STI"],
    # EPA lists the V90 only as the Cross Country ("V90CC B6 AWD").
    ("Volvo", "V90"): ["V90"],
}

# Models EPA legitimately has no rating for, so an empty result is correct and
# not a matcher failure worth chasing.
UNRATED_MODELS = {
    ("Ferrari", "SF-23"): "Formula 1 race car, never EPA rated",
    ("Ferrari", "SF-24"): "Formula 1 race car, never EPA rated",
    ("Ferrari", "SF21"): "Formula 1 race car, never EPA rated",
    ("Ford", "F-250"): "over 8,500 lb GVWR; EPA does not rate heavy duty",
    ("Ram", "2500"): "over 8,500 lb GVWR; EPA does not rate heavy duty",
    ("Ram", "3500"): "over 8,500 lb GVWR; EPA does not rate heavy duty",
    ("Dodge", "Ram 1500"): "Ram became its own make in 2011; EPA lists it there",
}


# ---------------------------------------------------------------- HTTP + cache

class ApiError(Exception):
    """A fueleconomy.gov request failed after all retries."""


class EpaClient:
    """Cached, rate-limited fueleconomy.gov client."""

    def __init__(self, cache_dir, delay=0.15, refresh=False, verbose=False):
        self.cache_dir = cache_dir
        self.delay = delay
        self.refresh = refresh
        self.verbose = verbose
        self.requests = 0
        self.cache_hits = 0
        self.failures = []
        os.makedirs(cache_dir, exist_ok=True)

    def _cache_path(self, key):
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", key)[:180]
        return os.path.join(self.cache_dir, safe + ".json")

    def get(self, path, params=None):
        """GET a fueleconomy.gov endpoint, returning parsed JSON (or None)."""
        query = urllib.parse.urlencode(params or {})
        key = path.strip("/") + ("?" + query if query else "")
        cache_path = self._cache_path(key)

        if not self.refresh and os.path.exists(cache_path):
            self.cache_hits += 1
            with open(cache_path) as f:
                return json.load(f)

        url = f"{EPA_BASE}/{path.lstrip('/')}" + (f"?{query}" if query else "")
        payload = self._fetch(url, key)

        with open(cache_path, "w") as f:
            json.dump(payload, f)
        return payload

    def _fetch(self, url, key):
        last_error = None
        for attempt in range(MAX_RETRIES):
            if self.delay:
                time.sleep(self.delay)
            request = urllib.request.Request(
                url, headers={"Accept": "application/json", "User-Agent": USER_AGENT}
            )
            try:
                self.requests += 1
                with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                    body = response.read().decode("utf-8", "replace").strip()
                if not body:
                    return None
                return json.loads(body)
            except urllib.error.HTTPError as exc:
                # 4xx means the query itself is wrong; retrying will not help.
                if exc.code < 500:
                    raise ApiError(f"{key}: HTTP {exc.code}") from exc
                last_error = f"HTTP {exc.code}"
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
                last_error = str(exc) or exc.__class__.__name__

            backoff = 2 ** attempt
            if self.verbose:
                print(f"  retry {attempt + 1}/{MAX_RETRIES} in {backoff}s ({last_error}): {key}",
                      file=sys.stderr)
            time.sleep(backoff)

        self.failures.append(f"{key}: {last_error}")
        raise ApiError(f"{key}: {last_error}")


def menu_items(payload):
    """Normalize a menu response: EPA returns a bare object for single results."""
    if not payload:
        return []
    items = payload.get("menuItem")
    if items is None:
        return []
    if isinstance(items, dict):
        return [items]
    return list(items)


# ------------------------------------------------------------------- matching

def normalize(name):
    """Lowercase, drop punctuation, collapse whitespace."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", name.lower())).strip()


def squash(name):
    """Alphanumerics only, so 'GR86' == 'GR 86' and 'F-150' == 'F150'."""
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def variant_matches(model_name, epa_name):
    """True when epa_name is a variant of model_name.

    Two prefix tests: token-wise (so "Q5" does not match "Q50"), and squashed
    (so spacing and hyphen differences still line up).
    """
    model_tokens = normalize(model_name).split()
    epa_tokens = normalize(epa_name).split()
    if model_tokens and epa_tokens[:len(model_tokens)] == model_tokens:
        return True

    model_squashed, epa_squashed = squash(model_name), squash(epa_name)
    if not model_squashed or not epa_squashed.startswith(model_squashed):
        return False
    # Require the match to end on a token boundary in the EPA name so "A4"
    # cannot claim "A45"; the next character must start a new word.
    consumed, remainder = 0, None
    for token in epa_tokens:
        consumed += len(squash(token))
        if consumed >= len(model_squashed):
            remainder = consumed == len(model_squashed)
            break
    return bool(remainder)


def alias_matches(alias, epa_name):
    """Loose prefix test for curated aliases: no token-boundary requirement."""
    return squash(epa_name).startswith(squash(alias))


def assign_variants(make, our_models, epa_names):
    """Map each of our model names to the EPA variants it owns.

    Aliased models resolve directly from MODEL_ALIASES and sit out the prefix
    arbitration. Everything else competes, and an EPA variant goes to the
    longest of our names that matches it, so "Q5 Sportback S line quattro"
    lands on "Q5 Sportback" rather than "Q5".
    """
    assigned = {name: [] for name in our_models}
    aliased = {name for name in our_models if (make, name) in MODEL_ALIASES}

    for name in aliased:
        aliases = MODEL_ALIASES[(make, name)]
        assigned[name] = [
            epa_name for epa_name in epa_names
            if any(alias_matches(alias, epa_name) for alias in aliases)
        ]

    contenders = [name for name in our_models if name not in aliased]
    for epa_name in epa_names:
        candidates = [name for name in contenders if variant_matches(name, epa_name)]
        if not candidates:
            continue
        winner = max(candidates, key=lambda name: (len(squash(name)), name))
        assigned[winner].append(epa_name)
    return assigned


# ------------------------------------------------------- EPA record inspection

def fuel_class(record):
    """Bucket an EPA vehicle record by what its MPG columns actually mean."""
    fuel1 = (record.get("fuelType1") or "").lower()
    fuel2 = (record.get("fuelType2") or "").lower()
    atv = (record.get("atvType") or "").lower()

    if "plug-in hybrid" in atv or ("electricity" in fuel2 and fuel1):
        return CLASS_PHEV
    if "electricity" in fuel1 or "hydrogen" in fuel1 or atv in {"ev", "fcv"}:
        return CLASS_MPGE
    return CLASS_GAS


def mpg_triple(record):
    """(city, highway, combined) as floats, or None when EPA has no numbers."""
    try:
        values = (
            float(record.get("city08") or 0),
            float(record.get("highway08") or 0),
            float(record.get("comb08") or 0),
        )
    except (TypeError, ValueError):
        return None
    return values if all(v > 0 for v in values) else None


def variant_label(record, epa_name):
    """Human-readable variant description for the report."""
    bits = [epa_name]
    engine = " ".join(str(record.get(k) or "").strip() for k in ("displ", "cylinders"))
    if engine.strip():
        bits.append(f"{record.get('displ')}L/{record.get('cylinders')}cyl")
    if record.get("atvType"):
        bits.append(str(record["atvType"]))
    return " | ".join(bits)


# ------------------------------------------------------------------ resolution

def candidate_years(model_data, year_window, forced_year=None, today_year=None):
    """Model years to try, newest first."""
    if forced_year:
        return [forced_year]
    today_year = today_year or time.localtime().tm_year
    production = model_data.get("production_years") or []
    start = production[0] if production else EPA_FIRST_YEAR
    end = production[1] if len(production) > 1 else today_year
    newest = min(int(end), today_year + 1)
    oldest = max(int(start), EPA_FIRST_YEAR, newest - year_window + 1)
    return list(range(newest, oldest - 1, -1))


def collect_variants(client, year, make, epa_names):
    """Fetch every EPA vehicle record behind a set of variant names."""
    records = []
    for epa_name in epa_names:
        options = client.get(
            "vehicle/menu/options", {"year": year, "make": make, "model": epa_name}
        )
        for item in menu_items(options):
            vehicle_id = item.get("value")
            if not vehicle_id:
                continue
            record = client.get(f"vehicle/{vehicle_id}")
            if record:
                records.append((epa_name, record))
    return records


def summarize(records, want_mpge):
    """Median city/highway/combined (or MPGe) across the comparable variants."""
    wanted = MPGE_CLASSES if want_mpge else GAS_CLASSES
    rows = []
    for epa_name, record in records:
        if fuel_class(record) not in wanted:
            continue
        triple = mpg_triple(record)
        if triple:
            rows.append((variant_label(record, epa_name), triple))
    if not rows:
        return None

    combined = [r[1][2] for r in rows]
    if want_mpge:
        proposal = {"mpge_combined": round(statistics.median(combined))}
    else:
        proposal = {
            "city": round(statistics.median(r[1][0] for r in rows)),
            "highway": round(statistics.median(r[1][1] for r in rows)),
            "combined": round(statistics.median(combined)),
        }
    spread = max(combined) - min(combined)
    threshold = WIDE_SPREAD_MPGE if want_mpge else WIDE_SPREAD_MPG
    return {
        "proposal": proposal,
        "variants": rows,
        "spread": spread,
        "wide": spread > threshold,
    }


def compare(existing, proposal, tolerance):
    """Verdict for a proposal against what vehicles.json already holds."""
    if not existing:
        return "fill"
    if set(existing) != set(proposal):
        return "differs"
    if all(abs(float(existing[k]) - proposal[k]) <= tolerance for k in proposal):
        return "agrees"
    return "differs"


def resolve_model(client, make, model, model_data, epa_models_by_year, args):
    """Resolve one vehicles.json model against EPA data."""
    want_mpge = bool(model_data.get("is_ev"))
    unrated_reason = UNRATED_MODELS.get((make, model))
    result = {
        "make": make,
        "model": model,
        "is_ev": want_mpge,
        "existing": model_data.get("mpg"),
        "note": unrated_reason,
        "verdict": "unrated" if unrated_reason else "no-match",
        "year": None,
        "epa_variants": [],
        "proposal": None,
        "spread": None,
        "wide": False,
        "detail": [],
    }

    if unrated_reason:
        return result

    years = candidate_years(model_data, args.year_window, args.year)
    for year in years:
        epa_names = epa_models_by_year.get(year, {}).get(model, [])
        if not epa_names:
            continue
        result["year"] = year
        result["epa_variants"] = epa_names
        records = collect_variants(client, year, make, epa_names)
        summary = summarize(records, want_mpge)
        if not summary:
            result["verdict"] = "no-data"
            continue
        result.update(
            proposal=summary["proposal"],
            spread=summary["spread"],
            wide=summary["wide"],
            detail=summary["variants"],
            verdict=compare(model_data.get("mpg"), summary["proposal"], args.tolerance),
        )
        return result
    return result


def build_year_index(client, make, our_models, years):
    """For each year, map our model names -> owned EPA variant names."""
    index = {}
    for year in years:
        payload = client.get("vehicle/menu/model", {"year": year, "make": make})
        epa_names = [item["text"] for item in menu_items(payload) if item.get("text")]
        if epa_names:
            index[year] = assign_variants(make, our_models, epa_names)
    return index


# --------------------------------------------------------------------- output

def format_mpg(values):
    if not values:
        return "-"
    if "mpge_combined" in values:
        return f"{values['mpge_combined']} MPGe"
    return f"{values['city']}/{values['highway']}/{values['combined']}"


def print_report(results, verbose):
    order = {"fill": 0, "differs": 1, "agrees": 2, "no-data": 3, "no-match": 4,
             "unrated": 5}
    for result in sorted(results, key=lambda r: (order.get(r["verdict"], 9),
                                                r["make"], r["model"])):
        flags = " [WIDE SPREAD]" if result["wide"] else ""
        if result.get("note"):
            flags += f" ({result['note']})"
        year = result["year"] or "-"
        print(f"{result['verdict']:9} {result['make']:14} {result['model']:22} "
              f"{year!s:6} current={format_mpg(result['existing']):16} "
              f"epa={format_mpg(result['proposal']):16}{flags}")
        if verbose and result["detail"]:
            for label, (city, highway, combined) in result["detail"]:
                print(f"              {city:5.0f} {highway:5.0f} {combined:5.0f}   {label}")
        elif verbose and result["epa_variants"]:
            print(f"              matched EPA variants: {', '.join(result['epa_variants'])}")


def print_summary(results, client):
    counts = {}
    for result in results:
        counts[result["verdict"]] = counts.get(result["verdict"], 0) + 1
    print("\n--- summary ---")
    for verdict in ("fill", "differs", "agrees", "no-data", "no-match", "unrated"):
        if verdict in counts:
            print(f"  {verdict:9} {counts[verdict]}")
    wide = sum(1 for r in results if r["wide"])
    if wide:
        print(f"  wide spread across variants (review): {wide}")
    print(f"  requests={client.requests} cache_hits={client.cache_hits} "
          f"failures={len(client.failures)}")


def build_patch(results, include_differs):
    wanted = {"fill", "differs"} if include_differs else {"fill"}
    changes, notes = {}, []
    for result in sorted(results, key=lambda r: (r["make"], r["model"])):
        if result["verdict"] not in wanted or not result["proposal"]:
            continue
        changes.setdefault(result["make"], {})[result["model"]] = result["proposal"]
        notes.append({
            "make": result["make"],
            "model": result["model"],
            "verdict": result["verdict"],
            "epa_year": result["year"],
            "epa_variants": result["epa_variants"],
            "existing": result["existing"],
            "proposed": result["proposal"],
            "combined_spread": result["spread"],
            "needs_review": bool(result["wide"] or result["verdict"] == "differs"),
        })
    return {
        "_comment": "Draft EPA MPG patch produced by scripts/fetch_epa_mpg.py. "
                    "Review notes[] (especially needs_review) before applying with --apply.",
        "source": "https://www.fueleconomy.gov/ws/rest",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "changes": changes,
        "notes": notes,
    }


def apply_patch(patch_path):
    """Install a reviewed draft patch into vehicles.json."""
    with open(patch_path) as f:
        patch = json.load(f)
    changes = patch.get("changes") or {}
    if not changes:
        print(f"{patch_path}: no changes to apply", file=sys.stderr)
        return 1

    with open(DATA_PATH) as f:
        data = json.load(f)

    applied, skipped = 0, []
    for make, models in changes.items():
        for model, mpg in models.items():
            if make not in data or model not in data[make]:
                skipped.append(f"{make} {model} (not in vehicles.json)")
                continue
            data[make][model]["mpg"] = mpg
            applied += 1

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"applied {applied} mpg updates to {os.path.relpath(DATA_PATH, REPO_ROOT)}")
    for note in skipped:
        print(f"  skipped {note}", file=sys.stderr)
    print("Now run: python3 scripts/validate_vehicle_data.py")
    return 0


# ------------------------------------------------------------------------ main

def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--make", help="limit to one make (exact vehicles.json key)")
    parser.add_argument("--model", help="limit to one model (requires --make)")
    parser.add_argument("--year", type=int, help="force a single EPA model year")
    parser.add_argument("--year-window", type=int, default=5,
                        help="model years to search backwards (default 5)")
    parser.add_argument("--tolerance", type=float, default=1.0,
                        help="MPG delta treated as agreement (default 1)")
    parser.add_argument("--emit-patch", action="store_true",
                        help="write a draft patch of proposed mpg values")
    parser.add_argument("--patch-path", default=DEFAULT_PATCH_PATH,
                        help=f"draft patch destination (default {DEFAULT_PATCH_PATH})")
    parser.add_argument("--include-differs", action="store_true",
                        help="also patch models whose committed values disagree with EPA")
    parser.add_argument("--apply", metavar="PATCH",
                        help="apply a reviewed draft patch to vehicles.json and exit")
    parser.add_argument("--cache-dir", default=DEFAULT_CACHE_DIR,
                        help=f"response cache (default {DEFAULT_CACHE_DIR})")
    parser.add_argument("--refresh", action="store_true", help="ignore cached responses")
    parser.add_argument("--delay", type=float, default=0.15,
                        help="seconds between network requests (default 0.15)")
    parser.add_argument("--limit", type=int, help="stop after N models (smoke testing)")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="show per-variant EPA numbers")
    args = parser.parse_args()

    if args.apply:
        return apply_patch(args.apply)
    if args.model and not args.make:
        parser.error("--model requires --make")

    with open(DATA_PATH) as f:
        data = json.load(f)

    if args.make:
        if args.make not in data:
            parser.error(f"unknown make {args.make!r}; expected one of: "
                         f"{', '.join(sorted(data))}")
        if args.model and args.model not in data[args.make]:
            parser.error(f"unknown model {args.model!r} for {args.make}; expected one of: "
                         f"{', '.join(sorted(data[args.make]))}")

    makes = [args.make] if args.make else sorted(data)
    client = EpaClient(args.cache_dir, delay=args.delay, refresh=args.refresh,
                       verbose=args.verbose)
    results = []

    try:
        for make in makes:
            our_models = sorted(data[make])
            targets = [args.model] if args.model else our_models
            # Index every year any target model could need, once per make.
            years = sorted({
                year
                for model in targets
                for year in candidate_years(data[make][model], args.year_window, args.year)
            }, reverse=True)
            print(f"[{make}] {len(targets)} model(s), EPA years "
                  f"{years[-1]}-{years[0]}", file=sys.stderr)
            epa_models_by_year = build_year_index(client, make, our_models, years)

            for model in targets:
                results.append(
                    resolve_model(client, make, model, data[make][model],
                                  epa_models_by_year, args)
                )
                if args.limit and len(results) >= args.limit:
                    raise StopIteration
    except StopIteration:
        pass
    except ApiError as exc:
        print(f"\nAborted: {exc}", file=sys.stderr)
        if results:
            print_report(results, args.verbose)
            print_summary(results, client)
        return 2
    except KeyboardInterrupt:
        print("\nInterrupted; reporting what was resolved so far.", file=sys.stderr)

    print_report(results, args.verbose or bool(args.model))
    print_summary(results, client)

    if args.emit_patch:
        patch = build_patch(results, args.include_differs)
        with open(args.patch_path, "w") as f:
            json.dump(patch, f, indent=2, ensure_ascii=False)
            f.write("\n")
        review = sum(1 for n in patch["notes"] if n["needs_review"])
        print(f"\nwrote {os.path.relpath(args.patch_path, REPO_ROOT)}: "
              f"{len(patch['notes'])} proposed change(s), {review} flagged for review")
        print("Review it, then: python3 scripts/fetch_epa_mpg.py --apply "
              f"{os.path.relpath(args.patch_path, REPO_ROOT)}")

    return 2 if client.failures else 0


if __name__ == "__main__":
    sys.exit(main())
