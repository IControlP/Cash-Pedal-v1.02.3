// Lifestyle calculator engine — pure functions, no browser APIs, so it stays
// importable from Node (verify-lifestyle.mjs, future server pre-render).
//
// Flow: profile + priorities → take-home pay → three budget pillars
// (Foundation / Lifestyle / Cushion) → what each pillar can buy: housing,
// neighborhood types, dining & travel, a car tier. All figures are estimates.

import DATA from '../data/lifestyleData.json' with { type: 'json' }
import { planCost, travelBuys, travelRegion, TRAVEL_PLANS, PLAN_PRIORITY } from './travel.js'
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
    childcare: city?.childcare ?? state.childcare,
  }
}

// ── Priorities (survey) ────────────────────────────────────────────────────
export const PRIORITY_KEYS = ['home', 'city', 'dining', 'travel', 'car', 'cushion', 'family']
export const DEFAULT_PRIORITIES = Object.fromEntries(PRIORITY_KEYS.map(k => [k, 3]))

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+']
const AGE_CUSHION_BONUS = { '18-24': 0, '25-34': 0, '35-44': 2, '45-54': 4, '55+': 5 }

// ── Taxes (2026 federal per Rev. Proc. 2025-32 via Tax Foundation; state per
// the Tax Foundation 2026 table in lifestyleData.json) ───────────────────
const FED = {
  single: {
    std: 16100,
    brackets: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
  },
  married: {
    std: 32200,
    brackets: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
  },
}
const SS_WAGE_BASE = 184500 // 2026 Social Security wage base (SSA announcement; not re-verified in this build)
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

// State income tax on wages from the Tax Foundation 2026 table: brackets,
// standard deduction and exemptions (or credits) per filing status. Estimate
// only — no federal-deduction add-backs, local taxes or income exclusions.
export function stateIncomeTax(gross, state, married, children = 0) {
  const t = STATES[state]?.stateTax
  if (!t) return 0 // no wage income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY)
  const f = married ? t.married : t.single
  let taxable = gross - f.std - (f.exemptionIsCredit ? 0 : f.exemption)
  taxable -= t.dependentIsCredit ? 0 : t.dependent * children
  taxable = Math.max(0, taxable)
  let tax = 0
  const b = f.brackets
  for (let i = 0; i < b.length; i++) {
    const [floor, rate] = b[i]
    const top = i + 1 < b.length ? b[i + 1][0] : Infinity
    if (taxable > floor) tax += (Math.min(taxable, top) - floor) * rate
  }
  const credits = (f.exemptionIsCredit ? f.exemption : 0) + (t.dependentIsCredit ? t.dependent * children : 0)
  return Math.max(0, tax - credits)
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
  const stateTax = stateIncomeTax(gross, state, married, children)
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
// The shared insurance model prices every car under $15k at the same (full-coverage)
// rate. Cheap used cars are commonly insured liability-only or with high deductibles,
// so the lifestyle tool scales premiums down to ~60% below $8k, ramping to 100% at $15k.
export function cheapCarInsuranceFactor(price) {
  if (price <= 8000) return 0.6
  if (price >= 15000) return 1
  return 0.6 + 0.4 * (price - 8000) / 7000
}

function carRunningMonthly(price, state, miles = 13500) {
  const fuel = computeAnnualFuel(false, 28, null, state, miles) / 12
  const ins = estimateInsurance(price, null, null, null, state) / 12 * cheapCarInsuranceFactor(price)
  const reg = computeAnnualRegFees(state, price) / 12
  const maint = clamp(50 + price * 0.0021, 60, 180)
  return fuel + ins + reg + maint
}

const CAR_LOAN = { downPct: 0.2, apr: 6.5, months: 60 }

export function carTier(transportMonthly, state, miles = 13500) {
  const cost = price => monthlyPayment(price * (1 - CAR_LOAN.downPct), CAR_LOAN.apr, CAR_LOAN.months) + carRunningMonthly(price, state, miles)
  const FLOOR = 2500
  if (cost(FLOOR) > transportMonthly) return { maxPrice: 0, tier: 'Car-light', monthlyBudget: Math.round(transportMonthly) }
  let lo = FLOOR
  let hi = 200000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (cost(mid) > transportMonthly) hi = mid
    else lo = mid
  }
  const maxPrice = Math.floor(lo / 500) * 500
  const tier = maxPrice >= 60000 ? 'Luxury' : maxPrice >= 35000 ? 'Premium' : maxPrice >= 20000 ? 'Mainstream' : maxPrice >= 8000 ? 'Practical' : 'Budget used'
  return { maxPrice, tier, monthlyBudget: Math.round(transportMonthly), monthlyAtMax: Math.round(cost(maxPrice)) }
}

