# Vehicle Pricing Data Rebuild Plan

## Problem

`src/data/vehicles.json` holds **11,083** trim-year price cells. An audit of
the file (see `tools/pricing/`) found that the price *magnitudes* are largely
**interpolated, not sourced**: 710 trim price-series across 147 of 254 models
contain a multi-year run of identical year-over-year increases — some a perfect
straight line for 11 years, which is impossible for real MSRPs.

Spot-fixing individual cells by hand does **not** work: free price sources
(KBB / Edmunds / Hagerty / manufacturer) disagree by **$1,000–$3,000 on the
same car** (mostly inconsistent destination-fee handling), block automated
fetching, and partial edits create *inversions* (a corrected newer year ending
up cheaper than an untouched older year). The only way to get prices to a
consistent, accurate standard is a **single authoritative dataset applied in
one pass**.

By contrast, the file's **trim-existence data is mostly correct** — most
discontinuation years are right. A handful of phantom trims have already been
fixed manually (Mustang, Kia Stinger, Ford Edge); the rest can be validated
in bulk against NHTSA vPIC (free) — see step 1.

## Convention (decided)

**Base MSRP, excluding destination/delivery.** Used for both new pricing and
as the baseline for used valuations. Every corrected value must follow this.

## Data sources

| Layer | Source | Cost | Gives us |
|---|---|---|---|
| Trim/year existence + specs | **NHTSA vPIC API** | Free (gov) | Which make/model/year/trims really exist; catches phantom & missing entries. **No MSRP.** |
| Base MSRP | **Licensed Year/Make/Model/Trim dataset** — e.g. Database Atlas or Teoalida (advertise a "Base MSRP" column at ~100% coverage), delivered as CSV/SQL | One-time license | The authoritative price for every cell |
| (Alt MSRP) | MarketCheck / VinAudit / CarAPI per-call APIs | Subscription | Same, via API instead of bulk file |

**Recommendation:** buy the **bulk CSV** (one-time, covers historical years and
trims, no per-call limits) over a metered API. The bulk file also sidesteps
this environment's network policy, which currently blocks outbound API calls
(vPIC included) — a CSV is processed fully offline.

## Pipeline (scripts in `tools/pricing/`)

1. **Extract keys** — `extract_keys.py` → `vehicle_price_keys.csv`
   The canonical `(make, model, year, trim, current_price)` list (11,083 rows).
   This is both the join key and the exact coverage list to hand a vendor.
   *(Built and runnable now.)*

2. **Validate existence (free)** — query vPIC `GetModelsForMakeYear` for every
   make/year, diff against our models to flag remaining phantom/missing
   model-years across all 36 makes at once (instead of manual spot-checks).
   *Requires the vPIC domain to be allowlisted in the environment network
   policy, or a one-time offline vPIC dump.*

3. **Acquire MSRP data** — license the dataset; drop the CSV in as
   `make, model, year, trim, base_msrp` (base = excl. destination). Normalize
   the source's price to base-excl-destination if it includes delivery.

4. **Match & dry-run** — `apply_msrp.py msrp.csv`
   Normalizes trim names and joins by `(make, model, year, trim)`. Produces:
   - `msrp_apply_report.csv` — every cell's old → new → delta (review here, not
     in the raw git diff).
   - `msrp_unmatched.csv` — cells the dataset couldn't fill (trim-name
     mismatches / coverage gaps), for an override map or manual handling.
   Trim-name mismatches are resolved with an overrides file
   (`--overrides map.csv`: `our_make,our_model,our_trim,src_trim`).

5. **Apply** — `apply_msrp.py msrp.csv --write`
   Updates `vehicles.json` in place (preserves key order), re-validates JSON,
   and flags any post-apply >10% year-over-year price drop (inversion check).

6. **Verify & commit** — confirm known anchors already validated by hand
   (911 Turbo S 2021 = $203,500; Corvette E-Ray 2024 = $104,295; Land Cruiser
   2024 1958 = $55,950), eyeball the report per make, then commit in
   reviewable per-make batches.

## What's blocking / who does what

- **You:** choose + license an MSRP source; provide the CSV (or an API key +
  allowlist the domain). Decide bulk-CSV vs API.
- **Me:** all scripting is built/ready (`extract_keys.py`, `apply_msrp.py`).
  On receiving the CSV I run the dry-run, build the trim-name override map for
  unmatched rows, apply, validate, and commit in batches. I can also run the
  free vPIC existence-validation once the domain is allowlisted.

## Risks

- **Trim-name matching** (our names vs the dataset's) is the main effort;
  mitigated by the normalizer + overrides file + the unmatched report.
- **Coverage of special editions / older years** may be partial; unmatched
  cells keep their current value and are flagged, never silently wrong.
- **Destination convention** in the source must be verified and normalized to
  base-excl-destination before applying.
