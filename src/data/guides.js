// ── Affordability answer guides ─────────────────────────────────────────────
//
// Programmatic "answer pages" for the questions car shoppers type into search
// engines and AI assistants:
//
//   /guides/how-much-car-can-i-afford-75000-salary
//   /guides/salary-needed-for-40000-car
//
// Every number is computed from src/utils/affordability.js — the same model
// the /affordability and /salary calculators use — so a guide always agrees
// with the tool it links to. Each page carries data a reader can't get from
// a generic rule of thumb: all-in monthly cost, loan-term trade-offs, a
// 50-state comparison and current-model-year vehicles at that price.
//
// Pure module (no browser APIs) — rendered by both the React Guide page and
// the server pre-renderer in ai-search.js.

import VEHICLES from './vehicles.json' with { type: 'json' }
import {
  solveAffordablePrice, estimateBasicMonthlyCosts, monthlyPayment,
  estimateLeaseMonthly, US_STATES, CURRENT_YEAR, DEFAULT_ANNUAL_MILES,
} from '../utils/affordability.js'

export const SALARY_LEVELS = [
  30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 75000,
  80000, 85000, 90000, 100000, 110000, 120000, 130000, 150000, 175000, 200000, 250000,
]
export const PRICE_LEVELS = [
  15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000,
  70000, 80000, 90000, 100000,
]

const DEFAULTS = { rate: 6.5, loanTerm: 48, downPct: 20, annualMiles: DEFAULT_ANNUAL_MILES }
const STATE_NAME = Object.fromEntries(US_STATES)
const TIER_INFO = [
  { key: 'conservative', pct: 10, label: 'Conservative', note: 'the 20/4/10 rule' },
  { key: 'comfortable', pct: 15, label: 'Comfortable', note: 'recommended' },
  { key: 'aggressive', pct: 20, label: 'Stretch', note: 'tight budget' },
]

export const money = n => '$' + Math.round(n).toLocaleString('en-US')
const short = n => n >= 1000 && n % 1000 === 0 ? `$${n / 1000}k` : money(n)

export const salaryGuidePath = s => `/guides/how-much-car-can-i-afford-${s}-salary`
export const priceGuidePath = p => `/guides/salary-needed-for-${p}-car`

function nearest(list, target) {
  return list.reduce((best, v) => Math.abs(v - target) < Math.abs(best - target) ? v : best, list[0])
}

function neighbours(list, value) {
  const i = list.indexOf(value)
  return [list[i - 1], list[i + 1]].filter(Boolean)
}

// Cheapest current-model-year models whose base MSRP sits in [lo, hi].
function vehiclesInRange(lo, hi, limit = 8) {
  const out = []
  for (const [make, models] of Object.entries(VEHICLES)) {
    for (const [model, data] of Object.entries(models)) {
      const trims = data.trims_by_year?.[CURRENT_YEAR]
      if (!trims) continue
      const base = Math.min(...Object.values(trims))
      if (base >= lo && base <= hi) out.push({ year: CURRENT_YEAR, make, model, type: data.type || null, basePrice: base, isEv: !!data.is_ev })
    }
  }
  // Closest to the top of the range first — "the most car this budget buys".
  out.sort((a, b) => b.basePrice - a.basePrice)
  // Keep variety: at most two models per make.
  const perMake = {}
  return out.filter(v => (perMake[v.make] = (perMake[v.make] || 0) + 1) <= 2).slice(0, limit)
}

// Cheapest current-model-year new car in the catalog.
let cheapestNewCache = null
function cheapestNew() {
  if (!cheapestNewCache) cheapestNewCache = vehiclesInRange(0, 1e9, 1e9).sort((a, b) => a.basePrice - b.basePrice)[0]
  return cheapestNewCache
}

