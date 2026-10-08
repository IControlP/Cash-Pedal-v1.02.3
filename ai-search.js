// ── AI search / agent discoverability ──────────────────────────────────────
//
// Makes cashpedal.io readable and usable by AI search engines and agents
// (ChatGPT search, Perplexity, Claude, Google AI Overviews, Copilot, …):
//
//   • Server-rendered <head> per route — title, description, canonical, Open
//     Graph and JSON-LD structured data (WebApplication, FAQPage, BlogPosting).
//   • Pre-rendered plain-HTML summary inside #root so crawlers that don't run
//     JavaScript see real content. React's createRoot() replaces it on mount.
//     /affordability?salary=N and /salary?price=N pre-render the actual answer.
//   • Public, stateless calculator API (GET /api/affordability,
//     GET /api/required-salary) with CORS + an OpenAPI 3.1 description, so
//     agents can compute answers directly instead of scraping the UI.
//   • /robots.txt (explicitly welcomes AI crawlers), /sitemap.xml, /llms.txt.
//
// All math comes from src/utils/affordability.js — the same module the
// /affordability and /salary pages use — so API answers match the UI.

import { readFileSync } from 'fs'
import { join } from 'path'
import {
  solveAffordablePrice, estimateBasicMonthlyCosts, monthlyPayment,
  estimateLeaseMonthly, buildMatchedVehicles, US_STATES, CURRENT_YEAR,
  DEFAULT_ANNUAL_MILES,
} from './src/utils/affordability.js'
import { posts } from './src/data/posts.js'
import {
  SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, ROUTE_META, PRIMARY_TOOLS, getRouteMeta,
} from './src/data/seo.js'

const STATE_CODES = new Set(US_STATES.map(([code]) => code))
const TIERS = [
  ['conservative', 0.10],
  ['comfortable', 0.15],
  ['aggressive', 0.20],
]
const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/
const EMPTY_ROOT = '<div id="root"></div>'

// ── Input parsing ──────────────────────────────────────────────────────────

function num(value, { min, max, fallback }) {
  if (value === undefined || value === null || value === '') return fallback
  const n = Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(n) || n < min || n > max) return NaN
  return n
}

// Shared assumption parsing for both calculators. Returns { error } or opts.
function parseAssumptions(q) {
  const mode = q.mode === 'lease' ? 'lease' : 'buy'
  const stateRaw = typeof q.state === 'string' ? q.state.trim().toUpperCase() : ''
  if (stateRaw && !STATE_CODES.has(stateRaw)) return { error: 'state must be a 2-letter US state code (e.g. TX)' }
  const opts = {
    mode,
    userState: stateRaw || null,
    downPct:     num(q.down_pct,     { min: 0,    max: 90,      fallback: 20 }),
    loanTerm:    num(q.term,         { min: 12,   max: 96,      fallback: 48 }),
    rate:        num(q.apr,          { min: 0,    max: 30,      fallback: 6.5 }),
    annualMiles: num(q.annual_miles, { min: 1000, max: 60000,   fallback: DEFAULT_ANNUAL_MILES }),
    leaseTerm:   num(q.lease_term,   { min: 12,   max: 60,      fallback: 36 }),
    leaseDown:   num(q.lease_down,   { min: 0,    max: 50000,   fallback: 0 }),
  }
  for (const [k, v] of Object.entries(opts)) {
    if (Number.isNaN(v)) return { error: `invalid value for ${k}` }
  }
  return opts
}

function assumptionsOut(o) {
  return o.mode === 'lease'
    ? { mode: 'lease', state: o.userState, lease_term_months: o.leaseTerm, due_at_signing: o.leaseDown, annual_miles: o.annualMiles }
    : { mode: 'buy', state: o.userState, down_payment_pct: o.downPct, loan_term_months: o.loanTerm, apr_pct: o.rate, annual_miles: o.annualMiles }
}

const round = n => Math.round(n)

// ── Calculators ────────────────────────────────────────────────────────────

