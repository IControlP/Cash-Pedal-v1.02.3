# Cash Pedal — CLAUDE.md

## Project Overview

Cash Pedal is a vehicle financial toolkit at [cashpedal.io](https://cashpedal.io). The core intention is to give users genuine confidence in their car-buying decisions by surfacing real data — loan math, total cost of ownership, salary affordability, side-by-side vehicle comparisons, and maintenance audits — so every choice is grounded in numbers, not gut feeling.

Features include calculators, vehicle comparisons, checklists, a blog, and AI advice. Pro features are gated behind a Stripe subscription or one-time access pass.

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
| Payments | Stripe (subscription + one-time pass) |
| Security | Helmet (CSP) + express-rate-limit |
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
├── main.jsx                        # React entry point
├── App.jsx                         # Router setup — all 12 routes defined here
├── index.css                       # Global styles and design tokens
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── ResultCard.jsx
│   ├── CarSVGs.jsx                 # Shared SVG car illustrations
│   ├── PaywallModal.jsx            # Subscription upsell modal
│   ├── ProGate.jsx                 # Wraps pro-only features with access check
│   └── landing/                   # Landing page section components
│       ├── Hero.jsx
│       ├── Problem.jsx
│       ├── Features.jsx
│       ├── HowItWorks.jsx
│       ├── TCOPreview.jsx
│       ├── Coverage.jsx
│       ├── FAQ.jsx
│       ├── CTAOffer.jsx
│       ├── TrustStrip.jsx
│       └── LandingFooter.jsx
├── pages/
│   ├── Landing.jsx                 # / — Hero + tool grid
│   ├── TCOCalculator.jsx           # /tco — Loan math, live sliders, vehicle picker
│   ├── MultiVehicleComparison.jsx  # /compare — Side-by-side, up to 5 vehicles
│   ├── SalaryCalculator.jsx        # /salary — 20/4/10 rule affordability check
│   ├── CarSurvey.jsx               # /survey — 10-question vehicle type quiz
│   ├── CarBuyingChecklist.jsx      # /checklist — Mileage-based maintenance audit
│   ├── WheelZard.jsx               # /wheelzard — AI chatbot (custom GPT)
│   ├── Resources.jsx               # /resources — Curated affiliate links
│   ├── About.jsx                   # /about — FAQ and methodology
│   ├── Subscribe.jsx               # /subscribe — Stripe subscription management
│   ├── Blog.jsx                    # /blog — Blog index
│   └── BlogPost.jsx                # /blog/:slug — Individual blog post
├── hooks/
│   └── useSubscription.js          # Checks subscription status via /api endpoints
├── utils/
│   └── vehicleCosts.js             # Shared cost calculation utilities
└── data/
    ├── vehicles.json               # Vehicle make/model/year/trim database
    ├── surveyData.js               # Car survey questions and scoring logic
    ├── checklistData.js            # Maintenance checklist items by mileage range
    └── posts.js                    # Blog post content (slug, title, date, HTML body)
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
| `/blog` | `Blog` | Blog index |
| `/blog/:slug` | `BlogPost` | Individual blog post (slug-routed from `posts.js`) |

---

## Backend API (server.js)

The Express server handles payments, subscription state, and data compliance. It serves the compiled React app from `/dist` and exposes these endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/stripe-webhook` | POST | Stripe webhook for payment events (raw body required) |
| `POST /api/consent` | POST | Save user consent record (GDPR audit trail) |
| `POST /api/user-data` | POST | Save user profile/analytics data (365-day retention) |
| `POST /api/create-checkout-session` | POST | Create Stripe checkout session (subscription or one-time pass) |
| `GET /api/verify-session` | GET | Verify completed Stripe session |
| `POST /api/subscription-status` | POST | Check subscriber status with device-limit enforcement |
| `POST /api/reset-devices` | POST | Reset all registered devices for a subscriber |
| `POST /api/cancel-subscription` | POST | Cancel active subscription (rate-limited: 5/hr) |
| `POST /api/delete-my-data` | POST | GDPR/CCPA right-to-erasure — soft-deletes subscriber, hard-deletes profile data |

**Database tables:**
- `subscribers` — Stripe subscription state and payment records
- `subscriber_devices` — Device access tracking (2-device limit, 30-day expiry)
- `consent_records` — Legal consent audit trail (exempt from auto-purge per GDPR Art. 17(3)(b))
- `user_data_collection` — Analytics/marketing data (365-day retention, auto-purged)

**Rate limiting:**
- General: 100 requests / 15 min
- Sensitive operations: 15 requests / 15 min
- Subscription cancellation: 5 requests / 1 hr

**Required environment variables:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_PRIVATE_URL` | Railway-internal PostgreSQL URL (takes priority over `DATABASE_URL`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PRICE_ID` | Stripe recurring subscription price ID |
| `STRIPE_ONE_TIME_PRICE_ID` | Stripe one-time access pass price ID (60-day access) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `APP_URL` | Production URL (default: `https://cashpedal.io`) |
| `PRO_USER_EMAILS` | Comma-separated emails that bypass all subscription checks |
| `PORT` | Injected by Railway automatically |

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
restartPolicyMaxRetries = 10

[deploy.healthcheck]
path = "/"
timeout = 300
interval = 30
```

The Express server binds to `$PORT`, serves the compiled React app from `/dist`, and routes `/api/*` to backend handlers. `cashpedal.io` and `www.cashpedal.io` are allowed hosts (configured in `vite.config.js`).

To deploy: push to the connected GitHub branch. Railway auto-rebuilds on every push.

---

## Styling Conventions

- Tailwind utility classes for layout and spacing
- CSS custom properties (variables) for the design token system:
  - `--bg` (`#0f0520`), `--surface` (`#1a0a30`), `--surface-hover` (`#231040`) — background layers
  - `--border` (`#3a1a5c`) — border color
  - `--accent` (`#FFB800`) — golden amber highlight color
  - `--accent-dim` (`#e0a000`) — dimmed accent for hover states
  - `--accent-muted` (`rgba(255,184,0,0.12)`) — subtle accent backgrounds
  - `--text-muted` (`#a08cbf`) — secondary text
- Global utility classes: `btn-primary`, `card`, `font-display`
- Animation classes: `anim-0` through `anim-5` for staggered fade-ins

---

## Blog

Blog posts live in `src/data/posts.js` as an exported array. Each post has:
- `slug` — URL identifier (`/blog/:slug`)
- `title`, `subtitle`, `date`, `author`, `readTime`, `cover` (image URL), `excerpt`, `tags`
- `content` — HTML string supporting `<h2>`, `<h3>`, `<p>`, `<ul>`/`<ol>`/`<li>`, `<strong>`, `<em>`, `<a>`, `<blockquote>`, `<hr>`

To publish a new post: add an entry to the array in `posts.js`. No CMS or build step required.

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
- Stripe supports both **recurring subscriptions** and **one-time 60-day access passes** — both are handled by `/api/create-checkout-session`.
- Security headers are enforced via Helmet with a CSP that allowlists Stripe checkout domains.
- GDPR/CCPA compliance: consent records are kept indefinitely (legal basis); analytics data auto-purges after 365 days; users can request erasure via `/api/delete-my-data`.
