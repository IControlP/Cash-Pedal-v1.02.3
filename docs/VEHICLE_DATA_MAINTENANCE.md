# Vehicle Database Maintenance

`src/data/vehicles.json` is a static database of 35 makes / 287 models with
MSRP by trim and model year (2015–present). Prices are **base MSRP excluding
destination**. It powers the TCO calculator,
comparisons, and salary calculator. Because it is static JSON with no upstream
feed, it goes stale and accumulates errors unless actively maintained. This
document describes the tooling and process that keep it current.

## Automated guardrails

### 1. CI validation on every change (`.github/workflows/vehicle-data-validation.yml`)

Any PR touching `vehicles.json` runs `scripts/validate_vehicle_data.py`, which
enforces:

- **Structural checks** — sane prices ($5k–$1M), plausible years,
  `production_years` consistent with trim years and ending on the last year
  with data, a known `type` that agrees with `is_ev` (EV pickups may stay
  `truck`), a known `fuel_type` (`hydrogen` for fuel-cell cars), at least 2
  seats, and no model whose prices duplicate a sibling's (the old
  Silverado / Silverado 1500 and 3 Series / 330i pattern; deliberate overlaps
  go in `DUPLICATE_OK`).
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
3. Add entries via a patch script in `scripts/patches/` (see
   `fix_catalog_patch17.py` for the pattern: load → deepcopy → `set_year()` →
   write → print changes, with the source of every figure in a comment).
   Keeping patch scripts in the repo documents every change and its sourcing.
   Patch scripts are one-shot: run them in order against the file state they
   were written for.
4. Bump each model's `production_years` end year; update `specs` if the
   powertrain changed.
5. Before adding a year, confirm the model exists for it: the EPA model menu
   (`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=YYYY&make=Make`)
   and NHTSA vPIC (`GetModelsForMakeYear`) are both free. If neither lists the
   model, that year never existed. This is how the phantom 2025-2026 rows
   removed in patch 16 were found.
6. Fill missing fuel economy from the EPA:
   `python3 scripts/fetch_epa_mpg.py --emit-patch`, review the `needs_review`
   notes in `scripts/epa_mpg_patch.json`, then
   `python3 scripts/fetch_epa_mpg.py --apply scripts/epa_mpg_patch.json`.
7. Run the validator; verify or baseline anything it flags.

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

### Oct 2026 review (patches 16-18)

- **Patch 16** removed non-road and duplicate entries (Ferrari F1 cars,
  Chevrolet "Silverado", BMW 328i/330i/340i), replaced the phantom 2023-2026
  BMW 750i rows with the G70 "7 Series", ended the B9 Audi A4/S4 and the A7
  at MY2025, restated the 2026 A5/S5 as the new sedan, removed model years
  that never existed (confirmed absent from both EPA and vPIC), and fixed
  segments. It also added `fuel_type: "hydrogen"` for the Mirai.
- **Patch 17** added sourced MY2027 pricing for 30 existing models (plus 2027 rows for the new HR-V and Maverick), revived models
  (gas Dodge Charger 2026, Nissan Murano 2026, Chrysler Voyager 2025-2026,
  Chevrolet Malibu 2025) and 14 missing high-volume models: Honda HR-V, Ford
  Maverick/Ranger/Bronco Sport, Toyota Corolla Cross/Grand Highlander, Nissan
  Frontier/Kicks/Versa, Kia Carnival, Hyundai Santa Cruz, Mercedes-Benz GLE,
  VW Taos and Cadillac Lyriq. Coverage of each new model starts at the
  earliest year with per-trim pricing in the sources, so some have gaps
  (for example, the Santa Cruz has no 2025 row).
- **Patch 18** replaced 2025-2026 rows that the 2027 prices showed to be
  extrapolated (CR-V, Terrain, Acadia, Odyssey, Corvette and others) and
  removed the Telluride's MY2026, which Kia never built.

The sources were press coverage of manufacturer announcements and pricing
guides, found by web search; the manufacturer sites were not reachable from
the tooling. Spot-check new figures against the build-and-price site.

**Boundary anomalies baselined without a sourced older-side value.** Fixing
one extrapolated year makes the flag move to the year before, so the cascade
was stopped at these keys. The newer value is sourced; the older DB value is
not, and is the likely error:
`yoy_drop|Honda|CR-V|CR-V Hybrid Sport|2025`,
`yoy_drop|Honda|Odyssey|Odyssey Touring|2025`,
`yoy_drop|Jeep|Grand Cherokee|Grand Cherokee Laredo|2026`,
`yoy_jump|Chevrolet|Corvette|*|2026` (Stingray, Stingray Convertible, Z06,
Z06 Convertible, ZR1), `yoy_jump|Chevrolet|Tahoe|Tahoe High Country|2027`,
`yoy_jump|Subaru|Ascent|Limited|2026`. The remaining new baseline entries are
verified real price moves: the Oct 2025 Ioniq 5 cuts, the 2026 Toyota bZ
(ex-bZ4X) cuts, the 2024 BMW 760i, the 2027 Corvette ZR1 and the 2024 Ford
Maverick Lariat (AWD and Lux package made standard).

**Still open after this review:**
- 170 active models still lack MY2027 rows (the monthly staleness check lists them). Many had no published
  pricing yet, or it was only given as a range.
- Missing models not yet added: Mercedes GLA/GLB, BMW X2/X6, VW ID.4, Chevrolet
  Bolt, Subaru Solterra, Jeep Wagoneer, Toyota Crown, Nissan Leaf/Ariya,
  Hyundai Venue, Toyota C-HR EV (2026), Jeep Cherokee (2026 revival).
- Most pre-2025 prices are still interpolated; see
  `docs/PRICING_DATA_REBUILD_PLAN.md`.