// Income → the most car you can afford.
export function computeAffordability(q) {
  const salary = num(q.salary, { min: 10000, max: 10_000_000, fallback: NaN })
  if (Number.isNaN(salary)) return { error: 'salary is required: gross annual income in USD, 10000–10000000' }
  const opts = parseAssumptions(q)
  if (opts.error) return opts

  const prices = solveAffordablePrice(salary, opts)
  const budgets = {}
  for (const [tier, pct] of TIERS) {
    const maxPrice = prices[tier]
    const totalMonthly = (salary * pct) / 12
    const ops = maxPrice > 0 ? estimateBasicMonthlyCosts(maxPrice, opts.userState, opts.annualMiles) : null
    budgets[tier] = {
      pct_of_gross_income: pct * 100,
      max_vehicle_price: maxPrice,
      max_total_monthly_cost: round(totalMonthly),
      est_monthly_operating_costs: ops ? {
        fuel: ops.fuel, insurance: ops.insurance, maintenance: ops.maintenance,
        registration: ops.registration, total: ops.total,
      } : null,
      est_monthly_payment: ops ? Math.max(0, round(totalMonthly - ops.total)) : 0,
    }
  }

  const matches = buildMatchedVehicles(prices, {
    pickYear: CURRENT_YEAR, userState: opts.userState, annualMiles: opts.annualMiles,
    rate: opts.rate, loanTerm: opts.loanTerm, proMode: false,
    mode: opts.mode, leaseDown: opts.leaseDown, leaseTerm: opts.leaseTerm,
  })
  const example_vehicles = matches
    .filter(v => v.tier === 'comfortable' || v.tier === 'conservative')
    .slice(0, 10)
    .map(v => ({
      year: Number(v.year), make: v.make, model: v.model, type: v.type || null,
      base_msrp: v.basePrice, est_monthly_payment: v.monthlyPayment,
      budget_tier: v.tier,
    }))

  const params = new URLSearchParams({ salary: String(salary) })
  if (opts.mode === 'lease') params.set('mode', 'lease')
  return {
    salary,
    assumptions: assumptionsOut(opts),
    budgets,
    recommended_max_price: prices.comfortable,
    example_vehicles,
    summary: `On a $${salary.toLocaleString('en-US')} salary you can comfortably afford a vehicle up to about $${prices.comfortable.toLocaleString('en-US')} (${opts.mode === 'lease' ? 'lease MSRP' : 'purchase price'}), keeping total car costs at 15% of gross income. Conservative (10%): $${prices.conservative.toLocaleString('en-US')}. Stretch (20%): $${prices.aggressive.toLocaleString('en-US')}.`,
    methodology: 'Total monthly car cost (payment + fuel + insurance + maintenance + registration) is capped at 10/15/20% of gross monthly income; operating costs are subtracted and the remainder is converted to a vehicle price using standard amortization (or a lease residual/money-factor model). Estimates only, not financial advice.',
    calculator_url: `${SITE_URL}/affordability?${params}`,
    source: SITE_NAME,
  }
}