const allInMonthly = (price, state, { rate, loanTerm, downPct, annualMiles } = DEFAULTS) => {
  const ops = estimateBasicMonthlyCosts(price, state, annualMiles)
  const payment = monthlyPayment(price * (1 - downPct / 100), rate, loanTerm)
  return { payment, ops, total: payment + ops.total }
}

// ── Salary → affordable price ──────────────────────────────────────────────

const salaryCache = new Map()

export function buildSalaryGuide(salary) {
  if (!SALARY_LEVELS.includes(salary)) return null
  if (salaryCache.has(salary)) return salaryCache.get(salary)

  const prices = solveAffordablePrice(salary, { userState: null, ...DEFAULTS })
  const tiers = TIER_INFO.map(t => {
    const monthlyBudget = salary * t.pct / 100 / 12
    const ops = estimateBasicMonthlyCosts(prices[t.key], null, DEFAULTS.annualMiles)
    return { ...t, maxPrice: prices[t.key], monthlyBudget, operating: ops.total, payment: Math.max(0, monthlyBudget - ops.total) }
  })
  const comfortable = prices.comfortable

  // Same 15% budget stretched over longer loans: higher price, more interest.
  const terms = [36, 48, 60, 72].map(term => {
    const p = solveAffordablePrice(salary, { userState: null, ...DEFAULTS, loanTerm: term }).comfortable
    const loan = p * 0.8
    const pay = monthlyPayment(loan, DEFAULTS.rate, term)
    return { term, maxPrice: p, payment: pay, interest: pay * term - loan }
  })

  const lease = solveAffordablePrice(salary, { userState: null, ...DEFAULTS, mode: 'lease', leaseTerm: 36, leaseDown: 0 }).comfortable

  const byState = US_STATES
    .map(([code, name]) => ({ code, name, maxPrice: solveAffordablePrice(salary, { userState: code, ...DEFAULTS }).comfortable }))
    .sort((a, b) => b.maxPrice - a.maxPrice)
  const best = byState.slice(0, 5)
  const worst = byState.slice(-5).reverse()

  let vehicles = vehiclesInRange(prices.conservative * 0.85, comfortable)
  let vehiclesNote = `${CURRENT_YEAR} models priced at or below the comfortable budget (base MSRP, before destination and options).`
  if (!vehicles.length) {
    vehicles = vehiclesInRange(0, prices.aggressive)
    vehiclesNote = vehicles.length
      ? `No new ${CURRENT_YEAR} car fits the comfortable budget. These are the new models that fit only the 20% stretch budget; a 2–4-year-old used car is the safer target.`
      : `No new ${CURRENT_YEAR} car fits even the 20% stretch budget, so a dependable used car is the realistic target.`
  }
  const cheapest = cheapestNew()

  const nearPrice = nearest(PRICE_LEVELS.filter(p => p > comfortable), comfortable * 1.3) || PRICE_LEVELS.at(-1)
  const nearPriceTotal = allInMonthly(nearPrice, null).total
  const nearPricePct = nearPriceTotal * 12 / salary * 100

  const s = short(salary)
  const guide = {
    kind: 'salary',
    path: salaryGuidePath(salary),
    salary,
    title: `How Much Car Can I Afford on ${s} a Year? (${CURRENT_YEAR} Numbers) | Cash Pedal`,
    description: `On a ${money(salary)} salary you can comfortably afford a car up to about ${money(comfortable)} — about ${money(tiers[1].monthlyBudget)}/month including the payment, gas, insurance, maintenance and registration. See the 10/15/20% budgets, the best and worst states, and ${CURRENT_YEAR} cars that fit.`,
    h1: `How much car can I afford on a ${money(salary)} salary?`,
    answer: [
      `On a ${money(salary)} salary (about ${money(salary / 2080)}/hour) you can comfortably afford a vehicle priced up to about ${money(comfortable)}. That keeps your total car costs — loan payment plus gas, insurance, maintenance and registration — at about ${money(tiers[1].monthlyBudget)} a month, or 15% of gross income.`,
      prices.conservative >= 5000
        ? `If you follow the stricter 20/4/10 rule (10% of income), aim for ${money(prices.conservative)} or less; ${money(prices.aggressive)} is the stretch ceiling at 20%.`
        : `The stricter 20/4/10 rule (10% of income) can't be met with a financed car at this income — gas, insurance and upkeep alone use up that budget. ${money(prices.aggressive)} is the stretch ceiling at 20%.`,
      cheapest && comfortable < cheapest.basePrice
        ? `That is below the price of the cheapest new ${CURRENT_YEAR} car (the ${cheapest.make} ${cheapest.model} at ${money(cheapest.basePrice)}), so a reliable used car is the realistic choice.`
        : '',
    ].filter(Boolean).join(' '),
    tiers,
    terms,
    lease,
    best,
    worst,
    stateSpread: best[0].maxPrice - worst[0].maxPrice,
    vehicles,
    vehiclesNote,
    faq: [
      [`Can I afford a ${money(nearPrice)} car on ${money(salary)} a year?`,
        `A ${money(nearPrice)} car costs about ${money(nearPriceTotal)} a month all-in with 20% down and a 48-month loan at 6.5% APR — ${nearPricePct.toFixed(0)}% of a ${money(salary)} gross income. ${nearPricePct <= 15 ? 'That is within the comfortable 15% guideline.' : nearPricePct <= 20 ? 'That is above the comfortable 15% guideline but under the 20% stretch limit.' : 'That is above the 20% stretch limit, so it would strain the budget.'}`],
      [`How much should my car payment be on ${money(salary)} a year?`,
        `The comfortable total car budget is about ${money(tiers[1].monthlyBudget)} a month. After roughly ${money(tiers[1].operating)} a month for gas, insurance, maintenance and registration, that leaves about ${money(tiers[1].payment)} for the loan payment itself.`],
      [`Does a longer loan let me afford more car?`,
        `Yes, but it costs more. With the same ${money(tiers[1].monthlyBudget)}/month budget, a 72-month loan raises the price you can afford to about ${money(terms[3].maxPrice)} (vs ${money(terms[1].maxPrice)} on 48 months) but adds about ${money(terms[3].interest - terms[1].interest)} in interest, and you are likely to owe more than the car is worth for longer.`],
      [`Which state is cheapest to own a car in on ${money(salary)}?`,
        `Because insurance, fuel and registration vary by state, the same salary buys about ${money(best[0].maxPrice)} of car in ${best[0].name} but only about ${money(worst[0].maxPrice)} in ${worst[0].name} at the 15% comfortable budget.`],
    ],
    related: {
      salaries: neighbours(SALARY_LEVELS, salary),
      prices: PRICE_LEVELS.filter(p => Math.abs(p - comfortable) <= 10000).slice(0, 3),
    },
    calculatorUrl: `/affordability?salary=${salary}`,
  }
  salaryCache.set(salary, guide)
  return guide
}