// ── Child care ───────────────────────────────────────────────────────────
// `annual` = MIT Living Wage center-based care for 1, 2 and 3 children (a blend of
// toddler, preschool and school-age rates). Children under 6 are in full-time
// daycare (marginal cost of each additional child follows MIT's totals); school-age
// children use after-school/summer care at ~35% of the one-child daycare figure.
export const SCHOOL_AGE_CARE_SHARE = 0.35
export function childcareMonthly(annual, under6, schoolAge) {
  if (!annual) return null
  const total = n => (n <= 0 ? 0 : n <= 3 ? annual[n] : annual[3] + (n - 3) * (annual[3] - annual[2]))
  return (total(under6) + schoolAge * SCHOOL_AGE_CARE_SHARE * annual[1]) / 12
}

// ── Survey answers ("prefs") ──────────────────────────────────────────────
// The survey collects concrete choices, not abstract sliders. Each one is priced
// in the visitor's own region and compared with the pillar budget. The unit costs
// below (marked "assumption") are round national figures scaled by the regional
// price parities; they are not drawn from a cited dataset.
export const COMMUTE = {
  remote: { label: 'Work from home', miles: 6000 },
  hybrid: { label: 'Hybrid (2–3 days in the office)', miles: 9500 },
  'onsite-short': { label: 'On-site, under 20 minutes', miles: 10500 },
  'onsite-medium': { label: 'On-site, 20–40 minutes', miles: 13500 },
  'onsite-long': { label: 'On-site, 40+ minutes', miles: 17500 },
}
export const GROCERY_STYLE = { budget: 0.85, standard: 1, premium: 1.3 }  // assumption: × USDA-style base
export const FITNESS_MONTHLY = { none: 0, basic: 40, boutique: 160 }      // assumption: per adult
export const HOBBY_MONTHLY = { low: 80, medium: 200, high: 450 }          // assumption: per adult
export const PET_MONTHLY = 120                                            // assumption: per pet (food, vet, supplies)
export const MEAL_COST = 22                                               // assumption: casual meal out, per person
export const EMERGENCY_TARGET_MONTHS = { steady: 3, variable: 6, uncertain: 9 }

export const DEFAULT_PREFS = {
  tenure: 'either', area: null, bedrooms: null, commute: 'onsite-medium', cars: null, carStyle: 3,
  mealsPerWeek: 2.5, groceryStyle: 'standard', fitness: 'none', hobbies: 'medium', pets: 0,
  travelPlan: 'weekends', goal: 'balanced', emergencyMonths: 1, stability: 'steady', schools: 3,
}

const bucket = (v, cuts) => cuts.findIndex(c => v <= c) + 1 || cuts.length + 1

// Maps survey answers onto the five-step priorities that shape the pillar split.
export function derivePriorities(prefs = {}) {
  const p = { ...DEFAULT_PREFS, ...prefs }
  return {
    home: { rent: 2, either: 3, 'buy-later': 4, 'buy-soon': 5 }[p.tenure] ?? 3,
    city: p.area ? { 'urban-core': 5, 'inner-suburb': 4, 'outer-suburb': 2, 'small-town': 1 }[p.area] : 3,
    dining: bucket(p.mealsPerWeek, [0.5, 1.5, 3.5, 6]),
    travel: PLAN_PRIORITY[p.travelPlan] ?? 3,
    car: clamp(p.carStyle, 1, 5),
    cushion: clamp(({ emergency: 5, debt: 4, home: 4, retire: 4, balanced: 3, enjoy: 2 }[p.goal] ?? 3) + (p.stability === 'steady' ? 0 : 1), 1, 5),
    family: clamp(p.schools, 1, 5),
  }
}

function typeRent(loc, t, bedrooms, roommates) {
  const unit = b => loc.rent[Math.min(4, b)] * GROSS_TO_CONTRACT
  if (roommates) {
    const people = roommates + 1
    return roundTo(unit(Math.max(2, people)) * t.rent / people)
  }
  return roundTo(unit(bedrooms) * t.rent)
}
const typePrice = (loc, t, bedrooms) => roundTo(loc.medianHome * t.price * BEDROOM_PRICE[bedrooms], 1000)

