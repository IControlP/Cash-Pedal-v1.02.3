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
  Foundation housing line and free dollars for Lifestyle/Future, shown as a gain:
  "Roommates add ~$X/mo to travel and savings".
- Roommate count only applies to rent; buy mode assumes the household alone (an
  optional "house hack" note can come later).
- Tax, childcare and the 28/36 mortgage ratios use the joint figure for couples.

## 3. Budget pillars

Four pillars of **take-home** pay (the user never needs to know the term "net"):

| Pillar | Contains | Baseline |
|---|---|---|
| **Foundation** (needs) | Housing, utilities, groceries, transport (car costs), insurance, minimum debt, childcare | 50% |
| **Lifestyle** (wants) | Dining out, entertainment, travel, hobbies, upgrades | 30% |
| **Future** (savings) | Emergency fund, retirement, down-payment fund | 15% |
| **Cushion** | Irregular costs, buffer, giving | 5% |

Baseline is then **shifted by profile and priorities**:

- Children: Foundation +4 to +10 pts (childcare), Lifestyle −2 to −6.
- Age: 25–34 Future +0, 35–54 Future +3 to +5, 55+ Future +5 and shorter housing horizon.
- Each priority rating (1–5, centered at 3) moves its pillar by ±1.5 pts, capped.
- Guardrails: Foundation ≤ 65%, Future ≥ 10%, Cushion ≥ 3%. Housing alone ≤ 30% of
  gross for rent, and the standard 28/36 front/back-end ratios for a mortgage.
- Result is a single `allocation` object that always sums to 100%.

Stated as presets the user can accept or override: *Balanced*, *Experience-first*,
*Home-first*, *Future-first*.

## 4. Calculation engine (`src/utils/lifestyle.js`, Node-importable like `affordability.js`)

Pure functions, no browser APIs, so the server can pre-render and an agent API can
reuse them.

- `takeHome(incomes[], state, maritalStatus, children)` — federal brackets
  (standard deduction, filing status), FICA, state income tax via static table in
  `src/data/taxData.json`. Child tax credit simplified. Estimates only.
- `buildAllocation(profile, priorities)` → `{ foundation, lifestyle, future, cushion }`
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
2. Add debt (student loans, existing car payment) in v1? It materially changes results.
3. Pillar names — keep Foundation / Lifestyle / Future / Cushion, or use needs / wants / savings?
4. Brand: stay "Cash Pedal", or reposition the name and domain copy?
