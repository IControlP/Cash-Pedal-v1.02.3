import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function calcLoan({ price, downPayment, loanTermMonths, annualRatePercent, ownershipYears }) {
  const loanAmount = price - downPayment
  const r = annualRatePercent / 12 / 100
  const n = loanTermMonths
  const monthlyPayment = r === 0
    ? loanAmount / n
    : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPaid = monthlyPayment * n
  const totalInterest = totalPaid - loanAmount
  const effectiveMonths = Math.min(ownershipYears * 12, n)
  const annualCost = (monthlyPayment * effectiveMonths) / ownershipYears
  return { loanAmount, monthlyPayment, totalInterest, totalCostOfLoan: totalPaid, annualCost }
}

const COLORS = ['var(--accent)', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa']

const defaultVehicle = {
  name: '',
  price: 30000,
  downPayment: 5000,
  loanTerm: 60,
  rate: 6.5,
  ownershipYears: 5,
}

function VehicleCard({ vehicle, index, onChange, onRemove, canRemove, color }) {
  const pct = (val, min, max) => ((val - min) / (max - min)) * 100

  return (
    <div className="card flex flex-col gap-4" style={{ borderColor: color, borderWidth: '1px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: color }}
        />
        <input
          type="text"
          value={vehicle.name}
          onChange={e => onChange({ ...vehicle, name: e.target.value })}
          placeholder={`Vehicle ${index + 1}`}
          className="input-field text-sm py-1.5 flex-1 mx-2"
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-[var(--text-muted)] hover:text-red-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Price */}
      <div>
        <label className="input-label">Price</label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
          <input
            type="number" value={vehicle.price}
            onChange={e => onChange({ ...vehicle, price: Number(e.target.value) })}
            className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }}
          />
        </div>
        <input type="range" min={5000} max={150000} step={500} value={vehicle.price}
          onChange={e => onChange({ ...vehicle, price: Number(e.target.value) })}
          style={{ background: `linear-gradient(to right, ${color} ${pct(vehicle.price, 5000, 150000)}%, var(--border) ${pct(vehicle.price, 5000, 150000)}%)` }}
        />
      </div>

      {/* Down payment */}
      <div>
        <label className="input-label">Down Payment</label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
          <input
            type="number" value={vehicle.downPayment}
            onChange={e => onChange({ ...vehicle, downPayment: Math.min(Number(e.target.value), vehicle.price) })}
            className="input-field text-sm py-2" style={{ paddingLeft: '1.75rem' }}
          />
        </div>
        <input type="range" min={0} max={Math.min(vehicle.price, 50000)} step={500} value={Math.min(vehicle.downPayment, vehicle.price)}
          onChange={e => onChange({ ...vehicle, downPayment: Number(e.target.value) })}
          style={{ background: `linear-gradient(to right, ${color} ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, Math.min(vehicle.price, 50000))}%, var(--border) ${pct(Math.min(vehicle.downPayment, vehicle.price), 0, Math.min(vehicle.price, 50000))}%)` }}
        />
      </div>

      {/* Loan term + rate side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Loan Term</label>
          <select value={vehicle.loanTerm} onChange={e => onChange({ ...vehicle, loanTerm: Number(e.target.value) })} className="input-field text-sm py-2">
            {[24,36,48,60,72,84].map(m => <option key={m} value={m}>{m} mo</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Rate (%)</label>
          <input
            type="number" value={vehicle.rate} min={0} max={25} step={0.1}
            onChange={e => onChange({ ...vehicle, rate: Number(e.target.value) })}
            className="input-field text-sm py-2"
          />
        </div>
      </div>

      {/* Ownership */}
      <div>
        <label className="input-label">Own for (years)</label>
        <select value={vehicle.ownershipYears} onChange={e => onChange({ ...vehicle, ownershipYears: Number(e.target.value) })} className="input-field text-sm py-2">
          {[1,2,3,4,5,7,10].map(y => <option key={y} value={y}>{y} yr{y > 1 ? 's' : ''}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function MultiVehicleComparison() {
  const [vehicles, setVehicles] = useState([
    { ...defaultVehicle, name: 'Vehicle 1', price: 25000, downPayment: 5000 },
    { ...defaultVehicle, name: 'Vehicle 2', price: 35000, downPayment: 7000 },
  ])

  const results = useMemo(() =>
    vehicles.map(v =>
      calcLoan({
        price: v.price,
        downPayment: Math.min(v.downPayment, v.price),
        loanTermMonths: v.loanTerm,
        annualRatePercent: v.rate,
        ownershipYears: v.ownershipYears,
      })
    ), [vehicles])

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

  // Rankings
  const rankedByMonthly = [...results.map((r, i) => ({ ...r, i }))].sort((a, b) => a.monthlyPayment - b.monthlyPayment)
  const bestMonthlyIdx = rankedByMonthly[0].i
  const rankedByTotal = [...results.map((r, i) => ({ ...r, i }))].sort((a, b) => a.totalCostOfLoan - b.totalCostOfLoan)
  const bestTotalIdx = rankedByTotal[0].i
  const rankedByAnnual = [...results.map((r, i) => ({ ...r, i }))].sort((a, b) => a.annualCost - b.annualCost)
  const bestAnnualIdx = rankedByAnnual[0].i

  const metrics = [
    { key: 'monthlyPayment', label: 'Monthly Payment', bestIdx: bestMonthlyIdx },
    { key: 'totalInterest', label: 'Total Interest', bestIdx: bestTotalIdx },
    { key: 'totalCostOfLoan', label: 'Total Cost of Loan', bestIdx: bestTotalIdx },
    { key: 'annualCost', label: 'True Cost / Year', bestIdx: bestAnnualIdx },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
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
            Enter the details for each vehicle and see every cost metric side by side — updating live.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Vehicle input cards — scrollable horizontally on mobile */}
          <div
            className="grid gap-4 mb-6 anim-3"
            style={{ gridTemplateColumns: `repeat(${vehicles.length}, minmax(220px, 1fr))` }}
          >
            {vehicles.map((v, i) => (
              <VehicleCard
                key={i}
                index={i}
                vehicle={v}
                color={COLORS[i]}
                onChange={updated => updateVehicle(i, updated)}
                onRemove={() => removeVehicle(i)}
                canRemove={vehicles.length > 2}
              />
            ))}
          </div>

          {/* Add vehicle button */}
          {vehicles.length < 5 && (
            <button
              onClick={addVehicle}
              className="btn-ghost text-sm mb-8 anim-3"
            >
              + Add Vehicle
            </button>
          )}

          {/* Comparison table */}
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
                {metrics.map(({ key, label, bestIdx }) => (
                  <tr key={key} className="border-t border-[var(--border)]">
                    <td className="py-3 pr-4 text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{label}</td>
                    {results.map((r, i) => (
                      <td key={i} className="py-3 px-3 text-right">
                        <span className={`font-display font-bold tabular-nums ${i === bestIdx ? 'text-[var(--accent)]' : 'text-white'}`}>
                          {fmt(r[key])}
                        </span>
                        {i === bestIdx && (
                          <span className="ml-1.5 text-[10px] text-[var(--accent)] font-bold">✓ best</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Loan amount row */}
                <tr className="border-t border-[var(--border)]">
                  <td className="py-3 pr-4 text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Loan Amount</td>
                  {results.map((r, i) => (
                    <td key={i} className="py-3 px-3 text-right font-semibold tabular-nums text-white">{fmt(r.loanAmount)}</td>
                  ))}
                </tr>
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
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i] }}
                      />
                    </div>
                    <span className="font-display font-bold text-white tabular-nums text-sm w-20 text-right shrink-0">
                      {fmt(results[i].monthlyPayment)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 anim-5">
            <Link to="/tco" className="btn-ghost text-sm">← Back to TCO Calculator</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
