import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSessionId } from '../components/TermsGate'
import { trackCalculatorStarted, trackCalculatorCompleted } from '../utils/analytics'
import Navbar from '../components/Navbar'
import { CarVisual } from '../components/CarSVGs'
import Footer from '../components/Footer'
import NextStep from '../components/NextStep'
import ResultCard from '../components/ResultCard'
import PaywallModal from '../components/PaywallModal'
import ProUpsell from '../components/ProUpsell'
import { useSubscription } from '../hooks/useSubscription'
import { useBonusCredits } from '../hooks/useBonusCredits'
import { trackUsage } from '../utils/usage'
import { trackSearch } from '../utils/marketSearch'
import VEHICLES from '../data/vehicles.json'
import {
  BRAND_DEPRECIATION_MULT,
  SEGMENT_CURVES, SEGMENT_MAX_DEPR,
  HIGH_RETENTION, POOR_RETENTION,
  classifySegment, applyModelAdjustments, estimateCurrentValue,
  INSURANCE_BASE_RATE, INSURANCE_VALUE_BRACKETS, INSURANCE_BRAND_MULT, STATE_INS_BASE,
  estimateInsurance,
  MAINT_BRAND_MULT, MAINT_LUXURY_MAKES, MAINT_PREMIUM_MAKES, MAINT_ECONOMY_MAKES,
  SEGMENT_MAINT_AVG,
  determineMaintTier, MAINT_TIER_COSTS, LABOR_RATE, STATE_LABOR_RATES, STATE_ROAD_WEAR_FACTOR, getLocalLaborRate,
  generateMaintenanceServices, generateMaintenanceByYear, generateDetailedMaintenanceByYear,
  STATE_FUEL_PRICES, STATE_ELEC_RATES,
  getPublicChargingRate, getEffectiveElecRate, computeAnnualFuel,
  PREMIUM_PRICE_DELTA, requiresPremiumFuel,
  STATE_REG_FEE, STATE_VLF, computeAnnualRegistration,
  computeSalesTax, STATE_VEHICLE_SALES_TAX, STATE_DOC_FEE_AVG, getRegionalDemandPremium,
  ZIP_RANGES, zipToState, resolveLocation,
} from '../utils/vehicleCosts'


// ── Loan math ────────────────────────────────────────
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
  const totalPaid = monthlyPayment * n
  const totalInterestPaid = totalPaid - loanAmount
  const effectiveMonths = Math.min(ownershipYears * 12, n)
  const trueAnnualCost = (monthlyPayment * effectiveMonths) / ownershipYears

  // Interest paid only through the ownership period.
  // When selling before the loan ends, the remaining balance is retired at sale —
  // so actual interest paid = (payments made) − (principal repaid), not full-term interest.
  let interestThroughOwnership
  if (effectiveMonths >= n || r === 0) {
    interestThroughOwnership = totalInterestPaid
  } else {
    const remainingBal = loanAmount * Math.pow(1 + r, effectiveMonths)
      - monthlyPayment * (Math.pow(1 + r, effectiveMonths) - 1) / r
    const principalRepaid = loanAmount - Math.max(0, remainingBal)
    interestThroughOwnership = Math.max(0, monthlyPayment * effectiveMonths - principalRepaid)
  }
  const ownershipShorterThanLoan = ownershipYears * 12 < n

  return { loanAmount, monthlyPayment, totalInterestPaid, totalCostOfLoan: totalPaid, trueAnnualCost, interestThroughOwnership, ownershipShorterThanLoan }
}

