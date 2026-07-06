// ── Production smoke test ─────────────────────────────────────────────────
// Verifies the deployed site actually works end-to-end: every route renders
// real content in a headless browser (not a blank screen, not the 404 page,
// no uncaught JS exceptions) and the public API endpoints respond with valid
// JSON. Run on a schedule by .github/workflows/smoke-test.yml.
//
// Local run:
//   npm install --no-save playwright && npx playwright install chromium
//   node scripts/smoke-test.mjs [base-url]     (default: https://cashpedal.io)
//
import { chromium } from 'playwright'

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || 'https://cashpedal.io')
  .replace(/\/+$/, '')

// Text unique to src/pages/NotFound.jsx — a real route rendering this means a
// broken router or a route that silently fell through to the catch-all.
const NOT_FOUND_MARKER = 'This road doesn’t exist'

// Every user-facing route in src/App.jsx (blog posts and legal pages are
// covered by their index/section pages).
const ROUTES = [
  '/', '/tco', '/tco-full', '/compare', '/salary', '/survey', '/checklist',
  '/wheelzard', '/resources', '/market', '/about', '/subscribe', '/blog',
  '/privacy', '/terms',
]

// Public GET endpoints that must return 200 + JSON even when optional API
// keys are absent (they fall back rather than fail).
const API_CHECKS = [
  { path: '/api/health',                    validate: b => b.status === 'ok' },
  { path: '/api/market-analytics',          validate: b => typeof b === 'object' && b !== null },
  { path: '/api/fuel-prices',               validate: b => typeof b === 'object' && b !== null && 'prices' in b },
  { path: '/api/electricity-rate?zip=90210', validate: b => typeof b === 'object' && b !== null && 'rate' in b },
]

const failures = []
const pass = msg => console.log(`  ✓ ${msg}`)
const fail = msg => { console.error(`  ✗ ${msg}`); failures.push(msg) }

// Honor an outbound proxy when present (e.g. corporate/dev environments);
// CI runs without one and this resolves to no proxy config.
const proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy || null
const browser = await chromium.launch({
  // Override when the environment provides its own Chromium build instead of
  // Playwright's pinned download (leave unset in CI).
  executablePath: process.env.SMOKE_CHROMIUM_PATH || undefined,
  ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
})
const context = await browser.newContext({ userAgent: 'CashPedal-SmokeTest/1.0 (+github-actions)' })

console.log(`Smoke-testing ${BASE}\n`)

// ── Route rendering checks ────────────────────────────────────────────────
console.log('Routes:')
for (const route of ROUTES) {
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err.message))
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    if (!resp || resp.status() >= 400) {
      fail(`${route} — HTTP ${resp ? resp.status() : 'no response'}`)
    } else {
      // React must hydrate #root with substantial content — a blank or
      // near-empty root is the "white screen of death".
      await page.waitForFunction(
        () => (document.getElementById('root')?.innerText || '').trim().length > 100,
        undefined,
        { timeout: 20_000 },
      )
      const text = await page.evaluate(() => document.getElementById('root').innerText)
      if (text.includes(NOT_FOUND_MARKER)) {
        fail(`${route} — rendered the 404 page`)
      } else if (pageErrors.length > 0) {
        fail(`${route} — uncaught JS error: ${pageErrors[0]}`)
      } else {
        pass(route)
      }
    }
  } catch (err) {
    fail(`${route} — ${err.message.split('\n')[0]}`)
  } finally {
    await page.close()
  }
}

// The catch-all must still work: a bogus URL should show the 404 page, not a
// blank screen.
{
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}/definitely-not-a-real-page`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForFunction(
      marker => (document.getElementById('root')?.innerText || '').includes(marker),
      NOT_FOUND_MARKER,
      { timeout: 20_000 },
    )
    pass('unknown URL renders the 404 page')
  } catch {
    fail('unknown URL did not render the 404 page (router catch-all broken)')
  } finally {
    await page.close()
  }
}

// ── API checks ────────────────────────────────────────────────────────────
// context.request shares the browser's proxy settings, so these work in both
// CI and proxied local environments.
console.log('\nAPI endpoints:')
for (const { path, validate } of API_CHECKS) {
  try {
    const resp = await context.request.get(`${BASE}${path}`, { timeout: 20_000 })
    if (!resp.ok()) {
      fail(`${path} — HTTP ${resp.status()}`)
      continue
    }
    let body
    try {
      body = await resp.json()
    } catch {
      fail(`${path} — response is not JSON`)
      continue
    }
    if (validate(body)) pass(path)
    else fail(`${path} — unexpected response shape: ${JSON.stringify(body).slice(0, 200)}`)
  } catch (err) {
    fail(`${path} — ${err.message.split('\n')[0]}`)
  }
}

await browser.close()

console.log('')
if (failures.length > 0) {
  console.error(`SMOKE TEST FAILED — ${failures.length} problem(s):`)
  for (const f of failures) console.error(`  • ${f}`)
  process.exit(1)
}
console.log(`SMOKE TEST PASSED — ${ROUTES.length + 1} routes and ${API_CHECKS.length} API endpoints healthy.`)
