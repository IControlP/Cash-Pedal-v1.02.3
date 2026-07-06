# Vehicle Database Maintenance

`src/data/vehicles.json` is a static database of 36 makes / 280 models with
MSRP by trim and model year (2015–present). It powers the TCO calculator,
comparisons, and salary calculator. Because it is static JSON with no upstream
feed, it goes stale and accumulates errors unless actively maintained. This
document describes the tooling and process that keep it current.

## Automated guardrails

### 1. CI validation on every change (`.github/workflows/vehicle-data-validation.yml`)

Any PR touching `vehicles.json` runs `scripts/validate_vehicle_data.py`, which
enforces:

- **Structural checks** — sane prices ($5k–$10M), plausible years,
  `production_years` consistent with trim years.
- **Pricing anomaly detection** — the heuristics developed during the 2026
  full-database audit (Patches 1–15):
  - year-over-year **drop** > $1,500 for the same trim
  - year-over-year **jump** > $5,000 for the same trim
  - price **frozen** for 3+ consecutive years

Known-legitimate anomalies (Tesla/Lucid price cuts, generation-change
restructures, deliberate frozen pricing like Fiat and late-cycle Acura) are
recorded in `scripts/msrp_anomaly_baseline.json`. CI fails only on **new**
anomalies.

When CI flags a change you have verified as correct (a real manufacturer price
cut, a gen change adding cheaper trims), accept it into the baseline:

```bash
python3 scripts/validate_vehicle_data.py --write-baseline
```

and commit the updated baseline alongside the data change. Never baseline an
anomaly you haven't verified against a source.

### 2. Monthly staleness check (`.github/workflows/vehicle-data-staleness.yml`)

On the 1st of each month a scheduled workflow runs:

```bash
python3 scripts/validate_vehicle_data.py --staleness
```

It computes the expected latest model year (calendar year, rolling to the
next year each September when new model years reach dealers) and flags any
model whose newest data is exactly one year behind. It opens/updates a GitHub
issue labeled `vehicle-data` listing them. For each flagged model, either add
the new model year's trims or confirm the model was discontinued (it stops
being flagged the following year).

## Annual model-year refresh process

Each fall (September–November), when manufacturers publish new model-year
pricing:

1. Run the staleness check locally to get the worklist.
2. For each active model, gather the new model year's trim lineup and MSRPs
   from the manufacturer's build-and-price site (authoritative), cross-checked
   against Edmunds/KBB/Car and Driver.
3. Add entries via a patch script in `scripts/` (see `fix_msrp_patch15.py` for
   the pattern: load → deepcopy → `fix()` → write → print changes). Keeping
   patch scripts in the repo documents every change and its sourcing.
4. Bump each model's `production_years` end year; update `mpg`/`specs` if the
   powertrain changed (fueleconomy.gov has free official MPG data).
5. Run the validator; verify or baseline anything it flags.

## Data source options

There is no good **free** API for MSRP data — pricing is commercial. Options
if manual refresh becomes too costly:

| Source | Cost | What it provides |
|---|---|---|
| Manufacturer build-and-price sites | Free (manual) | Authoritative current MSRPs — the current process |
| [CarAPI](https://carapi.app/) | Free tier / paid | Year/make/model/trim with MSRPs (1990+); closest drop-in feed |
| [Price Digests](https://pricedigests.com/api/specs/) | Commercial | MSRP + specs for 281k vehicles; industry-grade |
| [MarketCheck](https://www.marketcheck.com/apis/pricing/) | Commercial | Listing/market pricing (transaction, not MSRP) |
| [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) | Free | Make/model/year existence — good for validating coverage, **no pricing** |
| [fueleconomy.gov](https://www.fueleconomy.gov/feg/ws/) | Free | Official EPA MPG/MPGe — good for the `mpg` fields |

If the site's traffic justifies it, the CarAPI free tier is the natural first
step toward automating the annual refresh: a script could diff its trim/MSRP
data for the new model year against `vehicles.json` and emit a patch script
draft for human review. Keep human review in the loop — the 2026 audit showed
third-party aggregators themselves carry errors (that's how most of the ones
we fixed got in).

## History

The 2026 full-database audit (PRs through #247) reviewed all 280 models and
corrected ~15 patch batches of MSRP errors. The detection heuristics above
were derived from that work; the baseline file encodes its conclusions about
which anomalies are real-world pricing facts rather than data errors.