// ── Price → required salary ────────────────────────────────────────────────

const priceCache = new Map()

export function buildPriceGuide(price) {
  if (!PRICE_LEVELS.includes(price)) return null
  if (priceCache.has(price)) return priceCache.get(price)

  const base = allInMonthly(price, null)
  const salaryFor = (monthly, pct) => monthly * 12 / (pct / 100)
  const required = TIER_INFO.map(t => ({ ...t, salary: salaryFor(base.total, t.pct) }))
  const comfortable = required[1].salary

  const terms = [36, 48, 60, 72].map(term => {
    const r = allInMonthly(price, null, { ...DEFAULTS, loanTerm: term })
    const loan = price * 0.8
    return { term, payment: r.payment, interest: r.payment * term - loan, salary: salaryFor(r.total, 15) }
  })

  const downs = [0, 10, 20].map(pct => {
    const r = allInMonthly(price, null, { ...DEFAULTS, downPct: pct })
    return { pct, cash: price * pct / 100, payment: r.payment, salary: salaryFor(r.total, 15) }
  })

  const leasePayment = estimateLeaseMonthly(price, 0, 36)
  const leaseSalary = salaryFor(leasePayment + base.ops.total, 15)

  const byState = US_STATES
    .map(([code, name]) => {
      const r = allInMonthly(price, code)
      return { code, name, monthly: r.total, salary: salaryFor(r.total, 15) }
    })
    .sort((a, b) => a.salary - b.salary)
  const best = byState.slice(0, 5)
  const worst = byState.slice(-5).reverse()

  let vehicles = vehiclesInRange(price * 0.85, price * 1.1)
  if (vehicles.length < 4) vehicles = vehiclesInRange(price * 0.75, price * 1.2)
  const cheapest = cheapestNew()
  const vehiclesNote = vehicles.length
    ? `New ${CURRENT_YEAR} models with a base MSRP near ${money(price)} (before destination and options).`
    : cheapest && price < cheapest.basePrice
      ? `No new ${CURRENT_YEAR} car sells for ${money(price)} — the cheapest is the ${cheapest.make} ${cheapest.model} at ${money(cheapest.basePrice)} — so this budget points to a used car. The cost figures above still apply to a used car at this price.`
      : `No ${CURRENT_YEAR} models in our catalog have a base MSRP near ${money(price)}.`

  const p = short(price)
  const guide = {
    kind: 'price',
    path: priceGuidePath(price),
    price,
    title: `What Salary Do I Need for a ${p} Car? (${CURRENT_YEAR}) | Cash Pedal`,
    description: `A ${money(price)} car costs about ${money(base.total)}/month all-in. To keep that at a comfortable 15% of income you need a salary of about ${money(comfortable)} (${money(required[0].salary)} under the 20/4/10 rule). Loan-term, down-payment and state-by-state breakdowns.`,
    h1: `What salary do you need for a ${money(price)} car?`,
    answer: `To comfortably afford a ${money(price)} car you need a gross salary of about ${money(comfortable)} a year (${money(comfortable / 2080)}/hour). With 20% down and a 48-month loan at 6.5% APR, the payment is about ${money(base.payment)} a month, and gas, insurance, maintenance and registration add roughly ${money(base.ops.total)} — about ${money(base.total)} a month in total. Under the stricter 20/4/10 rule (10% of income) you would need ${money(required[0].salary)}; the bare minimum at 20% of income is ${money(required[2].salary)}.`,
    monthly: {
      payment: base.payment,
      fuel: base.ops.fuel, insurance: base.ops.insurance,
      maintenance: base.ops.maintenance, registration: base.ops.registration,
      total: base.total,
    },
    required,
    terms,
    downs,
    lease: { payment: leasePayment, salary: leaseSalary },
    best,
    worst,
    vehicles,
    vehiclesNote,
    faq: [
      [`How much is the monthly payment on a ${money(price)} car?`,
        `With 20% (${money(price * 0.2)}) down at 6.5% APR: about ${money(terms[0].payment)} on 36 months, ${money(terms[1].payment)} on 48, ${money(terms[2].payment)} on 60 and ${money(terms[3].payment)} on 72 months. Budget another ${money(base.ops.total)} a month for gas, insurance, maintenance and registration.`],
      [`Can I afford a ${money(price)} car making ${money(nearest(SALARY_LEVELS, comfortable * 0.75))}?`,
        (() => {
          const s = nearest(SALARY_LEVELS, comfortable * 0.75)
          const pct = base.total * 12 / s * 100
          return `It would take about ${pct.toFixed(0)}% of a ${money(s)} gross income. ${pct <= 15 ? 'That is within the comfortable 15% guideline.' : pct <= 20 ? 'That is over the comfortable 15% guideline but under the 20% stretch limit — doable with little room for surprises.' : 'That is over the 20% stretch limit; a cheaper car or a larger down payment would be safer.'}`
        })()],
      [`Is it cheaper to lease a ${money(price)} car?`,
        `A typical 36-month lease with nothing down runs about ${money(leasePayment)} a month, which lowers the comfortable salary to about ${money(leaseSalary)} — but you own nothing at the end, and mileage limits apply.`],
      [`Does where I live change the salary I need?`,
        `Yes. Insurance, fuel and registration differ a lot by state: a ${money(price)} car needs about ${money(best[0].salary)} in ${best[0].name} but about ${money(worst[0].salary)} in ${worst[0].name} to stay at 15% of income.`],
    ],
    related: {
      prices: neighbours(PRICE_LEVELS, price),
      salaries: SALARY_LEVELS.filter(s => Math.abs(s - comfortable) <= 15000).slice(0, 3),
    },
    calculatorUrl: `/salary?price=${price}`,
  }
  priceCache.set(price, guide)
  return guide
}