// Regional prices the survey shows next to each choice. Pure and cheap.
export function housingMenu(profile) {
  const loc = locationFor(profile)
  const married = !!profile.married
  const adults = married ? 2 : 1
  const children = Math.max(0, profile.children | 0)
  const roommates = !married && children === 0 ? clamp(profile.roommates | 0, 0, 3) : 0
  const need = bedroomsNeeded(children, adults)
  const svc = loc.rpp.other / 100
  const goods = loc.rpp.goods / 100
  const diners = adults + 0.5 * children
  const areaType = t => NEIGHBORHOOD_TYPES.find(x => x.type === t)
  const sizeRows = type => [0, 1, 2, 3, 4].map(b => ({
    bedrooms: b, label: b === 0 ? 'Studio' : `${b} bedroom${b > 1 ? 's' : ''}`,
    rent: typeRent(loc, areaType(type), b, 0), price: typePrice(loc, areaType(type), b),
    recommended: b === need,
  }))
  return {
    label: loc.label, bedroomsNeeded: need, roommates,
    areas: NEIGHBORHOOD_TYPES.map(t => ({
      type: t.type, label: t.label, blurb: t.blurb,
      rent: typeRent(loc, t, need, roommates), price: typePrice(loc, t, need),
    })),
    sizes: Object.fromEntries(NEIGHBORHOOD_TYPES.map(t => [t.type, sizeRows(t.type)])),
    downPaymentTypical: Math.round(typePrice(loc, areaType('inner-suburb'), need) * (MORTGAGE.downPct + MORTGAGE.closingPct)),
    mealCost: Math.round(MEAL_COST * svc),
    dining: [0.5, 2.5, 5, 8].map(m => ({ value: m, monthly: Math.round(m * 4.33 * MEAL_COST * svc * diners) })),
    groceries: Object.fromEntries(Object.entries(GROCERY_STYLE).map(([k, m]) => [k, Math.round(380 * (adults + 0.6 * children) * goods * m)])),
    fitness: Object.fromEntries(Object.entries(FITNESS_MONTHLY).map(([k, v]) => [k, Math.round(v * adults * svc)])),
    hobbies: Object.fromEntries(Object.entries(HOBBY_MONTHLY).map(([k, v]) => [k, Math.round(v * adults * svc)])),
    pets: [0, 1, 2].map(n => ({ value: n, monthly: Math.round(n * PET_MONTHLY * svc) })),
    travel: {
      region: travelRegion(profile.state).label,
      plans: TRAVEL_PLANS.map(pl => {
        const c = planCost(pl.id, { state: profile.state, adults, children, svcIdx: svc })
        return { id: pl.id, label: pl.label, summary: c.summary, annual: c.annual, monthly: Math.round(c.monthly) }
      }),
    },
    transitMonthly: Math.round(150 * svc),
  }
}