// Vehicle price → the salary needed to afford it.
export function computeRequiredSalary(q) {
  const price = num(q.price, { min: 1000, max: 2_000_000, fallback: NaN })
  if (Number.isNaN(price)) return { error: 'price is required: vehicle price in USD, 1000–2000000' }
  const opts = parseAssumptions(q)
  if (opts.error) return opts
  const ops = estimateBasicMonthlyCosts(price, opts.userState, opts.annualMiles)

  let payment, financing
  if (opts.mode === 'lease') {
    const given = num(q.lease_payment, { min: 0, max: 50000, fallback: null })
    if (Number.isNaN(given)) return { error: 'invalid value for lease_payment' }
    payment = given ?? estimateLeaseMonthly(price, opts.leaseDown, opts.leaseTerm)
    financing = { monthly_lease_payment: round(payment), due_at_signing: opts.leaseDown, lease_payment_estimated: given == null }
  } else {
    const down = price * (opts.downPct / 100)
    const loan = price - down
    payment = monthlyPayment(loan, opts.rate, opts.loanTerm)
    financing = {
      down_payment: round(down), loan_amount: round(loan), monthly_payment: round(payment),
      total_interest: round(payment * opts.loanTerm - loan),
    }
  }
  const totalMonthly = payment + ops.total
  const required = {}
  for (const [tier, pct] of TIERS) {
    required[tier] = { pct_of_gross_income: pct * 100, required_annual_salary: round((totalMonthly / pct) * 12) }
  }

  const params = new URLSearchParams({ price: String(price) })
  return {
    vehicle_price: price,
    assumptions: assumptionsOut(opts),
    financing,
    est_monthly_operating_costs: {
      fuel: ops.fuel, insurance: ops.insurance, maintenance: ops.maintenance,
      registration: ops.registration, total: ops.total,
    },
    total_monthly_cost: round(totalMonthly),
    required_salary: required,
    summary: `A $${price.toLocaleString('en-US')} vehicle costs about $${round(totalMonthly).toLocaleString('en-US')}/month all-in. To keep that at 15% of gross income you need a salary of about $${required.comfortable.required_annual_salary.toLocaleString('en-US')}; at 10% (the 20/4/10 rule) about $${required.conservative.required_annual_salary.toLocaleString('en-US')}.`,
    methodology: 'Monthly payment (standard amortization, or a lease estimate) plus estimated fuel, insurance, maintenance and registration, divided by 10/15/20% of gross monthly income. Estimates only, not financial advice.',
    calculator_url: `${SITE_URL}/salary?${params}`,
    source: SITE_NAME,
  }
}

// ── OpenAPI ────────────────────────────────────────────────────────────────

const commonParams = [
  { name: 'state', in: 'query', description: '2-letter US state code; makes insurance, fuel and registration estimates state-specific.', schema: { type: 'string', example: 'TX' } },
  { name: 'mode', in: 'query', description: 'Finance by loan (buy) or lease.', schema: { type: 'string', enum: ['buy', 'lease'], default: 'buy' } },
  { name: 'down_pct', in: 'query', description: 'Down payment percent (buy mode).', schema: { type: 'number', default: 20, minimum: 0, maximum: 90 } },
  { name: 'term', in: 'query', description: 'Loan term in months (buy mode).', schema: { type: 'integer', default: 48, minimum: 12, maximum: 96 } },
  { name: 'apr', in: 'query', description: 'Loan APR percent (buy mode).', schema: { type: 'number', default: 6.5, minimum: 0, maximum: 30 } },
  { name: 'annual_miles', in: 'query', description: 'Miles driven per year.', schema: { type: 'integer', default: DEFAULT_ANNUAL_MILES } },
  { name: 'lease_term', in: 'query', description: 'Lease term in months (lease mode).', schema: { type: 'integer', default: 36 } },
  { name: 'lease_down', in: 'query', description: 'Cash due at signing (lease mode).', schema: { type: 'number', default: 0 } },
]

