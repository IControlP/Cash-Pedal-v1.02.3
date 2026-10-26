// Lifestyle calculator engine — pure functions, no browser APIs, so it stays
// importable from Node (verify-lifestyle.mjs, future server pre-render).
//
// Flow: profile + priorities → take-home pay → three budget pillars
// (Foundation / Lifestyle / Cushion) → what each pillar can buy: housing,
// neighborhood types, dining & travel, a car tier. All figures are estimates.

import DATA from '../data/lifestyleData.json' with { type: 'json' }
import {
  estimateInsurance, computeAnnualFuel, computeAnnualRegFees,
} from './vehicleCosts.js'

export const STATES = DATA.states

// ACS reports GROSS rent (contract rent + utilities) on existing leases; the
// engine budgets utilities separately, so convert gross → contract rent.
export const GROSS_TO_CONTRACT = 0.92

// Resolve the cost data for a profile: a city row (ACS place + metro RPP) when
// supplied, otherwise the state row. Any field a city lacks falls back to its state.
export function locationFor(profile) {
  const state = STATES[profile.state] ?? STATES.TX
  const city = profile.city && profile.city.state === profile.state ? profile.city : null
  return {
    state, city,
    label: city ? `${city.name}, ${city.state}` : null,
    rent: city?.rent ?? state.rent,
    medianHome: city?.medianHome ?? state.medianHome,
    propTaxPct: city?.propTaxPct ?? state.propTaxPct,
    rpp: city?.rpp ?? state.rpp,
  }
}

// ── Priorities (survey) ────────────────────────────────────────────────────
export const PRIORITY_KEYS = ['home', 'city', 'dining', 'travel', 'car', 'cushion', 'family']
export const DEFAULT_PRIORITIES = Object.fromEntries(PRIORITY_KEYS.map(k => [k, 3]))

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+']
const AGE_CUSHION_BONUS = { '18-24': 0, '25-34': 0, '35-44': 2, '45-54': 4, '55+': 5 }

// ── Taxes (2025 federal; state via effective-rate table) ──────────────────
const FED = {
  single: {
    std: 15000,
    brackets: [[11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]],
  },
  married: {
    std: 30000,
    brackets: [[23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
  },
}
const SS_WAGE_BASE = 176100
const CHILD_CREDIT = 2200

function bracketTax(taxable, brackets) {
  let tax = 0
  let prev = 0
  for (const [top, rate] of brackets) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, top) - prev) * rate
    prev = top
  }
  return tax
}

// incomes: array of gross annual wages (one for singles, two for couples).
export function takeHome(incomes, state, married, children = 0) {
  const gross = incomes.reduce((a, b) => a + (Number(b) || 0), 0)
  const f = married ? FED.married : FED.single
  let federal = bracketTax(Math.max(0, gross - f.std), f.brackets)
  federal = Math.max(0, federal - CHILD_CREDIT * children)
  const fica = incomes.reduce((sum, inc) => {
    const w = Number(inc) || 0
    return sum + Math.min(w, SS_WAGE_BASE) * 0.062 + w * 0.0145
  }, 0)
  const statePct = STATES[state]?.stateTaxPct ?? 4
  const stateTax = gross * (statePct / 100) * Math.min(1.4, Math.max(0.6, gross / 75000))
  const net = gross - federal - fica - stateTax
  return {
    gross, federal: Math.round(federal), fica: Math.round(fica), state: Math.round(stateTax),
    annual: Math.round(net), monthly: Math.round(net / 12),
  }
}

// ── Pillar split ──────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function pillarPercents(profile, priorities) {
  const p = { ...DEFAULT_PRIORITIES, ...priorities }
  let lifestyle = 30 + 1.5 * (p.dining - 3) + 1.5 * (p.travel - 3)
  let cushion = 20 + 2 * (p.cushion - 3) + (AGE_CUSHION_BONUS[profile.age] ?? 0)
  lifestyle = clamp(lifestyle, 10, 40)
  cushion = clamp(cushion, 10, 35)
  let foundation = 100 - lifestyle - cushion
  if (foundation > 65) { lifestyle -= foundation - 65; foundation = 65 }
  lifestyle = Math.max(10, lifestyle)
  foundation = 100 - lifestyle - cushion
  return { foundation, lifestyle, cushion }
}

