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
| `POST /api/stripe-webhook` | Stripe webhook (raw body required) |

Subscribers are stored in PostgreSQL. Device access is limited to 2 devices per subscriber, expiring after 30 days.

**Required environment variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_PRICE_ID` — Stripe price ID for the subscription
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `APP_URL` — Production URL (default: `https://cashpedal.io`)
- `PORT` — Injected by Railway automatically

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
```

The Express server binds to `$PORT`, serves the compiled React app from `/dist`, and routes `/api/*` to backend handlers. `cashpedal.io` and `www.cashpedal.io` are allowed hosts (configured in `vite.config.js`).

To deploy: push to the connected GitHub branch. Railway auto-rebuilds on every push.

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
- The WheelZard page embeds an external custom GPT via iframe/link — no server-side AI calls in this repo.
- Subscription state is managed server-side via PostgreSQL and Stripe; `useSubscription.js` polls `/api/subscription-status`.
- Pro features are wrapped with `<ProGate>`, which shows `<PaywallModal>` to non-subscribers.
