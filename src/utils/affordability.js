// Shared helpers for the salary/affordability tools.
//
// The Salary Calculator (/salary — vehicle price → required income) and the
// dedicated Affordability page (/affordability — income → cars you can afford)
// share the same cost model and matched-vehicle logic. These pure helpers live
// here so both stay in exact sync; behavior is a verbatim extraction from the
// original SalaryCalculator implementation.

import VEHICLES from '../data/vehicles.json'
import {
  classifySegment,
  estimateInsurance, generateMaintenanceByYear,
  computeAnnualFuel, computeAnnualRegFees, projectRegistrationByYear,
  escalateAnnualFuel, estimateCurrentValue,
} from './vehicleCosts'

export function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Monthly payment (standard loan amortization)
export function monthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12 / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

export const DEFAULT_ANNUAL_MILES = 13500

// Average length of new-vehicle ownership in the US (~8 years, S&P Global
// Mobility). Used as the default ownership duration on the affordability tool.
export const US_AVG_OWNERSHIP_YEARS = 8
export const OWNERSHIP_YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Basic mode: state-aware when state is provided, otherwise flat tier estimates
export function estimateBasicMonthlyCosts(price, state, annualMiles = DEFAULT_ANNUAL_MILES) {
  const tierKey = price >= 60000 ? 'luxury' : price >= 35000 ? 'premium' : price >= 20000 ? 'standard' : 'economy'
  const tierLabel = { luxury: 'Luxury', premium: 'Premium', standard: 'Standard', economy: 'Economy' }
  // Maintenance stays tier-based (no brand info available in basic mode)
  const maintByTier = { luxury: 180, premium: 120, standard: 80, economy: 60 }
  const maintenance = maintByTier[tierKey]

  if (!state) {
    // No state: scale flat fuel estimate by mileage ratio; other costs stay tier-based
    const flat = { luxury: { fuel:250, insurance:280, registration:50 }, premium: { fuel:180, insurance:180, registration:35 }, standard: { fuel:150, insurance:130, registration:25 }, economy: { fuel:120, insurance:100, registration:20 } }
    const f = flat[tierKey]
    const scaledFuel = Math.round(f.fuel * (annualMiles / DEFAULT_ANNUAL_MILES))
    return { ...f, fuel: scaledFuel, maintenance, total: scaledFuel + f.insurance + maintenance + f.registration, tier: tierLabel[tierKey] }
  }

  // State provided: use shared utility functions for insurance, fuel, registration
  const fuel = Math.round(computeAnnualFuel(false, 28, null, state, annualMiles) / 12)
  const insurance = Math.round(estimateInsurance(price, null, null, null, state) / 12)
  const registration = Math.round(computeAnnualRegFees(state, price) / 12)
  return { fuel, insurance, maintenance, registration, total: fuel + insurance + maintenance + registration, tier: tierLabel[tierKey] }
}

