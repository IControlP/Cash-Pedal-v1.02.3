import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Monthly payment (standard loan amortization)
function monthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12 / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// Estimated monthly ownership costs on top of the payment
function estimateAdditionalMonthlyCosts(vehiclePrice) {
  // Tier-based estimates (consistent with original app)
  if (vehiclePrice >= 60000) {
    // Luxury tier
    return {
      fuel: 250,
      insurance: 280,
      maintenance: 180,
      registration: 50,
      total: 760,
      tier: 'Luxury',
    }
  } else if (vehiclePrice >= 35000) {
    // Premium tier
    return {
      fuel: 180,
      insurance: 180,
      maintenance: 120,
      registration: 35,
      total: 515,
      tier: 'Premium',
    }
  } else if (vehiclePrice >= 20000) {
    // Standard tier
    return {
      fuel: 150,
      insurance: 130,
      maintenance: 80,
      registration: 25,
      total: 385,
      tier: 'Standard',
    }
  } else {
    // Economy tier
    return {
      fuel: 120,
      insurance: 100,
      maintenance: 60,
      registration: 20,
      total: 300,
      tier: 'Economy',
    }
  }
}

const loanTermOptions = [
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
  { value: 72, label: '72 months' },
]

export default function SalaryCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState(30000)
  const [downPct, setDownPct] = useState(20)
  const [loanTerm, setLoanTerm] = useState(48)
  const [rate, setRate] = useState(6.5)

  const results = useMemo(() => {
    const downPayment = vehiclePrice * (downPct / 100)
    const loanAmount = vehiclePrice - downPayment
    const payment = monthlyPayment(loanAmount, rate, loanTerm)
    const extra = estimateAdditionalMonthlyCosts(vehiclePrice)
    const totalMonthly = payment + extra.total

    return {
      downPayment,
      loanAmount,
      payment,
      extra,
      totalMonthly,
      // Required gross monthly income at each threshold
      conservative: (totalMonthly / 0.10) * 12,  // 10% rule
      comfortable: (totalMonthly / 0.15) * 12,   // 15% rule
      aggressive: (totalMonthly / 0.20) * 12,    // 20% rule
      // Monthly breakdown of total annual income needed (conservative)
      conservativeMonthly: totalMonthly / 0.10,
    }
  }, [vehiclePrice, downPct, loanTerm, rate])

  const downAmount = vehiclePrice * (downPct / 100)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
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
            The 20/4/10 rule: 20% down, max 4-year loan, total vehicle costs ≤ 10% of gross income. See the salary you need.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

            {/* Inputs */}
            <div className="card anim-3 flex flex-col gap-6">
              <h2 className="font-display font-bold text-white text-lg">Vehicle Details</h2>
              <div className="h-px bg-[var(--border)]" />

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

              {/* Monthly cost breakdown */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                  Estimated monthly costs · {results.extra.tier} tier
                </p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Loan payment', val: results.payment },
                    { label: 'Fuel', val: results.extra.fuel },
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
                </div>
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

              {/* 20/4/10 rule explainer */}
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

              <Link to="/tco" className="btn-ghost text-sm justify-center">
                Calculate full TCO →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
