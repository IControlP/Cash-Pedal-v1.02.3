import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PaywallModal from '../components/PaywallModal'
import { useSubscription } from '../hooks/useSubscription'

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

function calcLoan({ price, downPayment, loanTermMonths, annualRatePercent, ownershipYears }) {
  const loanAmount = price - downPayment
  const r = annualRatePercent / 12 / 100
  const n = loanTermMonths
  const monthlyPayment = r === 0
    ? loanAmount / n
    : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPaid    = monthlyPayment * n
  const totalInterest = totalPaid - loanAmount
  const effectiveMonths = Math.min(ownershipYears * 12, n)
  const annualCost   = (monthlyPayment * effectiveMonths) / ownershipYears
  return { loanAmount, monthlyPayment, totalInterest, totalCostOfLoan: totalPaid, annualCost }
}

const COLORS = ['var(--accent)', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa']

// Default blank vehicle (manually entered — no TCO data)
const defaultVehicle = {
  name: '', price: 30000, downPayment: 5000, loanTerm: 60, rate: 6.5, ownershipYears: 5,
  isLease: false, leaseMonthlyPayment: 0, leaseTerm: 36,
  // Extended fields (null = not available for this entry)
  totalAnnualCost: null, totalOwnershipCost: null,
  mpgCombined: null, cargoSqFt: null, valueRetentionPct: null,
  isFromTCO: false,
}

// ── Ranking parameters available to the user ──────────
const RANK_PARAMS = [
  { key: 'totalOutOfPocket', label: 'Lowest Total Financing Cost', lowerIsBetter: true },
  { key: 'mpgCombined',      label: 'Best MPG',                               lowerIsBetter: false },
  { key: 'cargoSqFt',        label: 'Most Cargo Space',                       lowerIsBetter: false },
  { key: 'valueRetentionPct',label: 'Best Value Retention',                   lowerIsBetter: false },
]

// ── VehicleCard ────────────────────────────────────────
function VehicleCard({ vehicle, index, onChange, onRemove, canRemove, color }) {
  const pct = (val, min, max) => ((val - min) / (max - min)) * 100

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
            className="text-[var(--text-muted)] hover:text-red-400 transition-colors text-lg leading-none">
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
              Imported from TCO
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
              className="flex-1 py-1 rounded-md text-xs font-semibold transition-all"
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
            onChange={e => onChange({ ...vehicle, price: Number(e.target.value) })}
            className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
        </div>
        <input type="range" min={5000} max={150000} step={500} value={vehicle.price}
          onChange={e => onChange({ ...vehicle, price: Number(e.target.value) })}
          style={{ background: `linear-gradient(to right, ${color} ${pct(vehicle.price, 5000, 150000)}%, var(--border) ${pct(vehicle.price, 5000, 150000)}%)` }} />
      </div>

      {vehicle.isLease ? (
        <>
          {/* Lease monthly payment */}
          <div>
            <label className="input-label">Monthly Lease Payment</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
              <input type="number" min={0} value={vehicle.leaseMonthlyPayment ?? 0}
                onChange={e => onChange({ ...vehicle, leaseMonthlyPayment: Number(e.target.value) })}
                className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
            </div>
            <input type="range" min={0} max={3000} step={25}
              value={vehicle.leaseMonthlyPayment ?? 0}
              onChange={e => onChange({ ...vehicle, leaseMonthlyPayment: Number(e.target.value) })}
              style={{ background: `linear-gradient(to right, ${color} ${pct(vehicle.leaseMonthlyPayment ?? 0, 0, 3000)}%, var(--border) ${pct(vehicle.leaseMonthlyPayment ?? 0, 0, 3000)}%)` }} />
          </div>

          {/* Lease term */}
          <div>
            <label className="input-label">Lease Term</label>
            <select value={vehicle.leaseTerm ?? 36}
              onChange={e => onChange({ ...vehicle, leaseTerm: Number(e.target.value) })}
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
                onChange={e => onChange({ ...vehicle, downPayment: Math.min(Number(e.target.value), vehicle.price) })}
                className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }} />
            </div>
            <input type="range" min={0} max={Math.min(vehicle.price, 50000)} step={500}
              value={Math.min(vehicle.downPayment, vehicle.price)}
              onChange={e => onChange({ ...vehicle, downPayment: Number(e.target.value) })}
              style={{ background: `linear-gradient(to right, ${color} ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, Math.min(vehicle.price, 50000))}%, var(--border) ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, Math.min(vehicle.price, 50000))}%)` }} />
          </div>

          {/* Loan term + rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Loan Term</label>
              <select value={vehicle.loanTerm}
                onChange={e => onChange({ ...vehicle, loanTerm: Number(e.target.value) })}
                className="input-field text-sm py-2">
                {[24,36,48,60,72,84].map(m => <option key={m} value={m}>{m} mo</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Rate (%)</label>
              <input type="number" value={vehicle.rate} min={0} max={25} step={0.1}
                onChange={e => onChange({ ...vehicle, rate: Number(e.target.value) })}
                className="input-field text-sm py-2" />
            </div>
          </div>

          {/* Ownership */}
          <div>
            <label className="input-label">Own for (years)</label>
            <select value={vehicle.ownershipYears}
              onChange={e => onChange({ ...vehicle, ownershipYears: Number(e.target.value) })}
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
            onChange={e => onChange({ ...vehicle, mpgCombined: e.target.value === '' ? null : Number(e.target.value) })}
            className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="input-label">Cargo (cu ft)</label>
          <input type="number" min={0} max={200} step={0.1}
            value={vehicle.cargoSqFt ?? ''}
            placeholder="e.g. 15.1"
            onChange={e => onChange({ ...vehicle, cargoSqFt: e.target.value === '' ? null : Number(e.target.value) })}
            className="input-field text-sm py-2" />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────
export default function MultiVehicleComparison() {
  const { isSubscribed } = useSubscription()
  const [showPaywall, setShowPaywall] = useState(false)

  // Ranking parameter toggles
  const [activeRankParams, setActiveRankParams] = useState({ totalOutOfPocket: true, mpgCombined: false, cargoSqFt: false, valueRetentionPct: false })

  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cashpedal_comparison_vehicles') || 'null')
      if (saved && Array.isArray(saved) && saved.length >= 2) return saved
    } catch { /* ignore */ }
    return [
      { ...defaultVehicle, name: 'Vehicle 1', price: 25000, downPayment: 5000 },
      { ...defaultVehicle, name: 'Vehicle 2', price: 35000, downPayment: 7000 },
    ]
  })

  const [importBanner, setImportBanner] = useState(null) // { count }

  // Persist vehicles state across navigation
  useEffect(() => {
    localStorage.setItem('cashpedal_comparison_vehicles', JSON.stringify(vehicles))
  }, [vehicles])

  // Pull TCO-imported vehicles from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('cashpedal_tco_for_comparison')
    if (!raw) return
    try {
      const imports = JSON.parse(raw)
      if (!Array.isArray(imports) || imports.length === 0) return

      setVehicles(prev => {
        // Merge imports: replace existing slots or append, cap at 5
        const merged = [...prev]
        imports.forEach(imp => {
          const existing = merged.findIndex(v => v.tcoId === imp.id)
          const mapped = {
            tcoId:               imp.id,
            name:                imp.name || 'TCO Import',
            price:               imp.price,
            downPayment:         imp.downPayment,
            loanTerm:            imp.loanTerm,
            rate:                imp.rate,
            ownershipYears:      imp.ownershipYears,
            // Lease fields
            isLease:             imp.isLease ?? false,
            leaseMonthlyPayment: imp.leaseMonthlyPayment ?? 0,
            leaseTerm:           imp.leaseTerm ?? 36,
            // Extended
            totalAnnualCost:     imp.totalAnnualCost ?? null,
            totalOwnershipCost:  imp.totalOwnershipCost ?? null,
            mpgCombined:         imp.mpgCombined ?? null,
            cargoSqFt:           imp.cargoSqFt ?? null,
            valueRetentionPct:   imp.valueRetentionPct ?? null,
            isFromTCO:           true,
          }
          if (existing >= 0) {
            merged[existing] = mapped
          } else if (merged.length < 5) {
            merged.push(mapped)
          }
        })
        return merged
      })

      setImportBanner({ count: imports.length })
      // Clear after loading so re-visit doesn't re-import
      localStorage.removeItem('cashpedal_tco_for_comparison')
    } catch { /* ignore malformed data */ }
  }, [])

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

  // Compute total financing cost for ranking.
  // TCO-imported vehicles: full ownership cost (loan + insurance + fuel + maintenance + registration).
  // Manually entered: down payment + total loan payments (buy) or total lease payments (lease).
  const totalOutOfPocket = useMemo(() =>
    vehicles.map((v, i) => {
      if (v.totalOwnershipCost != null) return v.totalOwnershipCost
      if (v.isLease) return results[i].totalCostOfLoan  // monthly × term
      return Math.min(v.downPayment, v.price) + results[i].totalCostOfLoan
    }), [vehicles, results])

  function updateVehicle(i, v) {
    setVehicles(vs => vs.map((orig, idx) => idx === i ? v : orig))
  }

  function addVehicle() {
    if (vehicles.length >= 5) return
    setVehicles(vs => [...vs, { ...defaultVehicle, name: `Vehicle ${vs.length + 1}` }])
  }

  function removeVehicle(i) {
    setVehicles(vs => vs.filter((_, idx) => idx !== i))
  }

  function restartComparison() {
    localStorage.removeItem('cashpedal_comparison_vehicles')
    localStorage.removeItem('cashpedal_tco_for_comparison')
    setVehicles([
      { ...defaultVehicle, name: 'Vehicle 1', price: 25000, downPayment: 5000 },
      { ...defaultVehicle, name: 'Vehicle 2', price: 35000, downPayment: 7000 },
    ])
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

  const tcoMetrics = [
    hasTCOData   && { key: 'totalAnnualCost',   label: 'All-In Annual Cost',    vals: vehicles.map(v => v.totalAnnualCost),   lowerIsBetter: true,  fmt: v => v != null ? fmt(v) : '—' },
    hasTCOData   && { key: 'totalOwnershipCost', label: 'Total Ownership Cost',  vals: vehicles.map(v => v.totalOwnershipCost), lowerIsBetter: true,  fmt: v => v != null ? fmt(v) : '—' },
    hasMpg       && { key: 'mpg',               label: 'MPG (Combined)',         vals: vehicles.map(v => v.mpgCombined),       lowerIsBetter: false, fmt: fmtMpg },
    hasCargo     && { key: 'cargo',             label: 'Cargo Space',            vals: vehicles.map(v => v.cargoSqFt),         lowerIsBetter: false, fmt: fmtCargo },
    hasRetention && { key: 'retention',         label: 'Value Retention',        vals: vehicles.map(v => v.valueRetentionPct), lowerIsBetter: false, fmt: fmtRetention },
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
          usedCount={0}
          cancelPath="/compare"
          onUnlocked={() => setShowPaywall(false)}
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
            Compare up to 5 vehicles
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-xl">
            Enter details manually or import results directly from the TCO Calculator — updates live.
          </p>
        </div>

        {/* ── Pro gate banner ── */}
        {!isSubscribed && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
            <div className="rounded-xl border p-6 text-center"
              style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.04)' }}>
              <div className="text-3xl mb-3">⚖️</div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Pro Feature</p>
              <h2 className="font-display font-bold text-white text-xl mb-2">Multi-vehicle comparison is a Pro feature</h2>
              <p className="text-[var(--text-muted)] text-sm mb-5 max-w-md mx-auto leading-relaxed">
                Compare up to 5 vehicles side by side — payments, interest, insurance, fuel, maintenance, and total ownership cost.
                Free users get a single-vehicle TCO estimate.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowPaywall(true)}
                  className="btn-primary text-sm px-6 py-3"
                >
                  Unlock Multi-Vehicle Comparison →
                </button>
                <Link to="/tco" className="btn-ghost text-sm px-6 py-3 justify-center">
                  Back to TCO Calculator
                </Link>
              </div>
            </div>
          </div>
        )}

        {isSubscribed && <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Import banner */}
          {importBanner && (
            <div className="mb-5 anim-2 flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.05)' }}>
              <span style={{ color: 'var(--accent)' }} className="font-semibold">
                {importBanner.count} vehicle{importBanner.count !== 1 ? 's' : ''} imported from TCO Calculator
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
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
          <div
            className="grid gap-4 mb-6 anim-3"
            style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(220px, 1fr))` }}
          >
            {vehicles.map((v, i) => (
              <VehicleCard
                key={v.tcoId || i}
                index={i}
                vehicle={v}
                color={COLORS[i]}
                onChange={updated => updateVehicle(i, updated)}
                onRemove={() => removeVehicle(i)}
                canRemove={vehicles.length > 2}
              />
            ))}
          </div>

          {/* Add vehicle / import button row */}
          <div className="flex items-center gap-3 mb-8 anim-3 flex-wrap">
            {vehicles.length < 5 && (
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
          {rankingRows.length > 0 && (
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
              {activeRankParams.totalOutOfPocket && (
                <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                  * Financing cost: TCO-imported vehicles include all ownership costs (loan + insurance + fuel + maintenance + registration).
                  Manually entered vehicles show down payment + total loan payments (buy) or total lease payments (lease) — import from TCO Calculator for full all-in comparison.
                </p>
              )}
            </div>
          )}

          {/* ── Main comparison table ── */}
          <div className="card anim-4 overflow-x-auto">
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
          </div>

          {/* Bar chart: monthly payment visual */}
          <div className="card mt-6 anim-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">Monthly payment comparison</p>
            <div className="flex flex-col gap-3">
              {vehicles.map((v, i) => {
                const maxPayment = Math.max(...results.map(r => r.monthlyPayment))
                const pct = (results[i].monthlyPayment / maxPayment) * 100
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
          </div>

          {/* Total out-of-pocket bar chart (if TCO data present) */}
          {hasTCOData && (
            <div className="card mt-6 anim-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-6">Total ownership cost comparison</p>
              <div className="flex flex-col gap-3">
                {vehicles.map((v, i) => {
                  const maxTCO = Math.max(...totalOutOfPocket)
                  const pct = (totalOutOfPocket[i] / maxTCO) * 100
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
      <Footer />
    </div>
  )
}
