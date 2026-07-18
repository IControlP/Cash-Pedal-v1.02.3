import { useState, useMemo, useEffect, useRef } from 'react'
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage'
import { safeUUID } from '../utils/safeId'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import NextStep from '../components/NextStep'
import PaywallModal from '../components/PaywallModal'
import { useSubscription } from '../hooks/useSubscription'
import { useBonusCredits } from '../hooks/useBonusCredits'
import { trackUsage } from '../utils/usage'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtMpg(n) {
  return n != null ? `${n} MPG` : '—'
}

function fmtCargo(n) {
  return n != null ? `${n} cu ft` : '—'
}

function fmtRetention(n) {
  return n != null ? `${n}%` : '—'
}

// Coerce anything (user input, restored localStorage) to a finite number.
function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function calcLoan({ price, downPayment, loanTermMonths, annualRatePercent, ownershipYears }) {
  const safePrice = Math.max(0, num(price))
  const loanAmount = Math.max(0, safePrice - Math.min(Math.max(0, num(downPayment)), safePrice))
  const r = num(annualRatePercent) / 12 / 100
  const n = Math.max(1, num(loanTermMonths, 60))
  const years = Math.max(1, num(ownershipYears, 5))
  const monthlyPayment = r === 0
    ? loanAmount / n
    : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPaid    = monthlyPayment * n
  const totalInterest = totalPaid - loanAmount
  const effectiveMonths = Math.min(years * 12, n)
  const annualCost   = (monthlyPayment * effectiveMonths) / years
  return { loanAmount, monthlyPayment, totalInterest, totalCostOfLoan: totalPaid, annualCost }
}