// ── Lease math ────────────────────────────────────────
// moneyFactor = APR / 2400 (standard industry conversion)
function calculateLease({ msrp, capCostReduction, acquisitionFee, leaseTermMonths, aprPercent, residualPct }) {
  const capCost = msrp - capCostReduction + acquisitionFee
  const residualValue = msrp * (residualPct / 100)
  const moneyFactor = aprPercent / 2400
  const depreciationFee = (capCost - residualValue) / leaseTermMonths
  const financeCharge = (capCost + residualValue) * moneyFactor
  const monthlyPayment = depreciationFee + financeCharge
  const totalLeaseCost = monthlyPayment * leaseTermMonths + capCostReduction
  const annualLeaseCost = monthlyPayment * 12
  return { monthlyPayment, totalLeaseCost, annualLeaseCost, residualValue, capCost }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

// ── Vehicle data helpers ──────────────────────────────
const MAKES = Object.keys(VEHICLES).sort()

// Latest model year present anywhere in the database — used as the lease year filter
const LEASE_YEAR = String(Math.max(
  ...Object.values(VEHICLES).flatMap(makeData =>
    Object.values(makeData).flatMap(modelData =>
      Object.keys(modelData.trims_by_year).map(Number)
    )
  )
))

function getModels(make)          { return make ? Object.keys(VEHICLES[make] ?? {}).sort() : [] }
function getModelData(make, model){ return VEHICLES[make]?.[model] ?? null }

// In lease mode only show models that have trims for the latest database year
function getLeasableModels(make) {
  if (!make) return []
  return Object.keys(VEHICLES[make] ?? {}).filter(
    model => Object.keys(VEHICLES[make][model]?.trims_by_year ?? {}).includes(LEASE_YEAR)
  ).sort()
}

function getAvailableYears(make, model) {
  const d = getModelData(make, model)
  if (!d) return []
  return Object.keys(d.trims_by_year).sort((a, b) => b - a) // newest first
}

function getTrims(make, model, year) {
  const d = getModelData(make, model)
  if (!d || !year) return {}
  return d.trims_by_year[year] ?? {}
}

// ── Vehicle specs panel ───────────────────────────────
function SpecsPanel({ specs, mpg, isEV }) {
  if (!specs && !mpg) return null

  const items = []
  if (specs?.horsepower) items.push({ label: 'Horsepower', value: `${specs.horsepower} hp` })
  if (specs?.seats)       items.push({ label: 'Seats',     value: `${specs.seats} seats` })
  if (specs?.cargo_cu_ft) items.push({ label: 'Cargo',     value: `${specs.cargo_cu_ft} cu ft` })

  if (mpg) {
    if (mpg.mpge_combined) {
      items.push({ label: 'Efficiency', value: `${mpg.mpge_combined} MPGe` })
    } else if (mpg.combined) {
      items.push({ label: 'MPG (comb.)', value: `${mpg.combined} mpg` })
      if (mpg.city && mpg.highway)
        items.push({ label: 'City / Hwy', value: `${mpg.city} / ${mpg.highway}` })
    }
  }

  if (!items.length) return null

  return (
    <div className="rounded-xl border border-[var(--border)] p-4"
      style={{ background:'var(--surface)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Vehicle Specs
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
            <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Maintenance breakdown panel ───────────────────────
function MaintenanceBreakdown({ isEV, annualMileage, segment, make, startMileage = 0, model = '', modelYear = null, trim = '' }) {
  const yr1 = generateDetailedMaintenanceByYear(isEV, annualMileage, segment, make, 1, startMileage, null, 0, null, null, model, modelYear, trim)[0]
  const services = yr1?.services ?? []
  return (
    <div className="px-4 pb-3 pt-2 border-t border-[var(--border)]"
      style={{ background: 'rgba(0,0,0,0.25)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
        Planned services
      </p>
      <div className="flex flex-col gap-1">
        {services.map(({ name, occurrences, total }) => (
          <div key={name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white/75 truncate">{name}</span>
              <span className="text-[var(--text-muted)] opacity-70 shrink-0">×{occurrences}</span>
            </div>
            <span className="text-white/60 font-mono ml-2 shrink-0">{total > 0 ? `$${total}` : '—'}</span>
          </div>
        ))}
        {services.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">No scheduled services in year 1</span>
        )}
      </div>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────
function SliderInput({ label, value, onChange, min, max, step, prefix = '', suffix = '', inputMin, inputMax, displayValue, onDisplayChange }) {
  const handleSlider = useCallback(e => onChange(Number(e.target.value)), [onChange])
  const handleInput  = useCallback(e => {
    const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num)) (onDisplayChange ?? onChange)(num)
  }, [onChange, onDisplayChange])
  const pct = ((value - min) / (max - min)) * 100
  const shown = displayValue ?? value
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">{prefix}</span>}
          <input type="number" value={shown} min={inputMin ?? min} max={inputMax ?? max} step={step}
            onChange={handleInput} className="input-field"
            style={{ paddingLeft: prefix ? '1.75rem' : '1rem', paddingRight: suffix ? '2.5rem' : '1rem' }} />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        onChange={handleSlider}
        style={{ background:`linear-gradient(to right,var(--accent) ${pct}%,var(--border) ${pct}%)` }} />
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))} className="input-field">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Vehicle picker ────────────────────────────────────
function VehiclePicker({ make, model, year, trim, onChange, onClear, freeLeft, isSubscribed, isLease }) {
  // Lease mode: only models with trims in the latest database year
  const models    = isLease ? getLeasableModels(make) : getModels(make)
  const allYears  = getAvailableYears(make, model)
  // Lease: pin to the latest database year only
  const years     = isLease && allYears.length > 0 ? [LEASE_YEAR] : allYears
  const trimsMap  = getTrims(make, model, year)
  const trimNames = Object.keys(trimsMap)

  return (
    <div className="flex flex-col gap-4">
      {/* Make */}
      <div className="flex flex-col gap-2">
        <label className="input-label">Make</label>
        <select className="input-field" value={make} onChange={e => onChange('make', e.target.value)}>
          <option value="">Select make…</option>
          {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Model */}
      {make && (
        <div className="flex flex-col gap-2">
          <label className="input-label">Model</label>
          <select className="input-field" value={model} onChange={e => onChange('model', e.target.value)}>
            <option value="">Select model…</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Year */}
      {model && (
        <div className="flex flex-col gap-2">
          <label className="input-label">Year</label>
          <select className="input-field" value={year} onChange={e => onChange('year', e.target.value)}>
            <option value="">Select year…</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Trim */}
      {year && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="input-label">Trim</label>
            {!isSubscribed && (
              freeLeft > 0
                ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)' }}>
                    {freeLeft} free
                  </span>
                : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    🔒 locked
                  </span>
            )}
          </div>
          <select className="input-field" value={trim} onChange={e => onChange('trim', e.target.value)}>
            <option value="">Select trim…</option>
            {trimNames.map(t => (
              <option key={t} value={t}>{t} — {formatCurrency(trimsMap[t])}</option>
            ))}
          </select>
        </div>
      )}

      {/* Clear */}
      {make && (
        <button onClick={onClear}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-left w-fit">
          ✕ Clear selection
        </button>
      )}
    </div>
  )
}

// ── Data-collection constants ──────────────────────────
const CALC_TRIGGER        = 6
const LS_CALC_COUNT       = 'cashpedal_calculation_count'
const LS_USER_SUBMITTED   = 'cashpedal_user_data_submitted'
const LS_LAST_CALC        = 'cashpedal_last_calc'

// ── Paywall constants ─────────────────────────────────
const FREE_DETAILED_LIMIT  = 5
const LS_DETAILED_COUNT    = 'cashpedal_detailed_calc_count'

// ── User Data Collector Modal ─────────────────────────
function UserDataModal({ calcCount, onClose }) {
  const [email,           setEmail]           = useState('')
  const [marketingConsent,setMarketingConsent] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [errors,          setErrors]          = useState([])
  const [done,            setDone]            = useState(false)

  function handleSkip() {
    localStorage.setItem(LS_USER_SUBMITTED, 'true')
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!marketingConsent) {
      handleSkip()
      return
    }
    const errs = []
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.push('Please enter a valid email address')
    if (errs.length) { setErrors(errs); return }

    setSaving(true)
    setErrors([])
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id:         crypto.randomUUID(),
          session_id:        getSessionId(),
          first_name:        '',
          last_name:         '',
          email:             email.trim().toLowerCase(),
          calculation_count: calcCount,
        }),
      })
    } catch (e) {
      console.warn('[user-data] save failed:', e)
    }
    localStorage.setItem(LS_USER_SUBMITTED, 'true')
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md">
        {done ? (
          <div className="text-center py-8">
            <p className="text-white font-bold text-xl font-display">You're on the list.</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">We'll send tips to {email}. Unsubscribe any time.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h2 className="font-display font-bold text-white text-xl">
                Want car-buying tips?
              </h2>
              <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed">
                You've run <strong className="text-white">{calcCount} calculations</strong>.
                Drop your email if you'd like occasional tips on saving money when buying a car.
                This is completely optional.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" maxLength={255} />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
                style={{
                  borderColor: marketingConsent ? 'rgba(200,255,0,0.4)' : 'var(--border)',
                  background:  marketingConsent ? 'rgba(200,255,0,0.04)' : 'var(--surface)',
                }}>
                <input type="checkbox" checked={marketingConsent}
                  onChange={e => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{ accentColor: 'var(--accent)' }} />
                <span className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Yes, send me car-buying tips and Cash Pedal updates by email. I can unsubscribe at any time.
                </span>
              </label>

              {errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400">{err}</p>
                  ))}
                </div>
              )}

              <p className="text-center text-[var(--text-muted)] text-xs">
                We never sell your data. See our{' '}
                <a href="/privacy" className="text-[var(--accent)] underline hover:brightness-110">Privacy Policy</a>.
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={handleSkip}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                  No thanks
                </button>
                <button type="submit" disabled={saving || !marketingConsent}
                  className="flex-1 btn-primary disabled:opacity-40">
                  {saving ? 'Saving…' : 'Subscribe'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Typical annual operating cost benchmarks by segment ──────────────────
// (insurance + fuel + maintenance + registration, 12k mi/yr, national avg)
const SEGMENT_OP_COST_AVG = {
  economy:    4400,
  compact:    5200,
  sedan:      5600,
  suv:        7000,
  luxury_suv: 9200,
  truck:      7800,
  sports:     7600,
  luxury:    10400,
  electric:   3600,
  hybrid:     4800,
}

// ── Vehicle categories (used when no specific make/model is selected) ─────
// Each entry provides a SVG silhouette type, maintenance segment, and default MPG
const VEHICLE_CATEGORIES = [
  { value: 'sedan',    label: 'Sedan',                svgType: 'sedan',     segment: 'sedan',   mpg: 30,  mpge: null, isEV: false },
  { value: 'compact',  label: 'Compact / Crossover',  svgType: 'sedan',     segment: 'compact', mpg: 32,  mpge: null, isEV: false },
  { value: 'suv',      label: 'SUV',                  svgType: 'suv',       segment: 'suv',     mpg: 25,  mpge: null, isEV: false },
  { value: 'suv_large',label: 'Large SUV',            svgType: 'suv_large', segment: 'suv',     mpg: 18,  mpge: null, isEV: false },
  { value: 'truck',    label: 'Truck / Pickup',       svgType: 'truck',     segment: 'truck',   mpg: 20,  mpge: null, isEV: false },
  { value: 'minivan',  label: 'Minivan',              svgType: 'minivan',   segment: 'sedan',   mpg: 22,  mpge: null, isEV: false },
  { value: 'sports',   label: 'Sports Car',           svgType: 'sports',    segment: 'sports',  mpg: 25,  mpge: null, isEV: false },
  { value: 'luxury',   label: 'Luxury',               svgType: 'sedan',     segment: 'luxury',  mpg: 22,  mpge: null, isEV: false },
  { value: 'economy',  label: 'Economy / Subcompact', svgType: 'sedan',     segment: 'economy', mpg: 36,  mpge: null, isEV: false },
  { value: 'electric', label: 'Electric (EV)',        svgType: 'sedan',     segment: 'electric',mpg: null,mpge: 100,  isEV: true  },
]

const loanTermOptions = [
  { value: 24, label: '24 months (2 years)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 48, label: '48 months (4 years)' },
  { value: 60, label: '60 months (5 years)' },
  { value: 72, label: '72 months (6 years)' },
  { value: 84, label: '84 months (7 years)' },
]

const ownershipOptions = [
  { value: 1,  label: '1 year'   },
  { value: 2,  label: '2 years'  },
  { value: 3,  label: '3 years'  },
  { value: 4,  label: '4 years'  },
  { value: 5,  label: '5 years'  },
  { value: 7,  label: '7 years'  },
  { value: 10, label: '10 years' },
]

const leaseTermOptions = [
  { value: 24, label: '24 months (2 years)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 39, label: '39 months' },
  { value: 48, label: '48 months (4 years)' },
]

// ── Export helpers ────────────────────────────────────
function metaSection(meta, line) {
  const out = []
  out.push(line(['VEHICLE & PARAMETERS']))
  out.push(line(['Vehicle', meta.vehicle || 'Not specified']))
  out.push(line(['Purchase price', meta.price]))
  out.push(line(['Down payment', meta.downPayment]))
  if (meta.financeMode === 'lease') {
    out.push(line(['Finance mode', 'Lease']))
    out.push(line(['Lease term', `${meta.leaseTerm} months`]))
    out.push(line(['Lease APR', `${meta.leaseApr}%`]))
    out.push(line(['Residual', `${meta.residualPct}%`]))
  } else {
    out.push(line(['Finance mode', 'Loan']))
    out.push(line(['Loan term', `${meta.loanTerm} months`]))
    out.push(line(['Interest rate', `${meta.rate}%`]))
  }
  if (meta.financeMode !== 'lease' && meta.outTheDoor != null) {
    out.push(line(['Sales tax', meta.salesTax != null ? `$${meta.salesTax.toLocaleString()}` : '—']))
    out.push(line(['Doc fee', meta.docFee != null ? `$${meta.docFee.toLocaleString()}` : '—']))
    out.push(line(['Out-the-door price', meta.outTheDoor != null ? `$${meta.outTheDoor.toLocaleString()}` : '—']))
  }
  out.push(line(['Annual mileage', `${meta.annualMileage.toLocaleString()} mi/yr`]))
  out.push(line(['Current odometer', `${meta.startMileage.toLocaleString()} mi`]))
  out.push(line(['Location', meta.location || 'Not set']))
  out.push(line(['Ownership years', meta.ownershipYears]))
  return out
}

function buildCSV(rows, meta) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const line = cols => cols.map(esc).join(',')
  const out = []

  out.push(line(['Cash Pedal — TCO Report', `Generated ${new Date().toLocaleDateString()}`]))
  out.push('')
  out.push(...metaSection(meta, line))
  out.push('')

  out.push(line(['YEAR-BY-YEAR FORECAST']))
  out.push(line(['Year','Loan/Lease','Insurance','Fuel','Maintenance','Registration','Total']))
  rows.forEach(r => {
    out.push(line([`Year ${r.yr}`, r.loanCost, r.insurance, r.fuel, r.maintenance, r.registration, r.total]))
  })
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  out.push(line(['TOTAL','','','','','', grandTotal]))

  return out.join('\n')
}

function buildDetailedCSV(rows, maintenanceDetail, meta) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const line = cols => cols.map(esc).join(',')
  const out = []

  out.push(line(['Cash Pedal — TCO Report (Detailed)', `Generated ${new Date().toLocaleDateString()}`]))
  out.push('')
  out.push(...metaSection(meta, line))
  out.push('')

  out.push(line(['YEAR-BY-YEAR FORECAST']))
  out.push(line(['Year','Loan/Lease','Insurance','Fuel','Maintenance','Registration','Total']))
  rows.forEach(r => {
    out.push(line([`Year ${r.yr}`, r.loanCost, r.insurance, r.fuel, r.maintenance, r.registration, r.total]))
  })
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  out.push(line(['TOTAL','','','','','', grandTotal]))
  out.push('')

  if (maintenanceDetail) {
    out.push(line(['MAINTENANCE SCHEDULE BY YEAR']))
    out.push(line(['Year','Service','Occurrences','Cost Each','Year Maint. Total']))
    maintenanceDetail.forEach(yr => {
      if (yr.services.length === 0) {
        out.push(line([`Year ${yr.year}`, '(no scheduled services)', '', '', 0]))
      } else {
        yr.services.forEach((svc, idx) => {
          out.push(line([
            idx === 0 ? `Year ${yr.year}` : '',
            svc.name,
            svc.occurrences,
            svc.costPerOcc,
            idx === 0 ? yr.total : '',
          ]))
        })
      }
    })
  }

  return out.join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── 5-Year Forecast ───────────────────────────────────
function FiveYearForecast({ isPro, financeMode, rows, formatCurrency }) {
  const maxTotal   = Math.max(...rows.map(r => r.total), 1)
  const cumulTotal = rows.reduce((s, r) => s + r.total, 0)

  const SEGS = [
    { key: 'loanCost',     label: financeMode === 'lease' ? 'Lease'        : 'Loan',         color: 'var(--accent)' },
    { key: 'insurance',    label: 'Insurance',    color: '#60a5fa' },
    { key: 'fuel',         label: 'Fuel',         color: '#f472b6' },
    { key: 'maintenance',  label: 'Maintenance',  color: '#fb923c' },
    { key: 'registration', label: 'Registration', color: '#a78bfa' },
  ]

  const ProBadge = () => (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
      Pro
    </span>
  )

  if (!isPro) {
    return (
      <div className="relative rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="opacity-[0.12] pointer-events-none select-none p-4 flex flex-col gap-3" aria-hidden>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">5-Year Ownership Forecast</p>
            <ProBadge />
          </div>
          {[1,2,3,4,5].map(yr => (
            <div key={yr}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-muted)]">Year {yr}</span>
                <span className="text-white">$──,───</span>
              </div>
              <div className="h-3 w-full rounded" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center"
          style={{ background: 'rgba(13,13,18,0.82)', backdropFilter: 'blur(6px)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
            🔒
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm mb-1">5-Year Ownership Forecast</p>
            <p className="text-[var(--text-muted)] text-xs max-w-xs leading-relaxed mx-auto">
              Year-by-year cost breakdown showing loan payoff, rising maintenance, and cumulative ownership cost.
            </p>
          </div>
          <a href="/subscribe" className="text-xs font-bold px-4 py-2 rounded-lg"
            style={{ background: 'var(--accent)', color: '#000' }}>
            Unlock with Pro →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {rows.length}-Year Ownership Forecast
        </p>
        <ProBadge />
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map(row => (
          <div key={row.yr}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)] font-semibold">Year {row.yr}</span>
              <span className="text-white font-bold tabular-nums">{formatCurrency(row.total)}</span>
            </div>
            <div className="h-3 w-full rounded overflow-hidden flex gap-px" style={{ background: 'var(--bg)' }}>
              {SEGS.map(({ key, color }) =>
                row[key] > 0 ? (
                  <div key={key} className="h-full transition-all duration-500"
                    style={{ width: `${(row[key] / maxTotal) * 100}%`, background: color, minWidth: 2 }} />
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
        {SEGS.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto font-semibold text-white tabular-nums">
          {rows.length}-yr total: {formatCurrency(cumulTotal)}
        </span>
      </div>
    </div>
  )
}

// ── Repair & Reliability Risk Score ──────────────────
function RepairRiskScore({ isPro, make, model, isEV, maintBrandMult, determineTier }) {
  const ProBadge = () => (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
      Pro
    </span>
  )

  if (!isPro) {
    return (
      <div className="relative rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="opacity-[0.12] pointer-events-none select-none p-4 flex items-center gap-4" aria-hidden>
          <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-display font-bold text-xl"
            style={{ borderColor: '#4ade80', color: '#4ade80' }}>82</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-1.5">Low Risk</p>
            <div className="h-2 rounded-full" style={{ width: '82%', background: '#4ade80' }} />
          </div>
        </div>
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center"
          style={{ background: 'rgba(13,13,18,0.82)', backdropFilter: 'blur(6px)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
            🔒
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm mb-1">Repair & Reliability Risk Score</p>
            <p className="text-[var(--text-muted)] text-xs max-w-xs leading-relaxed mx-auto">
              Brand-specific reliability rating with repair cost multiplier and ownership risk notes.
            </p>
          </div>
          <a href="/subscribe" className="text-xs font-bold px-4 py-2 rounded-lg"
            style={{ background: 'var(--accent)', color: '#000' }}>
            Unlock with Pro →
          </a>
        </div>
      </div>
    )
  }

  if (!make) return null

  const mult  = maintBrandMult[make] ?? 1.0
  const tier  = determineTier(make)
  const raw   = Math.round(100 - ((mult - 0.65) / (1.85 - 0.65)) * 75)
  const score = Math.max(20, Math.min(100, isEV ? Math.min(raw + 8, 100) : raw))
  const label = score >= 80 ? 'Low Risk' : score >= 60 ? 'Average Risk' : 'Higher Risk'
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#FFB800' : '#f87171'

  const notes = [
    isEV
      ? 'Electric drivetrain: no oil changes, fewer brake services — but battery replacement is a major future cost risk.'
      : tier === 'luxury'
        ? `Luxury-brand parts and labor run ${Math.round((mult - 1) * 100)}% above industry average. Budget for higher repair bills.`
        : tier === 'premium'
          ? `Premium-brand maintenance runs ~${Math.round((mult - 1) * 100)}% above average rates.`
          : `${make} maintenance costs are ${mult <= 0.95 ? 'below' : mult <= 1.05 ? 'near' : 'above'}-average for its segment.`,
    `Repair cost multiplier: ${mult.toFixed(2)}× industry baseline.`,
  ]

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Repair & Reliability Risk
        </p>
        <ProBadge />
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-xl border-2"
          style={{ borderColor: color, color }}>
          {score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-white">{label}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}>
              {make}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: color }} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">0–100 scale · higher = lower repair risk</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        {notes.map((note, i) => (
          <p key={i} className="text-[10px] text-[var(--text-muted)] leading-relaxed">• {note}</p>
        ))}
      </div>
    </div>
  )
}

// ── Cost Alerts ───────────────────────────────────────
function CostAlerts({ isPro, make, model, isEV, totalAnnualCost, annualMaintenance,
  maintBrandMult, classifySegment, formatCurrency, loanAmount, price, rate, financeMode }) {

  const ProBadge = () => (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
      Pro
    </span>
  )

  if (!isPro) {
    return (
      <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <span className="text-base mt-0.5 shrink-0">🔒</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold text-white">Alerts & Better Alternatives</p>
            <ProBadge />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            We'd flag if this vehicle's costs are above average for its segment and suggest cheaper alternatives.
          </p>
          <a href="/subscribe" className="text-xs font-semibold mt-2 inline-block"
            style={{ color: 'var(--accent)' }}>
            Unlock with Pro →
          </a>
        </div>
      </div>
    )
  }

  const mult = maintBrandMult[make] ?? 1.0
  const alerts = []

  if (!make) {
    alerts.push({ type: 'info', text: 'Select a make and model above to see vehicle-specific cost alerts.' })
  } else {
    if (mult > 1.2) {
      alerts.push({
        type: 'warning',
        text: `${make}'s repair costs run ~${Math.round((mult - 1) * 100)}% above average. Budget an extra ${formatCurrency(Math.round(annualMaintenance * (mult - 1)))}/yr for surprises.`,
      })
    }
    if (totalAnnualCost > 15000 && !isEV) {
      alerts.push({
        type: 'info',
        text: `Your all-in annual cost of ${formatCurrency(totalAnnualCost)} is above average. Reducing the purchase price by 10% or shortening the loan term can save meaningfully on interest.`,
      })
    }
    if (financeMode === 'buy' && rate >= 10) {
      alerts.push({
        type: 'warning',
        text: `Your interest rate of ${rate}% is high. Check credit union rates — they typically run 2–4% below dealer-arranged financing for the same loan term.`,
      })
    }
    if (financeMode === 'buy' && loanAmount > 0 && price > 0 && loanAmount / price > 0.80) {
      alerts.push({
        type: 'warning',
        text: `You're financing more than 80% of the vehicle's value. Gap insurance (~$300 one-time or $20–$40/mo) protects you if the car is totaled before your loan balance drops below market value.`,
      })
    }
    if (isEV) {
      alerts.push({
        type: 'good',
        text: 'EVs eliminate oil changes and reduce brake wear — typical maintenance savings of $500–$900/yr vs. a comparable gas vehicle.',
      })
    }
    if (alerts.length === 0) {
      alerts.push({ type: 'good', text: `${make}'s costs are in line with segment averages. No major red flags detected for this vehicle.` })
    }
  }

  const colorMap = { warning: '#f87171', info: '#60a5fa', good: '#4ade80' }
  const iconMap  = { warning: '⚠', info: 'ℹ', good: '✓' }

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Alerts & Alternatives
        </p>
        <ProBadge />
      </div>
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="shrink-0 font-bold text-sm mt-0.5" style={{ color: colorMap[alert.type] }}>
            {iconMap[alert.type]}
          </span>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{alert.text}</p>
        </div>
      ))}
    </div>
  )
}

// ── Lease vs. Buy head-to-head (Pro) ──────────────────
function LeaseVsBuy({ isPro, data, formatCurrency }) {
  const ProBadge = () => (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
      Pro
    </span>
  )

  if (!isPro) {
    return (
      <div className="relative rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="opacity-[0.12] pointer-events-none select-none p-4 flex flex-col gap-3" aria-hidden>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Lease vs. Buy</p>
            <ProBadge />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Lease', 'Buy'].map(l => (
              <div key={l} className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--text-muted)] mb-2">{l}</p>
                <p className="text-white font-bold text-lg">$──,───</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center"
          style={{ background: 'rgba(13,13,18,0.82)', backdropFilter: 'blur(6px)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
            🔒
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm mb-1">Lease vs. Buy Analysis</p>
            <p className="text-[var(--text-muted)] text-xs max-w-xs leading-relaxed mx-auto">
              The same car, leased vs. financed over the same term — net of the resale equity buying
              leaves you with. See which one actually costs less, and by how much.
            </p>
          </div>
          <a href="/subscribe" className="text-xs font-bold px-4 py-2 rounded-lg"
            style={{ background: 'var(--accent)', color: '#000' }}>
            Unlock with Pro →
          </a>
        </div>
      </div>
    )
  }

  if (!data) return null

  const winColor  = '#4ade80'
  const winnerNet = data.buyWins ? data.netBuy : data.netLease

  const Row = ({ label, value, sign = '', muted = false, strong = false }) => (
    <div className="flex justify-between items-center text-xs">
      <span className={muted ? 'text-[var(--text-muted)]' : 'text-white/80'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-bold text-white' : muted ? 'text-[var(--text-muted)]' : 'text-white'}`}>
        {sign}{formatCurrency(value)}
      </span>
    </div>
  )

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Lease vs. Buy · {data.horizonMonths}-month horizon
        </p>
        <ProBadge />
      </div>

      {/* Verdict */}
      <div className="rounded-lg px-4 py-3 text-center"
        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
        <p className="font-display font-bold text-white text-base">
          {data.buyWins ? 'Buying' : 'Leasing'} is cheaper by{' '}
          <span style={{ color: winColor }}>{formatCurrency(data.diff)}</span>
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          over {data.horizonMonths} months · net cost {formatCurrency(winnerNet)} vs.{' '}
          {formatCurrency(data.buyWins ? data.netLease : data.netBuy)}
        </p>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Lease */}
        <div className="rounded-lg border p-3 flex flex-col gap-1.5"
          style={{ borderColor: !data.buyWins ? 'rgba(74,222,128,0.4)' : 'var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-white">Lease</p>
            {!data.buyWins && <span className="text-[10px] font-bold" style={{ color: winColor }}>✓ winner</span>}
          </div>
          <Row label="Drive-off" value={data.leaseDriveOff} muted />
          <Row label="Payments + drive-off" value={data.leaseTotal} muted />
          <Row label="Operating costs" value={data.operating} muted />
          <Row label="Equity at end" value={0} muted />
          <div className="h-px bg-[var(--border)] my-1" />
          <Row label="Net cost" value={data.netLease} strong />
        </div>

        {/* Buy */}
        <div className="rounded-lg border p-3 flex flex-col gap-1.5"
          style={{ borderColor: data.buyWins ? 'rgba(74,222,128,0.4)' : 'var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-white">Buy / Finance</p>
            {data.buyWins && <span className="text-[10px] font-bold" style={{ color: winColor }}>✓ winner</span>}
          </div>
          <Row label="Price + interest" value={data.buyFinancing} muted />
          <Row label="Operating costs" value={data.operating} muted />
          <Row label="− Resale equity" value={data.resaleValue} sign="−" muted />
          <div className="h-px bg-[var(--border)] my-1" />
          <Row label="Net cost" value={data.netBuy} strong />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5 pt-1">
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          {data.isCashPurchase
            ? <>• Buy side assumes a <span className="text-white">cash purchase</span> of {formatCurrency(data.buyFinancing)} with no financing cost, and credits an estimated {formatCurrency(data.resaleValue)} resale value at the end of the term.</>
            : <>• Buy side assumes {formatCurrency(data.buyDown)} down, a {data.loanTerm}-mo loan at {data.rate}%, and credits an estimated {formatCurrency(data.resaleValue)} resale value at the end of the term.</>
          }{' '}
          Adjust these in <span className="text-white">Buy / Finance</span> mode.
        </p>
        {data.excessMileageFee > 0 && (
          <p className="text-[10px] leading-relaxed" style={{ color: '#fbbf24' }}>
            • At {data.annualMileage.toLocaleString()} mi/yr you'd exceed a typical {data.leaseMileageCap.toLocaleString()}-mi
            lease allowance — budget ~{formatCurrency(data.excessMileageFee)} in over-mileage charges (not in the lease total above).
          </p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          • Operating costs are identical on both paths, so the verdict is driven by financing cost minus
          the equity buying leaves you with. Leasing means lower commitment and always-newer cars; buying
          builds an asset with no mileage cap.
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────
export default function TCOCalculator() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSubscribed } = useSubscription()

  // ── User data collection ──
  const [calcCount, setCalcCount] = useState(() =>
    parseInt(localStorage.getItem(LS_CALC_COUNT) || '0', 10)
  )
  const [userDataSubmitted] = useState(() =>
    localStorage.getItem(LS_USER_SUBMITTED) === 'true'
  )
  const [showUserDataModal, setShowUserDataModal] = useState(false)
  const countIncrementedRef    = useRef(false)
  const hasTrackedStartRef     = useRef(false)
  const hasTrackedDoneRef      = useRef(false)
  const lastChargedVehicleRef  = useRef(null)

  // ── Detailed-calc paywall ──
  const [detailedCalcCount, setDetailedCalcCount] = useState(() =>
    parseInt(localStorage.getItem(LS_DETAILED_COUNT) || '0', 10)
  )
  const [showPaywall,  setShowPaywall]  = useState(false)
  const { creditsLeft: bonusCreditsLeft, spendCredit } = useBonusCredits()

  // ── Comparison queue count ──
  const [comparisonCount, setComparisonCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cashpedal_tco_for_comparison') || '[]').length } catch { return 0 }
  })

  // Returns true if the action is allowed; false if blocked (paywall shown).
  // Each call counts as one calculation — callers must guard against duplicate invocations.
  const checkDetailedLimit = useCallback(async () => {
    if (isSubscribed) {
      trackUsage('tco_detailed', 'subscribed')
      return true
    }
    const next = detailedCalcCount + 1
    if (next > FREE_DETAILED_LIMIT) {
      // Base free limit exhausted — fall back to email-unlock bonus credits.
      // The server logs the spend as a usage event, so no trackUsage here.
      if (await spendCredit('tco_detailed')) {
        setDetailedCalcCount(next)
        localStorage.setItem(LS_DETAILED_COUNT, String(next))
        return true
      }
      setShowPaywall(true)
      return false
    }
    setDetailedCalcCount(next)
    localStorage.setItem(LS_DETAILED_COUNT, String(next))
    trackUsage('tco_detailed', 'free')
    return true
  }, [isSubscribed, detailedCalcCount, spendCredit])

  // Increment visit count once per page load (terms are always accepted by the time this mounts)
  useEffect(() => {
    if (countIncrementedRef.current) return
    countIncrementedRef.current = true
    trackUsage('visit_tco')
    const newCount = calcCount + 1
    setCalcCount(newCount)
    localStorage.setItem(LS_CALC_COUNT, String(newCount))
    if (newCount >= CALC_TRIGGER && !userDataSubmitted) {
      setShowUserDataModal(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [price, setPrice]           = useState(30000)
  const [downPayment, setDownPayment] = useState(5000)
  const [loanTerm, setLoanTerm]     = useState(60)
  const [rate, setRate]             = useState(6.5)
  const [ownershipYears, setOwnershipYears] = useState(5)

  // Annual operating costs (pre-filled with national averages)
  const [annualInsurance,    setAnnualInsurance]    = useState(2000)
  const [annualFuel,         setAnnualFuel]         = useState(2000)
  const [annualMaintenance,  setAnnualMaintenance]  = useState(1200)
  const [annualRegistration, setAnnualRegistration] = useState(300)

  const [selMake,  setSelMake]  = useState('')
  const [selModel, setSelModel] = useState('')
  const [selYear,  setSelYear]  = useState('')
  const [selTrim,  setSelTrim]  = useState('')

  // Location
  const [locationInput,  setLocationInput]  = useState('')
  const [resolvedState,     setResolvedState]     = useState(null)   // 2-letter state code
  const [resolvedLaborRate, setResolvedLaborRate] = useState(null)   // $/hr from ZIP or state
  const [resolvedWear,      setResolvedWear]      = useState(null)   // { severity, profile, region } from ZIP terrain
  const [resolvedRegion,    setResolvedRegion]    = useState(null)   // human-readable terrain region label
  const [locationLabel,  setLocationLabel]  = useState('')
  const [locationError,  setLocationError]  = useState('')
  // Operating costs mode
  const [customCosts,    setCustomCosts]    = useState(false)
  // Detailed estimates mode
  const [detailedMode,   setDetailedMode]   = useState(false)
  const [annualMileage,  setAnnualMileage]  = useState(13500)
  const [vehicleCategory,setVehicleCategory]= useState('')      // used when no make/model selected
  const [chargingStyle,  setChargingStyle]  = useState('home')  // 'home' | 'mixed' | 'public'
  const [customFuelPrice,setCustomFuelPrice]= useState('')      // empty = use state avg
  const [multiCarPolicy, setMultiCarPolicy] = useState(false)
  // Track original MSRP separately from price (which may be depreciation-adjusted)
  const [origMsrp,       setOrigMsrp]       = useState(null)

  // Finance mode: 'buy' | 'lease'
  const [financeMode,      setFinanceMode]      = useState('buy')
  // Lease-specific inputs
  const [leaseTerm,        setLeaseTerm]        = useState(36)
  const [leaseApr,         setLeaseApr]         = useState(3.0)
  const [residualPct,      setResidualPct]      = useState(55)
  const [capCostReduction, setCapCostReduction] = useState(0)
  const [acquisitionFee,   setAcquisitionFee]   = useState(795)
  // "Currently Have" mode inputs
  const [currentVehicleType,   setCurrentVehicleType]   = useState('financed') // 'financed' | 'leased' | 'paid_off'
  const [originalLoanAmount,   setOriginalLoanAmount]   = useState(20000)
  const [originalLoanTerm,     setOriginalLoanTerm]     = useState(60)
  const [currentLeasePayment,  setCurrentLeasePayment]  = useState(400)
  const [currentLeaseTerm,     setCurrentLeaseTerm]     = useState(36)
  const [ownPurchasePrice,     setOwnPurchasePrice]     = useState(null)   // null = not set
  const [ownPurchaseMonth,     setOwnPurchaseMonth]     = useState(null)   // 1–12
  const [ownPurchaseYear,      setOwnPurchaseYear]      = useState(null)   // e.g. 2021
  const [currentMileage,   setCurrentMileage]   = useState(null) // null = auto (carAge × annualMileage)
  const [dealerPurchase,   setDealerPurchase]   = useState(true)
  const [taxRateOverride,  setTaxRateOverride]  = useState(null) // null = use state rate
  const [docFeeOverride,   setDocFeeOverride]   = useState(null) // null = use state avg
  const [isCashPurchase,   setIsCashPurchase]   = useState(false)
  const [simpleMode,       setSimpleMode]       = useState(() => localStorage.getItem('cashpedal_simple_mode') !== 'false')

  const toggleSimpleMode = () => {
    const next = !simpleMode
    setSimpleMode(next)
    localStorage.setItem('cashpedal_simple_mode', String(next))
  }

  // "How to use" guide — collapsible, open by default, choice remembered
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem('cashpedal_tco_guide_collapsed') !== 'true')
  const toggleGuide = () => {
    setShowGuide(prev => {
      const next = !prev
      localStorage.setItem('cashpedal_tco_guide_collapsed', String(!next))
      return next
    })
  }

  // Restore last session when landing via ?resume=1
  useEffect(() => {
    if (searchParams.get('resume') !== '1') return
    try {
      const saved = JSON.parse(localStorage.getItem(LS_LAST_CALC) || 'null')
      if (!saved?.inputs) return
      const i = saved.inputs
      if (i.price        != null) setPrice(i.price)
      if (i.downPayment  != null) setDownPayment(i.downPayment)
      if (i.loanTerm     != null) setLoanTerm(i.loanTerm)
      if (i.rate         != null) setRate(i.rate)
      if (i.ownershipYears != null) setOwnershipYears(i.ownershipYears)
      if (i.selMake)  setSelMake(i.selMake)
      if (i.selModel) setSelModel(i.selModel)
      if (i.selYear)  setSelYear(i.selYear)
      if (i.selTrim)  setSelTrim(i.selTrim)
      if (i.financeMode) setFinanceMode(i.financeMode)
    } catch { /* ignore corrupt data */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived model data (type, specs, mpg, isEV)
  const modelData = useMemo(() => getModelData(selMake, selModel), [selMake, selModel])

  // Effective odometer start: user override or vehicle age × annual mileage
  const vehicleAge = selYear ? Math.max(0, new Date().getFullYear() - parseInt(selYear)) : 0
  const effectiveStartMileage = currentMileage ?? Math.round(vehicleAge * annualMileage)

  // Per-year maintenance costs using actual service occurrence counts (detailedMode only)
  const maintenanceDetail = useMemo(() => {
    if (!detailedMode) return null
    const sm = effectiveStartMileage
    if (modelData) {
      const seg = classifySegment(selMake || '', selModel || '')
      return generateDetailedMaintenanceByYear(modelData.is_ev, annualMileage, seg, selMake, 5, sm, resolvedState, vehicleAge, resolvedLaborRate, resolvedWear, selModel, selYear, selTrim)
    }
    const catInfo = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
    const catIsEV = catInfo?.isEV ?? false
    const catSeg  = catInfo?.segment ?? 'sedan'
    return generateDetailedMaintenanceByYear(catIsEV, annualMileage, catSeg, '', 5, sm, resolvedState, 0, resolvedLaborRate, resolvedWear)
  }, [detailedMode, modelData, annualMileage, selMake, selModel, selTrim, vehicleCategory, effectiveStartMileage, selYear, currentMileage, resolvedState, vehicleAge, resolvedLaborRate, resolvedWear])

  const maintenanceByYear = useMemo(() => maintenanceDetail?.map(yr => yr.total) ?? null, [maintenanceDetail])

  // When detailed mode is active, keep annualMaintenance aligned with the start-mileage-aware
  // first-year cost from the forecast (not the mileage-agnostic generateMaintenanceServices avg).
  useEffect(() => {
    if (!detailedMode || customCosts || !maintenanceDetail) return
    setAnnualMaintenance(maintenanceDetail[0]?.total ?? maintenanceDetail.reduce((s, y) => s + y.total, 0) / maintenanceDetail.length)
  }, [detailedMode, customCosts, maintenanceDetail])

  useEffect(() => {
    if (customCosts) return
    setAnnualInsurance(estimateInsurance(price, selMake||null, selModel||null, selYear||null, resolvedState||null, detailedMode && multiCarPolicy))
    const customOverride = customFuelPrice !== '' ? parseFloat(customFuelPrice) : null
    if (modelData) {
      // For EVs: use charging-style blended rate unless user has manually overridden it
      const fuelOverride = (modelData.is_ev && customOverride === null)
        ? getEffectiveElecRate(resolvedState, chargingStyle)
        : customOverride
      setAnnualFuel(computeAnnualFuel(modelData.is_ev, modelData.mpg?.combined, modelData.mpg?.mpge_combined, resolvedState, annualMileage, fuelOverride, requiresPremiumFuel(selMake, selModel)))
      if (detailedMode) {
        const seg = classifySegment(selMake||'', selModel||'')
        const services = generateMaintenanceServices(modelData.is_ev, annualMileage, seg, selMake, resolvedState, vehicleAge, resolvedLaborRate, resolvedWear, selModel, selYear, selTrim)
        setAnnualMaintenance(services.reduce((s, x) => s + x.annual, 0))
      } else {
        const seg = classifySegment(selMake||'', selModel||'')
        const segAvg = modelData.is_ev ? SEGMENT_MAINT_AVG.electric : (SEGMENT_MAINT_AVG[seg] ?? 1100)
        const brandMult = modelData.is_ev ? 1.0 : (MAINT_BRAND_MULT[selMake] ?? 1.0)
        setAnnualMaintenance(Math.round(segAvg * brandMult / 50) * 50)
      }
    } else {
      const catInfo = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
      const catIsEV = catInfo?.isEV ?? false
      const catMpg  = catInfo?.mpg  ?? 28
      const catMpge = catInfo?.mpge ?? null
      const fuelOverride = (catIsEV && customOverride === null)
        ? getEffectiveElecRate(resolvedState, chargingStyle)
        : customOverride
      setAnnualFuel(computeAnnualFuel(catIsEV, catMpg, catMpge, resolvedState, annualMileage, fuelOverride))
      if (detailedMode) {
        const catSeg = catInfo?.segment ?? 'sedan'
        const services = generateMaintenanceServices(catIsEV, annualMileage, catSeg, '', resolvedState, 0, resolvedLaborRate, resolvedWear)
        setAnnualMaintenance(services.reduce((s, x) => s + x.annual, 0))
      } else {
        const catSeg2 = catInfo?.segment ?? 'sedan'
        setAnnualMaintenance(catIsEV ? SEGMENT_MAINT_AVG.electric : (SEGMENT_MAINT_AVG[catSeg2] ?? 1100))
      }
    }
    const currentVal = (selYear && (selMake || selModel))
      ? estimateCurrentValue(price, selMake||null, selModel||null, Math.max(0, new Date().getFullYear() - parseInt(selYear)), currentMileage)
      : price
    setAnnualRegistration(computeAnnualRegistration(resolvedState, currentVal))
  }, [price, selMake, selModel, selYear, selTrim, resolvedState, resolvedLaborRate, resolvedWear, modelData, customCosts, detailedMode, multiCarPolicy, annualMileage, customFuelPrice, vehicleCategory, chargingStyle, currentMileage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Market-analytics search tracking ──
  // Record each make/model the visitor inspects, tagged with their resolved
  // state when available. De-duped per unique make/model/year/state combo so a
  // single session doesn't repeatedly log the same vehicle as sliders move.
  const lastSearchKeyRef = useRef('')
  useEffect(() => {
    if (!selMake || !selModel) return
    const key = `${selMake}|${selModel}|${selYear}|${resolvedState || ''}`
    if (lastSearchKeyRef.current === key) return
    lastSearchKeyRef.current = key
    trackSearch({ make: selMake, model: selModel, year: selYear || null, state: resolvedState })
  }, [selMake, selModel, selYear, resolvedState])

  const handleLocationInput = useCallback((val) => {
    setLocationInput(val)
    setLocationError('')
    const resolved = resolveLocation(val)
    if (resolved) {
      setResolvedState(resolved.state)
      setResolvedLaborRate(resolved.laborRate ?? null)
      setResolvedWear(resolved.wear ?? null)
      setResolvedRegion(resolved.region ?? null)
      setLocationLabel(resolved.label)
    } else {
      setResolvedState(null)
      setResolvedLaborRate(null)
      setResolvedWear(null)
      setResolvedRegion(null)
      setLocationLabel('')
      if (val.trim().length >= 2 && !resolved) {
        setLocationError('Enter a 5-digit ZIP code or 2-letter state (e.g., 90210 or CA)')
      }
    }
  }, [])

  // Applies a trim selection — shared by explicit picks and auto-defaults
  const applyTrim = useCallback((make, model, year, trimName) => {
    const t = getTrims(make, model, year)
    if (!t[trimName]) return
    setSelTrim(trimName)
    const msrp = t[trimName]
    setOrigMsrp(msrp)
    const ageYrs = Math.max(0, new Date().getFullYear() - parseInt(year))
    // Leases always use MSRP as cap cost; ≤1yr cars are priced at MSRP (dealer)
    // or a slight below-sticker discount (private). Used cars get dealer (+10%) or
    // private-party (market) pricing depending on the purchase channel toggle.
    let base
    if (financeMode === 'current') {
      // For "Currently Have" mode, use straight market value — no dealer markup
      base = ageYrs <= 1 ? msrp : Math.round(estimateCurrentValue(msrp, make, model, ageYrs) / 500) * 500
    } else if (financeMode === 'lease' || ageYrs <= 1) {
      base = dealerPurchase ? msrp : Math.round(msrp * 0.97 / 500) * 500
    } else {
      const market = estimateCurrentValue(msrp, make, model, ageYrs)
      base = dealerPurchase
        ? Math.round(market * 1.10 / 500) * 500
        : Math.round(market       / 500) * 500
    }
    setPrice(base)
  }, [financeMode, dealerPurchase])

  // Auto-selects the cheapest trim for a given make/model/year
  const autoSelectCheapestTrim = useCallback(async (make, model, year) => {
    const t = getTrims(make, model, year)
    const entries = Object.entries(t)
    if (entries.length === 0) return
    if (!(await checkDetailedLimit())) return
    lastChargedVehicleRef.current = `${make}|${model}|${year}`
    const [cheapestName] = entries.reduce((a, b) => b[1] < a[1] ? b : a)
    applyTrim(make, model, year, cheapestName)
  }, [checkDetailedLimit, applyTrim])

  const handlePickerChange = useCallback(async (level, value) => {
    trackFirstInteraction('vehicle_picker')
    if (level === 'make') {
      setSelMake(value); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null); setVehicleCategory('')
    }
    if (level === 'model') {
      setSelModel(value); setSelYear(''); setSelTrim(''); setOrigMsrp(null)
      // Lease: auto-select the pinned year and cheapest trim
      if (financeMode === 'lease' && value) {
        setSelYear(LEASE_YEAR)
        autoSelectCheapestTrim(selMake, value, LEASE_YEAR)
      }
    }
    if (level === 'year') {
      setSelYear(value); setSelTrim(''); setOrigMsrp(null)
      // Auto-default to cheapest trim when year is chosen
      if (value) autoSelectCheapestTrim(selMake, selModel, value)
    }
    if (level === 'trim') {
      const vehicleKey = `${selMake}|${selModel}|${selYear}`
      const alreadyCharged = lastChargedVehicleRef.current === vehicleKey
      if (value !== selTrim && !alreadyCharged && !(await checkDetailedLimit())) return
      if (value !== selTrim && !alreadyCharged) lastChargedVehicleRef.current = vehicleKey
      applyTrim(selMake, selModel, selYear, value)
    }
  }, [financeMode, selMake, selModel, selYear, selTrim, checkDetailedLimit, applyTrim, autoSelectCheapestTrim])

  const handleClear = useCallback(() => {
    setSelMake(''); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null)
  }, [])

  // Purchase extras (tax + dealer fees) — only for buy mode
  const salesTaxAmt = financeMode === 'buy'
    ? (taxRateOverride !== null
        ? Math.round(price * (parseFloat(taxRateOverride) / 100) / 25) * 25
        : computeSalesTax(resolvedState, price))
    : 0
  const autoDocFee = resolvedState ? (STATE_DOC_FEE_AVG[resolvedState] ?? 299) : 299
  const effectiveDocFee = (financeMode === 'buy' && dealerPurchase)
    ? (docFeeOverride !== null ? Number(docFeeOverride) : autoDocFee)
    : 0
  const totalPurchaseExtras = salesTaxAmt + effectiveDocFee
  const effectivePrice = financeMode === 'buy' ? price + totalPurchaseExtras : price
  const regionalDemand = resolvedState ? getRegionalDemandPremium(resolvedState) : 0

  const leasePeriodYears = Math.ceil(leaseTerm / 12)

  // "I Own It" — how long the user has owned the vehicle
  const now = new Date()
  const monthsOwned = (ownPurchaseYear != null && ownPurchaseMonth != null)
    ? Math.max(0, (now.getFullYear() - ownPurchaseYear) * 12 + (now.getMonth() + 1 - ownPurchaseMonth))
    : null
  const yearsOwnedWhole = monthsOwned != null ? Math.floor(monthsOwned / 12) : null
  const monthsOwnedRem  = monthsOwned != null ? monthsOwned % 12 : null

  // "Currently Have" — derived loan state from original terms + time elapsed
  const currentMonthsPaid    = monthsOwned != null ? Math.min(monthsOwned, originalLoanTerm) : 0
  const currentRemainingTerm = Math.max(0, originalLoanTerm - currentMonthsPaid)

  // Recompute remaining balance from amortization schedule
  const currentRemainingBalance = (() => {
    if (currentVehicleType !== 'financed' || originalLoanAmount <= 0 || currentMonthsPaid >= originalLoanTerm) return 0
    const r = rate / 12 / 100
    if (r === 0) return Math.max(0, originalLoanAmount * (1 - currentMonthsPaid / originalLoanTerm))
    const M = originalLoanAmount * r * Math.pow(1+r, originalLoanTerm) / (Math.pow(1+r, originalLoanTerm) - 1)
    return Math.max(0, originalLoanAmount * Math.pow(1+r, currentMonthsPaid) - M * (Math.pow(1+r, currentMonthsPaid) - 1) / r)
  })()

  const currentLeaseRemainingMonths = Math.max(0, currentLeaseTerm - (monthsOwned ?? 0))

  const results = useMemo(() => {
    if (financeMode === 'buy' && isCashPurchase) {
      return { loanAmount: 0, monthlyPayment: 0, totalInterestPaid: 0, totalCostOfLoan: 0,
        trueAnnualCost: 0, interestThroughOwnership: 0, ownershipShorterThanLoan: false }
    }
    if (financeMode === 'current') {
      if (currentVehicleType === 'paid_off' || currentVehicleType === 'leased' || currentRemainingBalance <= 0) {
        return { loanAmount: 0, monthlyPayment: 0, totalInterestPaid: 0, totalCostOfLoan: 0,
          trueAnnualCost: 0, interestThroughOwnership: 0, ownershipShorterThanLoan: false }
      }
      return calculateLoan({
        price: currentRemainingBalance, downPayment: 0,
        loanTermMonths: Math.max(1, currentRemainingTerm), annualRatePercent: rate, ownershipYears,
      })
    }
    return calculateLoan({
      price: effectivePrice, downPayment: Math.min(downPayment, effectivePrice),
      loanTermMonths: loanTerm, annualRatePercent: rate, ownershipYears,
    })
  }, [financeMode, isCashPurchase, currentVehicleType, currentRemainingBalance, currentRemainingTerm, effectivePrice, downPayment, loanTerm, rate, ownershipYears])

  const leaseResults = useMemo(() => calculateLease({
    msrp: price,
    capCostReduction: Math.min(capCostReduction, price),
    acquisitionFee,
    leaseTermMonths: leaseTerm,
    aprPercent: leaseApr,
    residualPct,
  }), [price, capCostReduction, acquisitionFee, leaseTerm, leaseApr, residualPct])

  const annualOperatingCost = annualInsurance + annualFuel + annualMaintenance + annualRegistration
  const totalAnnualCost = (financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost) + annualOperatingCost

  // Forecast rows computed at parent level so both the summary panel and FiveYearForecast
  // share identical totals (prevents the visual vs. summary number discrepancy).
  const forecastRows = useMemo(() => {
    const years = Math.min(5, Math.max(1, ownershipYears))
    const leasePeriodYears = Math.ceil(leaseTerm / 12)
    return Array.from({ length: years }, (_, i) => {
      const yr = i + 1
      const loanMonths = financeMode === 'lease'
        ? 0
        : financeMode === 'current'
          ? (currentVehicleType === 'leased'
              ? Math.max(0, Math.min(12, currentLeaseRemainingMonths - i * 12))
              : Math.max(0, Math.min(12, currentRemainingTerm - i * 12)))
          : Math.max(0, Math.min(12, loanTerm - i * 12))
      const loanCost = financeMode === 'lease'
        ? (yr <= leasePeriodYears ? leaseResults.annualLeaseCost : 0)
        : financeMode === 'current' && currentVehicleType === 'leased'
          ? currentLeasePayment * loanMonths
          : results.monthlyPayment * loanMonths
      const insurance    = Math.round(annualInsurance    * Math.pow(1.02, i))
      const fuel         = annualFuel
      const maintenance  = maintenanceByYear?.[i] ?? Math.round(annualMaintenance * Math.pow(1.08, i))
      const registration = Math.round(annualRegistration * Math.pow(0.95, i))
      const total = loanCost + insurance + fuel + maintenance + registration
      return { yr, loanCost, insurance, fuel, maintenance, registration, total }
    })
  }, [ownershipYears, leaseTerm, financeMode, loanTerm, leaseResults.annualLeaseCost,
      results.monthlyPayment, annualInsurance, annualFuel, maintenanceByYear,
      annualMaintenance, annualRegistration, currentVehicleType, currentLeasePayment,
      currentLeaseRemainingMonths, currentRemainingTerm])

  // Auto-suggest residual % based on the depreciation model for the selected lease term.
  // Fires whenever the lease term, make, or model changes. Runs in buy mode too so the
  // Lease vs. Buy panel uses a vehicle-appropriate residual even before switching modes.
  useEffect(() => {
    if (financeMode === 'current') return
    const leaseYears = leaseTerm / 12
    const suggested = Math.round(
      estimateCurrentValue(100, selMake || null, selModel || null, leaseYears)
    )
    setResidualPct(Math.max(20, Math.min(80, suggested)))
  }, [leaseTerm, selMake, selModel, financeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-estimate purchase price when the user explicitly overrides the odometer reading.
  useEffect(() => {
    if (financeMode !== 'buy' || !origMsrp || !selMake || !selModel || !selYear || currentMileage === null) return
    const ageYrs = Math.max(0, new Date().getFullYear() - parseInt(selYear))
    if (ageYrs <= 1) return
    const market = estimateCurrentValue(origMsrp, selMake, selModel, ageYrs, currentMileage)
    setPrice(Math.round((dealerPurchase ? market * 1.10 : market) / 500) * 500)
  }, [currentMileage, origMsrp, selMake, selModel, selYear, financeMode, dealerPurchase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-price vehicle when the purchase channel (dealer vs. private) toggles.
  useEffect(() => {
    if (financeMode !== 'buy' || !origMsrp || !selMake || !selModel || !selYear) return
    const ageYrs = Math.max(0, new Date().getFullYear() - parseInt(selYear))
    if (ageYrs <= 1) {
      setPrice(dealerPurchase ? origMsrp : Math.round(origMsrp * 0.97 / 500) * 500)
      return
    }
    const market = estimateCurrentValue(origMsrp, selMake, selModel, ageYrs, currentMileage ?? undefined)
    setPrice(Math.round((dealerPurchase ? market * 1.10 : market) / 500) * 500)
  }, [dealerPurchase]) // eslint-disable-line react-hooks/exhaustive-deps

  // For the insurance note: estimated current market value after depreciation
  const carAge            = selYear ? Math.max(0, new Date().getFullYear() - parseInt(selYear)) : 0
  const estimatedCarValue = selYear
    ? estimateCurrentValue(price, selMake || null, selModel || null, carAge, currentMileage)
    : price

  const safeDown = isCashPurchase ? effectivePrice : Math.min(downPayment, effectivePrice)
  const usingMSRP = !!(selMake && selModel && selYear && selTrim)

  // Net cost of ownership: total paid minus estimated future resale value
  const futureResaleValue = (financeMode === 'buy' && origMsrp && selYear)
    ? Math.round(estimateCurrentValue(origMsrp, selMake || null, selModel || null, carAge + ownershipYears))
    : null
  const totalOwnershipPaid = forecastRows.reduce((s, r) => s + r.total, 0)
  // For buy mode: include down payment (paid upfront, only partially recovered via resale).
  // For own mode: no purchase occurred — just the ongoing costs.
  const netCostOfOwnership = futureResaleValue != null
    ? totalOwnershipPaid + (financeMode === 'buy' ? safeDown : 0) - futureResaleValue
    : null

  // ── Lease vs. Buy head-to-head ──────────────────────────
  // Compares the same vehicle, on the same clock (the lease term), net of equity.
  // Leasing ends with $0 equity; buying ends with a depreciated asset you can sell —
  // crediting that resale value is what makes the comparison honest.
  const leaseVsBuy = useMemo(() => {
    if (!(price > 0)) return null
    const horizonYears  = leasePeriodYears   // common clock = the lease term
    const horizonMonths = leaseTerm

    // BUY path: finance the same vehicle, evaluated over the lease horizon.
    const buyLoan = isCashPurchase ? null : calculateLoan({
      price, downPayment: Math.min(downPayment, price),
      loanTermMonths: loanTerm, annualRatePercent: rate, ownershipYears: horizonYears,
    })
    // Cash purchase: no interest. Financed: price + interest through the horizon.
    const buyFinancing = price + (isCashPurchase ? 0 : buyLoan.interestThroughOwnership)
    // Equity retained at the end of the horizon (you own a depreciated asset).
    const projectedMiles = Math.round(annualMileage * (carAge + horizonYears))
    const resaleValue = Math.round(
      estimateCurrentValue(origMsrp ?? price, selMake || null, selModel || null, carAge + horizonYears, projectedMiles)
    )

    // Operating costs (insurance + fuel + maintenance + reg) are identical on both
    // paths over the same horizon, so they don't move the verdict — shown for context.
    const operating = Math.round(annualOperatingCost * horizonYears)

    const netBuy   = Math.round(buyFinancing + operating - resaleValue)
    const netLease = Math.round(leaseResults.totalLeaseCost + operating)

    // Lease mileage allowance caveat (standard ~12k/yr; excess typically ~$0.25/mi).
    const leaseMileageCap  = 12000
    const excessMiles      = Math.max(0, (annualMileage - leaseMileageCap) * horizonYears)
    const excessMileageFee = Math.round(excessMiles * 0.25)

    const diff = netLease - netBuy   // > 0 → buying is cheaper
    return {
      horizonYears, horizonMonths,
      leaseDriveOff: Math.round(Math.min(capCostReduction, price)),
      leaseTotal:    Math.round(leaseResults.totalLeaseCost),
      buyDown:       isCashPurchase ? Math.round(price) : Math.round(Math.min(downPayment, price)),
      buyInterest:   isCashPurchase ? 0 : Math.round(buyLoan.interestThroughOwnership),
      buyFinancing:  Math.round(buyFinancing),
      resaleValue, operating, netBuy, netLease,
      loanTerm, rate: isCashPurchase ? null : rate, annualMileage, leaseMileageCap, excessMileageFee, isCashPurchase,
      diff: Math.abs(Math.round(diff)), buyWins: diff > 0,
    }
  }, [price, leasePeriodYears, leaseTerm, downPayment, loanTerm, rate, isCashPurchase, annualMileage, carAge,
      origMsrp, selMake, selModel, annualOperatingCost, leaseResults.totalLeaseCost, capCostReduction])

  // Derived EV flag, charging rate, and premium fuel flag — used across the render
  const catInfoForRender = !selMake ? VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory) : null
  const effIsEV = modelData ? modelData.is_ev : (catInfoForRender?.isEV ?? false)
  const isPremium = !effIsEV && !!(selMake && requiresPremiumFuel(selMake, selModel))

  // Free detailed calcs remaining (base allowance + email-unlock bonus credits)
  const detailedFreeLeft = Math.max(0, FREE_DETAILED_LIMIT - detailedCalcCount) + bonusCreditsLeft

  // Whether the detailed results are currently blocked by the paywall
  const isDetailBlocked = !isSubscribed && detailedCalcCount > FREE_DETAILED_LIMIT && bonusCreditsLeft === 0

  // Persist a snapshot for returning-user insights on the landing page.
  // Only save when the user has changed at least one input from defaults.
  useEffect(() => {
    const isDefault = price === 30000 && downPayment === 5000 && !selMake
    if (isDefault) return
    const snapshot = {
      vehicle: selMake && selModel
        ? [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ')
        : null,
      price,
      financeMode,
      monthlyPayment: financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment,
      totalAnnualCost,
      savedAt: new Date().toISOString(),
      inputs: { price, downPayment, loanTerm, rate, ownershipYears, selMake, selModel, selYear, selTrim, financeMode },
    }
    localStorage.setItem(LS_LAST_CALC, JSON.stringify(snapshot))
  }, [price, downPayment, loanTerm, rate, ownershipYears, selMake, selModel, selYear, selTrim, financeMode, results, leaseResults, totalAnnualCost]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save this TCO result to localStorage so the comparison page can import it
  function handleAddToComparison() {
    const futureAgeYrs = carAge + ownershipYears
    const futureValue  = origMsrp
      ? estimateCurrentValue(origMsrp, selMake || null, selModel || null, futureAgeYrs)
      : null
    const retentionPct = origMsrp && futureValue != null
      ? Math.round((futureValue / origMsrp) * 100)
      : null

    // Use the same escalating forecastRows total displayed in the TCO summary,
    // plus the down payment (not captured in monthly payments).
    const totalOwnership = financeMode === 'lease'
      ? forecastRows.reduce((s, r) => s + r.total, 0)
      : forecastRows.reduce((s, r) => s + r.total, 0) + safeDown

    const entry = {
      id:                crypto.randomUUID(),
      name:              selMake && selModel
        ? [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ')
        : 'Custom Vehicle',
      addedAt:           new Date().toISOString(),
      // Finance mode
      isLease:           financeMode === 'lease',
      // Loan inputs (used when isLease === false)
      price,
      downPayment:       safeDown,
      loanTerm,
      rate,
      ownershipYears:    financeMode === 'lease' ? leasePeriodYears : ownershipYears,
      // Lease inputs (used when isLease === true)
      leaseMonthlyPayment: financeMode === 'lease' ? leaseResults.monthlyPayment : null,
      leaseTerm:           financeMode === 'lease' ? leaseTerm : null,
      // Finance results
      monthlyPayment:    financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment,
      totalInterest:     financeMode === 'lease' ? null : results.totalInterestPaid,
      totalCostOfLoan:   financeMode === 'lease' ? leaseResults.totalLeaseCost : results.totalCostOfLoan,
      trueAnnualCost:    financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost,
      // Operating costs
      annualInsurance,
      annualFuel,
      annualMaintenance,
      annualRegistration,
      totalAnnualCost,
      totalOwnershipCost: totalOwnership,
      // Vehicle identity
      make: selMake, model: selModel, year: selYear, trim: selTrim,
      // Specs (may be null for category-only or no-picker entries)
      mpgCombined:    modelData?.mpg?.combined ?? null,
      cargoSqFt:      modelData?.specs?.cargo_cu_ft ?? null,
      seats:          modelData?.specs?.seats ?? null,
      isEV:           effIsEV,
      // Value retention (not applicable for leases but keep for reference)
      futureValue,
      valueRetentionPct: financeMode === 'lease' ? null : retentionPct,
      // Cost efficiency
      annualMileage,
      costPerMile: annualMileage > 0 ? Math.round((totalAnnualCost / annualMileage) * 100) / 100 : null,
    }

    const existing = JSON.parse(localStorage.getItem('cashpedal_tco_for_comparison') || '[]')
    // Keep at most 5 entries (max comparison slots)
    const updated = [...existing, entry].slice(-5)
    localStorage.setItem('cashpedal_tco_for_comparison', JSON.stringify(updated))
    setComparisonCount(updated.length)
  }

  // Fire calculator_completed once per distinct vehicle selection
  useEffect(() => {
    if (!selTrim || hasTrackedDoneRef.current) return
    hasTrackedDoneRef.current = true
    trackCalculatorCompleted({
      vehicleCount:   1,
      hasEV:          modelData?.is_ev ?? false,
      ownershipYears,
    })
  }, [selTrim]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Analytics helpers ─────────────────────────────────
  function trackFirstInteraction(entryPoint = 'input') {
    if (hasTrackedStartRef.current) return
    hasTrackedStartRef.current = true
    trackCalculatorStarted({ source_page: '/tco', entry_point: entryPoint })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {showUserDataModal && (
        <UserDataModal
          calcCount={calcCount}
          onClose={() => setShowUserDataModal(false)}
        />
      )}
      {showPaywall && (
        <PaywallModal
          feature="tco"
          usedCount={FREE_DETAILED_LIMIT}
          cancelPath="/tco"
          onUnlocked={() => setShowPaywall(false)}
        />
      )}
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Vehicle TCO Calculator
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            What will this car <em>really</em> cost you?
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-lg">
            The sticker price is only half the story. See the full cost of ownership — depreciation,
            insurance, fuel, maintenance, and interest — for any of 35 makes &amp; 266 models, before you sign.
          </p>

          {/* Simple / Detailed toggle */}
          <div className="anim-2 mt-5 flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-lg text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {[
                { value: true,  label: 'Simple',   desc: 'Just the essentials' },
                { value: false, label: 'Detailed',  desc: 'Full control' },
              ].map(opt => (
                <button key={String(opt.value)}
                  onClick={() => { setSimpleMode(opt.value); localStorage.setItem('cashpedal_simple_mode', String(opt.value)) }}
                  className="px-4 py-1.5 rounded-md font-semibold transition-all"
                  style={{
                    background: simpleMode === opt.value ? 'var(--accent)' : 'transparent',
                    color:      simpleMode === opt.value ? '#000'          : 'var(--text-muted)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {simpleMode
                ? 'Showing the key numbers. Switch to Detailed for full control over every input.'
                : 'All inputs unlocked. Switch to Simple for a cleaner view.'}
            </p>
          </div>

          {/* How to use this calculator */}
          <div className="anim-2 mt-5 rounded-xl border overflow-hidden"
            style={{ borderColor: 'rgba(200,255,0,0.2)', background: 'rgba(200,255,0,0.03)' }}>
            <button onClick={toggleGuide}
              className="w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <span aria-hidden>💡</span> How to use this calculator
              </span>
              <span className="text-xs text-[var(--text-muted)]">{showGuide ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            {showGuide && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-4">
                <ol className="flex flex-col gap-3">
                  {[
                    { n: '1', t: 'Choose how you’ll pay',
                      d: 'Pick Buy / Finance, Lease, or Currently Have. Each mode asks only for the numbers that matter for that path.' },
                    { n: '2', t: 'Add your location & vehicle',
                      d: 'Your ZIP or state tailors insurance, fuel, and registration. Selecting a make/model/trim pulls in real MSRP and depreciation — or skip it and pick a category.' },
                    { n: '3', t: 'Set the financing details',
                      d: 'Enter price/MSRP, down payment, term, and rate (or money factor & residual for a lease). Everything recalculates live as you type.' },
                    { n: '4', t: 'Read your results',
                      d: 'See your all-in monthly cost, annual breakdown, and — for buying or leasing — a Lease vs. Buy verdict showing which is cheaper and by how much.' },
                  ].map(step => (
                    <li key={step.n} className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--accent)', color: '#000' }}>{step.n}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{step.t}</p>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">{step.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="rounded-lg border p-3 flex flex-col gap-1.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                    The three modes
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    <span className="text-white font-semibold">Buy / Finance</span> — purchasing a car, with or without a loan.{' '}
                    <span className="text-white font-semibold">Lease</span> — a new-car lease priced from MSRP, term, money factor, and residual.{' '}
                    <span className="text-white font-semibold">Currently Have</span> — a car you already own or lease, to see the cost of keeping it.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Comparing several cars? Run each one here, tap{' '}
                    <span className="text-white font-semibold">Add to Comparison</span>, then open the{' '}
                    <Link to="/compare" className="text-[var(--accent)] hover:underline font-semibold">Comparison page</Link>{' '}
                    to stack them side by side.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Layout */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── Inputs ── */}
            <div className="card anim-3 flex flex-col gap-7">

              {/* Free vs Limited feature tier summary */}
              {!isSubscribed && (
                <div className="rounded-xl overflow-hidden text-xs border"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'var(--bg)' }}>
                  <div className="px-4 py-3 flex items-center gap-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ color: '#4ade80', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      Free
                    </span>
                    <span className="text-[var(--text-muted)]">
                      Loan calculator · Operating cost estimates · Make / Model / Year lookup
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    {detailedFreeLeft <= 0
                      ? <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
                          🔒 Locked
                        </span>
                      : <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ color: '#FFB800', background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)' }}>
                          {detailedFreeLeft} free left
                        </span>
                    }
                    <span className="text-[var(--text-muted)]">
                      Trim-specific MSRP &amp; depreciation · Detailed itemized cost breakdown
                      {detailedFreeLeft <= 0 && (
                        <> — <a href="/subscribe" className="text-[var(--accent)] hover:underline font-semibold">Subscribe for unlimited</a></>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Your Location</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--accent)', border:'1px solid rgba(255,184,0,0.3)' }}>
                    Required
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-4">
                  Used for state-specific insurance rates, fuel prices, and registration fees.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field pr-24"
                      placeholder="ZIP code or state (e.g., 90210 or CA)"
                      value={locationInput}
                      onChange={e => handleLocationInput(e.target.value)}
                      maxLength={5}
                    />
                    {resolvedState && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ color:'var(--accent)', background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.25)' }}>
                        {locationLabel}
                      </span>
                    )}
                  </div>
                  {locationError && <p className="text-xs text-amber-400">{locationError}</p>}
                  {resolvedRegion && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      <span className="text-[var(--accent)]">⛰</span> Terrain-adjusted for{' '}
                      <span className="text-white">{resolvedRegion}</span> — service intervals tuned for local conditions.
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Buy / Lease / Own toggle */}
              <div className="flex flex-col gap-2">
                <label className="input-label">How will you pay for it?</label>
                <div className="flex gap-1 p-1 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {[
                    { value: 'buy',   label: 'Buy / Finance' },
                    { value: 'lease', label: 'Lease' },
                    { value: 'current', label: 'Currently Have' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => {
                        setFinanceMode(opt.value)
                        if (opt.value !== 'buy') setIsCashPurchase(false)
                        if (opt.value === 'lease' && selMake && selModel) {
                          if (selYear !== LEASE_YEAR) {
                            setSelYear(LEASE_YEAR)
                            setSelTrim('')
                            setOrigMsrp(null)
                            autoSelectCheapestTrim(selMake, selModel, LEASE_YEAR)
                          }
                        }
                      }}
                      className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                      style={{
                        background: financeMode === opt.value ? 'var(--accent)' : 'transparent',
                        color:      financeMode === opt.value ? '#000' : 'var(--text-muted)',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {financeMode === 'buy'
                    ? 'Buying or financing a vehicle. Enter the price, down payment, loan term, and rate — you’ll also get a Lease vs. Buy verdict.'
                    : financeMode === 'lease'
                    ? 'Leasing a new vehicle. Enter MSRP, term, money factor, and residual — we’ll show the full lease cost and whether buying would be cheaper.'
                    : 'A vehicle you already own or lease. Enter when you got it and your original terms to see what it costs to keep.'}
                </p>
              </div>

              {/* Vehicle selector */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">
                    {financeMode === 'current' ? 'Your Current Vehicle' : 'Select Your Vehicle'}
                  </h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                    Optional
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-5">
                  {financeMode === 'current'
                    ? 'Select your vehicle to auto-estimate current market value, insurance, fuel, and maintenance.'
                    : '35 makes · 266 models · trims by year with MSRP, MPG & specs.'}
                </p>
                <VehiclePicker
                  make={selMake} model={selModel} year={selYear} trim={selTrim}
                  onChange={handlePickerChange} onClear={handleClear}
                  freeLeft={detailedFreeLeft}
                  isSubscribed={isSubscribed}
                  isLease={financeMode === 'lease'}
                />

                {/* Category picker — shown only when no make is selected */}
                {!selMake && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-2">
                    <label className="input-label">
                      No specific vehicle? Pick a category for default estimates
                    </label>
                    <select
                      className="input-field"
                      value={vehicleCategory}
                      onChange={e => setVehicleCategory(e.target.value)}
                    >
                      <option value="">Select category…</option>
                      {VEHICLE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {vehicleCategory && (() => {
                      const cat = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
                      return (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Using {cat.label} defaults —{' '}
                          {cat.isEV ? '100 MPGe (EV avg)' : `${cat.mpg} MPG avg`}
                        </p>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Financing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-white text-lg">
                    {financeMode === 'current' ? 'Vehicle History & Financing' : 'Purchase & Financing'}
                  </h2>
                  {usingMSRP && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ color:'#FFB800', background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)' }}>
                      {origMsrp && carAge > 0 ? 'Est. Current Value' : 'Using MSRP'}
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-sm">
                  {financeMode === 'current'
                    ? 'Tell us when you got it, your original financing terms, and how long you plan to keep it.'
                    : financeMode === 'lease'
                    ? 'Lease inputs: MSRP, cap cost reduction, term, APR & residual.'
                    : 'Adjust any value — results update live.'}
                </p>
              </div>

              <SliderInput
                label={financeMode === 'current' ? 'Current Market Value' : financeMode === 'lease' ? 'Vehicle MSRP' : 'Vehicle Purchase Price (Out-the-Door)'}
                value={price}
                onChange={v => { trackFirstInteraction('price_slider'); setPrice(v) }}
                displayValue={financeMode === 'buy' ? effectivePrice : undefined}
                onDisplayChange={financeMode === 'buy' ? (otd) => {
                  const taxRate = taxRateOverride !== null
                    ? parseFloat(taxRateOverride) / 100
                    : (STATE_VEHICLE_SALES_TAX[resolvedState] ?? 0.0625)
                  const base = Math.round((otd - effectiveDocFee) / (1 + taxRate) / 500) * 500
                  setPrice(Math.max(5000, Math.min(150000, base)))
                } : undefined}
                min={5000} max={150000} step={500} prefix="$"
                inputMax={financeMode === 'buy' ? 175000 : undefined}
              />

              {financeMode === 'current' && (
                <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                  {origMsrp && carAge > 0
                    ? <>Est. market value for a {carAge}yr {selMake} · MSRP was <span className="text-white">{formatCurrency(origMsrp)}</span></>
                    : 'Adjust to match your vehicle\'s current private-party value'}
                </p>
              )}

              {financeMode === 'buy' && (
                <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                  Estimated vehicle <span className="text-white">{formatCurrency(price)}</span>
                  {totalPurchaseExtras > 0 && (
                    <> · tax + fees <span className="text-white">{formatCurrency(totalPurchaseExtras)}</span></>
                  )}
                  {origMsrp && carAge > 0 && (
                    <>
                      {' '}·{' '}
                      <span className="text-white">{dealerPurchase ? 'Dealer est.' : 'Private party est.'}</span>
                      {dealerPurchase && ' +10% markup'}
                      {currentMileage !== null && ` · ${currentMileage.toLocaleString()} mi`}
                      {' '}· MSRP <span className="text-white">{formatCurrency(origMsrp)}</span>
                    </>
                  )}
                </p>
              )}

              {/* Regional demand note — detailed mode only */}
              {!simpleMode && financeMode === 'buy' && carAge > 0 && regionalDemand !== 0 && resolvedState && (
                <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                  Used-car market in <span className="text-white">{resolvedState}</span> typically runs{' '}
                  <span className={regionalDemand > 0 ? 'text-amber-400' : 'text-green-400'}>
                    {regionalDemand > 0 ? '+' : ''}{Math.round(regionalDemand * 100)}%
                  </span>{' '}
                  vs. national average — adjust price accordingly.
                </p>
              )}

              {financeMode === 'buy' ? (
                <>
                  {/* Finance vs. Cash Purchase toggle */}
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    {[
                      { v: false, l: 'Finance / Loan' },
                      { v: true,  l: 'Cash Purchase' },
                    ].map(({ v, l }) => (
                      <button key={String(v)} onClick={() => setIsCashPurchase(v)}
                        className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                        style={{
                          background: isCashPurchase === v ? 'var(--accent)' : 'transparent',
                          color:      isCashPurchase === v ? '#000' : 'var(--text-muted)',
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Dealer / Private Party toggle — detailed mode only */}
                  {!simpleMode && (
                    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      {[{ v: true, l: 'Dealer Purchase' }, { v: false, l: 'Private Party' }].map(({ v, l }) => (
                        <button key={String(v)} onClick={() => setDealerPurchase(v)}
                          className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                          style={{
                            background: dealerPurchase === v ? 'var(--accent)' : 'transparent',
                            color:      dealerPurchase === v ? '#000' : 'var(--text-muted)',
                          }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tax + Fees block */}
                  <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {/* Sales tax row */}
                    {!simpleMode && (
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <span className="text-sm text-white">Sales Tax</span>
                          <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                            {resolvedState
                              ? taxRateOverride === null && (STATE_VEHICLE_SALES_TAX[resolvedState] ?? 1) === 0
                                ? <span className="text-green-400 font-semibold">No vehicle sales tax ({resolvedState})</span>
                                : `${resolvedState} · ${((taxRateOverride !== null ? parseFloat(taxRateOverride) : (STATE_VEHICLE_SALES_TAX[resolvedState] ?? 0.0625) * 100)).toFixed(2)}%`
                              : 'Enter location for exact rate'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative">
                            <input
                              type="number" step="0.01" min="0" max="20"
                              placeholder={resolvedState ? ((STATE_VEHICLE_SALES_TAX[resolvedState] ?? 0.0625) * 100).toFixed(2) : '6.25'}
                              value={taxRateOverride ?? ''}
                              onChange={e => setTaxRateOverride(e.target.value === '' ? null : e.target.value)}
                              className="input-field text-right pr-6 py-1 text-sm w-24"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none">%</span>
                          </div>
                          <span className="font-semibold text-white text-sm tabular-nums w-20 text-right">{formatCurrency(salesTaxAmt)}</span>
                        </div>
                      </div>
                    )}

                    {/* Doc fee row — dealer only, detailed mode only */}
                    {!simpleMode && dealerPurchase && (
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <span className="text-sm text-white">Doc Fee</span>
                          <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                            {resolvedState ? `${resolvedState} typical` : 'dealer documentation fee'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none">$</span>
                            <input
                              type="number" step="1" min="0" max="2000"
                              placeholder={String(autoDocFee)}
                              value={docFeeOverride ?? ''}
                              onChange={e => setDocFeeOverride(e.target.value === '' ? null : e.target.value)}
                              className="input-field text-right pl-5 py-1 text-sm w-24"
                            />
                          </div>
                          <span className="font-semibold text-white text-sm tabular-nums w-20 text-right">{formatCurrency(effectiveDocFee)}</span>
                        </div>
                      </div>
                    )}

                    {/* Out-the-door total */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="text-sm font-semibold text-white">Out-the-Door Price</span>
                        {simpleMode && totalPurchaseExtras > 0 && (
                          <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                            includes ~{formatCurrency(totalPurchaseExtras)} tax &amp; fees
                          </span>
                        )}
                      </div>
                      <span className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(effectivePrice)}
                      </span>
                    </div>
                  </div>

                  {isCashPurchase ? (
                    <>
                      <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
                        style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
                        <span className="text-green-400 mt-0.5">✓</span>
                        <div>
                          <p className="text-sm font-semibold text-white">Paying cash — no financing</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            Full purchase price paid upfront. Your analysis shows operating costs only — no monthly loan payment or interest charges.
                          </p>
                        </div>
                      </div>

                      <SelectInput label="Ownership Duration" value={ownershipYears}
                        onChange={setOwnershipYears} options={ownershipOptions} />
                    </>
                  ) : (
                    <>
                      <SliderInput label="Down Payment" value={safeDown}
                        onChange={v => setDownPayment(Math.min(v, effectivePrice))}
                        min={0} max={Math.min(effectivePrice, 50000)} step={500} prefix="$" />

                      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <span className="text-sm text-[var(--text-muted)]">Loan amount</span>
                        <span className="font-display font-bold text-white text-lg">{formatCurrency(results.loanAmount)}</span>
                      </div>

                      {/* Gap insurance nudge when financing >80% LTV */}
                      {results.loanAmount > price * 0.80 && (
                        <div className="rounded-lg px-3 py-2.5 flex items-start gap-2.5 border"
                          style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.05)' }}>
                          <span className="text-sm shrink-0 mt-0.5">⚠</span>
                          <p className="text-[11px] leading-relaxed" style={{ color: '#fbbf24' }}>
                            <span className="font-semibold">Low down payment — consider gap insurance.</span>{' '}
                            With less than 20% down, your loan balance may exceed the car's market value for the first 1–2 years.
                            Gap insurance (~$20–$40/mo or a one-time ~$300) covers the difference if the vehicle is totaled or stolen.
                          </p>
                        </div>
                      )}

                      <SelectInput label="Loan Term" value={loanTerm} onChange={setLoanTerm} options={loanTermOptions} />

                      <SliderInput label="Annual Interest Rate" value={rate} onChange={setRate}
                        min={0} max={25} step={0.1} suffix="%" inputMin={0} inputMax={25} />
                      {!simpleMode && (
                        <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                          Typical rates (new car): excellent credit 740+ ≈ 5–7% · good 680+ ≈ 7–9% · fair 620+ ≈ 10–13%
                        </p>
                      )}

                      <SelectInput label="Ownership Duration" value={ownershipYears}
                        onChange={setOwnershipYears} options={ownershipOptions} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <SliderInput label="Cap Cost Reduction (upfront payment)"
                    value={Math.min(capCostReduction, price)}
                    onChange={v => setCapCostReduction(Math.min(v, price))}
                    min={0} max={Math.min(price, 20000)} step={250} prefix="$" />

                  {!simpleMode && (
                    <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                      Lowers your monthly payment but is not recovered at lease end
                    </p>
                  )}

                  <SliderInput label="Acquisition Fee" value={acquisitionFee} onChange={setAcquisitionFee}
                    min={0} max={2000} step={25} prefix="$" />

                  {!simpleMode && (
                    <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                      Dealer/lender fee added to cap cost — typically $595–$995
                    </p>
                  )}

                  <SelectInput label="Lease Term" value={leaseTerm} onChange={setLeaseTerm} options={leaseTermOptions} />

                  <SliderInput label="Money Factor (APR equivalent)" value={leaseApr} onChange={setLeaseApr}
                    min={0} max={15} step={0.1} suffix="%" inputMin={0} inputMax={15} />

                  {!simpleMode && (
                    <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                      Money factor = {(leaseApr / 2400).toFixed(5)} · Ask the dealer for the exact money factor — divide by 2,400 to convert to APR
                    </p>
                  )}

                  <SliderInput label="Residual Value" value={residualPct} onChange={setResidualPct}
                    min={20} max={80} step={1} suffix="%" />

                  {!simpleMode && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                      <span className="text-sm text-[var(--text-muted)]">Residual amount</span>
                      <span className="font-display font-bold text-white text-lg">
                        {formatCurrency(price * residualPct / 100)}
                      </span>
                    </div>
                  )}

                  {!simpleMode && (
                    <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                      {leaseTerm <= 24
                        ? 'Typical 24-month residual: 58–65% — higher residual = lower payment'
                        : leaseTerm <= 36
                        ? 'Typical 36-month residual: 48–58% — Toyota/Honda/Subaru tend toward top of range; luxury/EV toward bottom'
                        : 'Typical 48-month residual: 40–50% — longer terms mean more depreciation and lower residuals'}
                    </p>
                  )}

                  {!simpleMode && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                      <span className="text-sm text-[var(--text-muted)]">Capitalized cost</span>
                      <span className="font-display font-bold text-white text-lg">
                        {formatCurrency(leaseResults.capCost)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {financeMode === 'current' && (
                <>
                  {/* When did you get it */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="input-label">When did you get this vehicle?</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select className="input-field" value={ownPurchaseMonth ?? ''}
                          onChange={e => setOwnPurchaseMonth(e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">Month…</option>
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <select className="input-field" value={ownPurchaseYear ?? ''}
                          onChange={e => setOwnPurchaseYear(e.target.value === '' ? null : Number(e.target.value))}>
                          <option value="">Year…</option>
                          {Array.from({ length: 26 }, (_, i) => now.getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      {monthsOwned != null && (
                        <p className="text-[10px] font-semibold" style={{ color: '#60c8ff' }}>
                          {[yearsOwnedWhole > 0 ? `${yearsOwnedWhole} yr${yearsOwnedWhole !== 1 ? 's' : ''}` : '',
                            monthsOwnedRem > 0 ? `${monthsOwnedRem} mo` : ''].filter(Boolean).join(', ') || 'Less than 1 month'} ago
                        </p>
                      )}
                    </div>

                    {/* What you paid */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="input-label">Original purchase price <span className="text-[var(--text-muted)] font-normal normal-case">(optional)</span></label>
                        {ownPurchasePrice != null && (
                          <button onClick={() => setOwnPurchasePrice(null)}
                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Clear</button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                        <input type="number" className="input-field pl-7" placeholder="e.g. 32000"
                          value={ownPurchasePrice ?? ''} min={0} step={500}
                          onChange={e => setOwnPurchasePrice(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))} />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">Out-the-door price including tax & fees — unlocks costs-to-date analysis</p>
                    </div>
                  </div>

                  <div className="h-px bg-[var(--border)]" />

                  {/* Financed / Leased / Paid Off */}
                  <div className="flex flex-col gap-3">
                    <label className="input-label">How is this vehicle financed?</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: 'financed',  label: 'Financed' },
                        { value: 'leased',    label: 'Leased' },
                        { value: 'paid_off',  label: 'Paid Off' },
                      ].map(opt => (
                        <button key={opt.value} onClick={() => setCurrentVehicleType(opt.value)}
                          className="py-2 rounded-lg text-sm font-semibold transition-all border"
                          style={{
                            background:  currentVehicleType === opt.value ? 'var(--accent)' : 'transparent',
                            color:       currentVehicleType === opt.value ? '#000' : 'var(--text-muted)',
                            borderColor: currentVehicleType === opt.value ? 'var(--accent)' : 'var(--border)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Financed inputs */}
                  {currentVehicleType === 'financed' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="input-label">Original loan amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                          <input type="number" className="input-field pl-7" placeholder="e.g. 25000"
                            value={originalLoanAmount || ''} min={0} step={500}
                            onChange={e => setOriginalLoanAmount(Math.max(0, parseInt(e.target.value) || 0))} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">Amount you financed at purchase, not the vehicle price</p>
                      </div>

                      <SelectInput label="Original loan term" value={originalLoanTerm} onChange={setOriginalLoanTerm} options={loanTermOptions} />

                      <SliderInput label="Interest rate" value={rate} onChange={setRate}
                        min={0} max={25} step={0.1} suffix="%" inputMin={0} inputMax={25} />

                      {/* Live loan progress summary */}
                      {originalLoanAmount > 0 && originalLoanTerm > 0 && (
                        <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm text-[var(--text-muted)]">Monthly payment</span>
                            <span className="font-display font-bold text-white text-lg">
                              {formatCurrency(calculateLoan({ price: originalLoanAmount, downPayment: 0, loanTermMonths: originalLoanTerm, annualRatePercent: rate, ownershipYears: 100 }).monthlyPayment)}
                            </span>
                          </div>
                          {monthsOwned != null && (
                            <>
                              <div className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <span className="text-sm text-white">Loan progress</span>
                                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                                    Month {Math.min(currentMonthsPaid, originalLoanTerm)} of {originalLoanTerm}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold tabular-nums"
                                  style={{ color: currentRemainingTerm > 0 ? '#FFB800' : '#4ade80' }}>
                                  {currentRemainingTerm > 0 ? `${currentRemainingTerm} mo left` : 'Paid off'}
                                </span>
                              </div>
                              {currentRemainingBalance > 0 && (
                                <div className="flex items-center justify-between px-4 py-3">
                                  <span className="text-sm text-[var(--text-muted)]">Remaining balance</span>
                                  <span className="font-semibold text-white tabular-nums">{formatCurrency(currentRemainingBalance)}</span>
                                </div>
                              )}
                              {/* Progress bar */}
                              <div className="px-4 py-3">
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                                  <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (currentMonthsPaid / originalLoanTerm) * 100)}%`, background: 'var(--accent)' }} />
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                  <span>{Math.round((currentMonthsPaid / originalLoanTerm) * 100)}% paid</span>
                                  <span>{Math.round(((originalLoanTerm - currentMonthsPaid) / originalLoanTerm) * 100)}% remaining</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Leased inputs */}
                  {currentVehicleType === 'leased' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="input-label">Monthly lease payment</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                          <input type="number" className="input-field pl-7" placeholder="e.g. 399"
                            value={currentLeasePayment || ''} min={0} step={10}
                            onChange={e => setCurrentLeasePayment(Math.max(0, parseInt(e.target.value) || 0))} />
                        </div>
                      </div>

                      <SelectInput label="Original lease term" value={currentLeaseTerm} onChange={setCurrentLeaseTerm}
                        options={leaseTermOptions} />

                      {monthsOwned != null && (
                        <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex items-center justify-between px-4 py-3">
                            <div>
                              <span className="text-sm text-white">Lease progress</span>
                              <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                                Month {Math.min(monthsOwned, currentLeaseTerm)} of {currentLeaseTerm}
                              </span>
                            </div>
                            <span className="text-sm font-semibold tabular-nums"
                              style={{ color: currentLeaseRemainingMonths > 0 ? '#FFB800' : '#f87171' }}>
                              {currentLeaseRemainingMonths > 0 ? `${currentLeaseRemainingMonths} mo left` : 'Expired'}
                            </span>
                          </div>
                          <div className="px-4 py-3">
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (Math.min(monthsOwned, currentLeaseTerm) / currentLeaseTerm) * 100)}%`, background: '#60a5fa' }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                              <span>{Math.round((Math.min(monthsOwned, currentLeaseTerm) / currentLeaseTerm) * 100)}% complete</span>
                              <span>{currentLeaseRemainingMonths} mo remaining</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Paid off */}
                  {currentVehicleType === 'paid_off' && (
                    <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
                      style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
                      <span className="text-green-400 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-white">No loan payment</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                          Your analysis will show operating costs, depreciation, and out-of-pocket cash spend only.
                        </p>
                      </div>
                    </div>
                  )}

                  <SelectInput label="How many more years do you plan to keep it?"
                    value={ownershipYears} onChange={setOwnershipYears} options={ownershipOptions} />
                </>
              )}

              <div className="h-px bg-[var(--border)]" />

              {/* Annual Operating Costs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Annual Operating Costs</h2>
                  {!simpleMode && resolvedState && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!detailedMode && !(await checkDetailedLimit())) return
                          setDetailedMode(d => !d)
                        }}
                        className="text-xs px-3 py-1 rounded-lg border transition-colors flex items-center gap-1.5"
                        style={{
                          borderColor: detailedMode ? 'rgba(255,184,0,0.5)' : 'var(--border)',
                          color: detailedMode ? 'var(--accent)' : 'var(--text-muted)',
                          background: detailedMode ? 'rgba(255,184,0,0.05)' : 'transparent',
                        }}>
                        {detailedMode ? 'Detailed ✓' : 'Detailed'}
                        {!isSubscribed && !detailedMode && (
                          detailedFreeLeft <= 0
                            ? <span style={{ color: '#f87171' }}>🔒</span>
                            : <span className="font-bold text-[10px]"
                                style={{ color: '#FFB800' }}>
                                {detailedFreeLeft} free
                              </span>
                        )}
                      </button>
                      <button
                        onClick={() => setCustomCosts(c => !c)}
                        className="text-xs px-3 py-1 rounded-lg border transition-colors"
                        style={{
                          borderColor: customCosts ? 'var(--accent)' : 'var(--border)',
                          color: customCosts ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                        {customCosts ? 'Use estimates' : 'Customize'}
                      </button>
                    </div>
                  )}
                </div>
                {!resolvedState ? (
                  <p className="text-sm text-amber-400/80">
                    Enter your location above to see state-specific cost estimates.
                  </p>
                ) : (
                  <p className="text-[var(--text-muted)] text-sm">
                    {customCosts
                      ? 'Adjust any cost to match your situation.'
                      : (() => {
                          const catInfo = !selMake ? VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory) : null
                          const effIsEV = modelData ? modelData.is_ev : (catInfo?.isEV ?? false)
                          const effMpg  = modelData ? (modelData.mpg?.combined ?? 28) : (catInfo?.mpg ?? 28)
                          const mpgNote = effIsEV ? ' · EV' : ` · ${effMpg} MPG${catInfo && !modelData ? ' avg' : ''}`
                          return `${detailedMode ? 'Detailed estimates' : 'Estimated'} for ${resolvedState} · ${annualMileage.toLocaleString()} mi/yr${mpgNote}.`
                        })()}
                  </p>
                )}
              </div>

              {/* Annual miles slider — always visible unless user is in custom-costs mode */}
              {!customCosts && (
                <SliderInput
                  label="Annual Miles Driven"
                  value={annualMileage}
                  onChange={setAnnualMileage}
                  min={3000} max={30000} step={500} suffix=" mi"
                />
              )}

              {/* Current odometer — detailed mode only (defaults to auto: vehicleAge × annualMileage) */}
              {!simpleMode && !customCosts && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="input-label">Current Odometer (miles)</label>
                    {currentMileage !== null && (
                      <button onClick={() => setCurrentMileage(null)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                        Reset to auto
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    className="input-field"
                    placeholder={`${effectiveStartMileage.toLocaleString()} mi (auto${vehicleAge > 0 ? ` — ${vehicleAge}yr × ${annualMileage.toLocaleString()} mi/yr` : ''})`}
                    value={currentMileage ?? ''}
                    onChange={e => setCurrentMileage(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
                    min={0} step={1000}
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Sets the starting mileage for the maintenance forecast — affects when services like tires, brakes, and fluids are due.
                  </p>
                </div>
              )}

              {/* EV Charging Setup — detailed mode only (simple mode defaults to home charging) */}
              {!simpleMode && resolvedState && !customCosts && effIsEV && (
                <div className="rounded-xl border p-4 flex flex-col gap-4"
                  style={{ borderColor: 'rgba(96,200,255,0.25)', background: 'rgba(96,200,255,0.03)' }}>

                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#60c8ff' }}>⚡ EV Charging Setup</span>
                  </div>

                  {/* Rate display — home vs public */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Home rate · {resolvedState}</p>
                      <p className="text-white font-bold text-sm mt-0.5">
                        ${(STATE_ELEC_RATES[resolvedState] ?? 0.16).toFixed(2)}<span className="text-[var(--text-muted)] font-normal text-xs">/kWh</span>
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Residential avg</p>
                    </div>
                    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Public DCFC · {resolvedState}</p>
                      <p className="text-white font-bold text-sm mt-0.5">
                        ${getPublicChargingRate(resolvedState).toFixed(2)}<span className="text-[var(--text-muted)] font-normal text-xs">/kWh</span>
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">DC fast-charge est.</p>
                    </div>
                  </div>

                  {/* Charging style selector */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">Where do you primarily charge?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'home',   label: '100% Home',     sub: 'Garage / driveway' },
                        { value: 'mixed',  label: 'Home + Public', sub: '~80% home / 20% DCFC' },
                        { value: 'public', label: 'All Public',    sub: 'No home charger' },
                      ].map(opt => (
                        <button key={opt.value}
                          onClick={() => setChargingStyle(opt.value)}
                          className="rounded-lg border px-2 py-2.5 text-center transition-all"
                          style={{
                            borderColor: chargingStyle === opt.value ? 'rgba(96,200,255,0.6)' : 'var(--border)',
                            background:  chargingStyle === opt.value ? 'rgba(96,200,255,0.12)' : 'transparent',
                          }}>
                          <p className="text-xs font-semibold"
                            style={{ color: chargingStyle === opt.value ? '#60c8ff' : 'white' }}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Effective blended rate — editable */}
                  <div className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: 'rgba(96,200,255,0.07)' }}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-[var(--text-muted)]">Effective kWh rate</span>
                      {!customFuelPrice && chargingStyle === 'mixed' && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          (${(STATE_ELEC_RATES[resolvedState] ?? 0.16).toFixed(2)} × 80% + ${getPublicChargingRate(resolvedState).toFixed(2)} × 20%)
                        </span>
                      )}
                      {customFuelPrice && (
                        <button
                          className="text-[10px] text-left underline"
                          style={{ color: 'rgba(96,200,255,0.6)' }}
                          onClick={() => setCustomFuelPrice('')}>
                          reset to auto
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-sm font-bold" style={{ color: '#60c8ff' }}>$</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-20 text-sm font-bold text-right bg-transparent border-b focus:outline-none"
                        style={{ color: '#60c8ff', borderColor: customFuelPrice ? '#60c8ff' : 'rgba(96,200,255,0.3)' }}
                        placeholder={getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)}
                        value={customFuelPrice}
                        onChange={e => setCustomFuelPrice(e.target.value)}
                      />
                      <span className="text-sm font-bold" style={{ color: '#60c8ff' }}>/kWh</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed inputs panel — detailed mode only */}
              {!simpleMode && resolvedState && detailedMode && !customCosts && (
                <div className="rounded-xl border p-4 flex flex-col gap-5"
                  style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.02)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                    Detailed Parameters
                  </p>

                  {/* Custom fuel/electricity price */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">
                      {effIsEV ? 'Override Electricity Rate ($/kWh)' : 'Fuel Price ($/gallon)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">$</span>
                        <input
                          type="number"
                          className="input-field pl-7"
                          placeholder={effIsEV
                            ? `${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)} (${{ home: 'home', mixed: 'blended', public: 'public DCFC' }[chargingStyle]})`
                            : `${((STATE_FUEL_PRICES[resolvedState] ?? 3.50) + (isPremium ? PREMIUM_PRICE_DELTA : 0)).toFixed(2)} (${resolvedState} ${isPremium ? 'premium' : 'regular'} avg)`}
                          value={customFuelPrice}
                          onChange={e => setCustomFuelPrice(e.target.value)}
                          step={effIsEV ? 0.001 : 0.05}
                          min={0}
                        />
                      </div>
                      {customFuelPrice && (
                        <button onClick={() => setCustomFuelPrice('')}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0">
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {effIsEV
                        ? `Leave blank to use charging-style rate ($${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)}/kWh)`
                        : `Leave blank to use ${resolvedState} ${isPremium ? 'premium' : 'regular'} avg ($${((STATE_FUEL_PRICES[resolvedState] ?? 3.50) + (isPremium ? PREMIUM_PRICE_DELTA : 0)).toFixed(2)}/gal)`}
                    </p>
                  </div>

                  {/* Multi-car policy toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Multi-Car Policy</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        ~15% discount · insuring 2+ vehicles on same policy
                      </p>
                    </div>
                    <button
                      onClick={() => setMultiCarPolicy(m => !m)}
                      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                      style={{ background: multiCarPolicy ? 'var(--accent)' : 'var(--border)' }}>
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                        style={{ left: multiCarPolicy ? '22px' : '2px', background: multiCarPolicy ? '#000' : '#555' }}
                      />
                    </button>
                  </div>

                </div>
              )}

              {resolvedState && !customCosts && (() => {
                const activeElecRate = customFuelPrice
                  ? parseFloat(customFuelPrice)
                  : getEffectiveElecRate(resolvedState, chargingStyle)
                const chargingStyleLabel = { home: 'home', mixed: 'home+public', public: 'public DCFC' }[chargingStyle]
                const effectiveGasPrice = (STATE_FUEL_PRICES[resolvedState] ?? 3.50) + (isPremium ? PREMIUM_PRICE_DELTA : 0)
                const fuelNote = effIsEV
                  ? `$${activeElecRate.toFixed(3)}/kWh · ${customFuelPrice ? 'custom' : chargingStyleLabel}`
                  : `${(customFuelPrice && detailedMode) ? `$${customFuelPrice}` : `$${STATE_FUEL_PRICES[resolvedState] ?? 3.50}`}/gal`
                const insNote = `${resolvedState} · ${selMake || 'avg'}${detailedMode && multiCarPolicy ? ' · multi-car' : ''}`
                const maintNote = detailedMode
                  ? (effIsEV ? 'EV · itemized' : 'gas · itemized')
                  : (effIsEV ? 'EV avg' : 'gas avg')
                const maintenanceSegment = selMake
                  ? classifySegment(selMake, selModel||'')
                  : (catInfoForRender?.segment ?? 'sedan')

                return (
                  <div className="rounded-xl border divide-y"
                    style={{ borderColor:'var(--border)', background:'var(--surface)' }}>
                    {[
                      { key: 'ins',  label: 'Insurance',                                   value: annualInsurance,    note: insNote },
                      { key: 'fuel', label: effIsEV ? 'Charging' : 'Fuel',                  value: annualFuel,         note: fuelNote },
                      { key: 'maint',label: 'Maintenance & Repairs',                        value: annualMaintenance,  note: maintNote },
                      { key: 'reg',  label: 'Registration & Fees',                          value: annualRegistration, note: `${resolvedState} DMV` },
                    ].map(({ key, label, value, note }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <span className="text-sm text-white">{label}</span>
                            <span className="ml-2 text-[10px] text-[var(--text-muted)]">{note}</span>
                          </div>
                          <span className="font-display font-semibold text-white text-sm">{formatCurrency(value)}/yr</span>
                        </div>
                        {key === 'maint' && detailedMode && (
                          <MaintenanceBreakdown
                            isEV={effIsEV}
                            annualMileage={annualMileage}
                            segment={maintenanceSegment}
                            make={selMake}
                            startMileage={effectiveStartMileage}
                            model={selModel}
                            modelYear={selYear}
                            trim={selTrim}
                          />
                        )}
                        {key === 'maint' && !detailedMode && !simpleMode && resolvedState && (
                          <div className="px-4 pb-3 text-[11px] text-[var(--text-muted)] leading-relaxed"
                            style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                            Segment average — costs vary by vehicle age, mileage, and brand.{' '}
                            {detailedFreeLeft > 0 || isSubscribed
                              ? <button
                                  onClick={async () => { if (!(await checkDetailedLimit())) return; setDetailedMode(true) }}
                                  className="underline hover:text-[var(--accent)] transition-colors">
                                  Use Detailed for itemized estimates.
                                </button>
                              : <a href="/subscribe" className="underline hover:text-[var(--accent)] transition-colors">
                                  Unlock Detailed for itemized estimates.
                                </a>
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {resolvedState && customCosts && (
                <>
                  <div className="flex flex-col gap-1">
                    <SliderInput label="Insurance" value={annualInsurance} onChange={setAnnualInsurance}
                      min={500} max={6000} step={100} prefix="$" suffix="/yr" />
                    <p className="text-[10px] text-[var(--text-muted)] pl-1">
                      {selYear
                        ? <>Est. current value <span className="text-white">{formatCurrency(estimatedCarValue)}</span>
                            {' '}({carAge === 0 ? 'new' : `${carAge}yr depreciation`} · {classifySegment(selMake||'', selModel||'')} segment)
                          </>
                        : `${resolvedState} base rate · adjust for your coverage level`
                      }
                    </p>
                  </div>
                  {/* Rate input so user can drive the annual cost from $/kWh or $/gal */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="input-label">
                        {effIsEV ? 'Electricity Rate ($/kWh)' : 'Gas Price ($/gallon)'}
                      </label>
                      {customFuelPrice && (
                        <button
                          onClick={() => {
                            setCustomFuelPrice('')
                            const defaultRate = effIsEV ? getEffectiveElecRate(resolvedState, chargingStyle) : null
                            setAnnualFuel(computeAnnualFuel(
                              effIsEV,
                              modelData?.mpg?.combined ?? (catInfoForRender?.mpg ?? 28),
                              modelData?.mpg?.mpge_combined ?? (catInfoForRender?.mpge ?? null),
                              resolvedState,
                              annualMileage,
                              defaultRate
                            ))
                          }}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">$</span>
                      <input
                        type="number"
                        className="input-field pl-7"
                        placeholder={effIsEV
                          ? `${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)} (${resolvedState} avg)`
                          : `${((STATE_FUEL_PRICES[resolvedState] ?? 3.50) + (isPremium ? PREMIUM_PRICE_DELTA : 0)).toFixed(2)} (${resolvedState}${isPremium ? ' premium' : ''} avg)`}
                        value={customFuelPrice}
                        onChange={e => {
                          const val = e.target.value
                          setCustomFuelPrice(val)
                          if (val !== '') {
                            const rate = parseFloat(val)
                            if (!isNaN(rate)) {
                              setAnnualFuel(computeAnnualFuel(
                                effIsEV,
                                modelData?.mpg?.combined ?? (catInfoForRender?.mpg ?? 28),
                                modelData?.mpg?.mpge_combined ?? (catInfoForRender?.mpge ?? null),
                                resolvedState,
                                annualMileage,
                                rate
                              ))
                            }
                          }
                        }}
                        step={effIsEV ? 0.001 : 0.05}
                        min={0}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {effIsEV
                        ? `Leave blank to use ${resolvedState} avg ($${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)}/kWh)`
                        : `Leave blank to use ${resolvedState} ${isPremium ? 'premium' : ''} avg ($${((STATE_FUEL_PRICES[resolvedState] ?? 3.50) + (isPremium ? PREMIUM_PRICE_DELTA : 0)).toFixed(2)}/gal)`}
                    </p>
                  </div>
                  <SliderInput label={effIsEV ? 'Annual Charging Cost' : 'Annual Fuel Cost'} value={annualFuel} onChange={setAnnualFuel}
                    min={0} max={6000} step={50} prefix="$" suffix="/yr" />
                  <div>
                    <SliderInput label="Maintenance &amp; Repairs" value={annualMaintenance} onChange={setAnnualMaintenance}
                      min={0} max={5000} step={50} prefix="$" suffix="/yr" />
                    {detailedMode && (
                      <div className="mt-3 rounded-xl border overflow-hidden"
                        style={{ borderColor: 'var(--border)' }}>
                        <MaintenanceBreakdown
                          isEV={modelData?.is_ev ?? false}
                          annualMileage={annualMileage}
                          segment={classifySegment(selMake||'', selModel||'')}
                          make={selMake}
                          startMileage={effectiveStartMileage}
                          model={selModel}
                          modelYear={selYear}
                          trim={selTrim}
                        />
                      </div>
                    )}
                  </div>
                  <SliderInput label="Registration &amp; Fees" value={annualRegistration} onChange={setAnnualRegistration}
                    min={0} max={2000} step={25} prefix="$" suffix="/yr" />
                </>
              )}
            </div>

            {/* ── Results ── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">

              {/* Car visual + specs */}
              {selModel && modelData ? (
                <div className="anim-3 flex flex-col gap-4">
                  <CarVisual
                    make={selMake} model={selModel}
                    carType={modelData.type} isEV={modelData.is_ev}
                  />
                  <SpecsPanel specs={modelData.specs} mpg={modelData.mpg} isEV={modelData.is_ev} />
                </div>
              ) : vehicleCategory && (() => {
                const cat = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
                return (
                  <div className="anim-3">
                    <CarVisual
                      make="" model={cat.label}
                      carType={cat.svgType} isEV={cat.isEV}
                    />
                  </div>
                )
              })()}

              {/* ── CURRENT MODE: True cost hero + breakdown ── */}
              {financeMode === 'current' && (() => {
                // Estimate monthly depreciation
                const annualDeprEst = origMsrp
                  ? Math.max(0, price - estimateCurrentValue(origMsrp, selMake||null, selModel||null, carAge + 1))
                  : Math.round(price * 0.12)
                const monthlyDepr = ownPurchasePrice != null && monthsOwned != null && monthsOwned > 0
                  ? Math.round(Math.max(0, ownPurchasePrice - price) / monthsOwned)
                  : Math.round(annualDeprEst / 12)

                const monthlyLoan  = results.monthlyPayment
                const monthlyIns   = Math.round(annualInsurance    / 12)
                const monthlyFuel  = Math.round(annualFuel         / 12)
                const monthlyMaint = Math.round(annualMaintenance  / 12)
                const monthlyReg   = Math.round(annualRegistration / 12)
                const monthlyOps   = monthlyIns + monthlyFuel + monthlyMaint + monthlyReg
                const trueMonthlyCash = monthlyLoan + monthlyOps
                const trueMonthlyAll  = trueMonthlyCash + monthlyDepr

                const costPerDay  = Math.round(trueMonthlyAll * 12 / 365)
                const costPerMile = annualMileage > 0
                  ? ((trueMonthlyAll * 12) / annualMileage).toFixed(2)
                  : null

                const segments = [
                  { label: currentVehicleType === 'leased' ? 'Lease payment' : currentVehicleType === 'financed' && currentRemainingBalance > 0 ? 'Loan payment' : null, value: currentVehicleType === 'leased' ? currentLeasePayment : monthlyLoan, color: 'var(--accent)' },
                  { label: 'Depreciation',  value: monthlyDepr,  color: '#f87171' },
                  { label: 'Insurance',     value: monthlyIns,   color: '#60a5fa' },
                  { label: 'Fuel',          value: monthlyFuel,  color: '#f472b6' },
                  { label: 'Maintenance',   value: monthlyMaint, color: '#fb923c' },
                  { label: 'Registration',  value: monthlyReg,   color: '#a78bfa' },
                ].filter(s => s.label !== null && s.value > 0)

                const hiddenMonthly = trueMonthlyAll - monthlyLoan

                return (
                  <div className="flex flex-col gap-4 anim-3">
                    {/* Hero card */}
                    <div className="rounded-xl p-5 flex flex-col gap-3"
                      style={{ background: 'linear-gradient(135deg, rgba(200,255,0,0.08) 0%, rgba(200,255,0,0.03) 100%)', border: '1px solid rgba(200,255,0,0.2)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Your car is costing you
                      </p>
                      <div className="flex items-end gap-3">
                        <span className="font-display font-extrabold text-5xl leading-none" style={{ color: 'var(--accent)' }}>
                          {formatCurrency(trueMonthlyAll)}
                        </span>
                        <span className="text-[var(--text-muted)] text-lg pb-1">/month</span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(costPerDay)}<span className="text-[var(--text-muted)] font-normal">/day</span>
                        </span>
                        {costPerMile && (
                          <span className="text-sm font-semibold text-white">
                            ${costPerMile}<span className="text-[var(--text-muted)] font-normal">/mile</span>
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(trueMonthlyAll * 12)}<span className="text-[var(--text-muted)] font-normal">/year</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                        True economic cost including depreciation. Your cash out-of-pocket is {formatCurrency(trueMonthlyCash)}/mo (loan + operating, no depreciation).
                      </p>
                    </div>

                    {/* "What you see vs. reality" comparison */}
                    {currentVehicleType !== 'paid_off' && hiddenMonthly > 0 && (
                      <div className="rounded-xl border p-4 flex flex-col gap-3"
                        style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f87171' }}>
                          The hidden cost gap
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">{currentVehicleType === 'leased' ? 'Lease payment only' : 'Loan payment only'}</p>
                            <p className="font-display font-bold text-white text-xl">{formatCurrency(currentVehicleType === 'leased' ? currentLeasePayment : monthlyLoan)}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">what you see</p>
                          </div>
                          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)' }}>
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">True monthly cost</p>
                            <p className="font-display font-bold text-xl" style={{ color: 'var(--accent)' }}>{formatCurrency(trueMonthlyAll)}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">full picture</p>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#f87171' }}>
                          Beyond your loan payment, you're spending an additional{' '}
                          <span className="font-bold text-white">{formatCurrency(hiddenMonthly)}/mo</span> on
                          depreciation, insurance, fuel, maintenance, and fees —{' '}
                          <span className="font-bold">{Math.round((hiddenMonthly / trueMonthlyAll) * 100)}% of your true cost</span>.
                        </p>
                      </div>
                    )}

                    {/* Monthly breakdown with visual bars */}
                    <div className="rounded-xl border p-4 flex flex-col gap-3"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Monthly Cost Breakdown
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {segments.map(({ label, value, color }) => {
                          const pct = Math.round((value / trueMonthlyAll) * 100)
                          return (
                            <div key={label}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                                  <span className="text-[var(--text-muted)]">{label}</span>
                                  {label === 'Depreciation' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                                      often missed
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--text-muted)]">{pct}%</span>
                                  <span className="text-white font-semibold tabular-nums w-16 text-right">{formatCurrency(value)}/mo</span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: color }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-[var(--border)] text-sm">
                        <span className="font-bold text-white">Total per month</span>
                        <span className="font-display font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(trueMonthlyAll)}</span>
                      </div>
                    </div>

                    {/* Costs to date — only when purchase history is filled in */}
                    {monthsOwned != null && ownPurchasePrice != null && (() => {
                      const depreciation    = Math.max(0, ownPurchasePrice - price)
                      const origMonthlyPmt  = currentVehicleType === 'leased' ? currentLeasePayment : (calculateLoan({ price: originalLoanAmount || 0, downPayment: 0, loanTermMonths: originalLoanTerm || 1, annualRatePercent: rate, ownershipYears: 100 }).monthlyPayment)
                      const loanPaidAmt     = currentVehicleType === 'paid_off' ? 0 : Math.round(origMonthlyPmt * Math.min(monthsOwned, currentVehicleType === 'leased' ? currentLeaseTerm : originalLoanTerm))
                      const operatingToDate = Math.round(annualOperatingCost * monthsOwned / 12)
                      const totalToDate     = depreciation + loanPaidAmt + operatingToDate
                      const totalFuture     = forecastRows.reduce((s, r) => s + r.total, 0)
                      const ownedLabel      = [
                        yearsOwnedWhole > 0 ? `${yearsOwnedWhole} yr${yearsOwnedWhole !== 1 ? 's' : ''}` : '',
                        monthsOwnedRem  > 0 ? `${monthsOwnedRem} mo` : '',
                      ].filter(Boolean).join(', ') || 'less than 1 month'

                      return (
                        <div className="rounded-xl border p-4 flex flex-col gap-3"
                          style={{ borderColor: 'rgba(96,200,255,0.25)', background: 'rgba(96,200,255,0.04)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60c8ff' }}>
                              What You've Spent So Far
                            </p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                              style={{ color: '#60c8ff', background: 'rgba(96,200,255,0.1)', border: '1px solid rgba(96,200,255,0.2)' }}>
                              {ownedLabel}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 text-sm">
                            {depreciation > 0 && (
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-[var(--text-muted)]">Value lost to depreciation</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {formatCurrency(ownPurchasePrice)} paid → {formatCurrency(price)} today
                                  </span>
                                </div>
                                <span className="font-semibold shrink-0 ml-3" style={{ color: '#f87171' }}>{formatCurrency(depreciation)}</span>
                              </div>
                            )}
                            {loanPaidAmt > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-[var(--text-muted)]">{currentVehicleType === 'leased' ? 'Lease payments made' : 'Loan payments made'}</span>
                                <span className="text-white font-semibold">{formatCurrency(loanPaidAmt)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--text-muted)]">Insurance, fuel, maintenance, fees</span>
                              <span className="text-white font-semibold">{formatCurrency(operatingToDate)}</span>
                            </div>
                            <div className="h-px bg-[var(--border)] my-0.5" />
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">Total spent to date</span>
                              <span className="font-display font-bold text-xl" style={{ color: '#60c8ff' }}>
                                {formatCurrency(totalToDate)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg p-3 flex flex-col gap-1.5"
                            style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[var(--text-muted)]">+ To keep {ownershipYears} more yr{ownershipYears !== 1 ? 's' : ''}</span>
                              <span className="text-white font-semibold">{formatCurrency(totalFuture)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-[var(--border)] pt-1.5">
                              <span className="font-bold text-white">Lifetime total</span>
                              <span className="font-display font-bold text-xl" style={{ color: 'var(--accent)' }}>
                                {formatCurrency(totalToDate + totalFuture)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}

              {/* ── Non-current mode results ── */}
              {financeMode !== 'current' && (() => {
                const basePayment   = financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment
                const monthlyIns    = Math.round(annualInsurance    / 12)
                const monthlyFuel   = Math.round(annualFuel         / 12)
                const monthlyMaint  = Math.round(annualMaintenance  / 12)
                const monthlyReg    = Math.round(annualRegistration / 12)
                const allInMonthly  = Math.round(basePayment) + monthlyIns + monthlyFuel + monthlyMaint + monthlyReg
                const paymentLabel  = financeMode === 'lease' ? 'Lease payment' : isCashPurchase ? null : 'Loan payment'
                const fuelLabel     = effIsEV ? 'Charging' : 'Fuel'
                return (
                  <div className="anim-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                      Your results
                    </p>
                    {/* All-in monthly hero */}
                    <div className="rounded-xl p-5 flex flex-col gap-3 mb-3"
                      style={{ background: 'linear-gradient(135deg,rgba(200,255,0,0.08) 0%,rgba(200,255,0,0.03) 100%)', border: '1px solid rgba(200,255,0,0.25)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                        {isCashPurchase ? 'Est. Monthly Operating Cost' : 'Est. Monthly All-In'}
                      </p>
                      <p className="font-display font-extrabold text-4xl leading-none" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(allInMonthly)}<span className="text-lg font-normal text-[var(--text-muted)] ml-1">/mo</span>
                      </p>
                      <div className="flex flex-col gap-1 pt-1 border-t border-[rgba(200,255,0,0.15)]">
                        {[
                          paymentLabel ? { label: paymentLabel, value: Math.round(basePayment) } : null,
                          { label: 'Insurance',  value: monthlyIns  },
                          { label: fuelLabel,    value: monthlyFuel },
                          { label: 'Maintenance',value: monthlyMaint},
                          { label: 'Reg. & fees',value: monthlyReg  },
                        ].filter(Boolean).map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center text-xs">
                            <span className="text-[var(--text-muted)]">{label}</span>
                            <span className="text-white font-medium tabular-nums">{formatCurrency(value)}/mo</span>
                          </div>
                        ))}
                      </div>
                      {isCashPurchase && (
                        <p className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[rgba(200,255,0,0.15)]">
                          Cash purchase of <span className="text-white font-semibold">{formatCurrency(effectivePrice)}</span> paid upfront — no monthly loan payment.
                        </p>
                      )}
                    </div>
                    {/* Financing-only card — what the dealer quotes (not shown for cash) */}
                    {!isCashPurchase && (
                      <ResultCard
                        label={financeMode === 'lease' ? 'Monthly Lease Payment' : 'Monthly Loan Payment'}
                        value={basePayment}
                        delay={0}
                        note="Financing only — does not include insurance, fuel, or maintenance"
                      />
                    )}
                  </div>
                )
              })()}

              {!simpleMode && financeMode !== 'current' && (
                <div className="grid grid-cols-1 gap-4 anim-5">
                  {financeMode === 'lease' ? (
                    <>
                      <ResultCard label="Total Lease Cost"     value={leaseResults.totalLeaseCost}   delay={60}  />
                      <ResultCard label="Residual Value"       value={leaseResults.residualValue}     delay={120} />
                      <ResultCard label="Lease Cost Per Year"  value={leaseResults.annualLeaseCost}  delay={180} />
                    </>
                  ) : isCashPurchase ? null : (
                    <>
                      <ResultCard
                        label={results.ownershipShorterThanLoan ? `Interest (${ownershipYears}-yr ownership)` : 'Total Interest Paid'}
                        value={results.interestThroughOwnership}
                        delay={60}
                        note={results.ownershipShorterThanLoan ? `Full ${loanTerm}-mo loan: ${formatCurrency(results.totalInterestPaid)} total interest` : null}
                      />
                      <ResultCard label="Total Cost of Loan"   value={results.totalCostOfLoan}    delay={120} />
                      <ResultCard label="Loan Cost Per Year"   value={results.trueAnnualCost}     delay={180} />
                    </>
                  )}
                </div>
              )}

              {/* Annual cost breakdown — skip for current mode (it has its own breakdown above) */}
              {financeMode !== 'current' && <div className="rounded-xl border p-4 flex flex-col gap-3"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Annual Cost Breakdown
                </p>
                <div className="flex flex-col gap-2 text-sm">
                  {[
                    isCashPurchase ? null : { label: financeMode === 'lease' ? 'Lease payments' : 'Loan payments', value: forecastRows[0]?.loanCost ?? (financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost) },
                    { label: 'Insurance',              value: forecastRows[0]?.insurance    ?? annualInsurance },
                    { label: (modelData?.is_ev || VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)?.isEV) ? 'Charging' : 'Fuel', value: annualFuel },
                    { label: 'Maintenance & repairs',  value: forecastRows[0]?.maintenance  ?? annualMaintenance },
                    { label: 'Registration & fees',    value: forecastRows[0]?.registration ?? annualRegistration },
                  ].filter(row => row && row.label !== null).map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">{label}</span>
                      <span className="text-white font-medium">{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-[var(--border)] my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Year 1 total</span>
                    <span className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
                      {formatCurrency(forecastRows[0]?.total ?? totalAnnualCost)}
                    </span>
                  </div>
                  {!simpleMode && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-muted)]">Cost per mile</span>
                      <span className="text-white font-medium tabular-nums">
                        ${((forecastRows[0]?.total ?? totalAnnualCost) / annualMileage).toFixed(2)}/mi
                      </span>
                    </div>
                  )}
                  {/* Segment operating cost context — detailed mode only */}
                  {!simpleMode && (() => {
                    const seg = selMake
                      ? classifySegment(selMake || '', selModel || '')
                      : (VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)?.segment ?? null)
                    const avg = seg ? SEGMENT_OP_COST_AVG[seg] : null
                    if (!avg) return null
                    const diff = annualOperatingCost - avg
                    const pct = Math.round(Math.abs(diff) / avg * 100)
                    const segLabel = seg.replace('_', ' ')
                    if (pct < 5) return (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">vs. avg {segLabel} operating cost</span>
                        <span className="text-green-400 font-medium">≈ on par</span>
                      </div>
                    )
                    return (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">vs. avg {segLabel} operating cost</span>
                        <span className={`font-medium ${diff > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {diff > 0 ? `+${pct}% above avg` : `${pct}% below avg`}
                        </span>
                      </div>
                    )
                  })()}
                  {!simpleMode && forecastRows.length > 1 && (() => {
                    const totals = forecastRows.map(r => r.total)
                    const lo = Math.min(...totals)
                    const hi = Math.max(...totals)
                    return lo !== hi ? (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Annual range (yr 1–{forecastRows.length})</span>
                        <span className="text-[var(--text-muted)] font-medium tabular-nums">
                          {formatCurrency(lo)} – {formatCurrency(hi)}
                        </span>
                      </div>
                    ) : null
                  })()}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-muted)]">
                      {financeMode === 'current'
                        ? `Total cost to keep ${ownershipYears} yr${ownershipYears !== 1 ? 's' : ''}`
                        : `Total over ${financeMode === 'lease' ? `${leaseTerm} mo lease` : `${ownershipYears} yr${ownershipYears !== 1 ? 's' : ''}`}`}
                    </span>
                    <span className="text-[var(--text-muted)] font-medium">
                      {formatCurrency(financeMode === 'lease'
                        ? leaseResults.totalLeaseCost + annualOperatingCost * (leaseTerm / 12)
                        : forecastRows.reduce((s, r) => s + r.total, 0))}
                    </span>
                  </div>
                </div>
              </div>}

              {/* Affordability check — 20/4/10 rule income bands — detailed mode only */}
              {!simpleMode && (() => {
                const year1Total = forecastRows[0]?.total ?? totalAnnualCost
                const req10 = year1Total / 0.10
                const req15 = year1Total / 0.15
                const req20 = year1Total / 0.20
                // Determine which band the user is likely in (no income input, so show all 3)
                return (
                  <div className="rounded-xl border p-4 flex flex-col gap-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Income Required (20/4/10 rule)
                      </p>
                      <a href="/salary" className="text-[10px] font-semibold"
                        style={{ color: 'var(--accent)' }}>
                        Full analysis →
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Conservative', sub: '10% of income', value: req10, color: '#f87171' },
                        { label: 'Comfortable',  sub: '15% of income', value: req15, color: '#FFB800' },
                        { label: 'Aggressive',   sub: '20% of income', value: req20, color: '#4ade80' },
                      ].map(({ label, sub, value, color }) => (
                        <div key={label} className="rounded-lg px-2 py-2.5 text-center"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mb-1">{sub}</p>
                          <p className="text-white font-bold text-xs tabular-nums">{formatCurrency(value)}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">/yr gross</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      Based on your Year 1 all-in cost of <span className="text-white">{formatCurrency(year1Total)}</span>.
                      The 10% band is the safest; above 20% strains most budgets.
                    </p>
                  </div>
                )
              })()}

              {/* Summary */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                style={{ background:'rgba(255,184,0,0.04)', borderColor:'rgba(255,184,0,0.15)', color:'var(--text-muted)' }}>
                <span className="text-[var(--accent)] font-semibold">The real picture: </span>
                {financeMode === 'lease' ? (
                  <>
                    Over your {leaseTerm}-month lease, payments total{' '}
                    <span className="text-white font-semibold">
                      {formatCurrency(leaseResults.monthlyPayment * leaseTerm)}
                    </span>{' '}
                    — you don&apos;t own the vehicle at the end. Add insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in Year 1 cost is {formatCurrency(forecastRows[0]?.total ?? totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(leaseResults.totalLeaseCost + annualOperatingCost * (leaseTerm / 12))} over the full lease.
                  </>
                ) : financeMode === 'current' ? (
                  <>
                    {currentVehicleType === 'financed' && currentRemainingBalance > 0 ? (
                      <>
                        You still owe <span className="text-white font-semibold">{formatCurrency(currentRemainingBalance)}</span> at{' '}
                        {rate}% — that&apos;s <span className="text-white font-semibold">{formatCurrency(results.monthlyPayment)}/mo</span> for{' '}
                        {currentRemainingTerm} months. Add{' '}
                      </>
                    ) : currentVehicleType === 'leased' ? (
                      <>You have {currentLeaseRemainingMonths} months left on your lease at {formatCurrency(currentLeasePayment)}/mo. Add </>
                    ) : (
                      <>Your vehicle is paid off. Add </>
                    )}
                    insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in Year 1 cost is {formatCurrency(forecastRows[0]?.total ?? totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(forecastRows.reduce((s, r) => s + r.total, 0))} to keep it for {ownershipYears} more year{ownershipYears !== 1 ? 's' : ''}.
                  </>
                ) : isCashPurchase ? (
                  <>
                    You're paying <span className="text-white font-semibold">{formatCurrency(effectivePrice)} cash</span> upfront — no loan, no interest.
                    Add insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in Year 1 cost is {formatCurrency(forecastRows[0]?.total ?? totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(forecastRows.reduce((s, r) => s + r.total, 0))} over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}.
                  </>
                ) : (
                  <>
                    Over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}, loan payments total{' '}
                    <span className="text-white font-semibold">
                      {formatCurrency(results.monthlyPayment * Math.min(ownershipYears * 12, loanTerm))}
                    </span>{' '}
                    ({formatCurrency(results.interestThroughOwnership)} in interest
                    {results.ownershipShorterThanLoan && <span className="text-amber-400/80"> — remaining balance paid off at sale</span>}
                    ). Add insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in Year 1 cost is {formatCurrency(forecastRows[0]?.total ?? totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(forecastRows.reduce((s, r) => s + r.total, 0))} over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}.
                  </>
                )}
              </div>

              {/* ── Net Cost of Ownership — detailed mode only ── */}
              {!simpleMode && (financeMode === 'buy' || financeMode === 'current') && futureResaleValue != null && netCostOfOwnership != null && (
                <div className="rounded-xl border p-4 flex flex-col gap-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Net Cost of Ownership
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Total paid over {ownershipYears} yr{ownershipYears !== 1 ? 's' : ''}</span>
                      <span className="text-white font-medium">{formatCurrency(totalOwnershipPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">
                        Est. resale value ({carAge + ownershipYears}yr old {selMake})
                      </span>
                      <span className="text-white font-medium">− {formatCurrency(futureResaleValue)}</span>
                    </div>
                    <div className="h-px bg-[var(--border)] my-0.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold">Net out-of-pocket</span>
                      <span className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(netCostOfOwnership)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    You can sell the vehicle at the end of ownership. This is your true economic cost — lower than total payments because the car retains value.
                  </p>
                </div>
              )}

              {/* ── Lease vs. Buy head-to-head (Pro) — shown in buy & lease modes ── */}
              {(financeMode === 'buy' || financeMode === 'lease') && (
                <LeaseVsBuy
                  isPro={isSubscribed}
                  data={leaseVsBuy}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* ── 5-Year Ownership Forecast (Pro) ── */}
              <FiveYearForecast
                isPro={isSubscribed}
                financeMode={financeMode}
                rows={forecastRows}
                formatCurrency={formatCurrency}
              />

              {/* ── Export Report — detailed mode only ── */}
              {!simpleMode && <div className="flex gap-2">
                <button
                  onClick={() => {
                    const meta = {
                      vehicle: [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ') || vehicleCategory || 'Unknown vehicle',
                      price, downPayment, financeMode, loanTerm, rate, leaseTerm, leaseApr, residualPct,
                      annualMileage, startMileage: effectiveStartMileage,
                      location: locationLabel || resolvedState || 'Not set',
                      ownershipYears,
                      salesTax: salesTaxAmt, docFee: effectiveDocFee, outTheDoor: effectivePrice,
                    }
                    downloadCSV(buildCSV(forecastRows, meta), 'tco-summary.csv')
                  }}
                  className="flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                >
                  Export Summary CSV
                </button>
                {maintenanceDetail && (
                  <button
                    onClick={() => {
                      const meta = {
                        vehicle: [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ') || vehicleCategory || 'Unknown vehicle',
                        price, downPayment, financeMode, loanTerm, rate, leaseTerm, leaseApr, residualPct,
                        annualMileage, startMileage: effectiveStartMileage,
                        location: locationLabel || resolvedState || 'Not set',
                        ownershipYears,
                      }
                      downloadCSV(buildDetailedCSV(forecastRows, maintenanceDetail, meta), 'tco-detailed.csv')
                    }}
                    className="flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                  >
                    Export Detailed Maintenance CSV
                  </button>
                )}
              </div>}

              {/* ── Repair & Reliability Risk Score (Pro) ── */}
              <RepairRiskScore
                isPro={isSubscribed}
                make={selMake}
                model={selModel}
                isEV={modelData?.is_ev ?? false}
                maintBrandMult={MAINT_BRAND_MULT}
                determineTier={determineMaintTier}
              />

              {/* ── Alerts for Better Alternatives (Pro) ── */}
              <CostAlerts
                isPro={isSubscribed}
                make={selMake}
                model={selModel}
                isEV={modelData?.is_ev ?? false}
                totalAnnualCost={totalAnnualCost}
                annualMaintenance={annualMaintenance}
                maintBrandMult={MAINT_BRAND_MULT}
                classifySegment={classifySegment}
                formatCurrency={formatCurrency}
                loanAmount={results.loanAmount}
                price={price}
                rate={rate}
                financeMode={financeMode}
              />

              {/* ── PDF Export (Pro) ── */}
              {isSubscribed ? (
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  ⬇ Export PDF Report
                </button>
              ) : (
                <div className="rounded-xl border px-4 py-2.5 flex items-center justify-between text-xs"
                  style={{ borderColor: 'var(--border)' }}>
                  <span className="flex items-center gap-2 text-[var(--text-muted)]">
                    🔒 PDF Report Export
                  </span>
                  <a href="/subscribe" className="font-semibold" style={{ color: 'var(--accent)' }}>
                    Unlock Pro →
                  </a>
                </div>
              )}

              {/* Add to Comparison */}
              <button
                onClick={handleAddToComparison}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                <span>＋</span> Add to Multi-Vehicle Comparison
              </button>

              {comparisonCount > 0 && (
                <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs"
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
              {!isSubscribed && detailedCalcCount >= FREE_DETAILED_LIMIT && (
                <div className="rounded-xl border px-4 py-3 text-center text-xs"
                  style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.04)' }}>
                  {bonusCreditsLeft > 0 ? (
                    <span className="text-[var(--text-muted)]">
                      You have <span className="font-semibold" style={{ color: 'var(--accent)' }}>{bonusCreditsLeft} bonus detailed {bonusCreditsLeft === 1 ? 'analysis' : 'analyses'}</span> left from your email unlock.{' '}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">You've used all your free detailed analyses. </span>
                  )}
                  <a href="/subscribe" className="text-[var(--accent)] hover:underline font-semibold">
                    Get the $19 pass for unlimited access →
                  </a>
                </div>
              )}
            </div>

          </div>

          <ProUpsell
            headline="Found a candidate? Now stress-test the whole deal."
            body="One $19 pass covers your entire car search — unlimited detailed breakdowns, lease vs. buy,
              side-by-side comparison of every car on your shortlist, and money-pit flags before you sign.
              When you're done, we go away. No subscription."
          />
        </div>
      </main>
      <NextStep
        tag="Next step · pick a winner"
        title="Weighing a few cars? Put them head to head."
        body="Stack up to 5 vehicles side by side and get one clear financial winner — category by category — so your shortlist comes down to facts, not gut feel."
        to="/compare"
        cta="Compare your finalists"
      />
      <Footer />
    </div>
  )
}