// ── Main entry ────────────────────────────────────────────────────────────
// profile: { incomes: number[], age, state, city?, married, children, childrenUnder6?,
//            roommates (singles, 0–3), debtMonthly, savedForHome, prefs? (survey answers) }
// priorities: optional override; by default derived from the survey answers.
export function computeLifestyle(profile, priorities) {
  const prefs = { ...DEFAULT_PREFS, ...(profile.prefs || {}) }
  const pr = { ...DEFAULT_PRIORITIES, ...(priorities ?? derivePriorities(prefs)) }
  const married = !!profile.married
  const adults = married ? 2 : 1
  const children = Math.max(0, profile.children | 0)
  const roommates = !married && children === 0 ? clamp(profile.roommates | 0, 0, 3) : 0
  const people = roommates + 1
  const debt = Math.max(0, Number(profile.debtMonthly) || 0)
  const loc = locationFor(profile)
  // Regional price parities (US = 100) applied per category.
  const goodsIdx = loc.rpp.goods / 100
  const utilIdx = loc.rpp.utilities / 100
  const svcIdx = loc.rpp.other / 100
  const diners = adults + 0.5 * children
  const travelers = adults + 0.7 * children

  const tax = takeHome(profile.incomes, profile.state, married, children)
  const TH = tax.monthly
  const gross = tax.gross
  const pct = pillarPercents(profile, pr)

  // Foundation fixed costs (everything except housing)
  const bedrooms = Number.isFinite(prefs.bedrooms) ? clamp(prefs.bedrooms, 0, 4) : bedroomsNeeded(children, adults)
  const utilitiesTotal = (150 + 40 * bedrooms) * utilIdx
  const sharedBedrooms = Math.max(2, people)
  const utilities = roommates ? (150 + 40 * sharedBedrooms) * utilIdx / people : utilitiesTotal
  const groceries = 380 * (adults + 0.6 * children) * goodsIdx * (GROCERY_STYLE[prefs.groceryStyle] ?? 1)
  const health = 280 * adults + 120 * children
  const pets = Math.max(0, prefs.pets | 0) * PET_MONTHLY * svcIdx
  const under6 = clamp(profile.childrenUnder6 ?? children, 0, children)
  const childcare = childcareMonthly(loc.childcare, under6, children - under6) ?? 650 * children * svcIdx
  const cars = clamp(prefs.cars ?? (married ? 2 : 1), 0, 3)
  const miles = (COMMUTE[prefs.commute] ?? COMMUTE['onsite-medium']).miles
  const carShare = clamp(0.12 + 0.02 * (pr.car - 3), 0.07, 0.20)
  // A second and third car each add 60% of the first car's budget.
  const transport = cars === 0 ? 150 * svcIdx : Math.min(0.30, carShare * (1 + 0.6 * (cars - 1))) * TH
  const fixed = { debt, utilities, groceries, health, childcare, transport, pets }
  const fixedTotal = Object.values(fixed).reduce((a, b) => a + b, 0)

  // Childcare comes off the top: the pillar split applies to what's left, and
  // childcare joins Foundation, so kids don't silently squeeze Lifestyle/Cushion.
  const splitBase = TH - childcare
  const foundationBudget = (pct.foundation / 100) * splitBase + childcare
  const rawHousing = foundationBudget - fixedTotal
  // Housing always gets at least 25% of take-home before we call it tight; the
  // difference is drawn from Lifestyle then Cushion below.
  const housingBudget = Math.max(rawHousing, 0.25 * TH)
  // Rent may stretch to the standard 30% of gross income (HUD's affordability
  // line), or up to 33% when the pillar budget itself allows more. Anything above
  // the pillar budget is drawn from Lifestyle then Cushion (see `delta` below).
  const rentCap = Math.min(Math.max(housingBudget, 0.30 * gross / 12), 0.33 * gross / 12)

  // Rent and typical purchase price by neighborhood type, for the chosen size
  const types = NEIGHBORHOOD_TYPES.map(t => {
    const rent = typeRent(loc, t, bedrooms, roommates)
    const typicalPrice = typePrice(loc, t, bedrooms)
    const score = pr.city * (t.walk + t.nightlife) / 2 + pr.home * t.space + pr.family * t.schools + pr.dining * t.nightlife * 0.5
    return { ...t, rent, typicalPrice, score, rentFits: rent <= rentCap, comfortable: rent <= housingBudget }
  })
  const cheapest = types.reduce((a, b) => (b.rent < a.rent ? b : a))
  const byScore = (a, b) => b.score - a.score
  const fitting = types.filter(t => t.rentFits).sort(byScore)
  // Fallback pick: a type inside the pillar budget, else one that stretches, else the cheapest.
  const altBest = types.filter(t => t.comfortable).sort(byScore)[0] ?? fitting[0] ?? cheapest
  const wanted = prefs.area ? types.find(t => t.type === prefs.area) : null
  const best = wanted && wanted.rentFits ? wanted : altBest
  const tight = fitting.length === 0

  // The visitor's own pick, priced and checked against the budget
  let pick = null
  if (wanted) {
    const smaller = !roommates && !wanted.rentFits
      ? [0, 1, 2, 3, 4].filter(b => b < bedrooms).reverse().map(b => ({ bedrooms: b, rent: typeRent(loc, NEIGHBORHOOD_TYPES.find(x => x.type === wanted.type), b, 0) })).find(x => x.rent <= rentCap) ?? null
      : null
    pick = {
      type: wanted.type, label: wanted.label, bedrooms, rent: wanted.rent, price: wanted.typicalPrice,
      status: wanted.comfortable ? 'comfortable' : wanted.rentFits ? 'possible' : 'stretch',
      overBudget: Math.max(0, Math.round(wanted.rent - housingBudget)),
      overCap: Math.max(0, Math.round(wanted.rent - rentCap)),
      smallerSize: smaller,
      alternative: wanted.rentFits ? null : { type: altBest.type, label: altBest.label, rent: altBest.rent },
    }
  }

  // Housing spend and the flow of leftover dollars
  const housingSpend = best.rent
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

  // Lifestyle: price the visitor's wish list in their region, then fund it from the
  // Lifestyle envelope. Over budget → every item is scaled back equally; under →
  // the remainder is "room to grow".
  const mealCost = MEAL_COST * svcIdx
  const travelCtx = { state: profile.state, adults, children, svcIdx }
  const plan = planCost(prefs.travelPlan, travelCtx)
  const wish = {
    dining: prefs.mealsPerWeek * 4.33 * mealCost * diners,
    travel: plan.monthly,
    fun: (HOBBY_MONTHLY[prefs.hobbies] ?? 0) * adults * svcIdx,
    fitness: (FITNESS_MONTHLY[prefs.fitness] ?? 0) * adults * svcIdx,
  }
  const wishTotal = Object.values(wish).reduce((a, b) => a + b, 0)
  const coverage = wishTotal > 0 ? Math.min(1, Math.max(0, lifestyleAmt) / wishTotal) : 1
  const funded = Object.fromEntries(Object.entries(wish).map(([k, v]) => [k, v * coverage]))
  const flex = Math.max(0, lifestyleAmt - wishTotal)
  const mealsPerWeekPerPerson = funded.dining / (4.33 * mealCost * diners)
  const travelBuysRows = travelBuys(funded.travel * 12, travelCtx)

  // Cushion: emergency fund first when it's short, then the home fund and retirement
  const monthlyNeeds = fixedTotal + housingSpend
  const emergencyTarget = Math.round((EMERGENCY_TARGET_MONTHS[prefs.stability] ?? 3) * monthlyNeeds)
  const emergencyHave = Math.round(Math.max(0, prefs.emergencyMonths) * monthlyNeeds)
  const emergencyGap = Math.max(0, emergencyTarget - emergencyHave)
  const share = {
    home: clamp(({ rent: 0.05, either: 0.15, 'buy-later': 0.25, 'buy-soon': 0.40 }[prefs.tenure] ?? 0.15) + (prefs.goal === 'home' ? 0.15 : 0), 0, 0.6),
    emergency: emergencyGap > 0 ? (prefs.goal === 'emergency' ? 0.5 : 0.3) : 0.05,
    extraDebt: debt > 0 && prefs.goal === 'debt' ? 0.3 : 0,
    retirement: 0.2,
  }
  const shareSum = Object.values(share).reduce((a, b) => a + b, 0)
  const cushionPos = Math.max(0, cushionAmt)
  const part = k => Math.round(cushionPos * share[k] / shareSum)
  const cushion = {
    total: Math.round(cushionAmt),
    homeFund: part('home'), emergency: part('emergency'), extraDebt: part('extraDebt'), retirement: part('retirement'),
    emergencyTarget, emergencyHave, emergencyGap,
    monthsToEmergencyFund: emergencyGap > 0 && part('emergency') > 0 ? Math.ceil(emergencyGap / part('emergency')) : emergencyGap > 0 ? null : 0,
  }
  cushion.retirementAndEmergency = cushion.emergency + cushion.retirement

  // Buying
  const maxPiti = Math.min(housingBudget, 0.28 * gross / 12)
  const maxPrice = maxHomePrice(maxPiti, st_propTax(loc))
  const buyTypes = types.map(t => ({ type: t.type, affordable: t.typicalPrice <= maxPrice }))
  const buyable = types.filter(t => t.typicalPrice <= maxPrice).sort(byScore)
  const buyTarget = (wanted && wanted.typicalPrice <= maxPrice) ? wanted : (buyable[0] ?? null)
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
    const cmp = rentVsBuy(buyTarget.typicalPrice, loc.propTaxPct, buyTarget.rent * (roommates ? people : 1))
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
  if (wanted) {
    housing.wantedPrice = wanted.typicalPrice
    housing.wantedPriceGap = Math.max(0, wanted.typicalPrice - maxPrice)
  }

  // Cars: budget is per household; the tier is per car
  const car = cars === 0
    ? { maxPrice: 0, tier: 'Car-free', monthlyBudget: Math.round(transport), cars }
    : { ...carTier(transport / cars, profile.state, miles), cars, householdBudget: Math.round(transport) }

  return {
    profile: { ...profile, married, children, roommates, childrenUnder6: under6, prefs },
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
    housing: { ...housing, housingBudget: Math.round(housingBudget), rentCap: Math.round(rentCap), bedrooms, people, tight, stretched, pick, tenure: prefs.tenure },
    neighborhoods: types.map(({ score, ...t }) => ({ ...t, best: t.type === best.type, buyable: buyTypes.find(b => b.type === t.type).affordable })),
    best: best.type,
    lifestyle: {
      total: Math.round(lifestyleAmt),
      dining: Math.round(funded.dining), travel: Math.round(funded.travel), fun: Math.round(funded.fun), fitness: Math.round(funded.fitness),
      flex: Math.round(flex),
      wishes: [
        { key: 'dining', label: 'Dining out', wish: Math.round(wish.dining), funded: Math.round(funded.dining) },
        { key: 'travel', label: 'Travel', wish: Math.round(wish.travel), funded: Math.round(funded.travel) },
        { key: 'fun', label: 'Hobbies & entertainment', wish: Math.round(wish.fun), funded: Math.round(funded.fun) },
        { key: 'fitness', label: 'Fitness', wish: Math.round(wish.fitness), funded: Math.round(funded.fitness) },
      ].filter(w => w.wish > 0),
      wishTotal: Math.round(wishTotal), coverage,
      mealsOutPerPersonPerWeek: Math.round(mealsPerWeekPerPerson * 10) / 10,
      travelPlan: { id: plan.id, label: plan.label, summary: plan.summary, annual: plan.annual, region: plan.region, items: plan.items },
      travelBuys: travelBuysRows,
    },
    cushion,
    car,
  }
}

