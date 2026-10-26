# Lifestyle Calculator — Product Spec (draft v0.1)

## 1. Intent

Pivot Cash Pedal from "what will this car cost me?" (risk framing) to
**"what life can my income support?"** (possibility framing). The visitor tells us
who they are and what they care about; we show the lifestyle they can maintain
within a sound budget, expressed as things they *can* have — a home to rent or
buy, neighborhood types, more dining out, a nicer car.

The existing car tools stay live as the **deep-dive** behind the car line of the
result. Routes, SEO pages and guides are untouched.

## 2. User flow (target: under 2 minutes)

1. **Profile** (one screen)
   - Marital status: single / married-partnered (asked first; it changes the income fields)
   - Gross annual salary — **single**: one income. **Married/partnered**: your income plus
     partner's income (joint household; partner may be $0)
   - Age range: 18–24, 25–34, 35–44, 45–54, 55+
   - State (existing `US_STATES`)
   - Living arrangement (singles only): **own place** or **with roommates** (1–3)
   - Children: none / 1 / 2 / 3+
2. **Priorities survey** (8–10 short questions, 1–5 scale, reusing the slider UI of `CarSurvey`)
   - Space & home ownership · Walkability / city life · Dining & entertainment ·
     Travel · Car quality · Saving / early retirement · Family & schools ·
     Low-stress finances (security)
3. **Result** — "Here's the life you can build"
   - Pillar split of take-home pay (donut/bars)
   - **Housing**: rent vs buy, with the max rent/price in range and a verdict
   - **Neighborhood types** that fit (urban core / inner suburb / outer suburb / small town)
   - **Dining & fun**: monthly dining-out and entertainment allowance (e.g. "~3 dinners out a week")
   - **Car tier**: max vehicle price and a segment label, with link into `/affordability` and `/tco`
   - **Savings**: monthly amount and a "you could do more of X by trading Y" toggle
4. **Trade-off sliders** — drag a priority up and watch the other lines shift, always
   phrased as "you gain" first, with the cost shown as a smaller secondary line.

### 2a. Household and living arrangement

| Household | Income used | Housing options modeled |
|---|---|---|
| Single | One income | Own place (studio / 1BR) **or** roommates: rent = shared 2–4BR rent ÷ people, plus a roommate utilities split |
| Married / partnered | Joint income; taxed as married filing jointly | Own place sized to household (1–3BR by kids) |

- Singles see a **Own place vs Roommates** toggle on the result. Roommates lower the
  Foundation housing line and free dollars for Lifestyle/Cushion, shown as a gain:
  "Roommates add ~$X/mo to travel and savings".
- Roommate count only applies to rent; buy mode assumes the household alone (an
  optional "house hack" note can come later).
- Tax, childcare and the 28/36 mortgage ratios use the joint figure for couples.

## 3. Budget pillars

Three pillars of **take-home** pay (decided: Foundation / Lifestyle / Cushion):

| Pillar | Contains | Baseline |
|---|---|---|
| **Foundation** (needs + fixed costs) | Housing, utilities, groceries, health, transport (car), childcare, **existing debt repayment** | 50% |
| **Lifestyle** (wants) | Dining out, entertainment, travel, hobbies | 30% |
| **Cushion** (future + buffer) | Emergency fund, retirement, down-payment fund, irregular costs | 20% |

Existing debt (student loans, car loan, cards, other) is entered as total required
monthly payments and treated as a **fixed cost inside Foundation**. Housing is what
remains of the Foundation budget after debt and the other fixed needs, so more debt
means a smaller housing budget; the result says so plainly and shows the gain from
paying it down ("clearing $400/mo of debt adds ~$X to your housing budget").

Baseline shifts by priorities and profile:

- Dining / travel priorities: Lifestyle +1.5 pts per step above 3 (symmetrically below).
- Saving priority and age: Cushion +2 pts per step; +2 (35–44), +4 (45–54), +5 (55+).
- Car priority sets the transport slice of Foundation (8% of take-home, ±1.5 per step).
- Children are priced bottom-up (childcare, groceries, health), not by shifting percentages.
- Guardrails: Cushion 10–35%, Lifestyle 10–40%, Foundation ≤ 65%; rent ≤ 33% and mortgage
  PITI ≤ 28% of gross. If Foundation costs overshoot the budget the shortfall is taken from
  Lifestyle and flagged as "tight".

## 4. Calculation engine (`src/utils/lifestyle.js`, Node-importable like `affordability.js`)

Pure functions, no browser APIs, so the server can pre-render and an agent API can
reuse them.

- `takeHome(incomes[], state, maritalStatus, children)` — federal brackets
  (standard deduction, filing status), FICA, state income tax via static table in
  `src/data/taxData.json`. Child tax credit simplified. Estimates only.