// ── Housing model ─────────────────────────────────────────────────────────
const BEDROOM_PRICE = { 0: 0.5, 1: 0.65, 2: 0.85, 3: 1, 4: 1.2 }

export const NEIGHBORHOOD_TYPES = [
  { type: 'urban-core', label: 'Urban core', rent: 1.30, price: 1.40,
    blurb: 'Walk to restaurants, transit and nightlife; smaller homes.',
    walk: 5, nightlife: 5, space: 1, schools: 3 },
  { type: 'inner-suburb', label: 'Inner suburb', rent: 1.10, price: 1.15,
    blurb: 'Walkable main streets, a short ride to downtown, a balance of space and energy.',
    walk: 4, nightlife: 3, space: 3, schools: 4 },
  { type: 'outer-suburb', label: 'Outer suburb', rent: 0.92, price: 0.95,
    blurb: 'Yards, newer homes and well-regarded schools; a car for most trips.',
    walk: 2, nightlife: 2, space: 4, schools: 5 },
  { type: 'small-town', label: 'Small town / exurb', rent: 0.75, price: 0.70,
    blurb: 'Most space for the money and the lowest housing costs; quieter and car-dependent.',
    walk: 2, nightlife: 1, space: 5, schools: 3 },
]

export function bedroomsNeeded(children, adults) {
  if (children >= 2) return 3
  if (children === 1) return 2
  return adults >= 2 ? 1 : 1
}

const roundTo = (n, step = 5) => Math.round(n / step) * step

function monthlyPayment(principal, annualRatePct, months) {
  const r = annualRatePct / 100 / 12
  return r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months))
}

function balanceAfter(principal, annualRatePct, months, paid) {
  const r = annualRatePct / 100 / 12
  const pmt = monthlyPayment(principal, annualRatePct, months)
  return principal * Math.pow(1 + r, paid) - pmt * ((Math.pow(1 + r, paid) - 1) / r)
}

export const MORTGAGE = { ratePct: 6.75, years: 30, downPct: 0.10, closingPct: 0.03, insurancePct: 0.0045, maintPct: 0.01 }

// Monthly all-in cost of owning a home of a given price.
export function ownCostMonthly(price, propTaxPct) {
  const loan = price * (1 - MORTGAGE.downPct)
  const pi = monthlyPayment(loan, MORTGAGE.ratePct, MORTGAGE.years * 12)
  const tax = price * propTaxPct / 100 / 12
  const ins = price * MORTGAGE.insurancePct / 12
  const pmi = MORTGAGE.downPct < 0.2 ? loan * 0.006 / 12 : 0
  const maint = price * MORTGAGE.maintPct / 12
  return { pi, tax, ins, pmi, maint, total: pi + tax + ins + pmi + maint }
}

function maxHomePrice(monthlyBudget, propTaxPct) {
  if (monthlyBudget <= 0) return 0
  let lo = 0
  let hi = 5_000_000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (ownCostMonthly(mid, propTaxPct).total > monthlyBudget) hi = mid
    else lo = mid
  }
  return Math.floor(lo / 1000) * 1000
}

// 7-year net cost of buying vs renting (principal paid is equity, not cost).
function rentVsBuy(price, propTaxPct, monthlyRent, years = 7) {
  const months = years * 12
  const c = ownCostMonthly(price, propTaxPct)
  const loan = price * (1 - MORTGAGE.downPct)
  const interest = c.pi * months - (loan - balanceAfter(loan, MORTGAGE.ratePct, MORTGAGE.years * 12, months))
  const carrying = (c.tax + c.ins + c.maint) * months + c.pmi * Math.min(months, 48)
  const upfront = price * (MORTGAGE.downPct + MORTGAGE.closingPct)
  const opportunity = upfront * (Math.pow(1.05, years) - 1)
  const finalValue = price * Math.pow(1.03, years)
  const appreciation = finalValue - price
  const selling = finalValue * 0.06
  const buyNet = interest + carrying + price * MORTGAGE.closingPct + opportunity + selling - appreciation
  let rentTotal = 0
  for (let y = 0; y < years; y++) rentTotal += 12 * monthlyRent * Math.pow(1.03, y)
  return { buyNet: Math.round(buyNet), rentTotal: Math.round(rentTotal), years }
}