// US state list for the selector (derived from STATE_INS_BASE keys for coverage)
export const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],
  ['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],
  ['DC','Washington D.C.'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],
  ['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
  ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],
  ['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],
  ['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
  ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],
  ['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
  ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

export const loanTermOptions = [
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
  { value: 72, label: '72 months' },
]

export const CURRENT_YEAR = String(
  Math.max(
    ...Object.values(VEHICLES).flatMap(make =>
      Object.values(make).flatMap(model =>
        Object.keys(model.trims_by_year || {}).map(Number)
      )
    )
  )
)

// Model years with broad catalog coverage, newest first — powers the "Model
// Year" selector for the matched-vehicles pick list. A handful of models
// carry a few sparse legacy year entries (e.g. a single discontinued trim
// dating back to 2008) alongside the ~200-model-deep 2015+ range; those
// near-empty years would make for a useless dropdown option, so years below
// a minimum-coverage threshold are dropped rather than hardcoding a cutoff year.
export const CATALOG_YEARS = (() => {
  const counts = {}
  Object.values(VEHICLES).forEach(make =>
    Object.values(make).forEach(model =>
      Object.keys(model.trims_by_year || {}).forEach(y => { counts[y] = (counts[y] || 0) + 1 })
    )
  )
  return Object.keys(counts)
    .filter(y => counts[y] >= 20)
    .sort((a, b) => Number(b) - Number(a))
})()

const SALARY_LUXURY_MAKES = new Set([
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Lexus', 'Acura', 'Infiniti',
  'Cadillac', 'Lincoln', 'Genesis', 'Jaguar', 'Land Rover', 'Maserati',
  'Alfa Romeo', 'Volvo', 'Buick', 'Mini', 'Ferrari', 'Tesla', 'Rivian', 'Lucid',
])

// Category filters for the matched-vehicle pick list. Body-type filters map to
// the catalog `type` field (fully populated for every model); EV/Luxury/Economy
// are cross-cutting attribute filters. These are single-select and may overlap
// (an EV SUV matches both "SUV" and "EV") — selecting one just narrows the list.
// `value`s line up with surveyData's categoryToAffordabilityFilter so the Car
// Survey can deep-link a visitor straight to the body type that fits them.
export const VEHICLE_CATEGORY_FILTERS = [
  { value: 'all',     label: 'All',      match: () => true },
  { value: 'suv',     label: 'SUV',      match: v => ['suv', 'suv_large', 'ev_suv'].includes(v.type) },
  { value: 'sedan',   label: 'Sedan',    match: v => ['sedan', 'ev_sedan'].includes(v.type) },
  { value: 'truck',   label: 'Truck',    match: v => v.type === 'truck' },
  { value: 'sports',  label: 'Sports',   match: v => v.type === 'sports' },
  { value: 'minivan', label: 'Minivan',  match: v => v.type === 'minivan' },
  { value: 'ev',      label: 'Electric', match: v => !!v.is_ev },
  { value: 'luxury',  label: 'Luxury',   match: v => SALARY_LUXURY_MAKES.has(v.make) },
  { value: 'economy', label: 'Economy',  match: v => !SALARY_LUXURY_MAKES.has(v.make) && v.basePrice <= 30000 },
]

const CATEGORY_MATCHERS = Object.fromEntries(VEHICLE_CATEGORY_FILTERS.map(f => [f.value, f.match]))

export function isCategoryValue(value) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_MATCHERS, value)
}

export function matchesCategory(vehicle, value) {
  const m = CATEGORY_MATCHERS[value]
  return m ? m(vehicle) : true
}

// Sort dimensions for the matched-vehicles pick list. cargo_cu_ft, horsepower,
// and seats are filled in for every catalog model, so they sort cleanly;
// mpg is only populated for ~14% of models and is left out until the catalog
// has fuller coverage — sorting by it would mostly be sorting by missing data.
export const SORT_OPTIONS = [
  { value: 'price', label: 'Price (High to Low)' },
  { value: 'value', label: 'Best Value (Lowest Cost)' },
  { value: 'cargo', label: 'Most Cargo Space' },
  { value: 'horsepower', label: 'Most Horsepower' },
  { value: 'seats', label: 'Most Seats' },
]

export function sortVehicles(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'value':
      sorted.sort((a, b) => (a.ownershipCost?.total ?? a.annualTotal) - (b.ownershipCost?.total ?? b.annualTotal))
      break
    case 'cargo':
      sorted.sort((a, b) => (b.specs.cargo_cu_ft ?? 0) - (a.specs.cargo_cu_ft ?? 0))
      break
    case 'horsepower':
      sorted.sort((a, b) => (b.specs.horsepower ?? 0) - (a.specs.horsepower ?? 0))
      break
    case 'seats':
      sorted.sort((a, b) => (b.specs.seats ?? 0) - (a.specs.seats ?? 0))
      break
    default:
      sorted.sort((a, b) => b.basePrice - a.basePrice)
  }
  return sorted
}

export const TIER_STYLES = {
  conservative: { color: 'text-green-400', label: '✓ Conservative' },
  comfortable:  { color: 'text-[var(--accent)]', label: 'Comfortable' },
  aggressive:   { color: 'text-amber-400', label: '⚠ Stretched' },
}

export const RECOMMENDATION_REASONING = {
  conservative: 'The most vehicle you can get in this category while keeping total costs at or below 10% of your gross income — the safest tier of the 20/4/10 rule.',
  comfortable: "Nothing in this category fits the safest 10% tier at your income — this is the top pick within the comfortable 15% tier.",
  aggressive: "Nothing in this category fits the safest or comfortable tiers at your income — this is the top pick within the stretched 20% tier. A lower category or higher salary would give you more room.",
}

// Share of the entered gross annual salary this vehicle's year-1 costs
// (financing + fuel + insurance + maintenance + registration) would consume.
export function pctOfIncome(v, salary) {
  const s = Number(salary)
  if (!s) return null
  return Math.round((v.annualTotal / s) * 1000) / 10
}

