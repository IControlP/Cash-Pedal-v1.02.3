import { useState, useMemo, useEffect, useRef } from 'react'
import { safeGet, safeSet } from '../utils/safeStorage'
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
  estimateInsurance, generateMaintenanceServices,
  computeAnnualFuel, computeAnnualRegFees, resolveLocation,
  STATE_INS_BASE,
} from '../utils/vehicleCosts'
import {
  fmt, monthlyPayment, DEFAULT_ANNUAL_MILES, estimateBasicMonthlyCosts,
  US_STATES, loanTermOptions, CURRENT_YEAR,
} from '../utils/affordability'

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
// Shared cost helpers (estimateBasicMonthlyCosts, monthlyPayment, US_STATES,
// CURRENT_YEAR, loanTermOptions, DEFAULT_ANNUAL_MILES, fmt) come from
// ../utils/affordability so this page and /affordability stay in exact sync.
// The Pro forward-mode estimator below is specific to this page.

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

const TYPE_LABELS = {
  electric: 'Electric', hybrid: 'Hybrid', truck: 'Truck', suv: 'SUV',
  luxury_suv: 'Luxury SUV', sports: 'Sports', compact: 'Compact',
  economy: 'Economy', sedan: 'Sedan', luxury: 'Luxury',
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

  const downAmount = vehiclePrice * (downPct / 100)


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

              {/* Reverse flow — now its own dedicated tool */}
              <div className="card border-[var(--accent)]" style={{ background: 'rgba(200,255,0,0.04)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">
                  Working backwards?
                </p>
                <p className="font-display font-bold text-white text-base leading-tight mb-1">
                  Know your salary, not the car?
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                  Enter your income and we&apos;ll show the price you can target at each spending tier —
                  plus real cars within budget, ranked and priced for your state.
                </p>
                <Link to="/affordability" className="btn-primary text-sm w-full justify-center">
                  What can I afford? →
                </Link>
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

          <ProUpsell
            headline="Know the salary. Now localize every number."
            body="Pro mode tailors every estimate to your state and exact vehicle — then your $19 pass
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
