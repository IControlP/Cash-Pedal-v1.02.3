import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import VEHICLES from '../data/vehicles.json'
import {
  classifySegment, estimateCurrentValue, estimateInsurance,
  MAINT_BRAND_MULT, SEGMENT_MAINT_AVG,
  computeAnnualFuel, STATE_FUEL_PRICES, requiresPremiumFuel,
  computeAnnualRegistration, resolveLocation,
} from '../utils/vehicleCosts'
import { trackSearch } from '../utils/marketSearch'
import {
  trackSimpleMakeSelected, trackSimpleModelSelected, trackSimpleYearSelected,
  trackSimpleEstimateStarted, trackFreeEstimateStarted,
  trackFreeEstimateGenerated, trackEstimateGenerated, trackCalculatorCompleted,
  trackCalculatorStarted,
} from '../utils/analytics'
import { safeGet, safeSet } from '../utils/safeStorage'

// ── Defaults ──────────────────────────────────────────────
const DEFAULT_APR             = 6.9
const DEFAULT_DOWN_PCT        = 0.10
const DEFAULT_LOAN_TERM       = 60
const DEFAULT_OWNERSHIP_YRS   = 5
const DEFAULT_ANNUAL_MILEAGE  = 12000
const LS_FLOW_STATE           = 'cashpedal_flow_state'

// ── Loan math ─────────────────────────────────────────────
function calculateLoan({ price, downPayment, loanTermMonths, annualRatePercent, ownershipYears }) {
  const loanAmount = price - downPayment
  const r = annualRatePercent / 12 / 100
  const n = loanTermMonths
  let monthlyPayment = 0
  if (r === 0) {
    monthlyPayment = loanAmount / n
  } else {
    monthlyPayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }
  const effectiveMonths = Math.min(ownershipYears * 12, n)
  let interestThroughOwnership
  if (effectiveMonths >= n || r === 0) {
    interestThroughOwnership = monthlyPayment * n - loanAmount
  } else {
    const remainingBal = loanAmount * Math.pow(1 + r, effectiveMonths)
      - monthlyPayment * (Math.pow(1 + r, effectiveMonths) - 1) / r
    const principalRepaid = loanAmount - Math.max(0, remainingBal)
    interestThroughOwnership = Math.max(0, monthlyPayment * effectiveMonths - principalRepaid)
  }
  return { monthlyPayment: Math.round(monthlyPayment), loanAmount, interestThroughOwnership: Math.round(interestThroughOwnership) }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

// ── Vehicle data helpers ───────────────────────────────────
const MAKES = Object.keys(VEHICLES).sort()

const ALL_YEARS = [...new Set(
  Object.values(VEHICLES).flatMap(makeData =>
    Object.values(makeData).flatMap(modelData =>
      Object.keys(modelData.trims_by_year)
    )
  )
)].sort((a, b) => Number(b) - Number(a))

function getMakesForYear(year) {
  if (!year) return MAKES
  return MAKES.filter(make =>
    Object.values(VEHICLES[make]).some(modelData =>
      Object.keys(modelData.trims_by_year).includes(year)
    )
  )
}

function getModelsForMakeYear(make, year) {
  if (!make) return []
  return Object.keys(VEHICLES[make] || {}).filter(model =>
    !year || Object.keys(VEHICLES[make][model]?.trims_by_year ?? {}).includes(year)
  ).sort()
}

function getAvgMSRP(make, model, year) {
  const trims = VEHICLES[make]?.[model]?.trims_by_year?.[year]
  if (!trims) return null
  const vals = Object.values(trims)
  if (!vals.length) return null
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length / 500) * 500
}