// Shared cost-breakdown lines for a matched vehicle — used by both the
// recommended pick and the matching-vehicles grid so the two stay in sync.
export function vehicleCostLines(v, rate, loanTerm) {
  const financeLabel = `Financing (80% · ${loanTerm}mo · ${rate}%)`
  // Annual total-cost range across the ownership duration (loan payments fall
  // off once the car is paid off; in Pro mode operating costs also escalate).
  const rng = v.annualRange
  const range = rng
    ? {
        label: `Annual cost · over ${rng.years} yr${rng.years !== 1 ? 's' : ''}`,
        text: rng.low === rng.high ? `${fmt(rng.low)}/yr` : `${fmt(rng.low)} – ${fmt(rng.high)}/yr`,
      }
    : null

  if (v.ownershipCost) {
    const yrs = v.ownershipCost.years
    return {
      header: `Est. all-in cost — ${yrs} yr${yrs !== 1 ? 's' : ''}`,
      lines: [
        { label: financeLabel, val: v.ownershipCost.financing },
        { label: 'Down payment (20%)', val: v.ownershipCost.downPayment },
        { label: v.is_ev ? 'Electricity' : 'Fuel', val: v.ownershipCost.fuel },
        { label: 'Insurance', val: v.ownershipCost.insurance },
        { label: 'Maintenance', val: v.ownershipCost.maintenance },
        { label: 'Registration', val: v.ownershipCost.registration },
      ],
      credit: { label: `Est. resale value (yr ${yrs})`, val: v.ownershipCost.resaleValue },
      totalLabel: `All-In Cost (${yrs}-yr)`,
      totalVal: v.ownershipCost.total,
      range,
    }
  }
  return {
    header: 'Est. annual costs',
    lines: [
      { label: financeLabel, val: v.annualFinancing },
      { label: v.is_ev ? 'Electricity' : 'Fuel', val: v.annualFuel },
      { label: 'Insurance', val: v.annualInsurance },
      { label: 'Maintenance', val: v.annualMaintenance },
      { label: 'Registration', val: v.annualRegistration },
    ],
    credit: null,
    totalLabel: 'Total/yr',
    totalVal: v.annualTotal,
    range,
  }
}