- `buildAllocation(profile, priorities)` → `{ foundation, lifestyle, cushion }`
  in dollars/month with sub-lines.
- `housingOptions(allocation, profile, stateData) // profile.roommates: 0–3 (singles)` →
  `{ rent: {maxMonthly, typicalBedrooms}, buy: {maxPrice, monthlyPITI, downPaymentNeeded, yearsToSave}, verdict }`
  - Buy affordability: max PITI at 28% of gross and ≤ Foundation housing line;
    20% or 10% down, 30-yr rate default (editable), tax + insurance from state data.
  - Verdict compares rent-vs-buy over the user's horizon (default 7 years):
    own cost vs rent + invested down payment. Output: "Buying fits now",
    "Renting keeps more options", or "Buy in ~N years".
- `neighborhoodFit(housing, priorities, stateData)` → ranked list of neighborhood
  **types** with plain-language reasons (walkability, space, schools, commute).
- `lifestyleAllowance(allocation, priorities)` → dining/entertainment/travel in
  concrete units (dinners per week, trips per year).
- `carTier(allocation)` → max vehicle price using the existing
  `solveAffordablePrice` with the transport budget instead of a % of salary.

All outputs are ranges (low/likely/high) rather than single numbers.

## 5. Data model (static JSON, validated in CI like `vehicles.json`)

`src/data/lifestyleData.json`, one entry per state (+ DC):

```json
{
  "CA": {
    "rent":  { "studio": 0, "1br": 0, "2br": 0, "3br": 0, "source": "HUD FMR FY2026 statewide median" },
    "home":  { "medianPrice": 0, "propertyTaxRate": 0, "insuranceMonthly": 0, "source": "Census ACS 5-yr" },
    "costIndex": { "groceries": 1.0, "dining": 1.0, "utilities": 1.0, "childcare": 0 },
    "neighborhoodTypes": [
      { "type": "urban-core", "rentMultiplier": 1.25, "priceMultiplier": 1.4, "walkability": 5, "space": 1, "schools": 3 }
    ],
    "incomeTax": { "type": "progressive", "brackets": [] }
  }
}
```

Metro-level overrides (`metros`) are optional in v1 and can be added for the 25
largest metros without changing the engine.

- **Sources** (free): HUD Fair Market Rents, Census ACS (median rent, home value,
  property tax), BLS Consumer Expenditure + regional price parities (BEA), Tax
  Foundation state tax tables, Care.com / EPI childcare cost. Every figure cites a
  source, same discipline as `docs/VEHICLE_DATA_MAINTENANCE.md`.
- `scripts/validate_lifestyle_data.py` — checks all 51 jurisdictions present,
  ranges sane, sources non-empty. `scripts/verify-lifestyle.mjs` — fixture profiles
  with expected ranges, run in `ci.yml` (same role as `verify-tco.mjs`).

## 6. Pages, routes, components

| Route | Component | Notes |
|---|---|---|
| `/lifestyle` | `LifestyleCalculator` | Profile → survey → result, single page with steps |
| `/lifestyle?salary=…&state=…` | same | Shareable result links, pre-rendered answer for AI crawlers |
| `/` | `Landing` | Hero rewritten: "See the life your income can build" |

New components: `ProfileForm`, `PrioritySurvey`, `PillarDonut`, `HousingCard`,
`NeighborhoodCards`, `AllowanceCard`, `CarTierCard`, `TradeoffSliders`.
Add route metadata to `src/data/seo.js`. Nav simplified to: Lifestyle, Cars you can buy
(`/affordability`), True cost (`/tco`), Compare, Blog; everything else under "More".

## 7. Copy and framing rules

- Lead with the gain: "You can afford a $2,400/mo home" before "your limit is…".
- No "hidden costs", "drain", "can't afford", "limited to".
- Trade-offs phrased as choices: "Prefer more dining out? That shifts ~$300 from savings."
- Disclaimer: educational estimates, not financial advice.

## 8. Monetization and tracking

- Free: profile → pillar split → headline housing and car lines.
- Pro (existing `ProGate`): full neighborhood ranking, rent-vs-buy horizon charts,
  trade-off sliders, saved scenarios, PDF export.
- Bonus-credit funnel works unchanged (`/api/claim-bonus`, `/api/spend-bonus`).
- Analytics: `lifestyle_profile_completed`, `lifestyle_survey_completed`,
  `lifestyle_result_viewed`; optional `POST /api/track-lifestyle` mirroring
  `track-calculation` (session UUID only, state + age range + household type; **no
  salary stored beyond a coarse bracket**).

## 9. MVP scope (what gets built after sign-off)