const COLORS = ['var(--accent)', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa']

// Default blank vehicle (manually entered — no TCO data)
const defaultVehicle = {
  name: '', price: 30000, downPayment: 5000, loanTerm: 60, rate: 6.5, ownershipYears: 5,
  isLease: false, leaseMonthlyPayment: 0, leaseTerm: 36,
  // Extended fields (null = not available for this entry)
  totalAnnualCost: null, totalOwnershipCost: null, costPerMile: null,
  mpgCombined: null, cargoSqFt: null, valueRetentionPct: null,
  isFromTCO: false,
}

// Nullable extended fields: keep only finite numbers, otherwise null.
function numOrNull(value) {
  const n = Number(value)
  return value != null && Number.isFinite(n) ? n : null
}

// Normalize a vehicle restored from localStorage (or imported from another
// tool) so missing/corrupted fields can never produce NaN in the math or
// crash a render. Every vehicle gets a stable uid for React keys.
function sanitizeVehicle(raw) {
  const v = raw && typeof raw === 'object' ? raw : {}
  return {
    ...defaultVehicle,
    uid:            typeof v.uid === 'string' && v.uid ? v.uid : safeUUID(),
    tcoId:          typeof v.tcoId === 'string' ? v.tcoId : undefined,
    name:           typeof v.name === 'string' ? v.name : '',
    price:          Math.max(0, num(v.price, defaultVehicle.price)),
    downPayment:    Math.max(0, num(v.downPayment, defaultVehicle.downPayment)),
    loanTerm:       Math.max(1, num(v.loanTerm, defaultVehicle.loanTerm)),
    rate:           Math.max(0, num(v.rate, defaultVehicle.rate)),
    ownershipYears: Math.max(1, num(v.ownershipYears, defaultVehicle.ownershipYears)),
    isLease:        v.isLease === true,
    leaseMonthlyPayment: Math.max(0, num(v.leaseMonthlyPayment, 0)),
    leaseTerm:      Math.max(1, num(v.leaseTerm, defaultVehicle.leaseTerm)),
    totalAnnualCost:    numOrNull(v.totalAnnualCost),
    totalOwnershipCost: numOrNull(v.totalOwnershipCost),
    costPerMile:        numOrNull(v.costPerMile),
    mpgCombined:        numOrNull(v.mpgCombined),
    cargoSqFt:          numOrNull(v.cargoSqFt),
    valueRetentionPct:  numOrNull(v.valueRetentionPct),
    isFromTCO:      v.isFromTCO === true,
    touched:        v.touched === true,
  }
}

// A "blank placeholder" is a manually-added slot the user never customized —
// still auto-named ("Vehicle N" or empty) with every input at its default.
// These get replaced (not stacked next to) vehicles imported from the TCO
// or Affordability pages.
function isBlankPlaceholder(v) {
  if (v.isFromTCO || v.tcoId || v.touched) return false
  if (v.name !== '' && !/^Vehicle \d+$/.test(v.name)) return false
  return v.price === defaultVehicle.price
    && v.downPayment === defaultVehicle.downPayment
    && v.loanTerm === defaultVehicle.loanTerm
    && v.rate === defaultVehicle.rate
    && v.ownershipYears === defaultVehicle.ownershipYears
    && v.isLease === defaultVehicle.isLease
    && v.mpgCombined == null
    && v.cargoSqFt == null
}

// ── Ranking parameters available to the user ──────────
const RANK_PARAMS = [
  { key: 'totalOutOfPocket', label: 'Most Affordable (Total Out-of-Pocket)', lowerIsBetter: true },
  { key: 'mpgCombined',      label: 'Best MPG',                               lowerIsBetter: false },
  { key: 'cargoSqFt',        label: 'Most Cargo Space',                       lowerIsBetter: false },
  { key: 'valueRetentionPct',label: 'Best Value Retention',                   lowerIsBetter: false },
]

// ── VehicleCard ────────────────────────────────────────
function VehicleCard({ vehicle, index, onChange, onRemove, canRemove, color }) {
  // Slider fill percentage — guard the degenerate range (e.g. price of $0
  // makes the down-payment slider's min === max) so we never emit NaN CSS.
  const pct = (val, min, max) => max > min ? Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)) : 0

  return (
    <div className="card flex flex-col gap-4" style={{ borderColor: color, borderWidth: '1px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <input
          type="text"
          value={vehicle.name}
          onChange={e => onChange({ ...vehicle, name: e.target.value })}
          placeholder={`Vehicle ${index + 1}`}
          className="input-field text-sm py-1.5 flex-1 mx-2"
        />
        {canRemove && (
          <button onClick={onRemove}
            aria-label="Remove vehicle"
            className="text-[var(--text-muted)] hover:text-red-400 active:opacity-70 transition-colors text-lg leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-500/10">
            ×
          </button>
        )}
      </div>

      {/* TCO-imported / lease badges */}
      {(vehicle.isFromTCO || vehicle.isLease) && (
        <div className="flex items-center gap-1.5 -mt-2 flex-wrap">
          {vehicle.isFromTCO && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{ color: 'var(--accent)', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)' }}>
              Imported
            </span>
          )}
          {vehicle.isLease && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}>
              Lease
            </span>
          )}
        </div>
      )}

      {/* Buy / Lease toggle — only shown for non-TCO vehicles */}
      {!vehicle.isFromTCO && (
        <div className="flex gap-1 p-1 rounded-lg"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {[
            { value: false, label: 'Buy / Finance' },
            { value: true,  label: 'Lease' },
          ].map(opt => (
            <button key={String(opt.value)}
              onClick={() => onChange({ ...vehicle, isLease: opt.value })}
              aria-pressed={vehicle.isLease === opt.value}
              className="flex-1 py-2 rounded-md text-xs font-semibold transition-all min-h-[40px] active:opacity-70"
              style={{
                background: vehicle.isLease === opt.value ? color : 'transparent',
                color:      vehicle.isLease === opt.value ? '#000' : 'var(--text-muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-px bg-[var(--border)]" />

      {/* Price / MSRP */}
      <div>
        <label className="input-label">{vehicle.isLease ? 'MSRP' : 'Price'}</label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
          <input type="number" value={vehicle.price}
            onChange={e => onChange({ ...vehicle, price: num(e.target.value) })}
            className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
        </div>
        <input type="range" min={5000} max={500000} step={500} value={vehicle.price}
          onChange={e => onChange({ ...vehicle, price: num(e.target.value) })}
          style={{ background: `linear-gradient(to right, ${color} ${pct(vehicle.price, 5000, 500000)}%, var(--border) ${pct(vehicle.price, 5000, 500000)}%)` }} />
      </div>

      {vehicle.isLease ? (
        <>
          {/* Lease monthly payment */}
          <div>
            <label className="input-label">Monthly Lease Payment</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
              <input type="number" min={0} value={vehicle.leaseMonthlyPayment ?? 0}
                onChange={e => onChange({ ...vehicle, leaseMonthlyPayment: num(e.target.value) })}
                className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
            </div>
            <input type="range" min={0} max={3000} step={25}
              value={vehicle.leaseMonthlyPayment ?? 0}
              onChange={e => onChange({ ...vehicle, leaseMonthlyPayment: num(e.target.value) })}
              style={{ background: `linear-gradient(to right, ${color} ${pct(vehicle.leaseMonthlyPayment ?? 0, 0, 3000)}%, var(--border) ${pct(vehicle.leaseMonthlyPayment ?? 0, 0, 3000)}%)` }} />
          </div>

          {/* Lease term */}
          <div>
            <label className="input-label">Lease Term</label>
            <select value={vehicle.leaseTerm ?? 36}
              onChange={e => onChange({ ...vehicle, leaseTerm: num(e.target.value) })}
              className="input-field text-sm py-2">
              {[24, 36, 39, 48].map(m => <option key={m} value={m}>{m} mo</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          {/* Down payment */}
          <div>
            <label className="input-label">Down Payment</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
              <input type="number" value={vehicle.downPayment}
                onChange={e => onChange({ ...vehicle, downPayment: Math.min(num(e.target.value), vehicle.price) })}
                className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
            </div>
            <input type="range" min={0} max={vehicle.price} step={500}
              value={Math.min(vehicle.downPayment, vehicle.price)}
              onChange={e => onChange({ ...vehicle, downPayment: num(e.target.value) })}
              style={{ background: `linear-gradient(to right, ${color} ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, vehicle.price)}%, var(--border) ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, vehicle.price)}%)` }} />
          </div>

          {/* Loan term + rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Loan Term</label>
              <select value={vehicle.loanTerm}
                onChange={e => onChange({ ...vehicle, loanTerm: num(e.target.value) })}
                className="input-field text-sm py-2">
                {[24,36,48,60,72,84].map(m => <option key={m} value={m}>{m} mo</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Rate (%)</label>
              <input type="number" value={vehicle.rate} min={0} max={25} step={0.1}
                onChange={e => onChange({ ...vehicle, rate: num(e.target.value) })}
                className="input-field text-sm py-2" />
            </div>
          </div>

          {/* Ownership */}
          <div>
            <label className="input-label">Own for (years)</label>
            <select value={vehicle.ownershipYears}
              onChange={e => onChange({ ...vehicle, ownershipYears: num(e.target.value) })}
              className="input-field text-sm py-2">
              {[1,2,3,4,5,7,10].map(y => <option key={y} value={y}>{y} yr{y > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Optional extra fields — always editable */}
      <div className="h-px bg-[var(--border)]" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        Extra fields for ranking
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">MPG</label>
          <input type="number" min={0} max={200} step={1}
            value={vehicle.mpgCombined ?? ''}
            placeholder="e.g. 32"
            onChange={e => onChange({ ...vehicle, mpgCombined: e.target.value === '' ? null : num(e.target.value) })}
            className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="input-label">Cargo (cu ft)</label>
          <input type="number" min={0} max={200} step={0.1}
            value={vehicle.cargoSqFt ?? ''}
            placeholder="e.g. 15.1"
            onChange={e => onChange({ ...vehicle, cargoSqFt: e.target.value === '' ? null : num(e.target.value) })}
            className="input-field text-sm py-2" />
        </div>
      </div>
    </div>
  )
}

// ── Paywall constants ─────────────────────────────────
const FREE_COMPARE_LIMIT = 5
const LS_COMPARE_COUNT   = 'cashpedal_compare_count'

// ── Main page ─────────────────────────────────────────
export default function MultiVehicleComparison() {
  const { isSubscribed } = useSubscription()
  const { creditsLeft: bonusCreditsLeft, spendCredit } = useBonusCredits()
  const [showPaywall, setShowPaywall] = useState(false)
  // Comparison unlocked for this session via an email-unlock bonus credit
  const [bonusUnlocked, setBonusUnlocked] = useState(false)

  const [compareCount, setCompareCount] = useState(() =>
    parseInt(safeGet(LS_COMPARE_COUNT) || '0', 10)
  )
  // Capture whether this session gets free access before the counter increments
  const freeAccessGranted = useRef(compareCount < FREE_COMPARE_LIMIT)
  const hasAccess = isSubscribed || bonusUnlocked || freeAccessGranted.current

  // Anonymous first-party usage tracking — once per page load
  useEffect(() => { trackUsage('visit_compare', isSubscribed ? 'subscribed' : 'free') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Increment the free-use counter once per page load when free access is granted
  useEffect(() => {
    if (freeAccessGranted.current && !isSubscribed) {
      const next = compareCount + 1
      setCompareCount(next)
      safeSet(LS_COMPARE_COUNT, String(next))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ranking parameter toggles
  const [activeRankParams, setActiveRankParams] = useState({ totalOutOfPocket: true, mpgCombined: false, cargoSqFt: false, valueRetentionPct: false })

  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = JSON.parse(safeGet('cashpedal_comparison_vehicles') || 'null')
      if (Array.isArray(saved)) return saved.slice(0, 5).map(sanitizeVehicle)
    } catch { /* ignore corrupted saved state */ }
    return []
  })

  const [importBanner, setImportBanner] = useState(null) // { count, skipped }

  // Persist vehicles state across navigation
  useEffect(() => {
    safeSet('cashpedal_comparison_vehicles', JSON.stringify(vehicles))
  }, [vehicles])

  // Pull vehicles queued for comparison (TCO Calculator / Affordability page)
  // from localStorage on mount. Imports REPLACE untouched blank placeholder
  // cards instead of stacking next to them; customized entries are kept.
  useEffect(() => {
    const raw = safeGet('cashpedal_tco_for_comparison')
    if (!raw) return
    let imports
    try {
      imports = JSON.parse(raw)
    } catch {
      // Malformed queue — clear it so it can't wedge every future visit
      safeRemove('cashpedal_tco_for_comparison')
      return
    }
    if (!Array.isArray(imports) || imports.length === 0) {
      safeRemove('cashpedal_tco_for_comparison')
      return
    }

    let imported = 0
    let skipped = 0
    // Merge into the mount-time vehicle list (this effect runs exactly once,
    // before any user edits, so the closure value is current).
    const merged = [...vehicles]
    imports.forEach(imp => {
      if (!imp || typeof imp !== 'object') return
      const mapped = sanitizeVehicle({
        ...imp,
        tcoId:     typeof imp.id === 'string' ? imp.id : safeUUID(),
        name:      imp.name || 'Imported Vehicle',
        isFromTCO: true,
        touched:   false,
      })
      // Same vehicle re-added from the source tool → refresh in place
      const existing = merged.findIndex(v => v.tcoId === mapped.tcoId)
      if (existing >= 0) {
        merged[existing] = { ...mapped, uid: merged[existing].uid }
        imported++
        return
      }
      // Fill a blank placeholder slot first, keeping its position
      const blank = merged.findIndex(isBlankPlaceholder)
      if (blank >= 0) {
        merged[blank] = { ...mapped, uid: merged[blank].uid }
        imported++
        return
      }
      if (merged.length < 5) {
        merged.push(mapped)
        imported++
      } else {
        skipped++
      }
    })

    setVehicles(merged)
    setImportBanner({ count: imported, skipped })
    // Clear after loading so a re-visit doesn't re-import
    safeRemove('cashpedal_tco_for_comparison')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() =>
    vehicles.map(v => {
      if (v.isLease) {
        const monthly = v.leaseMonthlyPayment ?? 0
        const term    = v.leaseTerm ?? 36
        return {
          loanAmount:       0,
          monthlyPayment:   monthly,
          totalInterest:    null,
          totalCostOfLoan:  monthly * term,
          annualCost:       monthly * 12,
        }
      }
      return calcLoan({
        price:             v.price,
        downPayment:       Math.min(v.downPayment, v.price),
        loanTermMonths:    v.loanTerm,
        annualRatePercent: v.rate,
        ownershipYears:    v.ownershipYears,
      })
    }), [vehicles])

  // Compute "total out of pocket" for ranking — prefer TCO-sourced if available
  const totalOutOfPocket = useMemo(() =>
    vehicles.map((v, i) =>
      v.totalOwnershipCost != null
        ? v.totalOwnershipCost
        : results[i].totalCostOfLoan
    ), [vehicles, results])

  function updateVehicle(i, v) {
    // Any manual edit marks the card as customized, so a later import from
    // the TCO/Affordability pages won't silently overwrite it.
    setVehicles(vs => vs.map((orig, idx) => idx === i ? { ...v, touched: true } : orig))
  }

  function addVehicle() {
    setVehicles(vs => vs.length >= 5 ? vs : [...vs, { ...defaultVehicle, uid: safeUUID(), name: `Vehicle ${vs.length + 1}` }])
  }

  function removeVehicle(i) {
    setVehicles(vs => vs.filter((_, idx) => idx !== i))
  }

  function restartComparison() {
    safeRemove('cashpedal_comparison_vehicles')
    safeRemove('cashpedal_tco_for_comparison')
    setVehicles([])
    setImportBanner(null)
  }

  function toggleRankParam(key) {
    setActiveRankParams(p => ({ ...p, [key]: !p[key] }))
  }

  // ── Compute best index for each metric ────────────────
  function bestIdx(values, lowerIsBetter) {
    const valid = values.map((v, i) => ({ v, i })).filter(x => x.v != null)
    if (valid.length === 0) return -1
    return (lowerIsBetter
      ? valid.reduce((a, b) => b.v < a.v ? b : a)
      : valid.reduce((a, b) => b.v > a.v ? b : a)
    ).i
  }

  const hasLease = vehicles.some(v => v.isLease)

  const loanMetrics = [
    { key: 'monthlyPayment',  label: hasLease ? 'Monthly Payment / Lease' : 'Monthly Payment', vals: results.map(r => r.monthlyPayment), lowerIsBetter: true },
    { key: 'totalInterest',   label: 'Total Interest',     vals: results.map(r => r.totalInterest),   lowerIsBetter: true,  fmt: v => v != null ? fmt(v) : '—' },
    { key: 'totalCostOfLoan', label: hasLease ? 'Total Cost (Loan/Lease)' : 'Total Cost of Loan', vals: results.map(r => r.totalCostOfLoan), lowerIsBetter: true },
    { key: 'annualCost',      label: hasLease ? 'Annual Cost (Loan/Lease)' : 'Loan Cost / Year',  vals: results.map(r => r.annualCost),      lowerIsBetter: true },
    { key: 'loanAmount',      label: 'Loan Amount',        vals: results.map((r, i) => vehicles[i].isLease ? null : r.loanAmount), lowerIsBetter: null, fmt: v => v != null ? fmt(v) : '—' },
  ]

  // TCO extended metrics (only rows where at least one vehicle has data)
  const hasTCOData     = vehicles.some(v => v.totalAnnualCost != null)
  const hasMpg         = vehicles.some(v => v.mpgCombined != null)
  const hasCargo       = vehicles.some(v => v.cargoSqFt != null)
  const hasRetention   = vehicles.some(v => v.valueRetentionPct != null)
  const hasCostPerMile = vehicles.some(v => v.costPerMile != null)

  const tcoMetrics = [
    hasTCOData     && { key: 'totalAnnualCost',   label: 'All-In Annual Cost',    vals: vehicles.map(v => v.totalAnnualCost),   lowerIsBetter: true,  fmt: v => v != null ? fmt(v) : '—' },
    hasTCOData     && { key: 'totalOwnershipCost', label: 'Total Ownership Cost',  vals: vehicles.map(v => v.totalOwnershipCost), lowerIsBetter: true,  fmt: v => v != null ? fmt(v) : '—' },
    hasCostPerMile && { key: 'costPerMile',        label: 'Cost Per Mile',          vals: vehicles.map(v => v.costPerMile),        lowerIsBetter: true,  fmt: v => v != null ? `$${v.toFixed(2)}/mi` : '—' },
    hasMpg         && { key: 'mpg',               label: 'MPG (Combined)',         vals: vehicles.map(v => v.mpgCombined),       lowerIsBetter: false, fmt: fmtMpg },
    hasCargo       && { key: 'cargo',             label: 'Cargo Space',            vals: vehicles.map(v => v.cargoSqFt),         lowerIsBetter: false, fmt: fmtCargo },
    hasRetention   && { key: 'retention',         label: 'Value Retention',        vals: vehicles.map(v => v.valueRetentionPct), lowerIsBetter: false, fmt: fmtRetention },
  ].filter(Boolean)

  // ── Ranking panel (user-selected parameters) ──────────
  const rankingRows = useMemo(() => {
    const rows = []

    if (activeRankParams.totalOutOfPocket) {
      const best = bestIdx(totalOutOfPocket, true)
      rows.push({
        label: 'Total Out-of-Pocket',
        scores: totalOutOfPocket.map((v, i) => ({
          display:  v != null ? fmt(v) : '—',
          isBest:   i === best,
          hasValue: v != null,
        })),
      })
    }

    if (activeRankParams.mpgCombined) {
      const vals = vehicles.map(v => v.mpgCombined)
      const best = bestIdx(vals, false)
      rows.push({
        label: 'Best MPG',
        scores: vals.map((v, i) => ({ display: fmtMpg(v), isBest: i === best, hasValue: v != null })),
      })
    }

    if (activeRankParams.cargoSqFt) {
      const vals = vehicles.map(v => v.cargoSqFt)
      const best = bestIdx(vals, false)
      rows.push({
        label: 'Most Cargo Space',
        scores: vals.map((v, i) => ({ display: fmtCargo(v), isBest: i === best, hasValue: v != null })),
      })
    }

    if (activeRankParams.valueRetentionPct) {
      const vals = vehicles.map(v => v.valueRetentionPct)
      const best = bestIdx(vals, false)
      rows.push({
        label: 'Best Value Retention',
        scores: vals.map((v, i) => ({ display: fmtRetention(v), isBest: i === best, hasValue: v != null })),
      })
    }

    return rows
  }, [activeRankParams, vehicles, totalOutOfPocket])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {showPaywall && (
        <PaywallModal
          feature="compare"
          usedCount={FREE_COMPARE_LIMIT}
          cancelPath="/compare"
          onUnlocked={async (method) => {
            setShowPaywall(false)
            if (method === 'bonus' && (await spendCredit('compare_unlock'))) setBonusUnlocked(true)
          }}
        />
      )}
      <Navbar />
      <main className="flex-1 pt-20 pb-16">

        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Multi-Vehicle Comparison
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            Which car is actually the best deal?
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-xl">
            Stack up to 5 vehicles side by side — payments, interest, fuel, insurance, maintenance —
            and see which one leaves the most money in your pocket. Add cars straight from the
            TCO Calculator or the Car Recommendation page; everything updates live.
          </p>
        </div>

        {/* ── Pro gate banner ── */}
        {!hasAccess && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
            <div className="rounded-xl border p-6 text-center"
              style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.04)' }}>
              <div className="text-3xl mb-3">⚖️</div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Pro Feature</p>
              <h2 className="font-display font-bold text-white text-xl mb-2">Put your finalists head to head</h2>
              <p className="text-[var(--text-muted)] text-sm mb-5 max-w-md mx-auto leading-relaxed">
                Two similar cars can be thousands of dollars apart over five years. Pro compares up to
                5 vehicles side by side — payments, interest, insurance, fuel, maintenance, and total
                ownership cost — so you know the real winner before you negotiate. The single-vehicle
                TCO calculator is always free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowPaywall(true)}
                  className="btn-primary text-sm px-6 py-3"
                >
                  Unlock Multi-Vehicle Comparison →
                </button>
                {bonusCreditsLeft > 0 && (
                  <button
                    onClick={async () => { if (await spendCredit('compare_unlock')) setBonusUnlocked(true) }}
                    className="text-sm px-6 py-3 rounded-xl border font-semibold transition-colors hover:brightness-110"
                    style={{ borderColor: 'rgba(255,184,0,0.35)', color: 'var(--accent)', background: 'rgba(255,184,0,0.05)' }}
                  >
                    Use 1 free Pro calculation ({bonusCreditsLeft} left)
                  </button>
                )}
                <Link to="/tco" className="btn-ghost text-sm px-6 py-3 justify-center">
                  Back to TCO Calculator
                </Link>
              </div>
            </div>
          </div>
        )}

        {hasAccess && <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Import banner */}
          {importBanner && importBanner.count > 0 && (
            <div className="mb-5 anim-2 flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.05)' }}>
              <span style={{ color: 'var(--accent)' }} className="font-semibold">
                {importBanner.count} vehicle{importBanner.count !== 1 ? 's' : ''} added to your comparison
                {importBanner.skipped > 0 && (
                  <span className="text-[var(--text-muted)] font-normal">
                    {' '}· {importBanner.skipped} skipped — all 5 slots are full (remove a vehicle to make room)
                  </span>
                )}
              </span>
              <button onClick={() => setImportBanner(null)}
                className="text-[var(--text-muted)] hover:text-white transition-colors text-lg leading-none">
                ×
              </button>
            </div>
          )}

          {/* Ranking parameters */}
          <div className="card anim-2 mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Ranking parameters — select what matters to you
            </p>
            <div className="flex flex-wrap gap-2">
              {RANK_PARAMS.map(p => (
                <button key={p.key}
                  onClick={() => toggleRankParam(p.key)}
                  aria-pressed={activeRankParams[p.key]}
                  className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border text-xs font-semibold transition-all active:opacity-70"
                  style={{
                    borderColor: activeRankParams[p.key] ? 'rgba(255,184,0,0.5)' : 'var(--border)',
                    color:       activeRankParams[p.key] ? 'var(--accent)' : 'var(--text-muted)',
                    background:  activeRankParams[p.key] ? 'rgba(255,184,0,0.06)' : 'transparent',
                  }}>
                  <span>{activeRankParams[p.key] ? '✓' : '+'}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle input cards */}
          {vehicles.length === 0 ? (
            <div className="anim-3 mb-6 rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
              <p className="text-[var(--text-muted)] text-sm mb-4">No vehicles added yet. Add your first vehicle to get started.</p>
              <button onClick={addVehicle} className="btn-primary text-sm px-6 py-2">
                + Add Vehicle
              </button>
            </div>
          ) : (
            <div
              className="grid gap-4 mb-6 anim-3"
              style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(220px, 1fr))` }}
            >
              {vehicles.map((v, i) => (
                <VehicleCard
                  key={v.uid || v.tcoId || i}
                  index={i}
                  vehicle={v}
                  color={COLORS[i]}
                  onChange={updated => updateVehicle(i, updated)}
                  onRemove={() => removeVehicle(i)}
                  canRemove={true}
                />
              ))}
            </div>
          )}

          {/* Add vehicle / import button row */}
          <div className="flex items-center gap-3 mb-8 anim-3 flex-wrap">
            {vehicles.length > 0 && vehicles.length < 5 && (
              <button onClick={addVehicle} className="btn-ghost text-sm">
                + Add Vehicle
              </button>
            )}
            <button
              onClick={restartComparison}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors border border-[var(--border)] hover:border-red-400/40 rounded-lg px-3 py-1.5">
              ↺ Restart Comparison
            </button>
            <Link to="/tco" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors ml-auto">
              ← Calculate in TCO first, then add here
            </Link>
          </div>

          {/* ── Ranking table (shown if any param is active) ── */}
          {vehicles.length > 0 && rankingRows.length > 0 && (
            <div className="card anim-4 overflow-x-auto mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                Rankings — your selected parameters
              </p>
              <table className="w-full text-sm" style={{ minWidth: `${vehicles.length * 140 + 180}px` }}>
                <thead>
                  <tr>
                    <th className="text-left text-[var(--text-muted)] font-semibold pb-4 pr-4 text-xs uppercase tracking-wider w-36">Parameter</th>
                    {vehicles.map((v, i) => (
                      <th key={i} className="text-right pb-4 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                          <span className="text-white font-bold font-display truncate max-w-[100px]">
                            {v.name || `Vehicle ${i + 1}`}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map(row => (
                    <tr key={row.label} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-4 text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{row.label}</td>
                      {row.scores.map((s, i) => (
                        <td key={i} className="py-3 px-3 text-right">
                          <span className={`font-display font-bold tabular-nums ${s.isBest && s.hasValue ? 'text-[var(--accent)]' : 'text-white'}`}>
                            {s.display}
                          </span>
                          {s.isBest && s.hasValue && (
                            <span className="ml-1.5 text-[10px] text-[var(--accent)] font-bold">✓ best</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Main comparison table ── */}
          {vehicles.length > 0 && (<div className="card anim-4 overflow-x-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">
              Side-by-side results
            </p>
            <table className="w-full text-sm" style={{ minWidth: `${vehicles.length * 140 + 140}px` }}>
              <thead>
                <tr>
                  <th className="text-left text-[var(--text-muted)] font-semibold pb-4 pr-4 text-xs uppercase tracking-wider">Metric</th>
                  {vehicles.map((v, i) => (
                    <th key={i} className="text-right pb-4 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                        <span className="text-white font-bold font-display truncate max-w-[100px]">
                          {v.name || `Vehicle ${i + 1}`}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loan metrics */}
                {loanMetrics.map(({ key, label, vals, lowerIsBetter, fmt: fmtFn }) => {
                  const best = lowerIsBetter != null ? bestIdx(vals, lowerIsBetter) : -1
                  const fmtVal = fmtFn ?? fmt
                  return (
                    <tr key={key} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-4 text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{label}</td>
                      {vals.map((val, i) => (
                        <td key={i} className="py-3 px-3 text-right">
                          <span className={`font-display font-bold tabular-nums ${i === best && best >= 0 && val != null ? 'text-[var(--accent)]' : 'text-white'}`}>
                            {fmtVal(val)}
                          </span>
                          {i === best && best >= 0 && val != null && (
                            <span className="ml-1.5 text-[10px] text-[var(--accent)] font-bold">✓ best</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}

                {/* TCO extended metrics section header */}
                {tcoMetrics.length > 0 && (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={vehicles.length + 1} className="pt-4 pb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                        Full TCO (from TCO Calculator)
                      </p>
                    </td>
                  </tr>
                )}

                {tcoMetrics.map(({ key, label, vals, lowerIsBetter, fmt: fmtFn }) => {
                  const best = lowerIsBetter != null ? bestIdx(vals, lowerIsBetter) : -1
                  return (
                    <tr key={key} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-4 text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{label}</td>
                      {vals.map((val, i) => (
                        <td key={i} className="py-3 px-3 text-right">
                          <span className={`font-display font-bold tabular-nums ${i === best && best >= 0 && val != null ? 'text-[var(--accent)]' : 'text-white'}`}>
                            {fmtFn(val)}
                          </span>
                          {i === best && best >= 0 && val != null && (
                            <span className="ml-1.5 text-[10px] text-[var(--accent)] font-bold">✓ best</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>)}

          {/* Bar chart: monthly payment visual */}
          {vehicles.length > 0 && <div className="card mt-6 anim-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">Monthly payment comparison</p>
            <div className="flex flex-col gap-3">
              {vehicles.map((v, i) => {
                const maxPayment = Math.max(...results.map(r => r.monthlyPayment))
                const pct = maxPayment > 0 ? (results[i].monthlyPayment / maxPayment) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm text-[var(--text-muted)] w-24 shrink-0 truncate">{v.name || `Vehicle ${i + 1}`}</span>
                    <div className="flex-1 h-6 bg-[var(--bg)] rounded overflow-hidden border border-[var(--border)]">
                      <div className="h-full rounded transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i] }} />
                    </div>
                    <span className="font-display font-bold text-white tabular-nums text-sm w-20 text-right shrink-0">
                      {fmt(results[i].monthlyPayment)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>}

          {/* Total out-of-pocket bar chart (if TCO data present) */}
          {vehicles.length > 0 && hasTCOData && (
            <div className="card mt-6 anim-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">Total ownership cost comparison</p>
              <div className="flex flex-col gap-3">
                {vehicles.map((v, i) => {
                  const maxTCO = Math.max(...totalOutOfPocket.filter(v => v != null))
                  const pct = maxTCO > 0 ? ((totalOutOfPocket[i] ?? 0) / maxTCO) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm text-[var(--text-muted)] w-24 shrink-0 truncate">{v.name || `Vehicle ${i + 1}`}</span>
                      <div className="flex-1 h-6 bg-[var(--bg)] rounded overflow-hidden border border-[var(--border)]">
                        <div className="h-full rounded transition-all duration-500"
                          style={{ width: `${pct}%`, background: COLORS[i] }} />
                      </div>
                      <span className="font-display font-bold text-white tabular-nums text-sm w-24 text-right shrink-0">
                        {fmt(totalOutOfPocket[i])}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-3">
                * Includes loan payments + insurance + fuel + maintenance + registration for TCO-imported vehicles
              </p>
            </div>
          )}

          <div className="mt-6 anim-5">
            <Link to="/tco" className="btn-ghost text-sm">← Back to TCO Calculator</Link>
          </div>
        </div>}
      </main>
      <NextStep
        tag="Next step · before you sign"
        title="Got a winner? Make sure it's not a money pit."
        body="Run the mileage-aware buying checklist on the actual car you're about to inspect — exactly what to check, what to ask, and what should send you walking."
        to="/checklist"
        cta="Open the checklist"
      />
      <Footer />
    </div>
  )
}