const st_propTax = loc => loc.propTaxPct

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
  { key: 'pets',       label: 'Pets',                    pillar: 'foundation', get: r => r.foundation.pets },
  { key: 'debt',       label: 'Debt payments',           pillar: 'foundation', get: r => r.foundation.debt },
  { key: 'dining',     label: 'Dining out',              pillar: 'lifestyle',  get: r => r.lifestyle.dining },
  { key: 'travel',     label: 'Travel',                  pillar: 'lifestyle',  get: r => r.lifestyle.travel },
  { key: 'fun',        label: 'Hobbies & entertainment', pillar: 'lifestyle',  get: r => r.lifestyle.fun },
  { key: 'fitness',    label: 'Fitness',                 pillar: 'lifestyle',  get: r => r.lifestyle.fitness },
  { key: 'flex',       label: 'Room to grow',            pillar: 'lifestyle',  get: r => r.lifestyle.flex },
  { key: 'emergency',  label: 'Emergency fund',          pillar: 'cushion',    get: r => r.cushion.emergency },
  { key: 'homeFund',   label: 'Home fund',               pillar: 'cushion',    get: r => r.cushion.homeFund },
  { key: 'extraDebt',  label: 'Extra debt payoff',       pillar: 'cushion',    get: r => r.cushion.extraDebt },
  { key: 'retirement', label: 'Retirement',              pillar: 'cushion',    get: r => r.cushion.retirement },
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
export function compareScenarios(profile, scenario, priorities) {
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
export function equivalentIncome(profile, state, priorities, city = null) {
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

// Emergency fund: target from income stability, what's already saved, and the pace
// the Cushion allows.
export function emergencyFund(r) {
  const c = r.cushion
  return { target: c.emergencyTarget, have: c.emergencyHave, gap: c.emergencyGap, monthly: c.emergency, months: c.monthsToEmergencyFund }
}

// How the visitor's answers redirect money versus a neutral set of answers.
export function priorityShifts(profile) {
  const mine = costCenters(computeLifestyle(profile))
  const base = Object.fromEntries(costCenters(computeLifestyle({ ...profile, prefs: {}, roommates: profile.roommates })).map(c => [c.key, c.amount]))
  return mine.map(c => ({ ...c, delta: c.amount - (base[c.key] ?? 0) })).sort((a, b) => b.delta - a.delta)
}

// Smallest gross income (same household, same place) at which the visitor's whole
// wish list is funded and their chosen home is no stretch. Returns null when it
// already is, or when even 4× today's income would not do it.
export function incomeForWishList(profile, priorities) {
  const ok = k => {
    const r = computeLifestyle({ ...profile, incomes: profile.incomes.map(i => (Number(i) || 0) * k) }, priorities)
    return r.lifestyle.coverage >= 0.999 && (!r.housing.pick || r.housing.pick.status !== 'stretch') && r.cushion.total >= 0
  }
  if (ok(1)) return null
  if (!ok(4)) return null
  let lo = 1
  let hi = 4
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (ok(mid)) hi = mid
    else lo = mid
  }
  const total = profile.incomes.reduce((a, b) => a + (Number(b) || 0), 0)
  return { income: Math.round(total * hi / 1000) * 1000, ratio: hi }
}