In: profile form, 8-question survey, tax estimate, pillar engine, rent-vs-buy,
neighborhood-type fit, dining/fun allowance, car tier linking to existing tools,
data JSON for all states (national-average multipliers for neighborhood types),
verification script, `/lifestyle` route, SEO entry, landing hero rewrite.

Out (later): named neighborhoods / zip data, metro overrides, saved scenarios,
PDF export, debt and student-loan inputs, second-income detail, server-side API.

## 10. Open questions

1. ~~Single household income or two incomes?~~ **Decided:** by marital status — one income
   for singles, joint income for couples; singles also choose own place vs roommates.
2. ~~Debt in v1?~~ **Decided:** yes; total monthly debt payments are a fixed cost in Foundation.
3. ~~Pillar names~~ **Decided:** Foundation / Lifestyle / Cushion (savings folds into Cushion).
4. ~~Brand~~ **Decided:** stay "Cash Pedal" for now.

## 11. Life stages and cost-center visuals (built)

Step 0 asks what brings the visitor here; the answer seeds the survey sliders and adds a
tailored panel to the results:

| Stage | Seeds | Results panel |
|---|---|---|
| Moving out of parents' home | roommates = 1, walkability up | cash needed to move in (first + deposit + setup) |
| Improving my finances | Cushion 5, dining/travel low | months to a 3-month safety net; levers (trim dining, clear debt) |
| Living with intention | neutral, user-driven | where priorities move dollars vs a neutral split |
| Moving to a new city | asks destination state | cost-center comparison + income needed to keep today's Lifestyle + Cushion |
| Taking a new job | asks new salary / state | take-home and cost-center change |

Visuals (`src/components/CostCenterChart.jsx`): ranked bars of 12 cost centers colored by
pillar (palette validated on the site's dark surface), direct $ and % labels, legend, and a
"view as table" toggle; a Now-vs-New paired-bar chart for scenarios.

## 12. City-level costs (built)

`scripts/fetch-lifestyle-sources.sh` downloads the sources; `scripts/build-lifestyle-data.mjs`
turns them into `src/data/lifestyleData.json` (51 states) and `src/data/lifestyleCities.json`
(381 cities: every city of 100k+, plus each state's three largest of 25k+).

| Field | Source |
|---|---|
| Rent by bedroom count (studio–4BR), median rent | Census ACS 2020–2024 5-yr, B25031 / B25064 (median **gross** rent, existing leases) |
| Median home value | ACS B25077 |
| Effective property tax | ACS B25103 ÷ B25077 |
| Goods / utilities / other-services price levels | BEA Regional Price Parities 2024, state (SARPP) and metro (MARPP) |
| Child care (center-based, 1/2/3 children), state and metro | MIT Living Wage Calculator typical expenses (livingwage.mit.edu), built from the US DOL National Database of Childcare Prices and Child Care Aware; MIT blends toddler, preschool and school-age rates, so infant care in particular may cost more |
| State income tax (brackets, standard deduction, exemptions/credits by filing status) | Tax Foundation, State Individual Income Tax Rates and Brackets, 2026 |
| Federal 2026 brackets, standard deduction, child tax credit | Rev. Proc. 2025-32 as published by Tax Foundation; SS wage base $184,500 from SSA's announcement (not re-verified) |

How it's used: the engine converts gross → contract rent (×0.92), prices groceries by the goods
index, utilities by the utilities index, and childcare, dining and travel by the services index.
A city row overrides its state's rent, home value and property tax; its BEA metro indexes apply
when the city is a principal city of a metro (243 of 381), otherwise the state indexes.

Known limits: ACS rents are existing leases (new-lease asking rents run higher); neighborhood
types are national multipliers on the city median; suburbs of big metros that aren't principal
cities (e.g. Irvine, Plano) use state price indexes. State income tax is computed on wages from the
2026 brackets with no federal-deduction add-backs, local income taxes or retirement/Social Security
exclusions (Washington's capital-gains-only tax is treated as no wage tax).

## 13. Child care and car-cost assumptions (built)

- **Child care.** The profile asks how many children are under 6. Those children are priced at full-time
  daycare using MIT's 1/2/3-child totals for the city's metro (state when no metro): each additional child costs
  the difference between consecutive totals (a sibling discount). School-age children use after-school/summer
  care at 35% of the one-child daycare figure (our assumption). Denver, one child under 6: about $1,700/month.
  If no under-6 count is given, all children are treated as daycare-age.
- **Cheap cars.** The shared insurance model charges the same full-coverage rate for every car under $15k.
  For the lifestyle car tier only, premiums scale to 60% below $8k and ramp to 100% at $15k (cheap used cars are
  commonly liability-only). The shared model and the TCO tools are unchanged. The budget floor is a $2,500 car;
  below that the tier reads "Car-light".