// ── Lookup ─────────────────────────────────────────────────────────────────

export function guideFromSlug(slug) {
  let m = /^how-much-car-can-i-afford-(\d+)-salary$/.exec(slug)
  if (m) return buildSalaryGuide(Number(m[1]))
  m = /^salary-needed-for-(\d+)-car$/.exec(slug)
  if (m) return buildPriceGuide(Number(m[1]))
  return null
}

export const GUIDES_INDEX = {
  path: '/guides',
  title: 'Car Affordability Guides by Salary and Price | Cash Pedal',
  description: 'How much car can you afford on your salary, and what salary do you need for a given car? Data-backed answers for every income from $30k to $250k and car prices from $15k to $100k, with state-by-state comparisons.',
  h1: 'Car affordability guides',
  intro: 'Quick, data-backed answers for the two questions every car buyer asks. Every figure includes the whole cost of owning a car — payment, gas, insurance, maintenance and registration — not just the loan.',
}

export function allGuidePaths() {
  return [...SALARY_LEVELS.map(salaryGuidePath), ...PRICE_LEVELS.map(priceGuidePath)]
}

export { STATE_NAME, CURRENT_YEAR }

// ── Page sections ──────────────────────────────────────────────────────────
// A renderer-neutral description of each guide page — headings, paragraphs,
// tables and link lists — consumed by both src/pages/Guide.jsx and the server
// pre-renderer (ai-search.js), so humans and crawlers see identical content.
// Section shape: { heading, paragraphs?, table?: { head, rows }, links?: [{ href, label }], note? }

