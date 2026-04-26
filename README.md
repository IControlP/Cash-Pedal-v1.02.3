# Cash Pedal

A vehicle financial toolkit at [cashpedal.io](https://cashpedal.io). Helps users make smarter car-buying decisions through calculators, comparisons, checklists, and AI advice.

**Stack:** React 18 · Vite 5 · Tailwind CSS · Express.js · PostgreSQL · Stripe · Railway

---

## Development

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build → dist/
npm run start     # Start production Express server
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PRICE_ID` | Stripe price ID for the subscription product |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `APP_URL` | Production URL (default: `https://cashpedal.io`) |
| `PORT` | Server port (injected automatically by Railway) |

---

## Deployment (Railway)

Deployment is automatic — push to the connected GitHub branch and Railway rebuilds.

`railway.toml` configures the build and start commands:
- **Build:** `npm install --include=dev && npm run build`
- **Start:** `npm run start` (Express server in `server.js`)

The Express server serves the compiled React app from `/dist` and handles `/api/*` routes for subscriptions and payments.

---

## Project Structure

```
src/              # React frontend
server.js         # Express backend (API + static serving)
railway.toml      # Railway deployment config
vite.config.js    # Vite build config
```

See `CLAUDE.md` for full project documentation including all routes, API endpoints, and architecture details.
