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
import { resolveLocation, STATE_INS_BASE } from '../utils/vehicleCosts'
import {
  fmt, monthlyPayment, DEFAULT_ANNUAL_MILES, US_STATES, loanTermOptions,
  CURRENT_YEAR, CATALOG_YEARS, SORT_OPTIONS, sortVehicles,
  TIER_STYLES, RECOMMENDATION_REASONING, pctOfIncome, vehicleCostLines,
  solveAffordablePrice, buildMatchedVehicles,
  VEHICLE_CATEGORY_FILTERS, matchesCategory, isCategoryValue,
  US_AVG_OWNERSHIP_YEARS, OWNERSHIP_YEAR_OPTIONS,
} from '../utils/affordability'

// Free Pro previews before the paywall — shared counter with /salary so a
// visitor can't reset the free allowance by hopping between the two tools.
const FREE_SALARY_PRO_LIMIT = 5
const LS_SALARY_PRO_COUNT   = 'cashpedal_salary_pro_count'

export default function Affordability() {
  const { isSubscribed } = useSubscription()
  const { spendCredit } = useBonusCredits()
  const [showPaywall, setShowPaywall] = useState(false)
  const [bonusUnlocked, setBonusUnlocked] = useState(false)
  const [salaryProCount, setSalaryProCount] = useState(() =>
    parseInt(safeGet(LS_SALARY_PRO_COUNT) || '0', 10)
  )

  // Entry CTA — scroll cold / ad traffic straight into the salary input.
  const inputsRef = useRef(null)
  const scrollToStart = () => inputsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => { trackUsage('visit_affordability') }, [])

  // Optional pre-fill of salary from a query param (?salary=75000)
  const [searchParams] = useSearchParams()
  const [knownSalary, setKnownSalary] = useState(() => {
    const q = searchParams.get('salary')
    const n = q ? parseInt(q, 10) : NaN
    return !isNaN(n) && n > 0 ? String(n) : ''
  })

  // State detection
  const [userState, setUserState] = useState('')
  const [stateAutoDetected, setStateAutoDetected] = useState(false)
  const [stateDetecting, setStateDetecting] = useState(false)
  const [stateDetectFailed, setStateDetectFailed] = useState(false)

  // ZIP (optional) — sharpens Pro maintenance & EV charging beyond state averages.
  const [userZip, setUserZip] = useState('')
  const [zipError, setZipError] = useState('')
  const [resolvedLaborRate, setResolvedLaborRate] = useState(null)
  const [resolvedWear, setResolvedWear] = useState(null)
  const [liveElecRate, setLiveElecRate] = useState(null)

  // Pro mode
  const [proMode, setProMode] = useState(false)

  // Loan assumptions + mileage
  const [downPct, setDownPct] = useState(20)
  const [loanTerm, setLoanTerm] = useState(48)
  const [rate, setRate] = useState(6.5)
  const [annualMiles, setAnnualMiles] = useState(DEFAULT_ANNUAL_MILES)

  // Pick-list controls — the category filter can be pre-selected via ?category=
  // (e.g. deep-linked from the Car Survey once it knows the visitor's body type).
  const [carFilterCategory, setCarFilterCategory] = useState(() => {
    const q = searchParams.get('category')
    return q && isCategoryValue(q) ? q : 'all'
  })
  const [pickYear, setPickYear] = useState(CURRENT_YEAR)
  const [sortBy, setSortBy] = useState('price')
  const [ownershipYears, setOwnershipYears] = useState(US_AVG_OWNERSHIP_YEARS)

  // Comparison hand-off — same cashpedal_tco_for_comparison localStorage queue
  // the TCO Calculator and Salary Calculator use; MultiVehicleComparison reads
  // it on mount and clears it after import.
  const [comparisonCount, setComparisonCount] = useState(() => {
    try { return JSON.parse(safeGet('cashpedal_tco_for_comparison') || '[]').length } catch { return 0 }
  })
  const [addedToCompare, setAddedToCompare] = useState(() => new Set())

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

  // ZIP resolves to a state (syncing the selector), a local labor rate, and a
  // wear profile — same resolveLocation() the TCO Calculator uses.
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

  function handleProToggle() {
    // Toggling off is always free
    if (proMode) { setProMode(false); return }
    if (isSubscribed || bonusUnlocked) { setProMode(true); return }
    if (salaryProCount < FREE_SALARY_PRO_LIMIT) {
      const next = salaryProCount + 1
      setSalaryProCount(next)
      safeSet(LS_SALARY_PRO_COUNT, String(next))
      trackUsage('salary_pro', 'free')
      setProMode(true)
      return
    }
    spendCredit('salary_pro').then(ok => {
      if (ok) { setBonusUnlocked(true); setProMode(true) }
      else setShowPaywall(true)
    })
  }

  const affordableResults = useMemo(
    () => solveAffordablePrice(knownSalary, { userState, annualMiles, rate, loanTerm, downPct }),
    [knownSalary, userState, annualMiles, rate, loanTerm, downPct]
  )

  const matchedVehicles = useMemo(
    () => buildMatchedVehicles(affordableResults, {
      pickYear, userState, annualMiles, rate, loanTerm, proMode, ownershipYears,
      resolvedLaborRate, resolvedWear, liveElecRate,
    }),
    [affordableResults, pickYear, userState, annualMiles, rate, loanTerm, proMode, ownershipYears, resolvedLaborRate, resolvedWear, liveElecRate]
  )

  const filteredVehicles = useMemo(() => {
    if (carFilterCategory === 'all') return matchedVehicles
    return matchedVehicles.filter(v => matchesCategory(v, carFilterCategory))
  }, [matchedVehicles, carFilterCategory])

  // How many matched vehicles fall in each category — shown in the selector so
  // a visitor sees which body types their budget actually covers.
  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const f of VEHICLE_CATEGORY_FILTERS) {
      counts[f.value] = f.value === 'all'
        ? matchedVehicles.length
        : matchedVehicles.filter(f.match).length
    }
    return counts
  }, [matchedVehicles])

  // Single "best fit" pick: priciest vehicle in the safest tier that still fits.
  const recommendedVehicle = useMemo(() => {
    if (!filteredVehicles.length) return null
    return filteredVehicles.find(v => v.tier === 'conservative')
      ?? filteredVehicles.find(v => v.tier === 'comfortable')
      ?? filteredVehicles.find(v => v.tier === 'aggressive')
      ?? null
  }, [filteredVehicles])

  const sortedGridVehicles = useMemo(() => sortVehicles(filteredVehicles, sortBy), [filteredVehicles, sortBy])

  // Top 20 by the active sort. On the default price sort, the recommended pick
  // is guaranteed to appear; other sorts leave the true top-ranked order intact.
  const gridVehicles = useMemo(() => {
    const top20 = sortedGridVehicles.slice(0, 20)
    if (!recommendedVehicle || sortBy !== 'price') return top20
    const alreadyShown = top20.some(v => v.make === recommendedVehicle.make && v.model === recommendedVehicle.model)
    return alreadyShown ? top20 : [recommendedVehicle, ...top20.slice(0, 19)]
  }, [sortedGridVehicles, recommendedVehicle, sortBy])

  function addVehicleToComparison(v) {
    const key = `${v.make}|${v.model}|${v.year}`
    if (addedToCompare.has(key)) return

    const downPayment = v.ownershipCost ? v.ownershipCost.downPayment : Math.round(v.basePrice * 0.20)
    const resaleValue = v.ownershipCost ? v.ownershipCost.resaleValue : null
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
      ownershipYears,
      totalAnnualCost: v.annualTotal,
      totalOwnershipCost: v.ownershipCost ? v.ownershipCost.total : v.annualTotal * ownershipYears,
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
          cancelPath="/affordability"
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
            What Can I Afford?
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            What car can your salary actually buy?
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-xl">
            Enter your gross annual income and we&apos;ll show the vehicle price you can target at each
            spending tier — plus real cars within budget, ranked and priced for your state, using the
            20/4/10 rule.
          </p>

          <ToolEntryCTA
            headline="See the cars your income can carry — in under 2 minutes."
            points={['Free', 'No signup', 'Based on the 20/4/10 rule']}
            buttonLabel="Find my range ↓"
            onStart={scrollToStart}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

            {/* Inputs */}
            <div ref={inputsRef} className="card anim-3 flex flex-col gap-6 scroll-mt-20">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white text-lg">Your Details</h2>
                <button
                  onClick={handleProToggle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={{
                    background: proMode ? 'var(--accent)' : 'transparent',
                    color: proMode ? '#000' : 'var(--text-muted)',
                    borderColor: proMode ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {!isSubscribed && !proMode && <span className="text-[10px] mr-0.5">🔒</span>}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Pro
                </button>
              </div>

              {/* Salary */}
              <div className="flex flex-col gap-2">
                <label className="input-label">Gross Annual Salary</label>
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

              <div className="h-px bg-[var(--border)]" />

              {/* Loan assumptions */}
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] -mb-2">
                Financing Assumptions
              </p>

              {/* Down payment % */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="input-label">Down Payment</label>
                  <span className="text-sm font-bold text-white">{downPct}%</span>
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
                <select value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} className="input-field">
                  {loanTermOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            </div>

            {/* Results: affordable price tiers */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20 anim-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Affordable vehicle price
              </p>

              {affordableResults ? (
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Conservative', pct: '10% of income', badge: '✓ Safest', value: affordableResults.conservative, accent: true },
                    { label: 'Comfortable',  pct: '15% of income', badge: null,        value: affordableResults.comfortable,  accent: false },
                    { label: 'Aggressive',   pct: '20% of income', badge: '⚠ Stretched', value: affordableResults.aggressive, accent: false },
                  ].map(({ label, pct, badge, value, accent }) => (
                    <div
                      key={label}
                      className={`card transition-all ${accent ? 'border-[var(--accent)]' : 'hover:border-[#3a3a3e]'}`}
                      style={accent ? { background: 'rgba(200,255,0,0.04)' } : {}}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {label}
                        </p>
                        {badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className={`font-display font-bold ${accent ? 'text-[var(--accent)] text-3xl' : 'text-white text-2xl'} tabular-nums`}>
                        {value > 0 ? fmt(value) : 'N/A'}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mt-1">{pct}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Assumes {downPct}% down · {loanTerm}-month loan · {rate}% APR · includes estimated insurance,
                    fuel, maintenance &amp; registration.{userState ? ` ${userState} rates applied.` : ' National average rates.'}
                  </p>
                </div>
              ) : (
                <div className="card border-[var(--border)]">
                  <p className="text-sm text-[var(--text-muted)]">
                    Enter your gross annual salary to see the vehicle price you can target at each spending tier,
                    then browse real cars within budget below.
                  </p>
                </div>
              )}

              {/* Rule explainer */}
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

              <Link to="/salary" className="btn-ghost text-sm justify-center">
                Have a specific car in mind? →
              </Link>
            </div>
          </div>

          {/* Matching Vehicles */}
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
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                      Ownership Duration
                    </label>
                    <select
                      value={ownershipYears}
                      onChange={e => setOwnershipYears(Number(e.target.value))}
                      className="input-field text-sm py-2 w-auto"
                    >
                      {OWNERSHIP_YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>
                          {y} yr{y !== 1 ? 's' : ''}{y === US_AVG_OWNERSHIP_YEARS ? ' (US avg)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                      Category
                    </label>
                    <select
                      value={carFilterCategory}
                      onChange={e => setCarFilterCategory(e.target.value)}
                      className="input-field text-sm py-2 w-auto"
                    >
                      {VEHICLE_CATEGORY_FILTERS.map(f => (
                        <option key={f.value} value={f.value}>
                          {f.label} ({categoryCounts[f.value] ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link to="/survey" className="text-[11px] text-[var(--accent)] hover:underline whitespace-nowrap">
                    Not sure which type fits? Take the 2-min survey →
                  </Link>
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
                      {b.range && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-[var(--text-muted)]">{b.range.label}</span>
                          <span className="text-xs font-semibold text-white tabular-nums">{b.range.text}</span>
                        </div>
                      )}
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
                            {b.range && (
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] text-[var(--text-muted)] leading-tight">{b.range.label}</span>
                                <span className="text-[11px] font-semibold text-white tabular-nums shrink-0">{b.range.text}</span>
                              </div>
                            )}
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
            headline="Found your range. Now localize every number."
            body="Pro mode tailors every estimate to your state, ZIP, and exact vehicle — then your $19 pass
              covers the rest of the journey: detailed cost breakdowns, side-by-side comparisons, and
              used-car checklists, unlimited for 60 days."
          />
        </div>
      </main>
      <NextStep
        tag="Next step · price the real cost"
        title="Found a car you like? See what it actually costs."
        body="Your affordable price is the ceiling. The TCO Calculator shows the true 5-year cost of any car under it — fuel, insurance, maintenance, depreciation, and interest."
        to="/tco"
        cta="Run the TCO Calculator"
      />
      <Footer />
    </div>
  )
}
