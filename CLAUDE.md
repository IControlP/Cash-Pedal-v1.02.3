# Cash Pedal — CLAUDE.md

## Project Overview

Cash Pedal is a vehicle financial toolkit at [cashpedal.io](https://cashpedal.io). It helps users make smarter car-buying decisions through calculators, comparisons, checklists, and AI advice. Pro features are gated behind a Stripe subscription.

**Current stack:** React 18 + Vite + Tailwind CSS + React Router DOM + Recharts + Express + PostgreSQL + Stripe
**Deployment:** Railway (via `railway.toml`) with nixpacks builder

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Backend server | Express.js (`server.js`) |
| Database | PostgreSQL (via `pg`) |
| Payments | Stripe |
| Deployment | Railway (nixpacks) |

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build locally
npm run start        # Start production server (used by Railway)
```

---

## Project Structure

```
src/
├── main.jsx                  # React entry point
├── App.jsx                   # Router setup — all 10 routes defined here
├── index.css                 # Global styles and design tokens
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── ResultCard.jsx
│   ├── PaywallModal.jsx      # Subscription upsell modal
│   └── ProGate.jsx           # Wraps pro-only features with access check
├── pages/
│   ├── Landing.jsx           # / — Hero + tool grid
│   ├── TCOCalculator.jsx     # /tco — Loan math, live sliders, vehicle picker
│   ├── MultiVehicleComparison.jsx  # /compare — Side-by-side, up to 5 vehicles
│   ├── SalaryCalculator.jsx  # /salary — 20/4/10 rule affordability check
│   ├── CarSurvey.jsx         # /survey — 10-question vehicle type quiz
│   ├── CarBuyingChecklist.jsx # /checklist — Mileage-based maintenance audit
│   ├── WheelZard.jsx         # /wheelzard — AI chatbot (custom GPT)
│   ├── Resources.jsx         # /resources — Curated affiliate links
│   ├── About.jsx             # /about — FAQ and methodology
│   └── Subscribe.jsx         # /subscribe — Stripe subscription management
├── hooks/
│   └── useSubscription.js    # Checks subscription status via /api endpoints
└── utils/
│   └── vehicleCosts.js       # Shared cost calculation utilities
└── data/
    ├── vehicles.json         # Vehicle make/model/year/trim database
    ├── surveyData.js         # Car survey questions and scoring logic
    └── checklistData.js      # Maintenance checklist items by mileage range
```

---

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Landing` | Hero page with tool grid |
| `/tco` | `TCOCalculator` | TCO / loan calculator with live math |
| `/compare` | `MultiVehicleComparison` | Compare up to 5 vehicles |
| `/salary` | `SalaryCalculator` | Minimum salary for a vehicle (20/4/10) |
| `/survey` | `CarSurvey` | Vehicle type personality quiz |
| `/checklist` | `CarBuyingChecklist` | Used car maintenance audit |
| `/wheelzard` | `WheelZard` | Wheel-Zard AI chatbot |
| `/resources` | `Resources` | Affiliate resource links |
| `/market` | `MarketAnalytics` | Most-searched vehicles, nationally and by state |
| `/about` | `About` | FAQ and methodology |
| `/subscribe` | `Subscribe` | Stripe subscription checkout and management |

---

## Backend API (server.js)

The Express server (`server.js`) handles payments and subscription state. It serves the compiled React app from `/dist` and exposes these endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/create-checkout-session` | Create Stripe checkout session |
| `GET /api/verify-session` | Verify completed Stripe session |
| `GET /api/subscription-status` | Check subscriber status (device-limited) |
| `POST /api/cancel-subscription` | Cancel active subscription |
| `POST /api/reset-devices` | Reset device count for subscriber |
| `POST /api/consent` | Save user consent record |
| `POST /api/user-data` | Save user data |
| `POST /api/track-search` | Record a vehicle search (make/model + optional state) for market analytics |
| `GET /api/market-analytics` | Public aggregate rankings — top vehicles nationally and by state (`?state=CA`) |
| `GET /api/insights/market` | **Protected** full per-state insights export (requires `x-api-key`) — the sellable dataset |
| `GET /api/electricity-rate?zip=XXXXX` | Zip-code-level residential $/kWh from OpenEI URDB; cached 30 days per zip; returns `null` rate when key absent or zip not found |
| `POST /api/verify-promo-code` | Verify/redeem a promo code — env `PROMO_CODES` (unlimited) or the capped beta code (50 browsers, 30-day access) |
| `POST /api/stripe-webhook` | Stripe webhook (raw body required) |
| `GET /api/health` | Health check — 200 when the server is up (pings Postgres when configured, 503 if unreachable); used by Railway's deploy healthcheck and the smoke test |

Subscribers are stored in PostgreSQL. Device access is limited to 2 devices per subscriber, expiring after 30 days.

### Market analytics

`POST /api/track-search` is fired from the TCO calculator whenever a visitor selects a real make/model. Rows are stored in the `vehicle_searches` table, keyed only by the browser session UUID (no email/IP), tagged with the resolved US state when available, and validated against `src/data/vehicles.json`. Public rankings count **distinct sessions** (not raw hits) over a rolling 90-day window so a single visitor can't skew results. The `/api/insights/market` export returns the full per-state breakdown for licensing and is gated behind the `INSIGHTS_API_KEY` header.

**Required environment variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_PRICE_ID` — Stripe price ID for the subscription
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `APP_URL` — Production URL (default: `https://cashpedal.io`)
- `PORT` — Injected by Railway automatically
- `INSIGHTS_API_KEY` — (optional) unlocks the `/api/insights/market` sellable export
- `PROMO_CODES` — (optional) comma-separated promo codes granting unlimited, permanent Pro access (exact match)
- `BETA_PROMO_CODE` — (optional) overrides the capped beta promo code (default `BETAPEDAL50`, case-insensitive). Server-enforced via the `promo_redemptions` table: max 50 distinct browsers ever, each grant expiring 30 days after redemption
- `OPENEI_API_KEY` — (optional) OpenEI Utility Rate Database key; enables zip-code-level residential electricity rates via `GET /api/electricity-rate?zip=XXXXX` (falls back to static state-level table without it)
- `RESEND_API_KEY` — (optional) Resend API key; enables transactional thank-you emails
- `EMAIL_FROM` — (optional) From address for transactional email (default: `Cash Pedal <hello@cashpedal.io>`; the domain must be verified in Resend)
- `HUBSPOT_ACCESS_TOKEN` — (optional) HubSpot private-app token; enables CRM sync of leads and purchases (needs `crm.objects.contacts` and `crm.objects.deals` read/write scopes)

### Transactional email automations

Two thank-you emails are sent via the Resend HTTPS API (no SDK dependency):

1. **Welcome** — fired when a visitor first shares their email, from either funnel (`/api/user-data` tips opt-in or `/api/claim-bonus` credit unlock). Sent at most once per email address, ever.
2. **Purchase confirmation** — fired on `checkout.session.completed` (webhook) and from `/api/verify-session` as a fallback, for both subscriptions and one-time passes. Deduplicated per Stripe checkout session.

### HubSpot CRM sync

Leads and purchases are mirrored into HubSpot's free CRM via its HTTPS API (no SDK dependency):

1. **Lead capture** — both email funnels upsert a contact (keyed by email) with name and `lifecyclestage: lead`. Backwards lifecycle moves are retried without the stage so returning customers don't break the sync.
2. **Purchase** — the contact is upgraded to `lifecyclestage: customer` and a closed-won deal (default pipeline, real Stripe amount) is created and associated with the contact. Deduplicated per Stripe checkout session.

Idempotency for both automations is enforced by the `automation_log` table (`UNIQUE (email, event_type, reference)`): a row is claimed before the side effect runs and released if the provider call fails, so a later trigger can retry. Without the relevant API key, each automation is a logged no-op.

---

## Deployment

Railway picks up `railway.toml` automatically.

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install --include=dev && npm run build"

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
healthcheckPath = "/api/health"
```

The Express server binds to `$PORT`, serves the compiled React app from `/dist`, and routes `/api/*` to backend handlers. `cashpedal.io` and `www.cashpedal.io` are allowed hosts (configured in `vite.config.js`).

To deploy: push to the connected GitHub branch. Railway auto-rebuilds on every push.

### CI / deploy feedback loop

Three layers keep bad code off the live site:

1. **Build gate** — `.github/workflows/ci.yml` runs `npm ci && npm run build` plus `node scripts/verify-tco.mjs` on every push to every branch. Railway's **"Wait for CI"** setting (enabled in the Railway dashboard, not in this repo) holds the deploy until these checks pass, so a commit that doesn't build never reaches production.
2. **Deploy health check** — `railway.toml` sets `healthcheckPath = "/api/health"`; Railway only routes traffic to a new deploy after that endpoint returns 200 (it pings Postgres), otherwise the previous deploy keeps serving.
3. **Hourly smoke test** — `.github/workflows/smoke-test.yml` runs `scripts/smoke-test.mjs` against `https://cashpedal.io`: every route must render real content in headless Chromium (no blank screen, no 404 fallthrough, no uncaught JS errors) and the public API endpoints must return valid JSON. On failure it opens/updates a GitHub issue labeled `smoke-test`; on recovery it closes the issue. Run locally: `npm install --no-save playwright && npx playwright install chromium && node scripts/smoke-test.mjs [base-url]`.

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

The root directory still contains the original Streamlit implementation (`.py` files, `pages/`, `requirements.txt`, `.streamlit/`, `Procfile`). These are **not active** — kept for reference only. Do not modify them expecting any effect on the live site. The active codebase lives entirely in `src/` and `server.js`.

---

## Key Notes for Development

- Most calculation logic lives **client-side** in React components.
- Vehicle data is loaded from `src/data/vehicles.json` (static JSON, no external fetch).
- **Any change to `vehicles.json` must pass `python3 scripts/validate_vehicle_data.py`** (runs in CI). Verified-legitimate pricing anomalies are accepted via `--write-baseline`; a monthly scheduled workflow flags models missing the latest model year. See `docs/VEHICLE_DATA_MAINTENANCE.md` for the full update process and data source options.
- The WheelZard page embeds an external custom GPT via iframe/link — no server-side AI calls in this repo.
- Subscription state is managed server-side via PostgreSQL and Stripe; `useSubscription.js` polls `/api/subscription-status`.
- Pro features are wrapped with `<ProGate>`, which shows `<PaywallModal>` to non-subscribers.
