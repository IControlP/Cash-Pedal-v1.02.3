# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cash Pedal is a vehicle financial toolkit at [cashpedal.io](https://cashpedal.io). It helps users make smarter car-buying decisions through calculators, comparisons, checklists, and AI advice. Pro features are gated behind a Stripe purchase (one-time pass or subscription), an email-capture bonus-credit funnel, or promo codes.

**Stack:** React 18 + Vite 5 + Tailwind CSS 3 + React Router DOM v6 + Recharts + Express + PostgreSQL (`pg`) + Stripe
**Deployment:** Railway (via `railway.toml`) with nixpacks builder

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run start        # Start production server (used by Railway)
```

Verification (no unit-test framework — these are the checks that run in CI):

```bash
node scripts/verify-tco.mjs                     # TCO/maintenance accuracy harness (±10% vs AAA/CR benchmarks)
python3 scripts/validate_vehicle_data.py        # Validates src/data/vehicles.json (required for any change to it)
python3 scripts/validate_vehicle_data.py --write-baseline   # Accept verified pricing anomalies
node scripts/smoke-test.mjs [base-url]          # Headless-Chromium smoke test (needs: npm install --no-save playwright && npx playwright install chromium)
```

---

## Architecture

Single deploy unit: `server.js` (Express, ~2,400 lines, no framework beyond Express itself) serves the compiled React SPA from `/dist` and exposes all `/api/*` endpoints. There is no ORM — raw SQL via `pg`, with tables created/migrated idempotently at boot (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`; no migration files). Most calculation logic lives **client-side** in React components and `src/utils/vehicleCosts.js`; the server handles payments, entitlements, analytics ingestion, and third-party API proxying/caching.

```
src/
├── main.jsx                  # React entry point
├── App.jsx                   # Router — all routes; every page except Landing is lazy-loaded
├── index.css                 # Global styles and design tokens
├── components/
│   ├── ErrorBoundary.jsx     # Wraps the whole app
│   ├── ProGate.jsx           # Wraps pro-only features with access check
│   ├── PaywallModal.jsx      # Purchase upsell modal
│   ├── landing/              # Landing-page sections (Hero, HeroEntryCard, FAQ, …)
│   └── ...                   # Navbar, Footer, ResultCard, NextStep, ProUpsell, etc.
├── pages/                    # One component per route (see Routes below)
├── hooks/
│   ├── useSubscription.js    # Entitlement state — localStorage cache + daily server re-verify
│   └── useBonusCredits.js    # Email-funnel bonus-credit balance (server is source of truth)
├── utils/
│   ├── vehicleCosts.js       # Shared cost model: depreciation, fuel, maintenance, registration, insurance
│   ├── analytics.js          # GA4 + Meta Pixel wrappers (safe no-ops when scripts absent)
│   ├── abTest.js             # Persistent 50/50 hero A/B variant
│   ├── marketSearch.js       # Fires /api/track-search
│   ├── session.js            # Anonymous browser session UUID
│   └── safeStorage.js        # localStorage guards for locked-down in-app browsers
└── data/
    ├── vehicles.json         # Vehicle make/model/year/trim database (~517 KB, static, validated in CI)
    ├── posts.js              # Blog posts — add posts here (instructions at top of file), no CMS
    ├── surveyData.js         # Car survey questions and scoring logic
    └── checklistData.js      # Maintenance checklist items by mileage range
```

### Routes (src/App.jsx)

| Path | Component | Description |
|---|---|---|
| `/` | `Landing` | Hero page with tool grid (only eagerly-loaded route) |
| `/tco` | `TCOFlow` | Guided/simple TCO estimate flow — the primary funnel |
| `/tco-full` | `TCOCalculator` | Full TCO / loan calculator with live math (~3,700 lines) |
| `/compare` | `MultiVehicleComparison` | Compare up to 5 vehicles |
| `/salary` | `SalaryCalculator` | Minimum salary for a vehicle (20/4/10) |
| `/survey` | `CarSurvey` | Vehicle type personality quiz |
| `/checklist` | `CarBuyingChecklist` | Used car maintenance audit |
| `/resources` | `Resources` | Affiliate resource links |
| `/market` | `MarketAnalytics` | Most-searched vehicles, nationally and by state |
| `/blog`, `/blog/:slug` | `Blog`, `BlogPost` | Blog index and posts (content in `src/data/posts.js`) |
| `/about`, `/privacy`, `/terms` | `About`, `Privacy`, `Terms` | Static/informational pages |
| `/subscribe` | `Subscribe` | Stripe checkout and account management |
| `*` | `NotFound` | 404 catch-all |

---

## Monetization / Entitlement Model

Four ways a visitor gets Pro access, all resolved server-side:

1. **One-time pass** (default `passType` in checkout) — Stripe `mode: 'payment'`, grants `ACCESS_DAYS` (60) of access, `purchase_type: 'one_time'`, no auto-renewal.
2. **Subscription** — Stripe `mode: 'subscription'`, period tracked from the Stripe subscription object.
3. **Bonus credits** — `/api/claim-bonus` trades name + email for 5 free Pro calculations (`BONUS_CREDITS`). One claim per email *and* per anonymous session. Spent atomically via `/api/spend-bonus`; the server (`bonus_credits` table) is the source of truth, localStorage is only a display cache.
4. **Promo codes** — `PROMO_CODES` env (unlimited, permanent) or the capped beta code (default `BETAPEDAL50`: 50 browsers ever, 30 days each, enforced via the `promo_redemptions` table). `PRO_USER_EMAILS` env bypasses all checks.

Device access is limited to 2 devices per subscriber (30-day device expiry), keyed by HMAC-anonymized IP — requires `IP_HMAC_SECRET`, otherwise device enforcement is skipped. Client-side, `useSubscription.js` reads localStorage first and re-verifies against `POST /api/subscription-status` at most once per day. Pro features are wrapped with `<ProGate>`, which shows `<PaywallModal>` to non-entitled users.

---

## Backend API (server.js)

Express hardening in place: `helmet`, `compression`, `express-rate-limit` (a general limiter plus stricter `sensitiveLimiter`/`cancelLimiter`), `trust proxy = 1` for Railway. Identity-bearing endpoints use POST so emails never appear in access logs.

| Endpoint | Purpose |
|---|---|
| `POST /api/create-checkout-session` | Create Stripe checkout session (`passType`: `'one_time'` default or `'subscription'`) |
| `GET /api/verify-session` | Verify completed Stripe session; upserts subscriber, fires email/CRM automations |
| `POST /api/subscription-status` | Check entitlement by email (device-limited) |
| `POST /api/cancel-subscription` | Cancel active subscription |
| `POST /api/reset-devices` | Reset device count for subscriber |
| `POST /api/claim-bonus` / `POST /api/spend-bonus` / `POST /api/bonus-status` | Email-funnel bonus credits: claim (name+email → 5 credits), atomic spend, balance check |
| `POST /api/verify-promo-code` | Verify/redeem a promo code — env `PROMO_CODES` (unlimited) or the capped beta code |
| `POST /api/consent` | Save user consent record |
| `POST /api/user-data` | Save user data (tips opt-in funnel) |
| `POST /api/delete-my-data` | GDPR erasure — deletes profile data; consent + Stripe records retained |
| `POST /api/track-usage` | First-party usage events (allowlisted feature/gate values, anonymized IP) |
| `POST /api/track-search` | Record a vehicle search (make/model + optional state) for market analytics |
| `POST /api/track-calculation` | Record a completed TCO calculation snapshot (make/model/year plus user-entered asking price, mileage, financing terms; location coarsened to state + zip3) |
| `GET /api/market-analytics` | Public aggregate rankings — top vehicles nationally and by state (`?state=CA`) |
| `GET /api/insights/market` | **Protected** full per-state insights export (requires `x-api-key`) — the sellable dataset |
| `GET /api/reliability/:make/:model/:year` | NHTSA recall/complaint proxy, cached 7 days in `nhtsa_cache`; degrades gracefully on NHTSA timeout |
| `GET /api/fuel-prices` | State-level fuel prices from EIA (in-memory weekly cache); static fallback without `EIA_API_KEY` |
| `GET /api/electricity-rate?zip=XXXXX` | Zip-level residential $/kWh from OpenEI URDB; cached 30 days per zip; `null` rate when key absent or zip not found |
| `POST /api/market-value` | **Pro-only** (requires active subscriber email in body). Median local dealer asking price (plus quartiles + sample size) for a year/make/model within ~100 mi of a zip, via the Marketcheck or Auto.dev listings API with monthly-quota tracking and provider fallback; cached per year/make/model/zip3 in the `market_value_cache` Postgres table — served fresh for 24h, refreshed when quota allows, and served stale (age-stamped `ageDays`) for up to 90 days when quota is exhausted; returns `null` price when not entitled, no key configured, or no data available |
| `POST /api/stripe-webhook` | Stripe webhook (raw body — registered before `express.json()`) |
| `GET /api/health` | Health check — 200 when the server is up (pings Postgres when configured, 503 if unreachable); used by Railway's deploy healthcheck and the smoke test |

### Market analytics

`POST /api/track-search` is fired from the TCO tools whenever a visitor selects a real make/model. Rows are stored in the `vehicle_searches` table, keyed only by the browser session UUID (no email/IP), tagged with the resolved US state when available, and validated against `src/data/vehicles.json` (loaded once at server boot). Public rankings count **distinct sessions** (not raw hits) over a rolling 90-day window so a single visitor can't skew results. The `/api/insights/market` export returns the full per-state breakdown for licensing and is gated behind the `INSIGHTS_API_KEY` header.

`POST /api/track-calculation` is fired (via `src/utils/calculationTracking.js`) when the `calculator_completed` GA4 event fires in the TCO tools, and again (debounced ~2s) whenever the visitor personalizes values afterward — the post-results personalize panel is where the valuable numbers get entered. The `calculation_snapshots` table keeps **one row per session+vehicle** (unique on `session_id + make + model + year`, upserted via `ON CONFLICT`): make/model/year/segment plus the numbers the user actually entered — asking price, odometer mileage, financing terms (term/APR/down payment), and listing type (dealer vs. private party). `updated_at` marks how fresh the row is (later passes refresh it in place; `COALESCE` keeps previously captured values when a later pass sends null), and the 365-day retention sweep keys on `updated_at` so recently refreshed rows survive. Values left at their pre-filled defaults are sent as `null` so model estimates never pollute the dataset. Same hygiene as `vehicle_searches`: session UUID only, make/model validated against the vehicle database, out-of-range numbers nulled server-side, and location stored coarse — 2-letter state plus the first 3 zip digits (a full 5-digit zip is never persisted). Silent collection only for now — not yet surfaced in `/market` or `/api/insights/market`.

### Environment variables

Required in production:
- `DATABASE_URL` — PostgreSQL connection string (`DATABASE_PRIVATE_URL` is preferred when set — Railway private networking)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe credentials
- `STRIPE_PRICE_ID` / `STRIPE_ONE_TIME_PRICE_ID` — price IDs for the subscription / one-time pass
- `APP_URL` — Production URL (default: `https://cashpedal.io`)
- `PORT` — Injected by Railway automatically
- `IP_HMAC_SECRET` — HMAC key for anonymized device tracking; without it device limits are not enforced (server warns at boot)

Optional (each feature degrades to a logged no-op or static fallback without its key):
- `INSIGHTS_API_KEY` — unlocks the `/api/insights/market` sellable export
- `PROMO_CODES` — comma-separated promo codes granting unlimited, permanent Pro access (exact match)
- `BETA_PROMO_CODE` — overrides the capped beta promo code (default `BETAPEDAL50`, case-insensitive). Server-enforced via the `promo_redemptions` table: max 50 distinct browsers ever, each grant expiring 30 days after redemption
- `PRO_USER_EMAILS` — comma-separated emails that bypass all subscription and device checks
- `EIA_API_KEY` — live state-level fuel prices via `GET /api/fuel-prices` (falls back to static table)
- `OPENEI_API_KEY` — OpenEI Utility Rate Database key; zip-level residential electricity rates (falls back to static state-level table)
- `MARKETCHECK_API_KEY` / `AUTO_DEV_API_KEY` — primary/fallback providers for `POST /api/market-value` (free tiers: 500 and 1,000 calls/mo). Without either key the calculator falls back to the regionally-adjusted depreciation model
- `MARKETCHECK_MONTHLY_LIMIT` / `AUTO_DEV_MONTHLY_LIMIT` — monthly call budgets (defaults 480 / 960 — slightly under the published free-tier caps for headroom). Counters live in the `api_quota` Postgres table, keyed by provider+month, so they survive restarts; a spent provider is skipped in favor of the next fallback
- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email (default from: `Cash Pedal <hello@cashpedal.io>`; the domain must be verified in Resend)
- `HUBSPOT_ACCESS_TOKEN` — HubSpot private-app token for CRM sync (needs `crm.objects.contacts` and `crm.objects.deals` read/write scopes)
- `VITE_META_TEST_EVENT_CODE` — (client build) appends a Meta Pixel test event code to every `fbq` payload for QA; leave unset in production

### Transactional email automations

Two thank-you emails are sent via the Resend HTTPS API (no SDK dependency):

1. **Welcome** — fired when a visitor first shares their email, from either funnel (`/api/user-data` tips opt-in or `/api/claim-bonus` credit unlock). Sent at most once per email address, ever.
2. **Purchase confirmation** — fired on `checkout.session.completed` (webhook) and from `/api/verify-session` as a fallback, for both subscriptions and one-time passes. Deduplicated per Stripe checkout session.

### HubSpot CRM sync

Leads and purchases are mirrored into HubSpot's free CRM via its HTTPS API (no SDK dependency):

1. **Lead capture** — both email funnels upsert a contact (keyed by email) with name and `lifecyclestage: lead`. Backwards lifecycle moves are retried without the stage so returning customers don't break the sync.
2. **Purchase** — the contact is upgraded to `lifecyclestage: customer` and a closed-won deal (default pipeline, real Stripe amount) is created and associated with the contact. Deduplicated per Stripe checkout session.

Idempotency for both automations is enforced by the `automation_log` table (`UNIQUE (email, event_type, reference)`): a row is claimed before the side effect runs and released if the provider call fails, so a later trigger can retry.

---

## Deployment

Railway picks up `railway.toml` automatically: nixpacks build (`npm install --include=dev && npm run build`), `npm run start`, `healthcheckPath = "/api/health"`. The Express server binds to `$PORT`, serves the compiled React app from `/dist`, and routes `/api/*` to backend handlers. `cashpedal.io` and `www.cashpedal.io` are allowed hosts (configured in `vite.config.js`).

To deploy: push to the connected GitHub branch. Railway auto-rebuilds on every push.

### CI / deploy feedback loop

Layers that keep bad code off the live site (workflows in `.github/workflows/`):

1. **Build gate** — `ci.yml` runs `npm ci && npm run build` plus `node scripts/verify-tco.mjs` on every push to every branch. Railway's **"Wait for CI"** setting (enabled in the Railway dashboard, not in this repo) holds the deploy until these checks pass, so a commit that doesn't build never reaches production.
2. **Vehicle data validation** — `vehicle-data-validation.yml` runs `scripts/validate_vehicle_data.py` on any PR touching `vehicles.json`, the validator, or the anomaly baseline. `vehicle-data-staleness.yml` runs monthly and flags models missing the latest model year.
3. **Deploy health check** — Railway only routes traffic to a new deploy after `/api/health` returns 200 (it pings Postgres); otherwise the previous deploy keeps serving.
4. **Hourly smoke test** — `smoke-test.yml` runs `scripts/smoke-test.mjs` against `https://cashpedal.io`: every route must render real content in headless Chromium (no blank screen, no 404 fallthrough, no uncaught JS errors) and the public API endpoints must return valid JSON. On failure it opens/updates a GitHub issue labeled `smoke-test`; on recovery it closes the issue.

---

## Styling Conventions

- Tailwind utility classes for layout and spacing
- CSS custom properties (variables) for the design token system:
  - `--bg`, `--surface`, `--surface-hover` — background layers
  - `--border` — border color
  - `--accent` — lime green (`rgb(200,255,0)`) highlight color
  - `--text-muted` — secondary text
- Global utility classes: `btn-primary`, `card`, `font-display`
- Animation classes: `anim-0` through `anim-5` for staggered fade-ins

---

## Legacy Python Files

The root directory still contains the original Streamlit implementation (`.py` files, `pages/`, `requirements.txt`, `Procfile`). These are **not active** — kept for reference only. Do not modify them expecting any effect on the live site. The active codebase lives entirely in `src/` and `server.js`. (Exception: `scripts/validate_vehicle_data.py` is a live CI tool.)

---

## Key Notes for Development

- Most calculation logic lives **client-side**; the shared cost model is `src/utils/vehicleCosts.js`. The depreciation estimator (`estimateCurrentValue`) is regionally aware: pass the resolved 2-letter state as the sixth argument to apply the state demand premium plus segment×region adjustments (truck country, sun/snow belt, EV-friendly states, salt-belt corrosion age discount). With no state it reproduces the national model exactly. For **entitled users**, when a zip is resolved and a provider key is configured, the TCO calculator overlays live local listing medians from `POST /api/market-value` (clamped to ±35% of the model's dealer estimate); free users and exhausted-quota months transparently fall back to the model.
- Changes to maintenance/cost logic in `vehicleCosts.js` must keep `node scripts/verify-tco.mjs` passing (runs in CI on every push).
- **Any change to `vehicles.json` must pass `python3 scripts/validate_vehicle_data.py`** (runs in CI). Verified-legitimate pricing anomalies are accepted via `--write-baseline`. See `docs/VEHICLE_DATA_MAINTENANCE.md` for the full update process and data source options.
- Blog posts are plain objects in `src/data/posts.js` (newest first) — follow the how-to comment at the top of that file; no CMS, no server restart needed.
- Client analytics go through `src/utils/analytics.js` (GA4 + Meta Pixel wrappers that no-op when the scripts haven't loaded); server-side first-party usage tracking goes through `POST /api/track-usage` with allowlisted feature names.
- Use `safeGet`/`safeSet` from `src/utils/safeStorage.js` instead of raw `localStorage` — some in-app browsers block storage entirely.
- The server creates/migrates its own Postgres tables at boot; there are no migration files. Add new tables/columns as idempotent `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` statements in `server.js`.