// ── Car tier ──────────────────────────────────────────────────────────────
function carRunningMonthly(price, state) {
  const fuel = computeAnnualFuel(false, 28, null, state, 13500) / 12
  const ins = estimateInsurance(price, null, null, null, state) / 12
  const reg = computeAnnualRegFees(state, price) / 12
  const maint = clamp(50 + price * 0.0021, 60, 180)
  return fuel + ins + reg + maint
}

const CAR_LOAN = { downPct: 0.2, apr: 6.5, months: 60 }

export function carTier(transportMonthly, state) {
  const cost = price => monthlyPayment(price * (1 - CAR_LOAN.downPct), CAR_LOAN.apr, CAR_LOAN.months) + carRunningMonthly(price, state)
  if (cost(5000) > transportMonthly) return { maxPrice: 0, tier: 'Transit & budget used', monthlyBudget: Math.round(transportMonthly) }
  let lo = 5000
  let hi = 200000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (cost(mid) > transportMonthly) hi = mid
    else lo = mid
  }
  const maxPrice = Math.floor(lo / 500) * 500
  const tier = maxPrice >= 60000 ? 'Luxury' : maxPrice >= 35000 ? 'Premium' : maxPrice >= 20000 ? 'Mainstream' : 'Practical'
  return { maxPrice, tier, monthlyBudget: Math.round(transportMonthly), monthlyAtMax: Math.round(cost(maxPrice)) }
}