const pct = n => `${n}%`
const vehicleLinks = list => list.map(v => ({
  href: `/tco?make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}&year=${v.year}`,
  label: `${v.year} ${v.make} ${v.model}${v.isEv ? ' (EV)' : ''} — from ${money(v.basePrice)}`,
}))

function stateTable(best, worst, valueLabel, value) {
  return {
    head: ['State', valueLabel],
    rows: [
      ...best.map(s => [s.name, value(s)]),
      ['…', '…'],
      ...worst.slice().reverse().map(s => [s.name, value(s)]),
    ],
  }
}

export function guideSections(g) {
  if (g.kind === 'salary') {
    return [
      {
        heading: `Your car budget on ${money(g.salary)}`,
        table: {
          head: ['Budget', 'Share of income', 'Total car costs / month', 'Loan payment / month', 'Max car price'],
          rows: g.tiers.map(t => [`${t.label} (${t.note})`, pct(t.pct), money(t.monthlyBudget), money(t.payment), t.maxPrice ? money(t.maxPrice) : 'Not feasible']),
        },
        note: 'Assumes 20% down, a 48-month loan at 6.5% APR, 13,500 miles a year and national-average fuel, insurance, maintenance and registration costs.',
      },
      {
        heading: g.vehicles.length ? `${CURRENT_YEAR} cars that fit` : `New cars on ${money(g.salary)}`,
        paragraphs: [g.vehiclesNote],
        links: vehicleLinks(g.vehicles),
      },
      {
        heading: 'Does a longer loan help?',
        paragraphs: [`Stretching the loan raises the price you can fit into the same ${money(g.tiers[1].monthlyBudget)}/month budget, but you pay more interest and stay "underwater" (owing more than the car is worth) for longer.`],
        table: {
          head: ['Loan term', 'Max car price (15% budget)', 'Monthly payment', 'Total interest'],
          rows: g.terms.map(t => [`${t.term} months`, money(t.maxPrice), money(t.payment), money(t.interest)]),
        },
      },
      {
        heading: 'What about leasing?',
        paragraphs: [`With the same 15% budget, a 36-month lease with nothing down fits a car with an MSRP of about ${money(g.lease)} — ${g.lease > g.tiers[1].maxPrice ? 'more car than buying, ' : ''}but you return it at the end with no equity, and mileage caps apply.`],
      },
      {
        heading: 'Where you live changes the answer',
        paragraphs: [`Insurance, gas prices and registration fees differ by state. At the same 15% budget, a ${money(g.salary)} salary buys ${money(g.stateSpread)} more car in ${g.best[0].name} than in ${g.worst[0].name}.`],
        table: stateTable(g.best, g.worst, 'Max car price (15% budget)', s => money(s.maxPrice)),
      },
    ]
  }
  return [
    {
      heading: `Monthly cost of a ${money(g.price)} car`,
      table: {
        head: ['Cost', 'Per month'],
        rows: [
          ['Loan payment (20% down, 48 mo, 6.5% APR)', money(g.monthly.payment)],
          ['Gas', money(g.monthly.fuel)],
          ['Insurance', money(g.monthly.insurance)],
          ['Maintenance', money(g.monthly.maintenance)],
          ['Registration & fees', money(g.monthly.registration)],
          ['Total', money(g.monthly.total)],
        ],
      },
      note: 'National averages at 13,500 miles a year. Pick your state and exact vehicle in the calculator for a local estimate.',
    },
    {
      heading: 'Salary needed',
      table: {
        head: ['Budget', 'Share of income', 'Salary needed', 'Hourly'],
        rows: g.required.map(t => [`${t.label} (${t.note})`, pct(t.pct), money(t.salary), money(t.salary / 2080)]),
      },
    },
    {
      heading: 'How the loan term changes it',
      table: {
        head: ['Loan term', 'Monthly payment', 'Total interest', 'Salary needed (15%)'],
        rows: g.terms.map(t => [`${t.term} months`, money(t.payment), money(t.interest), money(t.salary)]),
      },
    },
    {
      heading: 'How the down payment changes it',
      table: {
        head: ['Down payment', 'Cash up front', 'Monthly payment', 'Salary needed (15%)'],
        rows: g.downs.map(d => [pct(d.pct), money(d.cash), money(d.payment), money(d.salary)]),
      },
    },
    {
      heading: 'Lease instead?',
      paragraphs: [`A 36-month lease with nothing down on a ${money(g.price)} car runs about ${money(g.lease.payment)} a month, bringing the comfortable salary down to about ${money(g.lease.salary)}. You build no equity and mileage limits apply.`],
    },
    {
      heading: 'Salary needed by state',
      paragraphs: [`Insurance, gas and registration vary by state, so the same car needs a different income depending on where you live.`],
      table: stateTable(g.best, g.worst, 'Salary needed (15%)', s => money(s.salary)),
    },
    {
      heading: `${CURRENT_YEAR} cars around ${money(g.price)}`,
      paragraphs: [g.vehiclesNote],
      links: vehicleLinks(g.vehicles),
    },
  ]
}

export function relatedLinks(g) {
  return [
    ...g.related.salaries.map(s => ({ href: salaryGuidePath(s), label: `How much car can I afford on ${money(s)}?` })),
    ...g.related.prices.map(p => ({ href: priceGuidePath(p), label: `Salary needed for a ${money(p)} car` })),
  ]
}