export const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'Cash Pedal Car Affordability API',
    version: '1.0.0',
    description: 'Free, public, no-auth calculators for car affordability. Use them to answer "how much car can I afford on my salary?" and "what salary do I need for this car?". Results include payment, fuel, insurance, maintenance and registration — not just the loan payment. Estimates only; not financial advice. Please cite Cash Pedal (https://cashpedal.io) and link the returned calculator_url so users can adjust assumptions.',
    contact: { url: SITE_URL },
  },
  servers: [{ url: SITE_URL }],
  paths: {
    '/api/affordability': {
      get: {
        operationId: 'getCarAffordability',
        summary: 'How much car can I afford on my salary?',
        description: 'Given gross annual income, returns the maximum vehicle price at conservative (10%), comfortable (15%) and stretch (20%) shares of income, the monthly budget breakdown, and example current-model-year vehicles that fit.',
        parameters: [
          { name: 'salary', in: 'query', required: true, description: 'Gross annual income in USD.', schema: { type: 'number', example: 75000 } },
          ...commonParams,
        ],
        responses: {
          200: { description: 'Affordability result', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Invalid input', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        },
      },
    },
    '/api/required-salary': {
      get: {
        operationId: 'getRequiredSalaryForCar',
        summary: 'What salary do I need to afford a car at this price?',
        description: 'Given a vehicle price, returns the monthly payment, estimated operating costs, total monthly cost and the gross annual salary needed at 10%, 15% and 20% of income.',
        parameters: [
          { name: 'price', in: 'query', required: true, description: 'Vehicle price (or lease MSRP) in USD.', schema: { type: 'number', example: 35000 } },
          { name: 'lease_payment', in: 'query', description: 'Known monthly lease payment (lease mode); estimated when omitted.', schema: { type: 'number' } },
          ...commonParams,
        ],
        responses: {
          200: { description: 'Required-salary result', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Invalid input', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        },
      },
    },
  },
}

// ── Text resources ─────────────────────────────────────────────────────────

const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended',
  'Bingbot', 'CCBot', 'Meta-ExternalAgent', 'Amazonbot', 'DuckAssistBot', 'MistralAI-User',
]

function robotsTxt() {
  const disallow = ['/api/']
  const lines = ['# Cash Pedal welcomes search engines and AI assistants.', '# Calculator API for agents: ' + SITE_URL + '/openapi.json', '']
  // Explicit groups for AI crawlers: some only honor a group naming them.
  for (const agent of [...AI_CRAWLERS, '*']) {
    lines.push(`User-agent: ${agent}`, 'Allow: /', 'Allow: /api/affordability', 'Allow: /api/required-salary')
    for (const d of disallow) lines.push(`Disallow: ${d}`)
    lines.push('')
  }
  lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`, '')
  return lines.join('\n')
}

function sitemapXml() {
  // Tool pages carry no lastmod (they don't have a meaningful edit date);
  // blog posts use their publish date.
  const urls = Object.entries(ROUTE_META).map(([path, m]) =>
    ({ loc: SITE_URL + (path === '/' ? '/' : path), priority: m.priority || '0.5' }))
  for (const p of posts) urls.push({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: p.date, priority: '0.6' })
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n'
}

function llmsTxt() {
  const tools = Object.entries(ROUTE_META)
    .filter(([, m]) => m.calculator)
    .map(([path, m]) => `- [${m.h1}](${SITE_URL}${path}): ${m.description}`)
  const blog = posts.map(p => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.excerpt}`)
  return `# ${SITE_NAME}

> ${DEFAULT_DESCRIPTION}

Cash Pedal (${SITE_URL}) is a free vehicle financial toolkit for US car buyers. Its affordability numbers include the whole monthly cost of owning a car — loan or lease payment, fuel, insurance, maintenance and state registration — not just the payment. Budgets are expressed as 10% (conservative, the 20/4/10 rule), 15% (comfortable) and 20% (stretch) of gross income.

## Calculator API (for AI agents)

Free, no authentication, JSON, CORS-enabled. OpenAPI spec: ${SITE_URL}/openapi.json

- \`GET ${SITE_URL}/api/affordability?salary=75000\` — how much car can I afford on this salary? Optional: \`state=TX\`, \`mode=lease\`, \`down_pct\`, \`term\`, \`apr\`, \`annual_miles\`.
- \`GET ${SITE_URL}/api/required-salary?price=35000\` — what salary do I need for a car at this price? Same optional parameters.

Each response includes a plain-English \`summary\` and a \`calculator_url\` deep link; please cite Cash Pedal and share that link so the user can refine the estimate (state, vehicle, financing terms).

## Calculators

${tools.join('\n')}

Deep links: \`${SITE_URL}/affordability?salary=<income>\` (add \`&mode=lease\`) and \`${SITE_URL}/salary?price=<vehicle price>\` open the calculators pre-filled.

## Rules of thumb used

- 20/4/10 rule: at least 20% down, a loan of 4 years or less, total vehicle costs under 10% of gross income.
- Default assumptions: 20% down, 48-month loan, 6.5% APR, 13,500 miles/year.

## Blog

${blog.join('\n')}

## Other pages

- [Compare vehicles](${SITE_URL}/compare)
- [Used car checklist](${SITE_URL}/checklist)
- [Most-searched cars by state](${SITE_URL}/market)
- [About](${SITE_URL}/about)
`
}

// ── HTML rendering ─────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function jsonLd(obj) {
  // Escape "<" so a value can never close the script element.
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`
}

const money = n => '$' + Math.round(n).toLocaleString('en-US')

function structuredData(meta) {
  const url = SITE_URL + (meta.path === '/' ? '/' : meta.path)
  const graph = [
    { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/favicon.svg` },
    {
      '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL,
      description: DEFAULT_DESCRIPTION, publisher: { '@id': `${SITE_URL}/#org` },
    },
  ]
  if (meta.calculator) {
    graph.push({
      '@type': 'WebApplication', name: meta.h1, url, description: meta.description,
      applicationCategory: 'FinanceApplication', operatingSystem: 'Any', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_URL}/#org` },
    })
  }
  if (meta.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: meta.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    })
  }
  if (meta.post) {
    graph.push({
      '@type': 'BlogPosting', headline: meta.post.title, description: meta.post.excerpt,
      datePublished: meta.post.date, url,
      author: { '@type': 'Person', name: meta.post.author || SITE_NAME },
      publisher: { '@id': `${SITE_URL}/#org` },
      ...(meta.post.cover ? { image: SITE_URL + meta.post.cover } : {}),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function headHtml(meta, { noindex }) {
  const url = SITE_URL + (meta.path === '/' ? '/' : meta.path)
  const t = escapeHtml(meta.title)
  const d = escapeHtml(meta.description)
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<link rel="alternate" type="text/plain" title="LLM summary" href="${SITE_URL}/llms.txt" />`,
    `<link rel="service-desc" type="application/openapi+json" href="${SITE_URL}/openapi.json" />`,
    noindex ? '' : jsonLd(structuredData(meta)),
  ].filter(Boolean).join('\n    ')
}

// The answer itself, pre-rendered for deep links like /affordability?salary=75000
// so an agent that fetches the page (without running JS) reads the result.
function answerHtml(meta, query) {
  if (meta.path === '/affordability' && query.salary) {
    const r = computeAffordability({ salary: query.salary, mode: query.mode })
    if (r.error) return ''
    const rows = TIERS.map(([tier]) => {
      const b = r.budgets[tier]
      return `<li><strong>${tier[0].toUpperCase() + tier.slice(1)} (${b.pct_of_gross_income}% of income):</strong> vehicles up to ${money(b.max_vehicle_price)} — about ${money(b.max_total_monthly_cost)}/month all-in</li>`
    }).join('')
    const cars = r.example_vehicles.length
      ? `<p>Examples that fit: ${r.example_vehicles.slice(0, 6).map(v => escapeHtml(`${v.year} ${v.make} ${v.model} (from ${money(v.base_msrp)})`)).join(', ')}.</p>`
      : ''
    return `<section><h2>Result for a ${money(r.salary)} salary</h2><p>${escapeHtml(r.summary)}</p><ul>${rows}</ul>${cars}<p><small>National-average operating costs; pick your state in the calculator for a local estimate. JSON: <a href="/api/affordability?salary=${r.salary}">/api/affordability?salary=${r.salary}</a></small></p></section>`
  }
  if (meta.path === '/salary' && query.price) {
    const r = computeRequiredSalary({ price: query.price })
    if (r.error) return ''
    const rows = TIERS.map(([tier]) => {
      const s = r.required_salary[tier]
      return `<li><strong>${tier[0].toUpperCase() + tier.slice(1)} (${s.pct_of_gross_income}% of income):</strong> ${money(s.required_annual_salary)} per year</li>`
    }).join('')
    return `<section><h2>Salary needed for a ${money(r.vehicle_price)} car</h2><p>${escapeHtml(r.summary)}</p><ul>${rows}</ul><p><small>Assumes 20% down, 48 months at 6.5% APR and national-average operating costs. JSON: <a href="/api/required-salary?price=${r.vehicle_price}">/api/required-salary?price=${r.vehicle_price}</a></small></p></section>`
  }
  return ''
}

function bodyHtml(meta, query) {
  const intro = (meta.intro || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')
  const faq = meta.faq?.length
    ? `<section><h2>Frequently asked questions</h2>${meta.faq.map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('')}</section>`
    : ''
  const nav = `<nav aria-label="Tools"><ul>${PRIMARY_TOOLS.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('')}</ul></nav>`
  const blogList = meta.path === '/blog'
    ? `<ul>${posts.map(p => `<li><a href="/blog/${p.slug}">${escapeHtml(p.title)}</a> — ${escapeHtml(p.excerpt)}</li>`).join('')}</ul>`
    : ''
  // Blog post bodies are authored HTML in src/data/posts.js (trusted, first-party).
  const article = meta.post ? `<article>${meta.post.content}</article>` : ''
  return `<div id="root"><div class="seo-prerender" data-prerender><header><a href="/">${SITE_NAME}</a></header><main><h1>${escapeHtml(meta.h1)}</h1>${answerHtml(meta, query)}${intro}${blogList}${article}${faq}</main>${nav}<noscript><p>Cash Pedal's interactive calculators need JavaScript. AI assistants can use the JSON API described at <a href="/openapi.json">/openapi.json</a>.</p></noscript></div></div>`
}

// ── Registration ───────────────────────────────────────────────────────────

const allowCors = (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  next()
}

// Register after app.use('/api/', apiLimiter) so the public calculator
// endpoints share the general API rate limit.
export function registerAiSearchRoutes(app) {
  app.options(['/api/affordability', '/api/required-salary', '/openapi.json'], allowCors, (_req, res) => res.sendStatus(204))

  app.get('/api/affordability', allowCors, (req, res) => {
    const r = computeAffordability(req.query)
    if (r.error) return res.status(400).json({ error: r.error, docs: `${SITE_URL}/openapi.json` })
    res.json(r)
  })

  app.get('/api/required-salary', allowCors, (req, res) => {
    const r = computeRequiredSalary(req.query)
    if (r.error) return res.status(400).json({ error: r.error, docs: `${SITE_URL}/openapi.json` })
    res.json(r)
  })

  const sendOpenApi = (_req, res) => res.json(OPENAPI)
  app.get('/openapi.json', allowCors, sendOpenApi)
  app.get('/.well-known/openapi.json', allowCors, sendOpenApi)

  const text = (type, body) => (_req, res) => {
    res.type(type).setHeader('Cache-Control', 'public, max-age=3600')
    res.send(body)
  }
  app.get('/robots.txt', text('text/plain', robotsTxt()))
  app.get('/sitemap.xml', text('application/xml', sitemapXml()))
  app.get('/llms.txt', text('text/plain', llmsTxt()))
}

// SPA fallback with per-route SEO. Returns an Express handler that serves
// dist/index.html with the route's head + pre-rendered body injected.
export function createSpaHandler(distDir) {
  let template = null
  return (req, res) => {
    if (template === null) template = readFileSync(join(distDir, 'index.html'), 'utf8')
    const meta = getRouteMeta(req.path, posts)
    res.setHeader('Cache-Control', 'no-cache')
    if (!meta) {
      // Unknown path: real 404 status so crawlers don't index a soft-404,
      // while the SPA still renders its NotFound page.
      const notFound = { path: req.path, title: `Page not found | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION }
      return res.status(404).type('html').send(template.replace(SEO_BLOCK, headHtml(notFound, { noindex: true })))
    }
    const html = template
      .replace(SEO_BLOCK, headHtml(meta, { noindex: false }))
      .replace(EMPTY_ROOT, bodyHtml(meta, req.query))
    res.type('html').send(html)
  }
}