// ── Main entry ────────────────────────────────────────────────────────────
// profile: { incomes: number[], age, state, married, children, roommates (singles, 0–3),
//            debtMonthly, savedForHome }
export function computeLifestyle(profile, priorities = DEFAULT_PRIORITIES) {
  const pr = { ...DEFAULT_PRIORITIES, ...priorities }
  const married = !!profile.married
  const adults = married ? 2 : 1
  const children = Math.max(0, profile.children | 0)
  const roommates = !married && children === 0 ? clamp(profile.roommates | 0, 0, 3) : 0
  const people = roommates + 1
  const debt = Math.max(0, Number(profile.debtMonthly) || 0)
  const loc = locationFor(profile)
  const st = loc
  // Regional price parities (US = 100) applied per category.
  const goodsIdx = loc.rpp.goods / 100
  const utilIdx = loc.rpp.utilities / 100
  const svcIdx = loc.rpp.other / 100
  const household = adults + children

  const tax = takeHome(profile.incomes, profile.state, married, children)
  const TH = tax.monthly
  const gross = tax.gross
  const pct = pillarPercents(profile, pr)

  // Foundation fixed costs (everything except housing)
  const bedrooms = bedroomsNeeded(children, adults)
  const utilitiesTotal = (150 + 40 * bedrooms) * utilIdx
  const sharedBedrooms = Math.max(2, people)
  const utilities = roommates ? (150 + 40 * sharedBedrooms) * utilIdx / people : utilitiesTotal
  const groceries = 380 * (adults + 0.6 * children) * goodsIdx
  const health = 280 * adults + 120 * children
  const childcare = 650 * children * svcIdx
  const transportPct = clamp(0.12 + 0.02 * (pr.car - 3), 0.07, 0.20)
  const transport = transportPct * TH
  const fixed = { debt, utilities, groceries, health, childcare, transport }
  const fixedTotal = Object.values(fixed).reduce((a, b) => a + b, 0)

  // Childcare comes off the top: the pillar split applies to what's left, and
  // childcare joins Foundation, so kids don't silently squeeze Lifestyle/Cushion.
  const splitBase = TH - childcare
  const foundationBudget = (pct.foundation / 100) * splitBase + childcare
  const rawHousing = foundationBudget - fixedTotal
  // Housing always gets at least 25% of take-home before we call it tight; the
  // difference is drawn from Lifestyle then Cushion below.
  const housingBudget = Math.max(rawHousing, 0.25 * TH)
  const rentCap = Math.min(housingBudget, 0.33 * gross / 12)

  // Rent by neighborhood type
  const unitRent = b => loc.rent[Math.min(4, b)] * GROSS_TO_CONTRACT
  const rentOwn = t => unitRent(bedrooms) * t.rent
  const rentFor = t => roommates ? unitRent(sharedBedrooms) * t.rent / people : rentOwn(t)
  const types = NEIGHBORHOOD_TYPES.map(t => {
    const rent = roundTo(rentFor(t))
    const typicalPrice = roundTo(st.medianHome * t.price * BEDROOM_PRICE[bedrooms], 1000)
    const score = pr.city * (t.walk + t.nightlife) / 2 + pr.home * t.space + pr.family * t.schools + pr.dining * t.nightlife * 0.5
    return { ...t, rent, typicalPrice, score, rentFits: rent <= rentCap }
  })
  const cheapest = types.reduce((a, b) => (b.rent < a.rent ? b : a))
  const fitting = types.filter(t => t.rentFits).sort((a, b) => b.score - a.score)
  const best = fitting[0] ?? cheapest
  const tight = fitting.length === 0

  // Housing spend and the flow of leftover dollars
  let housingSpend = best.rent
  let lifestyleAmt = (pct.lifestyle / 100) * splitBase
  let cushionAmt = (pct.cushion / 100) * splitBase
  const delta = rawHousing - housingSpend
  if (delta >= 0) {
    lifestyleAmt += delta / 2
    cushionAmt += delta / 2
  } else {
    let short = -delta
    const fromLifestyle = Math.min(short, Math.max(0, lifestyleAmt - 0.1 * TH))
    lifestyleAmt -= fromLifestyle
    short -= fromLifestyle
    cushionAmt -= short
  }
  const stretched = cushionAmt < 0 || tight

  // Lifestyle breakdown → concrete units
  const wD = 1 + 0.35 * (pr.dining - 3)
  const wT = 1 + 0.35 * (pr.travel - 3)
  const wF = 1
  const wSum = wD + wT + wF
  const diningAmt = lifestyleAmt * wD / wSum
  const travelAmt = lifestyleAmt * wT / wSum
  const funAmt = lifestyleAmt * wF / wSum
  const mealCost = 22 * svcIdx
  const mealsPerWeekPerPerson = diningAmt / (4.33 * mealCost * household)
  const getawayCost = 600 * svcIdx * household
  const getawaysPerYear = (travelAmt * 12) / getawayCost

  // Cushion breakdown
  const downShare = pr.home >= 3 ? 0.4 : 0.2
  const cushion = {
    total: Math.round(cushionAmt),
    homeFund: Math.round(cushionAmt * downShare),
    retirementAndEmergency: Math.round(cushionAmt * (1 - downShare)),
  }

  // Buying
  const maxPiti = Math.min(housingBudget, 0.28 * gross / 12)
  const maxPrice = maxHomePrice(maxPiti, st.propTaxPct)
  const buyTypes = types.map(t => ({ type: t.type, affordable: t.typicalPrice <= maxPrice }))
  const buyable = types.filter(t => t.typicalPrice <= maxPrice).sort((a, b) => b.score - a.score)
  const buyTarget = buyable[0] ?? null
  let housing
  if (!buyTarget) {
    const closest = types.reduce((a, b) => (b.typicalPrice < a.typicalPrice ? b : a))
    housing = {
      verdict: 'rent', maxPrice,
      headline: `Renting is your best fit right now`,
      detail: `Your monthly budget supports a home up to about $${maxPrice.toLocaleString()}; the most affordable typical home near you is about $${closest.typicalPrice.toLocaleString()}. Renting keeps your options open while you build toward it.`,
    }
  } else {
    const downNeeded = buyTarget.typicalPrice * (MORTGAGE.downPct + MORTGAGE.closingPct)
    const saved = Math.max(0, Number(profile.savedForHome) || 0)
    const monthlyToHome = cushion.homeFund
    const monthsToReady = saved >= downNeeded ? 0 : monthlyToHome > 0 ? Math.ceil((downNeeded - saved) / monthlyToHome) : Infinity
    const years = monthsToReady / 12
    const cmp = rentVsBuy(buyTarget.typicalPrice, st.propTaxPct, buyTarget.rent * (roommates ? people : 1))
    const buyBeatsRent = cmp.buyNet <= cmp.rentTotal * 1.1
    let verdict
    let headline
    if (!buyBeatsRent) {
      verdict = 'rent'
      headline = 'Renting keeps more money in your pocket'
    } else if (years <= 0.5) {
      verdict = 'buy-now'
      headline = `You can buy a home — up to about $${maxPrice.toLocaleString()}`
    } else if (years <= 5) {
      verdict = 'buy-soon'
      headline = `You're about ${Math.max(1, Math.round(years * 10) / 10)} year${years > 1.05 ? 's' : ''} from buying`
    } else {
      verdict = 'rent'
      headline = 'Rent now, and build toward buying'
    }
    housing = {
      verdict, headline, maxPrice,
      detail: `A typical ${buyTarget.label.toLowerCase()} home runs about $${buyTarget.typicalPrice.toLocaleString()}. Over ${cmp.years} years, owning nets out to roughly $${cmp.buyNet.toLocaleString()} vs $${cmp.rentTotal.toLocaleString()} renting.`,
      targetType: buyTarget.type,
      downPaymentNeeded: Math.round(downNeeded),
      monthsToReady: Number.isFinite(monthsToReady) ? monthsToReady : null,
      compare: cmp,
    }
  }

  return {
    profile: { ...profile, married, children, roommates },
    tax, pillars: {
      percents: pct,
      foundation: Math.round(fixedTotal + housingSpend),
      lifestyle: Math.round(lifestyleAmt),
      cushion: Math.round(cushionAmt),
    },
    foundation: {
      housing: Math.round(housingSpend),
      ...Object.fromEntries(Object.entries(fixed).map(([k, v]) => [k, Math.round(v)])),
    },
    housing: { ...housing, housingBudget: Math.round(housingBudget), rentCap: Math.round(rentCap), bedrooms, people, tight, stretched },
    neighborhoods: types.map(({ score, ...t }) => ({ ...t, best: t.type === best.type, buyable: buyTypes.find(b => b.type === t.type).affordable })),
    best: best.type,
    lifestyle: {
      total: Math.round(lifestyleAmt),
      dining: Math.round(diningAmt), travel: Math.round(travelAmt), fun: Math.round(funAmt),
      mealsOutPerPersonPerWeek: Math.round(mealsPerWeekPerPerson * 10) / 10,
      getawaysPerYear: Math.round(getawaysPerYear * 10) / 10,
    },
    cushion,
    car: carTier(transport, profile.state),
  }
}