// Reverse mode: given a salary, solve for the max affordable vehicle price at
// each spending-tier threshold (10% / 15% / 20% of gross income). Returns null
// for salaries under $10k. opts = { userState, annualMiles, rate, loanTerm, downPct }.
export function solveAffordablePrice(salary, { userState, annualMiles, rate, loanTerm, downPct }) {
  const s = Number(salary)
  if (!s || s < 10000) return null

  function solve(thresholdPct) {
    const maxMonthly = (s * thresholdPct) / 12
    let estPrice = 30000
    for (let i = 0; i < 4; i++) {
      const ops = estimateBasicMonthlyCosts(estPrice, userState || null, annualMiles)
      const loanBudget = maxMonthly - ops.total
      if (loanBudget <= 0) return 0
      const r = rate / 12 / 100
      const n = loanTerm
      const factor = r > 0
        ? (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
        : n
      estPrice = Math.max(500, (loanBudget * factor) / (1 - downPct / 100))
    }
    return Math.round(estPrice / 500) * 500
  }

  return {
    conservative: solve(0.10),
    comfortable:  solve(0.15),
    aggressive:   solve(0.20),
  }
}

// Build the matched-vehicle list for a resolved affordable-price result.
// opts = { pickYear, userState, annualMiles, rate, loanTerm, proMode,
//          ownershipYears, resolvedLaborRate, resolvedWear, liveElecRate }.
export function buildMatchedVehicles(affordableResults, {
  pickYear, userState, annualMiles, rate, loanTerm, proMode, ownershipYears,
  resolvedLaborRate, resolvedWear, liveElecRate,
}) {
  if (!affordableResults) return []
  const maxPrice = affordableResults.aggressive || 0
  if (maxPrice <= 0) return []
  const entries = []
  Object.entries(VEHICLES).forEach(([make, models]) => {
    Object.entries(models).forEach(([model, data]) => {
      const trims = data.trims_by_year?.[pickYear]
      if (!trims) return // model not offered in the selected model year
      const modelYear = pickYear
      const basePrice = Math.min(...Object.values(trims))
      if (basePrice > maxPrice || basePrice <= 0) return
      let tier = 'aggressive'
      if (basePrice <= (affordableResults.conservative || 0)) tier = 'conservative'
      else if (basePrice <= (affordableResults.comfortable || 0)) tier = 'comfortable'
      const ops = estimateBasicMonthlyCosts(basePrice, userState || null, annualMiles)
      const monthlyFinance = monthlyPayment(basePrice * 0.80, rate, loanTerm)
      const annualFinancing = Math.round(monthlyFinance * 12)
      const annualFuel = ops.fuel * 12
      const annualInsurance = ops.insurance * 12
      const annualMaintenance = ops.maintenance * 12
      const annualRegistration = ops.registration * 12
      const annualOperating = ops.total * 12

      // Pro-only: real all-in TCO over the chosen ownership duration plus the
      // year-by-year cost range. Same functions & net-cost-of-ownership formula
      // as the TCO Calculator (financing + escalated operating costs + down
      // payment, minus the modeled resale value).
      let ownershipCost = null
      let annualRange = null
      if (proMode) {
        const durYears = Math.max(1, ownershipYears)
        const state = userState || null
        const isEv = !!data.is_ev
        const segment = isEv ? 'electric' : classifySegment(make, model)
        const mpg = data.mpg || null
        const mpgNum  = mpg && typeof mpg === 'object' ? (mpg.combined ?? null) : (mpg || null)
        const mpgeNum = mpg && typeof mpg === 'object' ? (mpg.mpge_combined ?? null) : null

        // Financing tapers to $0 once the loan is paid off within the duration.
        const financingByYear = Array.from({ length: durYears }, (_, i) => {
          const monthsThisYear = Math.min(12, Math.max(0, loanTerm - i * 12))
          return Math.round(monthlyFinance * monthsThisYear)
        })

        const fuelYear0 = computeAnnualFuel(
          isEv, isEv ? null : mpgNum, isEv ? mpgeNum : null, state, annualMiles,
          isEv ? liveElecRate : null
        )
        const fuelByYear = Array.from({ length: durYears }, (_, i) => Math.round(escalateAnnualFuel(fuelYear0, i, isEv)))

        const insuranceYear0 = estimateInsurance(basePrice, make, model, modelYear, state)
        const insuranceByYear = Array.from({ length: durYears }, (_, i) => Math.round(insuranceYear0 * Math.pow(1.02, i)))

        const maintByYear = generateMaintenanceByYear(
          isEv, annualMiles, segment, make, durYears, 0, state, 0, resolvedLaborRate, resolvedWear, model, modelYear
        ).map(x => Math.round(x))

        const regByYear = projectRegistrationByYear(state, basePrice, durYears, {
          make, model, vehicleAge: 0, isEV: isEv, isHybrid: segment === 'hybrid', segment,
        }).map(x => Math.round(x))

        const sum = arr => arr.reduce((s, x) => s + x, 0)
        const financingTotal = sum(financingByYear)
        const downPaymentAmt = Math.round(basePrice * 0.20)
        const resaleValue = Math.round(estimateCurrentValue(basePrice, make, model, durYears, null, state))
        const totalPaid = financingTotal + downPaymentAmt + sum(fuelByYear) + sum(insuranceByYear) + sum(maintByYear) + sum(regByYear)

        ownershipCost = {
          years: durYears,
          financing: financingTotal,
          downPayment: downPaymentAmt,
          fuel: sum(fuelByYear),
          insurance: sum(insuranceByYear),
          maintenance: sum(maintByYear),
          registration: sum(regByYear),
          resaleValue,
          total: Math.round(totalPaid - resaleValue),
        }

        // Annual total-cost range over the duration — financing + operating for
        // each year; excludes the one-time down payment and end-of-term resale.
        const perYearTotals = Array.from({ length: durYears }, (_, i) =>
          financingByYear[i] + fuelByYear[i] + insuranceByYear[i] + maintByYear[i] + regByYear[i]
        )
        annualRange = {
          years: durYears,
          low: Math.min(...perYearTotals),
          high: Math.max(...perYearTotals),
        }
      }

      entries.push({
        make, model, type: data.type, is_ev: data.is_ev,
        basePrice, year: modelYear, tier,
        specs: data.specs || {},
        annualFinancing, annualFuel, annualInsurance, annualMaintenance, annualRegistration,
        annualOperating,
        annualTotal: annualFinancing + annualOperating,
        annualRange,
        ownershipCost,
      })
    })
  })
  return entries.sort((a, b) => b.basePrice - a.basePrice)
}
