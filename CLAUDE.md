# Cash Pedal — CLAUDE.md

## Project Overview

Cash Pedal is a free vehicle financial toolkit at [cashpedal.io](https://cashpedal.io). It helps users make smarter car-buying decisions through calculators, comparisons, checklists, and AI advice.

**Current stack:** React 18 + Vite + Tailwind CSS + React Router DOM + Recharts
**Deployment:** Railway (via `railway.toml`) with nixpacks builder

> The original app was built with Python/Streamlit. The legacy `.py` files in the root remain for reference but are no longer the active application. The active codebase lives in `src/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
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
├── App.jsx                   # Router setup — all 9 routes defined here
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   └── ResultCard.jsx
├── pages/
│   ├── Landing.jsx           # / — Hero + tool grid
│   ├── TCOCalculator.jsx     # /tco — Loan math, live sliders, vehicle picker
│   ├── MultiVehicleComparison.jsx  # /compare — Side-by-side, up to 5 vehicles
│   ├── SalaryCalculator.jsx  # /salary — 20/4/10 rule affordability check
│   ├── CarSurvey.jsx         # /survey — 10-question vehicle type quiz
│   ├── CarBuyingChecklist.jsx # /checklist — Mileage-based maintenance audit
│   ├── WheelZard.jsx         # /wheelzard — AI chatbot (custom GPT)
│   ├── Resources.jsx         # /resources — Curated affiliate links
│   └── About.jsx             # /about — FAQ and methodology
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

---

## Deployment

Railway picks up `railway.toml` automatically.

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start"
```

The production preview server binds to `$PORT` and allows `cashpedal.io` and `www.cashpedal.io` as hosts (configured in `vite.config.js`).

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

The root directory still contains the original Streamlit implementation (`.py` files, `pages/`, `requirements.txt`, `.streamlit/`). These are **not active** — they are kept for reference only. Do not modify them expecting any effect on the live site.

---

## Key Notes for Development

- All calculation logic lives **client-side** in the React components — no backend API.
- Vehicle data is loaded from `src/data/vehicles.json` (static JSON, no external fetch).
- The WheelZard page embeds an external custom GPT via iframe/link — no server-side AI calls in this repo.
- No authentication, no database, no server-side state.
- The app is fully static after `npm run build`.