// What would clearing existing debt free up? Debt is a fixed cost inside
// Foundation, so paying it off flows to Lifestyle and Cushion (and a bigger
// home budget when housing isn't already at its floor).
export function debtPayoffGain(profile, priorities) {
  if (!(Number(profile.debtMonthly) > 0)) return { monthly: 0, homePrice: 0 }
  const base = computeLifestyle(profile, priorities)
  const clear = computeLifestyle({ ...profile, debtMonthly: 0 }, priorities)
  return {
    monthly: Math.round(clear.pillars.lifestyle + clear.pillars.cushion - base.pillars.lifestyle - base.pillars.cushion),
    homePrice: clear.housing.maxPrice - base.housing.maxPrice,
  }
}

// ── Cost centers (for charts) ─────────────────────────────────────────────
export const COST_CENTER_DEFS = [
  { key: 'housing',    label: 'Housing',                 pillar: 'foundation', get: r => r.foundation.housing },
  { key: 'groceries',  label: 'Groceries',               pillar: 'foundation', get: r => r.foundation.groceries },
  { key: 'transport',  label: 'Car & transport',         pillar: 'foundation', get: r => r.foundation.transport },
  { key: 'utilities',  label: 'Utilities',               pillar: 'foundation', get: r => r.foundation.utilities },
  { key: 'health',     label: 'Health & insurance',      pillar: 'foundation', get: r => r.foundation.health },
  { key: 'childcare',  label: 'Childcare',               pillar: 'foundation', get: r => r.foundation.childcare },
  { key: 'debt',       label: 'Debt payments',           pillar: 'foundation', get: r => r.foundation.debt },
  { key: 'dining',     label: 'Dining out',              pillar: 'lifestyle',  get: r => r.lifestyle.dining },
  { key: 'travel',     label: 'Travel',                  pillar: 'lifestyle',  get: r => r.lifestyle.travel },
  { key: 'fun',        label: 'Hobbies & entertainment', pillar: 'lifestyle',  get: r => r.lifestyle.fun },
  { key: 'homeFund',   label: 'Home fund',               pillar: 'cushion',    get: r => r.cushion.homeFund },
  { key: 'retirement', label: 'Retirement & safety net', pillar: 'cushion',    get: r => r.cushion.retirementAndEmergency },
]

