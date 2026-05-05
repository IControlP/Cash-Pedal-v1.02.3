import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PaywallModal from '../components/PaywallModal'
import { useSubscription } from '../hooks/useSubscription'
import VEHICLES from '../data/vehicles.json'
import {
  classifySegment, determineMaintTier,
  estimateInsurance, generateMaintenanceServices,
  computeAnnualFuel, computeAnnualRegistration,
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

const DEFAULT_ANNUAL_MILES = 12000

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
  const registration = Math.round(computeAnnualRegistration(state, price) / 12)
  return { fuel, insurance, maintenance, registration, total: fuel + insurance + maintenance + registration, tier: tierLabel[tierKey] }
}

// Pro mode: vehicle-specific + state-aware
function estimateProMonthlyCosts(price, make, model, year, isEv, mpg, state, annualMiles = DEFAULT_ANNUAL_MILES) {
  const segment = isEv ? 'electric' : classifySegment(make, model)

  const mpgNum  = mpg && typeof mpg === 'object' ? (mpg.combined ?? null) : (mpg || null)
  const mpgeNum = mpg && typeof mpg === 'object' ? (mpg.mpge_combined ?? null) : null

  const fuel = Math.round(computeAnnualFuel(
    isEv,
    isEv ? null : mpgNum,
    isEv ? mpgeNum : null,
    state || null,
    annualMiles
  ) / 12)

  const insurance = Math.round(estimateInsurance(price, make, model, year, state || null) / 12)

  const maintServices = generateMaintenanceServices(isEv, annualMiles, segment, make)
  const maintenance = Math.round(maintServices.reduce((s, x) => s + x.annual, 0) / 12)

  const registration = Math.round(computeAnnualRegistration(state || null, price) / 12)

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
  { value: 84, label: '84 months (7 yr)' },
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

export default function SalaryCalculator() {
  const { isSubscribed } = useSubscription()
  const [showPaywall, setShowPaywall] = useState(false)

  // Finance mode
  const [mode, setMode] = useState('buy')
  const [knownSalary, setKnownSalary] = useState('')

  // State detection
  const [userState, setUserState] = useState('')
  const [stateAutoDetected, setStateAutoDetected] = useState(false)
  const [stateDetecting, setStateDetecting] = useState(false)
  const [stateDetectFailed, setStateDetectFailed] = useState(false)

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
    return estimateProMonthlyCosts(activePrice, make, model, year, is_ev, mpg, userState, annualMiles)
  }, [proMode, selectedVehicleInfo, activePrice, userState, annualMiles])

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
      for (let i = 0; i < 6; i++) {
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
        const years = Object.keys(data.trims_by_year || {}).sort((a, b) => Number(b) - Number(a))
        if (!years.length) return
        const latestYear = years[0]
        const trims = data.trims_by_year[latestYear]
        const basePrice = Math.min(...Object.values(trims))
        if (basePrice > maxPrice || basePrice <= 0) return
        const category = classifyCarCategory(make, data.type, basePrice)
        let tier = 'aggressive'
        if (basePrice <= (affordableResults.conservative || 0)) tier = 'conservative'
        else if (basePrice <= (affordableResults.comfortable || 0)) tier = 'comfortable'
        const ops = estimateBasicMonthlyCosts(basePrice, userState || null, annualMiles)
        const annualFinancing = Math.round(monthlyPayment(basePrice * (1 - downPct / 100), rate, loanTerm) * 12)
        const annualOperating = ops.total * 12
        entries.push({
          make, model, type: data.type, is_ev: data.is_ev,
          basePrice, year: latestYear, category, tier,
          annualFinancing,
          annualFuel: ops.fuel * 12,
          annualInsurance: ops.insurance * 12,
          annualMaintenance: ops.maintenance * 12,
          annualRegistration: ops.registration * 12,
          annualOperating,
          annualTotal: annualFinancing + annualOperating,
        })
      })
    })
    return entries.sort((a, b) => b.basePrice - a.basePrice)
  }, [affordableResults, userState, annualMiles, rate])

  const filteredVehicles = useMemo(() => {
    if (carFilterCategory === 'all') return matchedVehicles
    return matchedVehicles.filter(v => v.category === carFilterCategory)
  }, [matchedVehicles, carFilterCategory])

  const downAmount = vehiclePrice * (downPct / 100)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {showPaywall && (
        <PaywallModal
          feature="salary"
          usedCount={0}
          cancelPath="/salary"
          onUnlocked={() => { setShowPaywall(false); setProMode(true) }}
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
              ? 'Enter your lease payment and see the gross income needed to keep vehicle costs under 10–20% of your salary.'
              : 'The 20/4/10 rule: 20% down, max 4-year loan, total vehicle costs ≤ 10% of gross income. See the salary you need.'}
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

            {/* Inputs */}
            <div className="card anim-3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white text-lg">Vehicle Details</h2>
                {/* Pro toggle */}
                <button
                  onClick={() => {
                    if (!isSubscribed && !proMode) { setShowPaywall(true); return }
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
                    className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
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
                        onClick={() => { setUserState(''); setStateAutoDetected(false) }}
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
                    {loanTerm === 60 && (
                      <p className="text-xs text-yellow-500">⚠ 5-year loans are common but add significant interest. The 20/4/10 rule recommends 48 months max.</p>
                    )}
                    {loanTerm === 72 && (
                      <p className="text-xs text-orange-400">⚠ 6-year loans mean you'll likely owe more than the car is worth for the first 2–3 years (underwater).</p>
                    )}
                    {loanTerm === 84 && (
                      <p className="text-xs text-red-400">⛔ 7-year loans are high risk — you'll be underwater for most of the loan and pay substantially more in interest. Consider a less expensive vehicle.</p>
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
                  <span className="font-semibold text-[var(--accent)]">12,000 avg</span>
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
                    Base MSRP fits your {downPct}% down · {loanTerm}-mo loan · {rate}% APR · includes operating costs
                    {userState ? ` · ${userState} rates` : ''}
                  </p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg shrink-0"
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
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
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

              {filteredVehicles.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-[var(--text-muted)] text-sm">No vehicles in this category fit your current budget.</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">Try a higher salary or switch to a different category.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredVehicles.slice(0, 20).map(v => {
                      const tierStyles = {
                        conservative: { color: 'text-green-400', label: '✓ Conservative' },
                        comfortable:  { color: 'text-[var(--accent)]', label: 'Comfortable' },
                        aggressive:   { color: 'text-amber-400', label: '⚠ Stretched' },
                      }[v.tier]
                      return (
                        <div
                          key={`${v.make}-${v.model}`}
                          className="card p-3 flex flex-col gap-1 hover:border-[var(--accent)] transition-all"
                        >
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="text-[11px] font-semibold text-[var(--text-muted)] leading-tight">{v.make}</p>
                            {v.is_ev && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(200,255,0,0.15)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.3)' }}>
                                EV
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-white leading-tight">{v.model}</p>
                          <p className="text-[11px] text-[var(--text-muted)] capitalize">{v.type.replace('_', ' ')}</p>
                          <p className="font-display font-bold text-white tabular-nums text-base mt-1.5">{fmt(v.basePrice)}</p>
                          <span className={`text-[10px] font-semibold ${tierStyles.color} mb-1`}>{tierStyles.label}</span>
                          <div className="border-t border-[var(--border)] pt-2 flex flex-col gap-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Est. annual costs</p>
                            {[
                              { label: `Financing (${100 - downPct}% · ${loanTerm / 12}yr · ${rate}%)`, val: v.annualFinancing },
                              { label: v.is_ev ? 'Electricity' : 'Fuel', val: v.annualFuel },
                              { label: 'Insurance', val: v.annualInsurance },
                              { label: 'Maintenance', val: v.annualMaintenance },
                              { label: 'Registration', val: v.annualRegistration },
                            ].map(({ label, val }) => (
                              <div key={label} className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-[var(--text-muted)] leading-tight">{label}</span>
                                <span className="text-[10px] text-white tabular-nums shrink-0">{fmt(val)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-1 mt-0.5">
                              <span className="text-[10px] font-bold text-white">Total/yr</span>
                              <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>{fmt(v.annualTotal)}</span>
                            </div>
                          </div>
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
        </div>
      </main>
      <Footer />
    </div>
  )
}
