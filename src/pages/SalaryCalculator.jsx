import { useState, useMemo, useEffect, useRef } from 'react'
import { safeGet, safeSet } from '../utils/safeStorage'
import { safeUUID } from '../utils/safeId'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import NextStep from '../components/NextStep'
import PaywallModal from '../components/PaywallModal'
import ToolEntryCTA from '../components/ToolEntryCTA'
import ProUpsell from '../components/ProUpsell'
import { useSubscription } from '../hooks/useSubscription'
import { useBonusCredits } from '../hooks/useBonusCredits'
import { trackUsage } from '../utils/usage'
import VEHICLES from '../data/vehicles.json'
import {
  classifySegment, determineMaintTier,
  estimateInsurance, generateMaintenanceServices, generateMaintenanceByYear,
  computeAnnualFuel, computeAnnualRegFees, projectRegistrationByYear,
  escalateAnnualFuel, estimateCurrentValue, resolveLocation,
  STATE_INS_BASE,
} from '../utils/vehicleCosts'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Monthly payment (standard loan amortization)
function monthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12 / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// Estimated monthly lease payment using standard dealer math
// residual ≈ 55% (36mo), 60% (24mo), 50% (48mo); money factor ≈ 0.00250 (~6% APR)
function estimateLeaseMonthly(msrp, capReduction, termMonths) {
  const residualPct = termMonths <= 24 ? 0.60 : termMonths <= 36 ? 0.55 : 0.50
  const residual = msrp * residualPct
  const capCost = msrp - capReduction
  const depreciation = (capCost - residual) / termMonths
  const financeCharge = (capCost + residual) * 0.00250
  return Math.max(0, Math.round(depreciation + financeCharge))
}

// ── Cost estimation ──────────────────────────────────────
// All shared functions come from src/utils/vehicleCosts.js (same as TCOCalculator).
// state=null throughout means national average fallbacks.

const DEFAULT_ANNUAL_MILES = 13500