// All cost centers with their monthly amount and share of take-home pay.
export function costCenters(r) {
  const take = Math.max(1, r.tax.monthly)
  return COST_CENTER_DEFS.map(d => {
    const amount = Math.max(0, Math.round(d.get(r)))
    return { key: d.key, label: d.label, pillar: d.pillar, amount, share: amount / take }
  })
}

// ── Scenarios: new job and/or new city ────────────────────────────────────
// scenario: { state?, incomes? } — anything omitted stays as in `profile`.
export function compareScenarios(profile, scenario, priorities = DEFAULT_PRIORITIES) {
  const now = computeLifestyle(profile, priorities)
  const next = computeLifestyle({ ...profile, ...scenario }, priorities)
  const a = Object.fromEntries(costCenters(now).map(c => [c.key, c.amount]))
  const rows = costCenters(next).map(c => ({ ...c, before: a[c.key], delta: c.amount - a[c.key] }))
  return {
    now, next, rows,
    takeHomeDelta: next.tax.monthly - now.tax.monthly,
    discretionaryDelta: (next.pillars.lifestyle + next.pillars.cushion) - (now.pillars.lifestyle + now.pillars.cushion),
  }
}

// Gross household income needed in `state` to keep today's Lifestyle + Cushion
// dollars (what you can spend on life beyond fixed costs), same household.
export function equivalentIncome(profile, state, priorities = DEFAULT_PRIORITIES, city = null) {
  const baseline = computeLifestyle(profile, priorities)
  const target = baseline.pillars.lifestyle + baseline.pillars.cushion
  const total = profile.incomes.reduce((a, b) => a + (Number(b) || 0), 0)
  const at = k => {
    const r = computeLifestyle({ ...profile, state, city, incomes: profile.incomes.map(i => (Number(i) || 0) * k) }, priorities)
    return r.pillars.lifestyle + r.pillars.cushion
  }
  let lo = 0.3
  let hi = 4
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (at(mid) < target) lo = mid
    else hi = mid
  }
  const income = Math.round(total * hi / 500) * 500
  return { income, ratio: hi }
}

// Life-stage helpers --------------------------------------------------------
// Cash needed to move into a first place: first month + deposit + setup.
export function moveInCash(r) {
  const rent = r.foundation.housing * Math.max(1, r.housing.people)
  const pi = locationFor(r.profile).rpp.other / 100
  const own = r.profile.roommates ? r.foundation.housing : rent
  const setup = 1800 * pi
  return { firstAndDeposit: Math.round(own * 2), setup: Math.round(setup), total: Math.round(own * 2 + setup) }
}

// Months to build a 3-month Foundation emergency fund using half of Cushion.
export function emergencyFund(r) {
  const target = Math.round(3 * r.pillars.foundation)
  const monthly = Math.max(0, r.cushion.total * 0.5)
  return { target, monthly: Math.round(monthly), months: monthly > 0 ? Math.ceil(target / monthly) : null }
}

// How the user's priorities redirect money versus a neutral set of priorities.
export function priorityShifts(profile, priorities) {
  const mine = costCenters(computeLifestyle(profile, priorities))
  const base = Object.fromEntries(costCenters(computeLifestyle(profile, DEFAULT_PRIORITIES)).map(c => [c.key, c.amount]))
  return mine.map(c => ({ ...c, delta: c.amount - base[c.key] })).sort((a, b) => b.delta - a.delta)
}
