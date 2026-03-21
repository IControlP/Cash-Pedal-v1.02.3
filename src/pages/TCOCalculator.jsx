import { useState, useMemo, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ResultCard from '../components/ResultCard'

// ── Loan math (validated from Streamlit app) ────────
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

  // True cost per year — use full loan period, capped at ownership duration
  const ownershipMonths = ownershipYears * 12
  const effectiveMonths = Math.min(ownershipMonths, n)
  const totalCostOverOwnership = monthlyPayment * effectiveMonths

  const trueAnnualCost = totalCostOverOwnership / ownershipYears

  return {
    loanAmount,
    monthlyPayment,
    totalInterestPaid,
    totalCostOfLoan: totalPaid,
    trueAnnualCost,
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

// ── Slider with number input ──────────────────────────
function SliderInput({ label, value, onChange, min, max, step, prefix = '', suffix = '', inputMin, inputMax }) {
  const handleSlider = useCallback(e => onChange(Number(e.target.value)), [onChange])
  const handleInput = useCallback(e => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const num = parseFloat(raw)
    if (!isNaN(num)) onChange(num)
  }, [onChange])

  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">
            {prefix}
          </span>
          <input
            type="number"
            value={value}
            min={inputMin ?? min}
            max={inputMax ?? max}
            step={step}
            onChange={handleInput}
            className="input-field"
            style={{ paddingLeft: prefix ? '1.75rem' : '1rem', paddingRight: suffix ? '2.5rem' : '1rem' }}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={handleSlider}
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  )
}

// ── Select ─────────────────────────────────────────────
function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="input-field"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const loanTermOptions = [
  { value: 24, label: '24 months (2 years)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 48, label: '48 months (4 years)' },
  { value: 60, label: '60 months (5 years)' },
  { value: 72, label: '72 months (6 years)' },
  { value: 84, label: '84 months (7 years)' },
]

const ownershipOptions = [
  { value: 1, label: '1 year' },
  { value: 2, label: '2 years' },
  { value: 3, label: '3 years' },
  { value: 4, label: '4 years' },
  { value: 5, label: '5 years' },
  { value: 7, label: '7 years' },
  { value: 10, label: '10 years' },
]

export default function TCOCalculator() {
  const [price, setPrice] = useState(30000)
  const [downPayment, setDownPayment] = useState(5000)
  const [loanTerm, setLoanTerm] = useState(60)
  const [rate, setRate] = useState(6.5)
  const [ownershipYears, setOwnershipYears] = useState(5)

  const results = useMemo(
    () =>
      calculateLoan({
        price,
        downPayment: Math.min(downPayment, price),
        loanTermMonths: loanTerm,
        annualRatePercent: rate,
        ownershipYears,
      }),
    [price, downPayment, loanTerm, rate, ownershipYears],
  )

  const safeDownPayment = Math.min(downPayment, price)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />

      <main className="flex-1 pt-20 pb-16">
        {/* ── Page header ─────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Vehicle TCO Calculator
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            Total Cost of Ownership
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-lg">
            Adjust any input and watch your real costs update live — no submit button, no waiting.
          </p>
        </div>

        {/* ── Main layout ─────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── Inputs panel ──────────────────────────── */}
            <div className="card anim-3 flex flex-col gap-7">
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Purchase & Financing</h2>
                <p className="text-[var(--text-muted)] text-sm">Set your vehicle details to calculate your true cost.</p>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <SliderInput
                label="Vehicle Purchase Price"
                value={price}
                onChange={setPrice}
                min={5000}
                max={150000}
                step={500}
                prefix="$"
              />

              <SliderInput
                label="Down Payment"
                value={safeDownPayment}
                onChange={v => setDownPayment(Math.min(v, price))}
                min={0}
                max={Math.min(price, 50000)}
                step={500}
                prefix="$"
              />

              {/* Loan amount callout */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Loan amount</span>
                <span className="font-display font-bold text-white text-lg">
                  {formatCurrency(results.loanAmount)}
                </span>
              </div>

              <SelectInput
                label="Loan Term"
                value={loanTerm}
                onChange={setLoanTerm}
                options={loanTermOptions}
              />

              <SliderInput
                label="Annual Interest Rate"
                value={rate}
                onChange={setRate}
                min={0}
                max={25}
                step={0.1}
                suffix="%"
                inputMin={0}
                inputMax={25}
              />

              <SelectInput
                label="Ownership Duration"
                value={ownershipYears}
                onChange={setOwnershipYears}
                options={ownershipOptions}
              />
            </div>

            {/* ── Results panel ───────────────────────────── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">
              <div className="anim-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  Your results
                </p>

                {/* Primary metric */}
                <ResultCard
                  label="Monthly Payment"
                  value={results.monthlyPayment}
                  highlight={true}
                  delay={0}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 anim-5">
                <ResultCard
                  label="Total Interest Paid"
                  value={results.totalInterestPaid}
                  delay={60}
                />
                <ResultCard
                  label="Total Cost of Loan"
                  value={results.totalCostOfLoan}
                  delay={120}
                />
                <ResultCard
                  label="True Cost Per Year"
                  value={results.trueAnnualCost}
                  delay={180}
                />
              </div>

              {/* Summary callout */}
              <div
                className="rounded-xl p-4 border text-sm leading-relaxed"
                style={{
                  background: 'rgba(200,255,0,0.04)',
                  borderColor: 'rgba(200,255,0,0.15)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="text-[var(--accent)] font-semibold">The real picture: </span>
                Over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}, you'll pay{' '}
                <span className="text-white font-semibold">{formatCurrency(results.monthlyPayment * Math.min(ownershipYears * 12, loanTerm))}</span>{' '}
                in loan payments — that's{' '}
                <span className="text-white font-semibold">{formatCurrency(results.totalInterestPaid)}</span>{' '}
                in interest on a {formatCurrency(results.loanAmount)} loan.
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
