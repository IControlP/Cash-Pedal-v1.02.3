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
- **Specs and efficiency coverage** — every model must carry an `mpg` block
  and complete `specs` (horsepower/seats/cargo). EVs must be rated in
  `mpge_combined` and combustion cars in city/highway/combined, combined must
  fall between city and highway (EPA combined is a 55/45 blend, so a figure
  outside that band means the three numbers came from different
  configurations), and every value must sit within plausible bounds. Any
  `trim_specs` override is held to the same rules and rejected if it merely
  restates the model default.
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
   powertrain changed (fueleconomy.gov has free official MPG data). If the new
   model year adds or drops a trim that differs in powertrain or body style,
   update the model's rules in `scripts/fill_mpg_patch2.py` (powertrain) or
   `scripts/fill_specs_patch3.py` (seats/cargo) and re-run them rather than
   hand-editing the `trim_specs` block. The patches are cumulative and must run
   in order — patch 2 rewrites each model's `trim_specs`, patch 3 merges into
   it.
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

## Specs and efficiency data

Alongside pricing, each model carries the figures the calculators need to
model fuel cost and to sort/compare vehicles:

```jsonc
{
  "is_ev": false,
  "mpg": { "city": 27, "highway": 35, "combined": 30 },
  "specs": { "horsepower": 203, "seats": 5, "cargo_cu_ft": 37.6 },
  "trim_specs": {
    "Hybrid XLE": {
      "mpg": { "city": 41, "highway": 38, "combined": 39 },
      "horsepower": 219
    },
    "Prime XSE": {
      "mpg": { "city": 38, "highway": 38, "combined": 38, "mpge_combined": 94 },
      "plugin_hybrid": true,
      "horsepower": 302
    }
  }
}
```

Conventions:

- **Model level describes the base powertrain**, in the most common drivetrain
  (FWD/RWD where the model offers a choice), matched to the configuration
  `specs.horsepower` was recorded for.
- **`trim_specs` is keyed by exact trim name** and exists for trims that depart
  from the model on either axis: the **powertrain** (hybrids, plug-ins, V8 and
  performance variants, diesels, EV drivetrain tiers) or the **body/cab
  configuration** (convertibles, coupes, 2-door vs 4-door, long-wheelbase SUVs,
  pickup cabs). An entry may set any subset of `horsepower`, `seats`,
  `cargo_cu_ft` and `mpg`; whatever it omits is inherited. Equipment-level trims
  (LX/EX/Touring) differ in neither and correctly inherit everything; the
  validator rejects an override that duplicates the model default. Read it
  through `resolveTrimSpecs()` in `src/utils/vehicleCosts.js`, which merges an
  override over the model defaults.
- **Only what the trim name determines.** Pickup bed volume is not encoded in
  the trim name (a SuperCrew takes either bed), so cab trims set `seats` alone.
  Captain's-chair and third-row-delete options change seat count without
  changing the trim name and are not inferred.
- **EVs** (`is_ev: true`) are rated in `mpge_combined`; everything else in
  city/highway/combined.
- **Plug-in hybrids** set `plugin_hybrid: true` and carry both: the
  charge-sustaining gasoline MPG and the EPA blended MPGe. `is_ev` stays false,
  so `computeAnnualFuel` bills their fuel as gasoline — a deliberately
  conservative choice, since how much of a PHEV's mileage is electric depends
  entirely on the owner's charging habits. Blended-mode cost is not modelled.
- **Vehicles over 8,500 lb GVWR** (F-250, Ram 2500/3500, ProMaster) get no EPA
  rating. They carry real-world figures marked `"estimated": true`, which is
  still far better than letting them fall back to the 28 MPG category default.
- Trims in the database that were never sold in the US have no EPA rating and
  are deliberately left inheriting the model default rather than given invented
  numbers. `scripts/fill_mpg_patch2.py` lists them in `SKIPPED`.

### Sourcing

fueleconomy.gov is the authoritative free source for MPG/MPGe and should be
used for any refresh. The initial backfill (`scripts/fill_mpg_patch1.py` and
`fill_mpg_patch2.py`) could not reach it — the environment's network policy
blocks the domain — so its figures were authored against the base
configuration each model's recorded horsepower identifies, and are best
treated as accurate to about ±1–2 MPG rather than exact EPA cell values. The
structural checks above catch gross errors, not off-by-one ones. When
fueleconomy.gov is reachable, diffing its ratings against these values is a
worthwhile cleanup pass.