// ── SearchSelect ───────────────────────────────────────────
function SearchSelect({ placeholder, options, value, onChange, disabled, autoFocus }) {
  const [query, setQuery]   = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef        = useRef(null)
  const inputRef            = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [autoFocus])

  const filtered = useMemo(() =>
    options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  , [options, query])

  function handleSelect(option) {
    onChange(option)
    setQuery('')
    setIsOpen(false)
  }

  function handleChange(e) {
    setQuery(e.target.value)
    setIsOpen(true)
    if (!e.target.value) onChange('')
  }

  function handleFocus() {
    setQuery('')
    setIsOpen(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur() }
  }

  const displayValue = isOpen ? query : (value || '')

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input-field w-full pr-10"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none text-xs">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50 overflow-auto rounded-xl border shadow-2xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: '240px' }}
        >
          {filtered.slice(0, 30).map(option => (
            <button
              key={option}
              onMouseDown={() => handleSelect(option)}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{
                color: option === value ? 'var(--accent)' : 'var(--text)',
                background: option === value ? 'rgba(255,184,0,0.06)' : 'transparent',
                minHeight: '44px',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = option === value ? 'rgba(255,184,0,0.06)' : 'transparent'}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Progress bar ───────────────────────────────────────────
function ProgressBar({ step }) {
  const steps = ['vehicle', 'purchase', 'loading', 'results']
  const index = steps.indexOf(step)
  const labels = ['Vehicle', 'Price', 'Calculating', 'Results']

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-center gap-0">
        {labels.map((label, i) => {
          const done    = i < index
          const active  = i === index
          const future  = i > index
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)',
                    color: (done || active) ? '#000' : 'var(--text-muted)',
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-[10px] font-semibold hidden sm:block"
                  style={{ color: active ? 'var(--accent)' : done ? 'var(--text-muted)' : 'var(--border)' }}>
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div className="flex-1 h-0.5 mx-1.5 transition-all duration-500"
                  style={{ background: done ? 'var(--accent)' : 'var(--border)' }} />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-3 sm:hidden">
        {step === 'vehicle' ? 'Step 1 of 3 — Vehicle' :
         step === 'purchase' ? 'Step 2 of 3 — Purchase info' :
         step === 'loading' ? 'Calculating...' : 'Your estimate is ready'}
      </p>
    </div>
  )
}

// ── Loading animation ──────────────────────────────────────
const LOADING_STEPS = [
  'Looking up vehicle specifications...',
  'Estimating depreciation...',
  'Calculating fuel costs...',
  'Estimating insurance...',
  'Building your ownership report...',
]

function LoadingScreen({ onComplete }) {
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setDoneCount(i + 1), 280 * (i + 1))
    )
    const done = setTimeout(onComplete, 280 * LOADING_STEPS.length + 400)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [onComplete])

  return (
    <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-8">
      <div>
        <div
          className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'rgba(255,184,0,0.12)', border: '2px solid var(--accent)' }}
        >
          <span className="text-2xl">⚡</span>
        </div>
        <h2 className="font-display font-extrabold text-white text-2xl text-center">
          Running the numbers...
        </h2>
        <p className="text-[var(--text-muted)] text-sm text-center mt-1">
          Calculating your 5-year ownership estimate
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {LOADING_STEPS.map((label, i) => {
          const done    = doneCount > i
          const active  = doneCount === i
          return (
            <div
              key={label}
              className="flex items-center gap-3 transition-all duration-300"
              style={{ opacity: doneCount >= i ? 1 : 0.3 }}
            >
              <div
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: done ? 'rgba(74,222,128,0.2)' : active ? 'rgba(255,184,0,0.15)' : 'var(--border)',
                  border: done ? '1.5px solid #4ade80' : active ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  color: done ? '#4ade80' : 'transparent',
                }}
              >
                {done ? '✓' : ''}
              </div>
              <span className="text-sm" style={{ color: done ? '#4ade80' : active ? 'var(--text)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Cost bar ───────────────────────────────────────────────
function CostBar({ value, max, color }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(4, (value / max) * 100)}%`, background: color }}
      />
    </div>
  )
}

// ── Results display ────────────────────────────────────────
function ResultsDisplay({
  selMake, selModel, selYear, price,
  depreciation, financingCost,
  totalInsurance, totalFuel, totalMaintenance, totalRegistration,
  monthlyPayment, futureValue,
  isPersonalised, showPersonalize, onTogglePersonalize,
  // personalise inputs
  zipCode, onZipChange, zipLabel, zipError,
  downPct, onDownPct,
  apr, onApr,
  loanTerm, onLoanTerm,
  annualMileage, onMileage,
  fuelPriceOverride, onFuelPrice,
}) {
  const total = depreciation + financingCost + totalInsurance + totalFuel + totalMaintenance + totalRegistration
  const maxCost = Math.max(depreciation, financingCost, totalInsurance, totalFuel, totalMaintenance, totalRegistration)

  const breakdown = [
    { label: 'Depreciation',  value: depreciation,    color: '#f472b6', icon: '📉',
      hint: `Value lost over 5 yrs · est. resale ${formatCurrency(futureValue)}` },
    { label: 'Financing',     value: financingCost,   color: 'var(--accent)', icon: '🏦',
      hint: `Interest on loan · ${DEFAULT_APR}% APR default` },
    { label: 'Insurance',     value: totalInsurance,  color: '#60a5fa', icon: '🛡️',
      hint: '5-year total · based on vehicle class' },
    { label: 'Fuel',          value: totalFuel,       color: '#34d399', icon: '⛽',
      hint: `5-year total · ${DEFAULT_ANNUAL_MILEAGE.toLocaleString()} mi/yr default` },
    { label: 'Maintenance',   value: totalMaintenance,color: '#fb923c', icon: '🔧',
      hint: '5-year total · brand-adjusted average' },
    { label: 'Registration',  value: totalRegistration,color: '#a78bfa', icon: '📋',
      hint: '5-year total · national average' },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 pb-16">

      {/* Hero total */}
      <div className="text-center mb-8 pt-4">
        <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
          Estimated 5-Year Ownership Cost
        </p>
        <div className="font-display font-extrabold text-5xl sm:text-6xl text-white mb-1">
          {formatCurrency(total)}
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          {selYear} {selMake} {selModel} · {formatCurrency(Math.round(total / 60))}/mo avg
        </p>

        {/* Purchase price context */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
          style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
          <span className="text-[var(--text-muted)]">Purchase Price</span>
          <span className="font-bold text-white">{formatCurrency(price)}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">Monthly Payment</span>
          <span className="font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(monthlyPayment)}</span>
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="flex flex-col gap-3 mb-4">
        {breakdown.map(({ label, value, color, icon, hint }) => (
          <div key={label} className="rounded-xl border px-4 py-3.5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg shrink-0">{icon}</span>
                <div>
                  <span className="text-sm font-semibold text-white">{label}</span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{hint}</p>
                </div>
              </div>
              <span className="font-display font-bold text-lg text-white tabular-nums">
                {formatCurrency(value)}
              </span>
            </div>
            <CostBar value={value} max={maxCost} color={color} />
          </div>
        ))}
      </div>

      {/* Defaults notice */}
      <p className="text-xs text-[var(--text-muted)] text-center mb-6 leading-relaxed">
        {isPersonalised
          ? 'Estimate updated with your details.'
          : 'This estimate uses national average ownership assumptions.'
        }
      </p>

      {/* CTA to full calculator */}
      <div className="flex gap-3 mb-8">
        <Link to="/compare" className="flex-1 btn-ghost text-center text-sm justify-center py-3">
          Compare vehicles
        </Link>
        <Link to="/salary" className="flex-1 btn-ghost text-center text-sm justify-center py-3">
          Affordability check
        </Link>
      </div>

      {/* Personalize section */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.03)' }}>
        <button
          onClick={onTogglePersonalize}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
          aria-expanded={showPersonalize}
        >
          <div className="text-left">
            <p className="font-display font-bold text-white text-base">
              Make this estimate even more accurate
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Personalize financing, location, and driving habits
            </p>
          </div>
          <span className="text-[var(--text-muted)] text-xs ml-4 shrink-0">
            {showPersonalize ? 'Hide ▲' : 'Personalize ▼'}
          </span>
        </button>

        {showPersonalize && (
          <div className="px-5 pb-5 flex flex-col gap-5 border-t" style={{ borderColor: 'rgba(255,184,0,0.15)' }}>

            {/* Location */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="input-label">Your ZIP Code or State</label>
              <div className="relative">
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., 90210 or CA"
                  value={zipCode}
                  onChange={e => onZipChange(e.target.value)}
                  maxLength={5}
                />
                {zipLabel && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ color: 'var(--accent)', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
                    {zipLabel}
                  </span>
                )}
              </div>
              {zipError && <p className="text-xs text-amber-400">{zipError}</p>}
            </div>

            {/* Down payment */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="input-label">Down Payment</label>
                <span className="text-sm font-bold text-white">{formatCurrency(price * downPct / 100)}</span>
              </div>
              <input
                type="range" min={0} max={50} step={1}
                value={downPct}
                onChange={e => onDownPct(Number(e.target.value))}
                style={{ background: `linear-gradient(to right,var(--accent) ${downPct * 2}%,var(--border) ${downPct * 2}%)` }}
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>$0</span><span>{downPct}%</span><span>50%</span>
              </div>
            </div>

            {/* APR */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="input-label">Interest Rate (APR)</label>
                <span className="text-sm font-bold text-white">{apr}%</span>
              </div>
              <input
                type="range" min={0} max={25} step={0.1}
                value={apr}
                onChange={e => onApr(Number(e.target.value))}
                style={{ background: `linear-gradient(to right,var(--accent) ${apr * 4}%,var(--border) ${apr * 4}%)` }}
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>0%</span><span>25%</span>
              </div>
            </div>

            {/* Loan term */}
            <div className="flex flex-col gap-2">
              <label className="input-label">Loan Term</label>
              <select
                className="input-field"
                value={loanTerm}
                onChange={e => onLoanTerm(Number(e.target.value))}
              >
                {[24,36,48,60,72,84].map(m => (
                  <option key={m} value={m}>{m} months ({m/12} {m === 12 ? 'year' : 'years'})</option>
                ))}
              </select>
            </div>

            {/* Annual mileage */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="input-label">Annual Mileage</label>
                <span className="text-sm font-bold text-white">{annualMileage.toLocaleString()} mi</span>
              </div>
              <input
                type="range" min={3000} max={30000} step={1000}
                value={annualMileage}
                onChange={e => onMileage(Number(e.target.value))}
                style={{ background: `linear-gradient(to right,var(--accent) ${((annualMileage-3000)/27000)*100}%,var(--border) ${((annualMileage-3000)/27000)*100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>3k</span><span>12k avg</span><span>30k</span>
              </div>
            </div>

            {/* Fuel price */}
            <div className="flex flex-col gap-2">
              <label className="input-label">Fuel Price (optional override)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  className="input-field pl-7"
                  placeholder="National avg"
                  value={fuelPriceOverride}
                  onChange={e => onFuelPrice(e.target.value)}
                  min={1} max={8} step={0.01}
                />
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Your estimate updates instantly as you adjust these values.
            </p>
          </div>
        )}
      </div>

      {/* Pro upsell */}
      <div className="mt-6 rounded-2xl border p-5"
        style={{ borderColor: 'rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.04)' }}>
        <p className="font-display font-bold text-white text-base mb-1">
          Want even greater accuracy?
        </p>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
          Cash Pedal Pro unlocks ZIP-specific insurance, local registration fees,
          detailed year-by-year forecasts, and side-by-side vehicle comparisons.
        </p>
        <ul className="flex flex-col gap-1.5 mb-4">
          {[
            'ZIP-specific insurance estimates',
            'Local registration & tax fees',
            'Year-by-year ownership forecast',
            'Side-by-side vehicle comparisons',
            'Advanced financing scenarios',
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span style={{ color: '#4ade80' }}>✓</span> {f}
            </li>
          ))}
        </ul>
        <Link to="/subscribe" className="btn-primary w-full justify-center text-sm py-3">
          Unlock Pro →
        </Link>
      </div>

      {/* Link to full calculator */}
      <p className="text-center text-xs text-[var(--text-muted)] mt-5">
        Need lease analysis, "Currently Have" mode, or detailed maintenance breakdown?{' '}
        <Link to="/tco-full" className="text-[var(--accent)] underline hover:brightness-110">
          Open the full calculator →
        </Link>
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function TCOFlow() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState('vehicle')

  // Step 1 — vehicle
  const [selYear,  setSelYear]  = useState('')
  const [selMake,  setSelMake]  = useState('')
  const [selModel, setSelModel] = useState('')

  // Step 2 — purchase
  const [isNew, setIsNew] = useState(true)
  const [price, setPrice] = useState(0)
  const [priceEdited, setPriceEdited] = useState(false)

  // Personalize
  const [showPersonalize,  setShowPersonalize]  = useState(false)
  const [zipCode,          setZipCode]          = useState('')
  const [resolvedState,    setResolvedState]    = useState(null)
  const [zipLabel,         setZipLabel]         = useState('')
  const [zipError,         setZipError]         = useState('')
  const [downPct,          setDownPct]          = useState(DEFAULT_DOWN_PCT * 100)
  const [apr,              setApr]              = useState(DEFAULT_APR)
  const [loanTerm,         setLoanTerm]         = useState(DEFAULT_LOAN_TERM)
  const [annualMileage,    setAnnualMileage]    = useState(DEFAULT_ANNUAL_MILEAGE)
  const [fuelPriceOverride,setFuelPriceOverride]= useState('')

  const hasTrackedStartRef = useRef(false)

  // Pre-fill from landing-page query params (?make=X&model=Y&year=Z)
  useEffect(() => {
    const qMake  = searchParams.get('make')
    const qModel = searchParams.get('model')
    const qYear  = searchParams.get('year')

    if (!qMake || !VEHICLES[qMake]) return

    const hasModel = qModel && VEHICLES[qMake]?.[qModel]
    const hasYear  = qYear  && hasModel && VEHICLES[qMake]?.[qModel]?.trims_by_year?.[qYear] !== undefined

    setSelMake(qMake)
    if (hasModel) setSelModel(qModel)
    if (qYear)    setSelYear(qYear)

    if (hasModel && qYear) {
      // Compute price immediately so we can skip straight to loading
      const avg = getAvgMSRP(qMake, qModel, qYear)
      if (avg) {
        const vehicleAge = Math.max(0, new Date().getFullYear() - parseInt(qYear))
        if (vehicleAge === 0) {
          setPrice(avg)
          setIsNew(true)
        } else {
          const used = Math.round(estimateCurrentValue(avg, qMake, qModel, vehicleAge) / 500) * 500
          setPrice(used || avg)
          setIsNew(false)
        }
        setPriceEdited(false)
        hasTrackedStartRef.current = true
        trackCalculatorStarted({ source_page: '/tco', entry_point: 'hero_card' })
        setStep('loading')
      } else {
        // No MSRP data — land on purchase step so user can enter price
        setStep('purchase')
      }
    } else if (hasModel) {
      setStep('purchase')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  // Derived vehicle data
  const modelData    = VEHICLES[selMake]?.[selModel] ?? null
  const isEV         = modelData?.is_ev ?? false
  const mpgCombined  = modelData?.mpg?.combined ?? null
  const mpgeCombined = modelData?.mpg?.mpge_combined ?? null

  // Available options
  const availableMakes  = useMemo(() => getMakesForYear(selYear), [selYear])
  const availableModels = useMemo(() => getModelsForMakeYear(selMake, selYear), [selMake, selYear])

  // Auto-set price on vehicle change
  useEffect(() => {
    if (!selMake || !selModel || !selYear || priceEdited) return
    const avg = getAvgMSRP(selMake, selModel, selYear)
    if (!avg) return
    const vehicleAge = Math.max(0, new Date().getFullYear() - parseInt(selYear))
    if (vehicleAge === 0) {
      setPrice(avg)
      setIsNew(true)
    } else {
      const used = Math.round(estimateCurrentValue(avg, selMake, selModel, vehicleAge) / 500) * 500
      setPrice(used || avg)
      setIsNew(false)
    }
  }, [selMake, selModel, selYear, priceEdited])

  // Market search tracking
  const lastSearchRef = useRef('')
  useEffect(() => {
    if (!selMake || !selModel) return
    const key = `${selMake}|${selModel}|${selYear}`
    if (lastSearchRef.current === key) return
    lastSearchRef.current = key
    trackSearch({ make: selMake, model: selModel, year: selYear || null, state: resolvedState })
  }, [selMake, selModel, selYear, resolvedState])

  // ZIP / state resolution
  const handleZipChange = useCallback((val) => {
    setZipCode(val)
    setZipError('')
    const resolved = resolveLocation(val)
    if (resolved) {
      setResolvedState(resolved.state)
      setZipLabel(resolved.label)
    } else {
      setResolvedState(null)
      setZipLabel('')
      if (val.trim().length >= 2) {
        setZipError('Enter a 5-digit ZIP or 2-letter state (e.g., 90210 or CA)')
      }
    }
  }, [])

  // ── Computed costs ──────────────────────────────────────
  const costs = useMemo(() => {
    if (!price || step !== 'results') return null

    const downPayment    = price * (downPct / 100)
    const loanResult     = calculateLoan({
      price, downPayment,
      loanTermMonths: loanTerm,
      annualRatePercent: apr,
      ownershipYears: DEFAULT_OWNERSHIP_YRS,
    })

    const vehicleAge   = selYear ? Math.max(0, new Date().getFullYear() - parseInt(selYear)) : 0
    const futureValue  = Math.round(estimateCurrentValue(price, selMake || null, selModel || null, vehicleAge + DEFAULT_OWNERSHIP_YRS))
    const depreciation = Math.max(0, price - futureValue)

    const annualInsurance = estimateInsurance(price, selMake || null, selModel || null, selYear || null, resolvedState)

    const fuelOverride = fuelPriceOverride !== '' ? parseFloat(fuelPriceOverride) : null
    const annualFuel   = computeAnnualFuel(
      isEV, mpgCombined, mpgeCombined, resolvedState, annualMileage,
      fuelOverride, !isEV && !!selMake && requiresPremiumFuel(selMake, selModel || ''),
      STATE_FUEL_PRICES,
    )

    const segment  = selMake && selModel ? classifySegment(selMake, selModel) : 'sedan'
    const brandMult = MAINT_BRAND_MULT[selMake] ?? 1.0
    const segAvg    = isEV ? SEGMENT_MAINT_AVG.electric : (SEGMENT_MAINT_AVG[segment] ?? 1100)
    const annualMaintenance = Math.round(segAvg * brandMult / 50) * 50

    const annualRegistration = computeAnnualRegistration(resolvedState, price)

    const totalInsurance   = Math.round(annualInsurance * DEFAULT_OWNERSHIP_YRS)
    const totalFuel        = Math.round(annualFuel * DEFAULT_OWNERSHIP_YRS)
    const totalMaintenance = Math.round(
      Array.from({ length: DEFAULT_OWNERSHIP_YRS }, (_, i) =>
        annualMaintenance * Math.pow(1.06, i)
      ).reduce((s, v) => s + v, 0)
    )
    const totalRegistration = Math.round(
      Array.from({ length: DEFAULT_OWNERSHIP_YRS }, (_, i) =>
        annualRegistration * Math.pow(0.95, i)
      ).reduce((s, v) => s + v, 0)
    )

    return {
      depreciation,
      financingCost: loanResult.interestThroughOwnership,
      monthlyPayment: loanResult.monthlyPayment,
      totalInsurance,
      totalFuel,
      totalMaintenance,
      totalRegistration,
      futureValue,
    }
  }, [
    price, step, downPct, apr, loanTerm, selYear, selMake, selModel,
    isEV, mpgCombined, mpgeCombined, resolvedState, annualMileage, fuelPriceOverride,
  ])

  // ── Step handlers ───────────────────────────────────────
  function handleYearChange(year) {
    setSelYear(year)
    setSelMake('')
    setSelModel('')
    setPriceEdited(false)
    if (year) trackSimpleYearSelected({ year, make: '', model: '', mode: 'flow' })
  }

  function handleMakeChange(make) {
    setSelMake(make)
    setSelModel('')
    setPriceEdited(false)
    if (make) trackSimpleMakeSelected({ make, mode: 'flow' })
  }

  function handleModelChange(model) {
    setSelModel(model)
    setPriceEdited(false)
    if (model) trackSimpleModelSelected({ make: selMake, model, mode: 'flow' })
  }

  function handleContinueToStep2() {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true
      trackCalculatorStarted({ source_page: '/tco', entry_point: 'flow_step1' })
    }
    setStep('purchase')
  }

  function handleGetEstimate() {
    trackSimpleEstimateStarted({ make: selMake, model: selModel, year: selYear, mode: 'flow' })
    trackFreeEstimateStarted({ make: selMake, model: selModel, year: selYear, mode: 'flow' })
    setStep('loading')
  }

  function handleLoadingComplete() {
    setStep('results')
    trackEstimateGenerated({ make: selMake, model: selModel, year: selYear, mode: 'flow', hasEV: isEV })
    trackFreeEstimateGenerated({ make: selMake, model: selModel, year: selYear, mode: 'flow', hasEV: isEV })
    trackCalculatorCompleted({ vehicleCount: 1, hasEV: isEV, ownershipYears: DEFAULT_OWNERSHIP_YRS })
  }

  const isStep1Complete = !!(selYear && selMake && selModel)
  const isPersonalised  = zipCode !== '' || downPct !== DEFAULT_DOWN_PCT * 100
    || apr !== DEFAULT_APR || loanTerm !== DEFAULT_LOAN_TERM
    || annualMileage !== DEFAULT_ANNUAL_MILEAGE || fuelPriceOverride !== ''

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="flex-1 pt-20">

        {/* Hero header — shown on vehicle and purchase steps */}
        {(step === 'vehicle' || step === 'purchase') && (
          <div className="max-w-xl mx-auto px-4 pt-8 pb-4 text-center">
            <div className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ color: 'var(--accent)', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)' }}>
              Free · No signup
            </div>
            <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mb-3">
              Can you actually afford this car?
            </h1>
            <p className="text-[var(--text-muted)] text-base leading-relaxed">
              Find out what this car will really cost over the next 5 years —
              buying the car is only the beginning.
            </p>
          </div>
        )}

        {/* Progress bar */}
        <ProgressBar step={step} />

        {/* ── Step 1: Vehicle ── */}
        {step === 'vehicle' && (
          <div className="max-w-xl mx-auto px-4 pb-12">
            <div className="card flex flex-col gap-5">
              <div>
                <h2 className="font-display font-bold text-white text-xl mb-0.5">
                  What car are you looking at?
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Select year, make, and model to get started.
                </p>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-2">
                <label className="input-label">Year</label>
                <select
                  className="input-field"
                  value={selYear}
                  onChange={e => handleYearChange(e.target.value)}
                >
                  <option value="">Select year…</option>
                  {ALL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Make */}
              {selYear && (
                <div className="flex flex-col gap-2">
                  <label className="input-label">Make</label>
                  <SearchSelect
                    placeholder="Search makes…"
                    options={availableMakes}
                    value={selMake}
                    onChange={handleMakeChange}
                    autoFocus
                  />
                </div>
              )}

              {/* Model */}
              {selMake && (
                <div className="flex flex-col gap-2">
                  <label className="input-label">Model</label>
                  <SearchSelect
                    placeholder="Search models…"
                    options={availableModels}
                    value={selModel}
                    onChange={handleModelChange}
                    autoFocus
                  />
                </div>
              )}

              {/* Selected summary */}
              {isStep1Complete && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <span className="text-green-400 text-lg">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {selYear} {selMake} {selModel}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isEV ? 'Electric vehicle' :
                        selMake && selModel ? classifySegment(selMake, selModel).replace('_', ' ') : ''
                      }
                      {mpgCombined ? ` · ${mpgCombined} MPG` : ''}
                      {mpgeCombined ? ` · ${mpgeCombined} MPGe` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelYear(''); setSelMake(''); setSelModel(''); setPriceEdited(false) }}
                    className="text-[var(--text-muted)] hover:text-white text-sm transition-colors px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}

              <button
                onClick={handleContinueToStep2}
                disabled={!isStep1Complete}
                className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Purchase info ── */}
        {step === 'purchase' && (
          <div className="max-w-xl mx-auto px-4 pb-12">
            <div className="card flex flex-col gap-5">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1 font-semibold">
                  {selYear} {selMake} {selModel}
                </p>
                <h2 className="font-display font-bold text-white text-xl mb-0.5">
                  What's the purchase price?
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {getAvgMSRP(selMake, selModel, selYear)
                    ? "We've pre-filled an estimated price based on available trim data."
                    : 'Enter the price you expect to pay.'}
                </p>
              </div>

              {/* New / Used toggle */}
              <div className="flex flex-col gap-2">
                <label className="input-label">Buying new or used?</label>
                <div className="flex gap-1.5 p-1 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {[
                    { v: true,  l: 'New' },
                    { v: false, l: 'Used' },
                  ].map(({ v, l }) => (
                    <button key={String(v)}
                      onClick={() => {
                        setIsNew(v)
                        const avg = getAvgMSRP(selMake, selModel, selYear)
                        if (avg && !priceEdited) {
                          const vehicleAge = Math.max(0, new Date().getFullYear() - parseInt(selYear))
                          if (v) {
                            setPrice(avg)
                          } else {
                            setPrice(Math.round(estimateCurrentValue(avg, selMake, selModel, vehicleAge) / 500) * 500 || avg)
                          }
                        }
                      }}
                      aria-pressed={isNew === v}
                      className="flex-1 py-2.5 rounded-md text-sm font-semibold transition-all min-h-[44px]"
                      style={{
                        background: isNew === v ? 'var(--accent)' : 'transparent',
                        color:      isNew === v ? '#000' : 'var(--text-muted)',
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price input */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="input-label">Purchase Price</label>
                  {getAvgMSRP(selMake, selModel, selYear) && !priceEdited && (
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', color: 'var(--accent)' }}>
                      {isNew ? 'Est. MSRP' : 'Est. market value'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-lg pointer-events-none">$</span>
                  <input
                    type="number"
                    className="input-field pl-8 text-xl font-bold"
                    style={{ fontSize: '1.25rem', fontWeight: 700 }}
                    value={price || ''}
                    onChange={e => {
                      const v = Math.max(0, parseInt(e.target.value) || 0)
                      setPrice(v)
                      setPriceEdited(true)
                    }}
                    min={0}
                    step={500}
                    placeholder="35,000"
                  />
                </div>
                <input
                  type="range" min={5000} max={150000} step={500}
                  value={Math.min(Math.max(price, 5000), 150000)}
                  onChange={e => { setPrice(Number(e.target.value)); setPriceEdited(true) }}
                  style={{ background: `linear-gradient(to right,var(--accent) ${Math.max(0, ((price-5000)/145000)*100)}%,var(--border) ${Math.max(0, ((price-5000)/145000)*100)}%)` }}
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>$5k</span><span>$150k</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('vehicle')}
                  className="btn-ghost px-5 py-3"
                >
                  ← Back
                </button>
                <button
                  onClick={handleGetEstimate}
                  disabled={!price}
                  className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Get My Estimate →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <LoadingScreen onComplete={handleLoadingComplete} />
        )}

        {/* ── Results ── */}
        {step === 'results' && costs && (
          <ResultsDisplay
            selMake={selMake} selModel={selModel} selYear={selYear} price={price}
            depreciation={costs.depreciation}
            financingCost={costs.financingCost}
            monthlyPayment={costs.monthlyPayment}
            totalInsurance={costs.totalInsurance}
            totalFuel={costs.totalFuel}
            totalMaintenance={costs.totalMaintenance}
            totalRegistration={costs.totalRegistration}
            futureValue={costs.futureValue}
            isPersonalised={isPersonalised}
            showPersonalize={showPersonalize}
            onTogglePersonalize={() => setShowPersonalize(p => !p)}
            zipCode={zipCode} onZipChange={handleZipChange}
            zipLabel={zipLabel} zipError={zipError}
            downPct={downPct} onDownPct={setDownPct}
            apr={apr} onApr={setApr}
            loanTerm={loanTerm} onLoanTerm={setLoanTerm}
            annualMileage={annualMileage} onMileage={setAnnualMileage}
            fuelPriceOverride={fuelPriceOverride} onFuelPrice={setFuelPriceOverride}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