// Basic mode: state-aware when state is provided, otherwise flat tier estimates
function estimateBasicMonthlyCosts(price, state, annualMiles = DEFAULT_ANNUAL_MILES) {
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

// Pro mode: vehicle-specific + state-aware. laborRate/wearProfile (from a
// resolved ZIP) sharpen maintenance; elecRate (ZIP-level, via OpenEI) sharpens
// EV charging cost — both fall back to state-level modeling without a ZIP.
function estimateProMonthlyCosts(price, make, model, year, isEv, mpg, state, annualMiles = DEFAULT_ANNUAL_MILES, laborRate = null, wearProfile = null, elecRate = null) {
  const segment = isEv ? 'electric' : classifySegment(make, model)

  const mpgNum  = mpg && typeof mpg === 'object' ? (mpg.combined ?? null) : (mpg || null)
  const mpgeNum = mpg && typeof mpg === 'object' ? (mpg.mpge_combined ?? null) : null

  const fuel = Math.round(computeAnnualFuel(
    isEv,
    isEv ? null : mpgNum,
    isEv ? mpgeNum : null,
    state || null,
    annualMiles,
    isEv ? elecRate : null
  ) / 12)

  const insurance = Math.round(estimateInsurance(price, make, model, year, state || null) / 12)

  const maintServices = generateMaintenanceServices(isEv, annualMiles, segment, make, state || null, 0, laborRate, wearProfile, model, year)
  const maintenance = Math.round(maintServices.reduce((s, x) => s + x.annual, 0) / 12)

  const vehicleAge = year ? Math.max(0, new Date().getFullYear() - parseInt(year)) : 0
  const registration = Math.round(computeAnnualRegFees(state || null, price, {
    isEV: isEv, isHybrid: segment === 'hybrid', segment, vehicleAge,
  }) / 12)

  return {
    fuel, insurance, maintenance, registration,
    total: fuel + insurance + maintenance + registration,
    segment,
    maintTier: determineMaintTier(make),
  }
}

// Rough effective take-home estimate for a given gross annual salary.
// Uses simplified federal brackets + FICA + 4% avg state income tax.
// Intended for ballpark context only, not tax advice.
function estimateMonthlyTakeHome(grossAnnual) {
  let federalEff
  if (grossAnnual <= 30000)       federalEff = 0.08
  else if (grossAnnual <= 55000)  federalEff = 0.12
  else if (grossAnnual <= 90000)  federalEff = 0.17
  else if (grossAnnual <= 140000) federalEff = 0.21
  else if (grossAnnual <= 200000) federalEff = 0.24
  else                            federalEff = 0.28
  const totalRate = federalEff + 0.0765 + 0.04  // federal + FICA + avg state
  return Math.round((grossAnnual * (1 - totalRate)) / 12)
}

// US state list for the selector (derived from STATE_INS_BASE keys for coverage)
const US_STATES = [
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

const loanTermOptions = [
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
  { value: 72, label: '72 months' },
]

const TYPE_LABELS = {
  electric: 'Electric', hybrid: 'Hybrid', truck: 'Truck', suv: 'SUV',
  luxury_suv: 'Luxury SUV', sports: 'Sports', compact: 'Compact',
  economy: 'Economy', sedan: 'Sedan', luxury: 'Luxury',
}

const CURRENT_YEAR = String(
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
const CATALOG_YEARS = (() => {
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

function classifyCarCategory(make, type, basePrice) {
  if (SALARY_LUXURY_MAKES.has(make)) return 'luxury'
  if (['suv', 'suv_large', 'truck', 'sports', 'ev_sedan', 'ev_suv', 'minivan'].includes(type)) return 'other'
  return basePrice <= 30000 ? 'economy' : 'other'
}

// Sort dimensions for the matched-vehicles pick list. cargo_cu_ft, horsepower,
// and seats are filled in for every catalog model, so they sort cleanly;
// mpg is only populated for ~14% of models and is left out until the catalog
// has fuller coverage — sorting by it would mostly be sorting by missing data.
const SORT_OPTIONS = [
  { value: 'price', label: 'Price (High to Low)' },
  { value: 'value', label: 'Best Value (Lowest Cost)' },
  { value: 'cargo', label: 'Most Cargo Space' },
  { value: 'horsepower', label: 'Most Horsepower' },
  { value: 'seats', label: 'Most Seats' },
]

function sortVehicles(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'value':
      sorted.sort((a, b) => (a.fiveYear?.total ?? a.annualTotal) - (b.fiveYear?.total ?? b.annualTotal))
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

const TIER_STYLES = {
  conservative: { color: 'text-green-400', label: '✓ Conservative' },
  comfortable:  { color: 'text-[var(--accent)]', label: 'Comfortable' },
  aggressive:   { color: 'text-amber-400', label: '⚠ Stretched' },
}

const RECOMMENDATION_REASONING = {
  conservative: 'The most vehicle you can get in this category while keeping total costs at or below 10% of your gross income — the safest tier of the 20/4/10 rule.',
  comfortable: "Nothing in this category fits the safest 10% tier at your income — this is the top pick within the comfortable 15% tier.",
  aggressive: "Nothing in this category fits the safest or comfortable tiers at your income — this is the top pick within the stretched 20% tier. A lower category or higher salary would give you more room.",
}

// Shared cost-breakdown lines for a matched vehicle — used by both the
// recommended pick and the matching-vehicles grid so the two stay in sync.
// Share of the entered gross annual salary this vehicle's year-1 costs
// (financing + fuel + insurance + maintenance + registration) would consume.
function pctOfIncome(v, salary) {
  const s = Number(salary)
  if (!s) return null
  return Math.round((v.annualTotal / s) * 1000) / 10
}

function vehicleCostLines(v, rate, loanTerm) {
  const financeLabel = `Financing (80% · ${loanTerm}mo · ${rate}%)`
  if (v.fiveYear) {
    return {
      header: 'Est. 5-year net cost',
      lines: [
        { label: financeLabel, val: v.fiveYear.financing },
        { label: 'Down payment (20%)', val: v.fiveYear.downPayment },
        { label: v.is_ev ? 'Electricity' : 'Fuel', val: v.fiveYear.fuel },
        { label: 'Insurance', val: v.fiveYear.insurance },
        { label: 'Maintenance', val: v.fiveYear.maintenance },
        { label: 'Registration', val: v.fiveYear.registration },
      ],
      credit: { label: 'Est. resale value (yr 5)', val: v.fiveYear.resaleValue },
      totalLabel: 'Net cost (5-yr)',
      totalVal: v.fiveYear.total,
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
  }
}

// ── Paywall constants ─────────────────────────────────
const FREE_SALARY_PRO_LIMIT = 5
const LS_SALARY_PRO_COUNT   = 'cashpedal_salary_pro_count'

export default function SalaryCalculator() {
  const { isSubscribed } = useSubscription()
  const { spendCredit } = useBonusCredits()
  const [showPaywall, setShowPaywall] = useState(false)

  // Entry CTA — scroll cold / ad traffic straight into the inputs.
  const inputsRef = useRef(null)
  const scrollToStart = () => {
    inputsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  // Pro mode unlocked for this session via an email-unlock bonus credit
  const [bonusUnlocked, setBonusUnlocked] = useState(false)

  const [salaryProCount, setSalaryProCount] = useState(() =>
    parseInt(safeGet(LS_SALARY_PRO_COUNT) || '0', 10)
  )

  // Anonymous first-party usage tracking — once per page load
  useEffect(() => { trackUsage('visit_salary') }, [])

  // Pre-fill from TCOFlow query params (?make=X&model=Y&year=Z&price=N)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const qMake  = searchParams.get('make')
    const qModel = searchParams.get('model')
    const qYear  = searchParams.get('year')
    const qPrice = searchParams.get('price')

    if (!qMake || !VEHICLES[qMake]) return

    const hasModel = qModel && VEHICLES[qMake]?.[qModel]

    if (hasModel) setSelModel(qModel)
    if (qYear)    setSelYear(qYear)
    setSelMake(qMake)

    if (qPrice) {
      const p = parseInt(qPrice, 10)
      if (!isNaN(p) && p > 0) setVehiclePrice(p)
    }

    // Enable pro mode so the vehicle picker is shown and used in cost calculations
    if (hasModel) setProMode(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount

  // Finance mode
  const [mode, setMode] = useState('buy')
  const [knownSalary, setKnownSalary] = useState('')

  // State detection
  const [userState, setUserState] = useState('')
  const [stateAutoDetected, setStateAutoDetected] = useState(false)
  const [stateDetecting, setStateDetecting] = useState(false)
  const [stateDetectFailed, setStateDetectFailed] = useState(false)

  // ZIP code (optional) — sharpens Pro maintenance (local labor rate & wear
  // profile) and EV charging cost beyond the state-level averages above.
  const [userZip, setUserZip] = useState('')
  const [zipError, setZipError] = useState('')
  const [resolvedLaborRate, setResolvedLaborRate] = useState(null)
  const [resolvedWear, setResolvedWear] = useState(null)
  const [liveElecRate, setLiveElecRate] = useState(null)

  // Pro mode
  const [proMode, setProMode] = useState(false)
  const [selMake, setSelMake] = useState('')
  const [selModel, setSelModel] = useState('')
  const [selYear, setSelYear] = useState('')
  const [selTrim, setSelTrim] = useState('')

  // Annual mileage (affects fuel cost)
  const [annualMiles, setAnnualMiles] = useState(DEFAULT_ANNUAL_MILES)

  // Car suggestion filter
  const [carFilterCategory, setCarFilterCategory] = useState('all')
  const [pickYear, setPickYear] = useState(CURRENT_YEAR)
  const [sortBy, setSortBy] = useState('price')

  // Comparison hand-off — mirrors TCOCalculator's "Add to Comparison" queue
  // (same cashpedal_tco_for_comparison localStorage key MultiVehicleComparison
  // reads on mount), plus a session-only set so a card can show "Added" instead
  // of silently re-queuing the same vehicle on repeat clicks.
  const [comparisonCount, setComparisonCount] = useState(() => {
    try { return JSON.parse(safeGet('cashpedal_tco_for_comparison') || '[]').length } catch { return 0 }
  })
  const [addedToCompare, setAddedToCompare] = useState(() => new Set())

  // Buy inputs
  const [vehiclePrice, setVehiclePrice] = useState(30000)
  const [downPct, setDownPct] = useState(20)
  const [loanTerm, setLoanTerm] = useState(48)
  const [rate, setRate] = useState(6.5)

  // Lease inputs
  const [leaseMsrp, setLeaseMsrp] = useState(30000)
  const [leaseDown, setLeaseDown] = useState(0)
  const [leaseMonthly, setLeaseMonthly] = useState(400)
  const [leaseTerm, setLeaseTerm] = useState(36)

  // Cascade: make → model → year → trim
  const makes = useMemo(() => {
    const all = Object.keys(VEHICLES).sort()
    if (mode !== 'lease') return all
    return all.filter(mk =>
      Object.values(VEHICLES[mk] || {}).some(md => CURRENT_YEAR in (md.trims_by_year || {}))
    )
  }, [mode])

  const models = useMemo(() => {
    if (!selMake) return []
    const all = Object.keys(VEHICLES[selMake] || {}).sort()
    if (mode !== 'lease') return all
    return all.filter(m => CURRENT_YEAR in (VEHICLES[selMake]?.[m]?.trims_by_year || {}))
  }, [selMake, mode])

  const years = useMemo(() => {
    if (!selMake || !selModel) return []
    const trimsByYear = VEHICLES[selMake]?.[selModel]?.trims_by_year || {}
    if (mode === 'lease') {
      return CURRENT_YEAR in trimsByYear ? [CURRENT_YEAR] : []
    }
    return Object.keys(trimsByYear).sort((a, b) => Number(b) - Number(a))
  }, [selMake, selModel, mode])

  const trims = useMemo(() => {
    if (!selMake || !selModel || !selYear) return []
    return Object.keys(VEHICLES[selMake]?.[selModel]?.trims_by_year?.[selYear] || {})
  }, [selMake, selModel, selYear])

  const selectedVehicleInfo = useMemo(() => {
    if (!proMode || !selMake || !selModel) return null
    const vd = VEHICLES[selMake]?.[selModel]
    if (!vd) return null
    const price = selTrim && selYear
      ? vd.trims_by_year?.[selYear]?.[selTrim]
      : null
    return {
      make: selMake,
      model: selModel,
      year: selYear,
      trim: selTrim,
      is_ev: vd.is_ev,
      type: vd.type,
      specs: vd.specs,
      mpg: vd.mpg,
      price,
    }
  }, [proMode, selMake, selModel, selYear, selTrim])

  // Auto-detect state from IP on mount
  useEffect(() => {
    setStateDetecting(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    fetch('https://ipwho.is/', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.country_code === 'US' && d.region_code &&
            US_STATES.some(([code]) => code === d.region_code)) {
          setUserState(d.region_code)
          setStateAutoDetected(true)
        } else {
          setStateDetectFailed(true)
        }
      })
      .catch(() => setStateDetectFailed(true))
      .finally(() => { setStateDetecting(false); clearTimeout(timeout) })
  }, [])

  // ZIP resolves to a state (syncing the selector above), a local labor rate,
  // and a wear profile — same resolveLocation() the TCO Calculator uses.
  function handleZipInput(val) {
    setUserZip(val)
    setZipError('')
    if (!val) {
      setResolvedLaborRate(null)
      setResolvedWear(null)
      return
    }
    if (!/^\d{5}$/.test(val)) {
      setResolvedLaborRate(null)
      setResolvedWear(null)
      if (val.length >= 5) setZipError('Enter a 5-digit ZIP code')
      return
    }
    const resolved = resolveLocation(val)
    if (resolved) {
      setUserState(resolved.state)
      setStateAutoDetected(false)
      setResolvedLaborRate(resolved.laborRate ?? null)
      setResolvedWear(resolved.wear ?? null)
    } else {
      setResolvedLaborRate(null)
      setResolvedWear(null)
      setZipError('ZIP code not recognized')
    }
  }

  // Live electricity rate ($/kWh) for the resolved ZIP — sharpens EV charging
  // cost beyond the state-level table. Falls back silently when unavailable.
  useEffect(() => {
    if (!/^\d{5}$/.test(userZip)) { setLiveElecRate(null); return }
    let cancelled = false
    fetch(`/api/electricity-rate?zip=${userZip}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setLiveElecRate(data?.rate ?? null) })
      .catch(() => { if (!cancelled) setLiveElecRate(null) })
    return () => { cancelled = true }
  }, [userZip])

  // When trim selected, auto-populate price field
  useEffect(() => {
    if (!proMode || !selectedVehicleInfo?.price) return
    const p = selectedVehicleInfo.price
    if (mode === 'lease') setLeaseMsrp(p)
    else setVehiclePrice(p)
  }, [proMode, selectedVehicleInfo?.price, mode])

  // Pro + lease mode: auto-calculate monthly payment whenever MSRP, down, or term changes
  useEffect(() => {
    if (!proMode || mode !== 'lease' || !leaseMsrp) return
    setLeaseMonthly(estimateLeaseMonthly(leaseMsrp, leaseDown, leaseTerm))
  }, [proMode, mode, leaseMsrp, leaseDown, leaseTerm])

  // In lease mode: auto-select current year once model is set, clear if unavailable
  useEffect(() => {
    if (mode !== 'lease' || !proMode) return
    if (selMake && selModel) {
      const hasCurrentYear = CURRENT_YEAR in (VEHICLES[selMake]?.[selModel]?.trims_by_year || {})
      if (hasCurrentYear) {
        setSelYear(CURRENT_YEAR)
        setSelTrim('')
      } else {
        setSelYear('')
        setSelTrim('')
      }
    }
  }, [mode, selMake, selModel, proMode])

  // When switching to lease mode, clear selections no longer valid
  useEffect(() => {
    if (mode !== 'lease' || !proMode) return
    if (selMake) {
      const makeValid = Object.values(VEHICLES[selMake] || {}).some(md => CURRENT_YEAR in (md.trims_by_year || {}))
      if (!makeValid) { setSelMake(''); setSelModel(''); setSelYear(''); setSelTrim(''); return }
    }
    if (selMake && selModel) {
      const modelValid = CURRENT_YEAR in (VEHICLES[selMake]?.[selModel]?.trims_by_year || {})
      if (!modelValid) { setSelModel(''); setSelYear(''); setSelTrim('') }
    }
  }, [mode])

  // Reset cascade on upstream change
  function handleMakeChange(v) { setSelMake(v); setSelModel(''); setSelYear(''); setSelTrim('') }
  function handleModelChange(v) { setSelModel(v); setSelYear(''); setSelTrim('') }
  function handleYearChange(v) { setSelYear(v); setSelTrim('') }

  const activePrice = mode === 'lease' ? leaseMsrp : vehiclePrice

  const proExtras = useMemo(() => {
    if (!proMode || !selectedVehicleInfo) return null
    const { make, model, year, is_ev, mpg } = selectedVehicleInfo
    return estimateProMonthlyCosts(
      activePrice, make, model, year, is_ev, mpg, userState, annualMiles,
      resolvedLaborRate, resolvedWear, liveElecRate
    )
  }, [proMode, selectedVehicleInfo, activePrice, userState, annualMiles, resolvedLaborRate, resolvedWear, liveElecRate])

  const results = useMemo(() => {
    const extra = proExtras
      ? { ...proExtras, tier: TYPE_LABELS[proExtras.segment] ?? 'Vehicle' }
      : mode === 'lease'
        ? estimateBasicMonthlyCosts(leaseMsrp, userState, annualMiles)
        : estimateBasicMonthlyCosts(vehiclePrice, userState, annualMiles)

    if (mode === 'lease') {
      const totalMonthly = leaseMonthly + extra.total
      return {
        payment: leaseMonthly,
        extra,
        totalMonthly,
        conservative: (totalMonthly / 0.10) * 12,
        comfortable: (totalMonthly / 0.15) * 12,
        aggressive: (totalMonthly / 0.20) * 12,
        conservativeMonthly: totalMonthly / 0.10,
        downPayment: leaseDown,
        loanAmount: null,
      }
    }
    const downPayment = vehiclePrice * (downPct / 100)
    const loanAmount = vehiclePrice - downPayment
    const payment = monthlyPayment(loanAmount, rate, loanTerm)
    const totalLoanCost = payment * loanTerm
    const totalInterest = totalLoanCost - loanAmount
    const totalMonthly = payment + extra.total
    return {
      downPayment,
      loanAmount,
      payment,
      totalLoanCost,
      totalInterest,
      extra,
      totalMonthly,
      conservative: (totalMonthly / 0.10) * 12,
      comfortable: (totalMonthly / 0.15) * 12,
      aggressive: (totalMonthly / 0.20) * 12,
      conservativeMonthly: totalMonthly / 0.10,
    }
  }, [mode, vehiclePrice, downPct, loanTerm, rate, leaseMsrp, leaseDown, leaseMonthly, leaseTerm, proExtras, userState, annualMiles])

  // Reverse mode: given a salary, solve for the max affordable vehicle price
  const affordableResults = useMemo(() => {
    const s = Number(knownSalary)
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
  }, [knownSalary, userState, rate, loanTerm, downPct, annualMiles])

  const matchedVehicles = useMemo(() => {
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
        const category = classifyCarCategory(make, data.type, basePrice)
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

        // Pro: real 5-year TCO — same functions & net-cost-of-ownership formula
        // as the TCO Calculator (financing + escalated operating costs + down
        // payment, minus the modeled resale value at year 5).
        let fiveYear = null
        if (proMode) {
          const state = userState || null
          const isEv = !!data.is_ev
          const segment = isEv ? 'electric' : classifySegment(make, model)
          const mpg = data.mpg || null
          const mpgNum  = mpg && typeof mpg === 'object' ? (mpg.combined ?? null) : (mpg || null)
          const mpgeNum = mpg && typeof mpg === 'object' ? (mpg.mpge_combined ?? null) : null

          const fuelYear0 = computeAnnualFuel(
            isEv, isEv ? null : mpgNum, isEv ? mpgeNum : null, state, annualMiles,
            isEv ? liveElecRate : null
          )
          const fuel5yr = [0, 1, 2, 3, 4].reduce((s, i) => s + escalateAnnualFuel(fuelYear0, i, isEv), 0)

          const insuranceYear0 = estimateInsurance(basePrice, make, model, modelYear, state)
          const insurance5yr = [0, 1, 2, 3, 4].reduce((s, i) => s + Math.round(insuranceYear0 * Math.pow(1.02, i)), 0)

          const maintenance5yr = generateMaintenanceByYear(
            isEv, annualMiles, segment, make, 5, 0, state, 0, resolvedLaborRate, resolvedWear, model, modelYear
          ).reduce((s, x) => s + x, 0)

          const registration5yr = projectRegistrationByYear(state, basePrice, 5, {
            make, model, vehicleAge: 0, isEV: isEv, isHybrid: segment === 'hybrid', segment,
          }).reduce((s, x) => s + x, 0)

          // Payments run for the actual loan term, not the full 5-yr horizon —
          // a 36 or 48-month loan is paid off before year 5, a 72-month loan
          // still has payments left at year 5 that fall outside this window.
          const financing5yr = Math.round(monthlyFinance * Math.min(60, loanTerm))
          const downPayment5yr = Math.round(basePrice * 0.20)
          const resaleValue = Math.round(estimateCurrentValue(basePrice, make, model, 5, null, state))
          const totalPaid = financing5yr + downPayment5yr + fuel5yr + insurance5yr + maintenance5yr + registration5yr

          fiveYear = {
            financing: financing5yr,
            downPayment: downPayment5yr,
            fuel: Math.round(fuel5yr),
            insurance: insurance5yr,
            maintenance: Math.round(maintenance5yr),
            registration: Math.round(registration5yr),
            resaleValue,
            total: Math.round(totalPaid - resaleValue),
          }
        }

        entries.push({
          make, model, type: data.type, is_ev: data.is_ev,
          basePrice, year: modelYear, category, tier,
          specs: data.specs || {},
          annualFinancing, annualFuel, annualInsurance, annualMaintenance, annualRegistration,
          annualOperating,
          annualTotal: annualFinancing + annualOperating,
          fiveYear,
        })
      })
    })
    return entries.sort((a, b) => b.basePrice - a.basePrice)
  }, [affordableResults, userState, annualMiles, rate, proMode, resolvedLaborRate, resolvedWear, liveElecRate, pickYear, loanTerm])

  const filteredVehicles = useMemo(() => {
    if (carFilterCategory === 'all') return matchedVehicles
    return matchedVehicles.filter(v => v.category === carFilterCategory)
  }, [matchedVehicles, carFilterCategory])

  // Single "best fit" pick: the priciest vehicle in the safest tier that still
  // fits (conservative → comfortable → aggressive), within the active filter.
  // filteredVehicles is already sorted by basePrice desc, so .find gives the
  // top-of-tier vehicle directly.
  const recommendedVehicle = useMemo(() => {
    if (!filteredVehicles.length) return null
    return filteredVehicles.find(v => v.tier === 'conservative')
      ?? filteredVehicles.find(v => v.tier === 'comfortable')
      ?? filteredVehicles.find(v => v.tier === 'aggressive')
      ?? null
  }, [filteredVehicles])

  // The grid re-ranks the same category-filtered list by the chosen sort
  // dimension (price, value, cargo, horsepower, seats); recommendedVehicle
  // above always stays price-based regardless of this display sort.
  const sortedGridVehicles = useMemo(() => sortVehicles(filteredVehicles, sortBy), [filteredVehicles, sortBy])

  // Top 20 by the active sort. On the default price sort, the recommended
  // pick is guaranteed to appear (it's price/tier-based, so it's often the
  // safest, cheaper option that can fall outside a price-desc top 20). For
  // the other sort dimensions (cargo, horsepower, seats, value) that
  // guarantee is skipped — forcing a pick chosen for price/tier to the front
  // of, say, a "Most Cargo Space" ranking would contradict the sort itself.
  const gridVehicles = useMemo(() => {
    const top20 = sortedGridVehicles.slice(0, 20)
    if (!recommendedVehicle || sortBy !== 'price') return top20
    const alreadyShown = top20.some(v => v.make === recommendedVehicle.make && v.model === recommendedVehicle.model)
    return alreadyShown ? top20 : [recommendedVehicle, ...top20.slice(0, 19)]
  }, [sortedGridVehicles, recommendedVehicle, sortBy])

  const downAmount = vehiclePrice * (downPct / 100)

  // Queue a matched vehicle into the same comparison hand-off TCOCalculator
  // uses — MultiVehicleComparison imports this on mount and clears it after.
  function addVehicleToComparison(v) {
    const key = `${v.make}|${v.model}|${v.year}`
    if (addedToCompare.has(key)) return

    const downPayment = v.fiveYear ? v.fiveYear.downPayment : Math.round(v.basePrice * 0.20)
    const resaleValue = v.fiveYear ? v.fiveYear.resaleValue : null
    const valueRetentionPct = resaleValue != null ? Math.round((resaleValue / v.basePrice) * 100) : null

    const entry = {
      id: safeUUID(),
      name: `${v.year} ${v.make} ${v.model}`,
      addedAt: new Date().toISOString(),
      isLease: false,
      price: v.basePrice,
      downPayment,
      loanTerm,
      rate,
      ownershipYears: 5,
      totalAnnualCost: v.annualTotal,
      totalOwnershipCost: v.fiveYear ? v.fiveYear.total : v.annualTotal * 5,
      make: v.make, model: v.model, year: v.year,
      mpgCombined: null,
      cargoSqFt: v.specs.cargo_cu_ft ?? null,
      seats: v.specs.seats ?? null,
      isEV: v.is_ev,
      valueRetentionPct,
    }

    let existing = []
    try {
      const parsed = JSON.parse(safeGet('cashpedal_tco_for_comparison') || '[]')
      if (Array.isArray(parsed)) existing = parsed
    } catch { /* start fresh on malformed data */ }
    const updated = [...existing, entry].slice(-5)
    safeSet('cashpedal_tco_for_comparison', JSON.stringify(updated))
    setComparisonCount(updated.length)
    setAddedToCompare(prev => new Set(prev).add(key))
    trackUsage('salary_add_to_compare')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {showPaywall && (
        <PaywallModal
          feature="salary"
          usedCount={FREE_SALARY_PRO_LIMIT}
          cancelPath="/salary"
          onUnlocked={async (method) => {
            setShowPaywall(false)
            if (method === 'bonus') {
              if (await spendCredit('salary_pro')) { setBonusUnlocked(true); setProMode(true) }
            } else {
              setProMode(true)
            }
          }}
        />
      )}
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Salary Calculator
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            Can you actually afford it?
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-xl">
            {mode === 'lease'
              ? 'A lease that fits on paper can still squeeze your budget. Enter your payment and see the gross income that keeps total vehicle costs under 10–20% of your salary — before you commit.'
              : "Don't let a car payment quietly eat your future. Using the 20/4/10 rule — 20% down, max 4-year loan, total vehicle costs ≤ 10% of gross income — see the salary that makes this car comfortable, not crushing."}
          </p>

          {/* Entry CTA — gives cold / ad traffic one obvious next step */}
          <ToolEntryCTA
            headline="Find the salary this car really takes — in under 2 minutes."
            points={['Free', 'No signup', 'Based on the 20/4/10 rule']}
            buttonLabel="Check my number ↓"
            onStart={scrollToStart}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

            {/* Inputs */}
            <div ref={inputsRef} className="card anim-3 flex flex-col gap-6 scroll-mt-20">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white text-lg">Vehicle Details</h2>
                {/* Pro toggle */}
                <button
                  onClick={async () => {
                    if (!isSubscribed && !proMode && !bonusUnlocked) {
                      if (salaryProCount < FREE_SALARY_PRO_LIMIT) {
                        const next = salaryProCount + 1
                        setSalaryProCount(next)
                        safeSet(LS_SALARY_PRO_COUNT, String(next))
                        trackUsage('salary_pro', 'free')
                      } else if (await spendCredit('salary_pro')) {
                        setBonusUnlocked(true)
                      } else {
                        setShowPaywall(true)
                        return
                      }
                    } else if (!proMode && isSubscribed) {
                      trackUsage('salary_pro', 'subscribed')
                    }
                    setProMode(p => !p)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={{
                    background: proMode ? 'var(--accent)' : 'transparent',
                    color: proMode ? '#000' : 'var(--text-muted)',
                    borderColor: proMode ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {!isSubscribed && !proMode && (
                    <span className="text-[10px] mr-0.5">🔒</span>
                  )}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Pro
                </button>
              </div>

              {/* Buy / Lease toggle */}
              <div className="flex gap-1 p-1 rounded-lg"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {[
                  { value: 'buy', label: 'Buy / Finance' },
                  { value: 'lease', label: 'Lease' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setMode(opt.value)}
                    aria-pressed={mode === opt.value}
                    className="flex-1 py-2 rounded-md text-sm font-semibold transition-all min-h-[44px] active:opacity-70"
                    style={{
                      background: mode === opt.value ? 'var(--accent)' : 'transparent',
                      color: mode === opt.value ? '#000' : 'var(--text-muted)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* State selector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="input-label flex items-center gap-1.5">
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" className="shrink-0">
                      <path d="M5.5 0C2.46 0 0 2.46 0 5.5c0 4.125 5.5 7.5 5.5 7.5S11 9.625 11 5.5C11 2.46 8.54 0 5.5 0Zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor" opacity=".7"/>
                    </svg>
                    Your State
                  </label>
                  <div className="flex items-center gap-2">
                    {stateDetecting && (
                      <span className="text-[10px] text-[var(--text-muted)] animate-pulse">Detecting…</span>
                    )}
                    {!stateDetecting && stateDetectFailed && !userState && (
                      <span className="text-[10px] text-yellow-500">Auto-detect unavailable — select manually</span>
                    )}
                    {!stateDetecting && stateAutoDetected && userState && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block" />
                        Auto-detected
                      </span>
                    )}
                    {userState && (
                      <button
                        onClick={() => {
                          setUserState(''); setStateAutoDetected(false)
                          setUserZip(''); setResolvedLaborRate(null); setResolvedWear(null); setZipError('')
                        }}
                        className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <select
                  value={userState}
                  onChange={e => { setUserState(e.target.value); setStateAutoDetected(false) }}
                  className="input-field text-sm"
                >
                  <option value="">National average (no state)</option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{name} ({code})</option>
                  ))}
                </select>
                {userState && (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {STATE_INS_BASE[userState]
                      ? `${US_STATES.find(([c]) => c === userState)?.[1] ?? userState} state insurance rates, fuel prices, and registration fees applied.`
                      : 'National average rates applied for this state.'}
                  </p>
                )}

                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between">
                    <label className="input-label text-[11px]">ZIP Code (optional)</label>
                    {userZip && (
                      <button
                        onClick={() => { setUserZip(''); setResolvedLaborRate(null); setResolvedWear(null); setZipError('') }}
                        className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={userZip}
                    onChange={e => handleZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="e.g. 90210"
                    className="input-field text-sm"
                  />
                  {zipError ? (
                    <p className="text-[10px] text-yellow-500">{zipError}</p>
                  ) : (
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {resolvedLaborRate
                        ? `Local labor rate & wear profile applied to Pro maintenance estimates${liveElecRate ? ', plus ZIP-level EV charging rates' : ''}.`
                        : 'Sharpens Pro maintenance & EV charging cost estimates beyond state averages.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Pro: Vehicle picker */}
              {proMode && (
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--accent)] bg-[rgba(200,255,0,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                    Pro — Vehicle Lookup
                  </p>
                  <p className="text-xs text-[var(--text-muted)] -mt-1">
                    Select make, model, year, and trim to auto-fill price and get vehicle-specific cost estimates.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Make */}
                    <div className="flex flex-col gap-1">
                      <label className="input-label text-[10px]">Make</label>
                      <select
                        value={selMake}
                        onChange={e => handleMakeChange(e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="">Select make</option>
                        {makes.map(mk => <option key={mk} value={mk}>{mk}</option>)}
                      </select>
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-1">
                      <label className="input-label text-[10px]">Model</label>
                      <select
                        value={selModel}
                        onChange={e => handleModelChange(e.target.value)}
                        className="input-field text-sm"
                        disabled={!selMake}
                      >
                        <option value="">Select model</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="flex flex-col gap-1">
                      <label className="input-label text-[10px]">Year</label>
                      <select
                        value={selYear}
                        onChange={e => handleYearChange(e.target.value)}
                        className="input-field text-sm"
                        disabled={!selModel}
                      >
                        <option value="">Select year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    {/* Trim */}
                    <div className="flex flex-col gap-1">
                      <label className="input-label text-[10px]">Trim</label>
                      <select
                        value={selTrim}
                        onChange={e => setSelTrim(e.target.value)}
                        className="input-field text-sm"
                        disabled={!selYear}
                      >
                        <option value="">Select trim</option>
                        {trims.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Vehicle profile badge */}
                  {selectedVehicleInfo && (
                    <div className="mt-1 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">
                          {selectedVehicleInfo.year && `${selectedVehicleInfo.year} `}
                          {selectedVehicleInfo.make} {selectedVehicleInfo.model}
                          {selectedVehicleInfo.trim && selectedVehicleInfo.trim !== selectedVehicleInfo.model
                            ? <span className="text-[var(--text-muted)] font-normal"> · {selectedVehicleInfo.trim}</span>
                            : null}
                        </p>
                        <div className="flex gap-1.5">
                          {selectedVehicleInfo.is_ev && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(200,255,0,0.15)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.3)' }}>
                              EV
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] capitalize">
                            {selectedVehicleInfo.type}
                          </span>
                        </div>
                      </div>
                      {selectedVehicleInfo.specs && (
                        <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                          {selectedVehicleInfo.specs.horsepower && (
                            <span>{selectedVehicleInfo.specs.horsepower} hp</span>
                          )}
                          {selectedVehicleInfo.specs.seats && (
                            <span>{selectedVehicleInfo.specs.seats} seats</span>
                          )}
                          {selectedVehicleInfo.specs.cargo_cu_ft && (
                            <span>{selectedVehicleInfo.specs.cargo_cu_ft} cu ft cargo</span>
                          )}
                          {selectedVehicleInfo.mpg && (
                            <span>
                              {selectedVehicleInfo.is_ev
                                ? `${selectedVehicleInfo.mpg.mpge_combined} MPGe`
                                : `${selectedVehicleInfo.mpg.combined} mpg`}
                            </span>
                          )}
                        </div>
                      )}
                      {selectedVehicleInfo.price && (
                        <p className="text-xs text-[var(--text-muted)]">
                          MSRP auto-filled: <span className="text-white font-semibold">{fmt(selectedVehicleInfo.price)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="h-px bg-[var(--border)]" />

              {mode === 'lease' ? (
                <>
                  {/* MSRP */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Vehicle MSRP</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        value={leaseMsrp}
                        onChange={e => setLeaseMsrp(Number(e.target.value))}
                        className="input-field"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                    <input
                      type="range" min={5000} max={200000} step={1000}
                      value={leaseMsrp}
                      onChange={e => setLeaseMsrp(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${((leaseMsrp - 5000) / 195000) * 100}%, var(--border) ${((leaseMsrp - 5000) / 195000) * 100}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>$5,000</span><span>$200,000</span>
                    </div>
                  </div>

                  {/* Cap cost reduction / down payment */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="input-label">Cap Cost Reduction</label>
                      <span className="text-sm font-bold text-white">{fmt(leaseDown)}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        value={leaseDown}
                        min={0}
                        onChange={e => setLeaseDown(Number(e.target.value))}
                        className="input-field"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                    <input
                      type="range" min={0} max={20000} step={500}
                      value={leaseDown}
                      onChange={e => setLeaseDown(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${(leaseDown / 20000) * 100}%, var(--border) ${(leaseDown / 20000) * 100}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>$0 (no drive-off)</span><span>$20,000</span>
                    </div>
                  </div>

                  {/* Monthly lease payment */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="input-label">Monthly Lease Payment</label>
                      {proMode && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)' }}>
                          estimated
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        value={leaseMonthly}
                        min={0}
                        onChange={e => setLeaseMonthly(Number(e.target.value))}
                        className="input-field"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                    <input
                      type="range" min={0} max={3000} step={25}
                      value={leaseMonthly}
                      onChange={e => setLeaseMonthly(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${(leaseMonthly / 3000) * 100}%, var(--border) ${(leaseMonthly / 3000) * 100}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>$0</span><span>$3,000/mo</span>
                    </div>
                  </div>

                  {/* Lease term */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Lease Term</label>
                    <select value={leaseTerm} onChange={e => setLeaseTerm(Number(e.target.value))} className="input-field">
                      {[24, 36, 39, 48].map(m => (
                        <option key={m} value={m}>{m} months</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Total out-of-pocket: {fmt(leaseMonthly * leaseTerm + leaseDown)}
                      {leaseDown > 0 ? ` (${fmt(leaseDown)} due at signing + ${fmt(leaseMonthly * leaseTerm)} payments)` : ''} · No equity at lease end
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Price */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Vehicle Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                      <input
                        type="number"
                        value={vehiclePrice}
                        onChange={e => setVehiclePrice(Number(e.target.value))}
                        className="input-field"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                    <input
                      type="range" min={5000} max={200000} step={1000}
                      value={vehiclePrice}
                      onChange={e => setVehiclePrice(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${((vehiclePrice - 5000) / 195000) * 100}%, var(--border) ${((vehiclePrice - 5000) / 195000) * 100}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>$5,000</span><span>$200,000</span>
                    </div>
                  </div>

                  {/* Down payment % */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="input-label">Down Payment</label>
                      <span className="text-sm font-bold text-white">{fmt(downAmount)}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={downPct}
                        min={0} max={100}
                        onChange={e => setDownPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="input-field"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={1}
                      value={downPct}
                      onChange={e => setDownPct(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${downPct}%, var(--border) ${downPct}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>0%</span><span className="font-semibold text-[var(--accent)]">20% recommended</span><span>100%</span>
                    </div>
                  </div>

                  {/* Loan term */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Loan Term</label>
                    <select
                      value={loanTerm}
                      onChange={e => setLoanTerm(Number(e.target.value))}
                      className="input-field"
                    >
                      {loanTermOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {loanTerm > 48 && (
                      <p className="text-xs text-yellow-500">⚠ The 20/4/10 rule recommends 48 months max to keep total cost down.</p>
                    )}
                  </div>

                  {/* Interest rate */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Annual Interest Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={rate}
                        min={0} max={25} step={0.1}
                        onChange={e => setRate(Number(e.target.value))}
                        className="input-field"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">%</span>
                    </div>
                    <input
                      type="range" min={0} max={25} step={0.1}
                      value={rate}
                      onChange={e => setRate(Number(e.target.value))}
                      style={{ background: `linear-gradient(to right, var(--accent) ${(rate / 25) * 100}%, var(--border) ${(rate / 25) * 100}%)` }}
                    />
                  </div>
                </>
              )}

              {/* Annual mileage */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="input-label">Annual Mileage</label>
                  <span className="text-sm font-bold text-white">{annualMiles.toLocaleString()} mi/yr</span>
                </div>
                <input
                  type="range" min={3000} max={30000} step={1000}
                  value={annualMiles}
                  onChange={e => setAnnualMiles(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, var(--accent) ${((annualMiles - 3000) / 27000) * 100}%, var(--border) ${((annualMiles - 3000) / 27000) * 100}%)` }}
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>3,000</span>
                  <span className="font-semibold text-[var(--accent)]">13,500 avg</span>
                  <span>30,000</span>
                </div>
              </div>

              {/* Monthly cost breakdown */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Estimated monthly costs · {results.extra.tier} tier
                  </p>
                  <div className="flex items-center gap-1.5">
                    {userState && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
                        {userState}
                      </span>
                    )}
                    {proMode && selectedVehicleInfo?.make && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
                        Pro
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: mode === 'lease' ? 'Lease payment' : 'Loan payment', val: results.payment },
                    { label: results.extra.segment === 'electric' ? 'Electricity (fuel equiv.)' : 'Fuel', val: results.extra.fuel },
                    { label: 'Insurance', val: results.extra.insurance },
                    { label: 'Maintenance', val: results.extra.maintenance },
                    { label: 'Registration', val: results.extra.registration },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-muted)]">{label}</span>
                      <span className="text-white font-semibold tabular-nums">{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border)] pt-2 mt-1 flex items-center justify-between">
                    <span className="font-bold text-white">Total monthly</span>
                    <span className="font-display font-bold text-[var(--accent)] text-lg tabular-nums">{fmt(results.totalMonthly)}</span>
                  </div>
                  {annualMiles > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[var(--text-muted)]">Cost per mile</span>
                      <span className="text-white font-medium tabular-nums">
                        ${((results.totalMonthly * 12) / annualMiles).toFixed(2)}/mi
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                  {proMode && selectedVehicleInfo?.make
                    ? <>Brand-specific rates for {selectedVehicleInfo.make}{selectedVehicleInfo.is_ev ? ', EV-adjusted fuel & service' : ''}. </>
                    : null}
                  {userState
                    ? <>{US_STATES.find(([c]) => c === userState)?.[1]} insurance, fuel & registration rates applied.</>
                    : 'National average rates. Select your state above for tailored estimates.'}
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20 anim-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Required annual income
              </p>

              {[
                {
                  label: 'Conservative',
                  sublabel: '10% of gross income — recommended',
                  value: results.conservative,
                  highlight: true,
                  badge: '✓ Safest',
                },
                {
                  label: 'Comfortable',
                  sublabel: '15% of gross income',
                  value: results.comfortable,
                  highlight: false,
                  badge: null,
                },
                {
                  label: 'Aggressive',
                  sublabel: '20% of gross income',
                  value: results.aggressive,
                  highlight: false,
                  badge: '⚠ Stretched',
                },
              ].map(({ label, sublabel, value, highlight, badge }) => (
                <div
                  key={label}
                  className={`card transition-all ${highlight ? 'border-[var(--accent)]' : 'hover:border-[#3a3a3e]'}`}
                  style={highlight ? { background: 'rgba(255,184,0,0.04)' } : {}}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: highlight ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {label}
                    </p>
                    {badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className={`font-display font-bold ${highlight ? 'text-[var(--accent)] text-3xl' : 'text-white text-2xl'} tabular-nums`}>
                    {fmt(value)}
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">{sublabel}</p>
                </div>
              ))}

              {/* Loan cost summary — buy mode only */}
              {mode === 'buy' && results.loanAmount > 0 && (
                <div className="card border-[var(--border)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Loan Cost Summary</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Amount financed', val: results.loanAmount },
                      { label: `Interest paid (${loanTerm / 12} yr @ ${rate}%)`, val: results.totalInterest },
                      { label: 'Total loan cost', val: results.totalLoanCost },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-muted)]">{label}</span>
                        <span className={`font-semibold tabular-nums ${label.startsWith('Interest') ? 'text-yellow-400' : 'text-white'}`}>{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                  {results.totalInterest > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                      You pay {fmt(results.totalInterest)} extra in interest — {Math.round((results.totalInterest / results.loanAmount) * 100)}% above the loan principal. A shorter term or larger down payment reduces this.
                    </p>
                  )}
                </div>
              )}

              {/* Take-home income context */}
              {(() => {
                const grossConservative = results.conservative
                const takeHome = estimateMonthlyTakeHome(grossConservative)
                const vehiclePct = Math.round((results.totalMonthly / takeHome) * 100)
                return (
                  <div className="rounded-xl border border-[var(--border)] p-4 text-sm"
                    style={{ background: 'var(--surface)' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                      What that salary looks like monthly
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Gross (conservative)</span>
                        <span className="text-white font-semibold">{fmt(grossConservative / 12)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Est. take-home after taxes</span>
                        <span className="text-white font-semibold">{fmt(takeHome)}/mo</span>
                      </div>
                      <div className="border-t border-[var(--border)] pt-2 flex justify-between">
                        <span className="text-[var(--text-muted)]">Vehicle share of take-home</span>
                        <span className={`font-bold ${vehiclePct <= 15 ? 'text-green-400' : vehiclePct <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                          {vehiclePct}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                      Take-home estimate uses federal brackets + FICA + 4% avg state tax — actual varies by state, filing status &amp; deductions. The 20/4/10 rule targets 10% of <em>gross</em> income, which is typically 13–16% of take-home.
                    </p>
                  </div>
                )
              })()}

              {/* Reverse: What can I afford? */}
              <div className="card border-[var(--border)]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  What can I afford?
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  Enter your gross annual salary to see the vehicle price you can target at each spending tier.
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      value={knownSalary}
                      onChange={e => setKnownSalary(e.target.value)}
                      placeholder="e.g. 75,000"
                      className="input-field"
                      style={{ paddingLeft: '1.75rem' }}
                      min={0}
                      step={1000}
                    />
                  </div>
                  {knownSalary && Number(knownSalary) >= 10000 && (
                    <input
                      type="range" min={20000} max={400000} step={1000}
                      value={Number(knownSalary)}
                      onChange={e => setKnownSalary(e.target.value)}
                      style={{ background: `linear-gradient(to right, var(--accent) ${((Number(knownSalary) - 20000) / 380000) * 100}%, var(--border) ${((Number(knownSalary) - 20000) / 380000) * 100}%)` }}
                    />
                  )}
                </div>
                {affordableResults ? (
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Conservative', pct: '10%', badge: '✓ Safest', value: affordableResults.conservative, accent: true },
                      { label: 'Comfortable',  pct: '15%', badge: null,        value: affordableResults.comfortable,  accent: false },
                      { label: 'Aggressive',   pct: '20%', badge: '⚠ Stretched', value: affordableResults.aggressive, accent: false },
                    ].map(({ label, pct, badge, value, accent }) => (
                      <div key={label}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg border"
                        style={{
                          borderColor: accent ? 'var(--accent)' : 'var(--border)',
                          background: accent ? 'rgba(200,255,0,0.04)' : 'var(--bg)',
                        }}>
                        <div>
                          <span className="text-xs font-semibold" style={{ color: accent ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {label} <span className="font-normal opacity-70">({pct})</span>
                          </span>
                          {badge && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              {badge}
                            </span>
                          )}
                        </div>
                        <span className={`font-display font-bold tabular-nums ${accent ? 'text-[var(--accent)] text-lg' : 'text-white'}`}>
                          {value > 0 ? fmt(value) : 'N/A'}
                        </span>
                      </div>
                    ))}
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-1">
                      Assumes {downPct}% down · {loanTerm}-month loan · {rate}% APR · includes estimated insurance, fuel, maintenance &amp; registration.
                      {userState ? ` ${userState} rates applied.` : ' National average rates.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Enter a salary above to see your affordable vehicle range.
                  </p>
                )}
              </div>

              {/* Rule explainer */}
              {mode === 'buy' ? (
                <div className="card border-[var(--border)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">The 20/4/10 Rule</p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { num: '20%', desc: 'Minimum down payment' },
                      { num: '4 yrs', desc: 'Maximum loan term' },
                      { num: '10%', desc: 'Max % of gross income for all vehicle costs' },
                    ].map(({ num, desc }) => (
                      <div key={num} className="flex items-center gap-3">
                        <span className="font-display font-bold text-[var(--accent)] text-sm w-12 shrink-0">{num}</span>
                        <span className="text-sm text-[var(--text-muted)]">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card border-[var(--border)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">Lease Affordability Guide</p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { num: '10%', desc: 'Conservative — all vehicle costs ≤ 10% of gross income' },
                      { num: '15%', desc: 'Comfortable — most can manage without strain' },
                      { num: '20%', desc: 'Aggressive — stretched but feasible for some' },
                    ].map(({ num, desc }) => (
                      <div key={num} className="flex items-center gap-3">
                        <span className="font-display font-bold text-[var(--accent)] text-sm w-12 shrink-0">{num}</span>
                        <span className="text-sm text-[var(--text-muted)]">{desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-3">
                    Note: Leases build no equity. At lease end you return the vehicle or buy it at residual value.
                  </p>
                </div>
              )}

              <Link to="/tco" className="btn-ghost text-sm justify-center">
                Calculate full TCO →
              </Link>
            </div>
          </div>

          {/* Vehicle Suggestions */}
          {affordableResults && (
            <div className="mt-10 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">
                    Matching Vehicles
                  </p>
                  <h2 className="font-display font-bold text-white text-lg leading-tight">
                    Cars within your budget
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {pickYear} model year · Base MSRP fits your {downPct}% down · {loanTerm}-mo loan · {rate}% APR · includes operating costs
                    {userState ? ` · ${userState} rates` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                      Model Year
                    </label>
                    <select
                      value={pickYear}
                      onChange={e => setPickYear(e.target.value)}
                      className="input-field text-sm py-2 w-auto"
                    >
                      {CATALOG_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="input-field text-sm py-2 w-auto"
                    >
                      {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1 p-1 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'economy', label: 'Economy' },
                      { value: 'luxury', label: 'Luxury' },
                      { value: 'other', label: 'Other' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setCarFilterCategory(opt.value)}
                        aria-pressed={carFilterCategory === opt.value}
                        className="px-3 py-2.5 min-h-[44px] rounded-md text-xs font-semibold transition-all active:opacity-70"
                        style={{
                          background: carFilterCategory === opt.value ? 'var(--accent)' : 'transparent',
                          color: carFilterCategory === opt.value ? '#000' : 'var(--text-muted)',
                        }}
                      >
                        {opt.label}
                        {' '}
                        <span className="opacity-60 font-normal">
                          ({carFilterCategory === opt.value || opt.value === 'all'
                            ? (opt.value === 'all' ? matchedVehicles.length : filteredVehicles.length)
                            : matchedVehicles.filter(v => v.category === opt.value).length})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {recommendedVehicle && (() => {
                const b = vehicleCostLines(recommendedVehicle, rate, loanTerm)
                const t = TIER_STYLES[recommendedVehicle.tier]
                return (
                  <div className="card border-[var(--accent)] p-5 mb-6" style={{ background: 'rgba(200,255,0,0.04)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-1">
                          ★ Recommended for You
                        </p>
                        <p className="font-display font-bold text-white text-xl leading-tight">
                          {recommendedVehicle.year} {recommendedVehicle.make} {recommendedVehicle.model}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] capitalize mt-0.5">
                          {recommendedVehicle.type.replace('_', ' ')}{recommendedVehicle.is_ev ? ' · EV' : ''}
                        </p>
                        {(recommendedVehicle.specs.horsepower || recommendedVehicle.specs.seats || recommendedVehicle.specs.cargo_cu_ft) && (
                          <p className="text-xs text-[var(--text-muted)] flex flex-wrap gap-x-2 mt-1">
                            {recommendedVehicle.specs.horsepower && <span>{recommendedVehicle.specs.horsepower} hp</span>}
                            {recommendedVehicle.specs.seats && <span>{recommendedVehicle.specs.seats} seats</span>}
                            {recommendedVehicle.specs.cargo_cu_ft && <span>{recommendedVehicle.specs.cargo_cu_ft} cu ft cargo</span>}
                          </p>
                        )}
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="font-display font-bold text-white text-2xl tabular-nums">{fmt(recommendedVehicle.basePrice)}</p>
                        <span className={`text-[11px] font-semibold ${t.color}`}>{t.label}</span>
                        {pctOfIncome(recommendedVehicle, knownSalary) != null && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {pctOfIncome(recommendedVehicle, knownSalary)}% of gross income/yr
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                      {RECOMMENDATION_REASONING[recommendedVehicle.tier]}
                    </p>
                    <div className="border-t border-[var(--border)] pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{b.header}</p>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        {b.lines.map(({ label, val }) => (
                          <div key={label} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[var(--text-muted)]">{label}</span>
                            <span className="text-white font-medium tabular-nums shrink-0">{fmt(val)}</span>
                          </div>
                        ))}
                        {b.credit && (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[var(--text-muted)]">{b.credit.label}</span>
                            <span className="text-green-400 font-medium tabular-nums shrink-0">− {fmt(b.credit.val)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 mt-2">
                        <span className="text-sm font-bold text-white">{b.totalLabel}</span>
                        <span className="font-display font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{fmt(b.totalVal)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addVehicleToComparison(recommendedVehicle)}
                      disabled={addedToCompare.has(`${recommendedVehicle.make}|${recommendedVehicle.model}|${recommendedVehicle.year}`)}
                      className="btn-ghost text-xs w-full mt-4 flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {addedToCompare.has(`${recommendedVehicle.make}|${recommendedVehicle.model}|${recommendedVehicle.year}`)
                        ? '✓ Added to Comparison'
                        : <>＋ Add to Comparison</>}
                    </button>
                  </div>
                )
              })()}

              {comparisonCount > 0 && (
                <div className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-6 text-xs"
                  style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)' }}>
                  <span style={{ color: 'var(--accent)' }} className="font-semibold">
                    {comparisonCount} car{comparisonCount !== 1 ? 's' : ''} queued for comparison
                  </span>
                  {comparisonCount >= 2 && (
                    <Link to="/compare"
                      className="font-bold text-white hover:text-[var(--accent)] transition-colors ml-3 shrink-0">
                      View Comparison →
                    </Link>
                  )}
                </div>
              )}

              {filteredVehicles.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-[var(--text-muted)] text-sm">No {pickYear} model year vehicles in this category fit your current budget.</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">Try a higher salary, a different model year, or a different category.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                    All matches
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {gridVehicles.map(v => {
                      const tierStyles = TIER_STYLES[v.tier]
                      const b = vehicleCostLines(v, rate, loanTerm)
                      const isRecommended = recommendedVehicle
                        && v.make === recommendedVehicle.make && v.model === recommendedVehicle.model
                      return (
                        <div
                          key={`${v.make}-${v.model}`}
                          className={`card p-4 flex flex-col gap-1.5 transition-all ${isRecommended ? '' : 'hover:border-[var(--accent)]'}`}
                          style={isRecommended ? { borderColor: 'var(--accent)' } : undefined}
                        >
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="text-xs font-semibold text-[var(--text-muted)] leading-tight">{v.make}</p>
                            <div className="flex gap-1 shrink-0">
                              {isRecommended && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--accent)', color: '#000' }}>
                                  ★ Pick
                                </span>
                              )}
                              {v.is_ev && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(200,255,0,0.15)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.3)' }}>
                                  EV
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-base font-bold text-white leading-tight">{v.model}</p>
                          <p className="text-xs text-[var(--text-muted)] capitalize">{v.year} · {v.type.replace('_', ' ')}</p>
                          {(v.specs.horsepower || v.specs.seats || v.specs.cargo_cu_ft) && (
                            <p className="text-[11px] text-[var(--text-muted)] flex flex-wrap gap-x-2">
                              {v.specs.horsepower && <span>{v.specs.horsepower} hp</span>}
                              {v.specs.seats && <span>{v.specs.seats} seats</span>}
                              {v.specs.cargo_cu_ft && <span>{v.specs.cargo_cu_ft} cu ft cargo</span>}
                            </p>
                          )}
                          <p className="font-display font-bold text-white tabular-nums text-lg mt-1.5">{fmt(v.basePrice)}</p>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${tierStyles.color}`}>{tierStyles.label}</span>
                            {pctOfIncome(v, knownSalary) != null && (
                              <span className="text-[11px] text-[var(--text-muted)]">{pctOfIncome(v, knownSalary)}% of income/yr</span>
                            )}
                          </div>
                          <div className="border-t border-[var(--border)] pt-2 flex flex-col gap-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                              {b.header}
                            </p>
                            {b.lines.map(({ label, val }) => (
                              <div key={label} className="flex items-center justify-between gap-1.5">
                                <span className="text-xs text-[var(--text-muted)] leading-tight">{label}</span>
                                <span className="text-xs text-white tabular-nums shrink-0">{fmt(val)}</span>
                              </div>
                            ))}
                            {b.credit && (
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs text-[var(--text-muted)] leading-tight">{b.credit.label}</span>
                                <span className="text-xs text-green-400 tabular-nums shrink-0">− {fmt(b.credit.val)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 mt-0.5">
                              <span className="text-xs font-bold text-white">{b.totalLabel}</span>
                              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>{fmt(b.totalVal)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => addVehicleToComparison(v)}
                            disabled={addedToCompare.has(`${v.make}|${v.model}|${v.year}`)}
                            className="btn-ghost text-xs w-full mt-2 py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-60"
                          >
                            {addedToCompare.has(`${v.make}|${v.model}|${v.year}`) ? '✓ Added' : <>＋ Add to Compare</>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  {filteredVehicles.length > 20 && (
                    <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                      Showing 20 of {filteredVehicles.length} matches — filter by category or adjust your salary to refine.
                    </p>
                  )}
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Conservative ≤ {fmt(affordableResults.conservative)}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block" /> Comfortable ≤ {fmt(affordableResults.comfortable)}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Stretched ≤ {fmt(affordableResults.aggressive)}</span>
                <span className="opacity-60">Base MSRP only · final price varies by trim, dealer, and region</span>
              </div>
            </div>
          )}

          <ProUpsell
            headline="Know your number. Now find the car that fits it."
            body="Pro mode localizes every estimate to your state and exact vehicle — then your $19 pass
              covers the rest of the journey: detailed cost breakdowns, side-by-side comparisons, and
              used-car checklists, unlimited for 60 days."
          />
        </div>
      </main>
      <NextStep
        tag="Next step · price the real cost"
        title="Know your budget? See what a car actually costs."
        body="Your affordable price is the ceiling. The TCO Calculator shows the true 5-year cost of any car under it — fuel, insurance, maintenance, depreciation, and interest."
        to="/tco"
        cta="Run the TCO Calculator"
      />
      <Footer />
    </div>
  )
}
