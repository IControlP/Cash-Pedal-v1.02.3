import { useState, useMemo, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ResultCard from '../components/ResultCard'
import VEHICLES from '../data/vehicles.json'

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
  return { loanAmount, monthlyPayment, totalInterestPaid, totalCostOfLoan: totalPaid, trueAnnualCost }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

// ── Vehicle data helpers ──────────────────────────────
const MAKES = Object.keys(VEHICLES).sort()

function getModels(make)          { return make ? Object.keys(VEHICLES[make] ?? {}).sort() : [] }
function getModelData(make, model){ return VEHICLES[make]?.[model] ?? null }

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

// ── Car SVG silhouettes ───────────────────────────────
const C = {
  body:        '#191921',
  bodyStroke:  '#2a2a3a',
  glass:       'rgba(100,180,255,0.10)',
  glassStroke: 'rgba(120,190,255,0.28)',
  wheelOuter:  '#0e0e16',
  wheelRim:    '#22223a',
  wheelHub:    '#2e2e50',
  wheelSpoke:  '#1a1a30',
  accent:      '#C8FF00',
  tail:        '#ff3333',
  shadow:      'rgba(0,0,0,0.45)',
}

function Wheel({ cx, cy, r = 26 }) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return (
      <line key={i}
        x1={cx} y1={cy}
        x2={cx + (r - 6) * Math.cos(a)}
        y2={cy + (r - 6) * Math.sin(a)}
        stroke={C.wheelSpoke} strokeWidth="2"
      />
    )
  })
  return (
    <g>
      <circle cx={cx} cy={cy} r={r}     fill={C.wheelOuter} stroke={C.bodyStroke} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 6} fill={C.wheelRim} />
      {spokes}
      <circle cx={cx} cy={cy} r={6}     fill={C.wheelHub} />
      <circle cx={cx} cy={cy} r={3}     fill={C.bodyStroke} />
    </g>
  )
}

function EVBadge({ x, y }) {
  return (
    <>
      <rect x={x} y={y} width="30" height="14" rx="4"
        fill="rgba(200,255,0,0.20)" stroke="rgba(200,255,0,0.4)" strokeWidth="1" />
      <text x={x + 15} y={y + 10} textAnchor="middle" fontSize="7"
        fontWeight="bold" fill="#C8FF00" fontFamily="monospace">EV</text>
    </>
  )
}

function SedanSVG({ isEV }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="198" ry="8" fill={C.shadow} />
      <path d="M54 142 C54 127 65 113 82 105 C99 97 120 94 144 93 C163 93 176 79 190 67 C202 56 220 50 242 50 L272 50 C294 50 313 57 331 70 C349 83 367 93 396 99 C417 104 433 115 437 130 L438 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M194 68 C206 56 223 51 244 51 L271 51 C292 51 311 58 329 71 C345 83 361 92 390 99 C370 100 345 100 328 100 L197 100 C195 86 194 76 194 68 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <rect x="55" y="118" width="13" height="7" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="55" y="128" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="432" y="116" width="11" height="9" rx="3" fill={C.tail} opacity="0.85" />
      <line x1="258" y1="100" x2="255" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={362} cy={154} />
      {isEV && <EVBadge x={186} y={126} />}
    </svg>
  )
}

function SUVSVG({ isEV, isLarge }) {
  const roofY = isLarge ? 36 : 41
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="200" ry="8" fill={C.shadow} />
      <path
        d={`M50 142 C50 126 62 112 79 104 C96 96 120 92 152 91 C166 91 175 ${roofY+33} 183 ${roofY+21} C191 ${roofY+11} 207 ${roofY} 229 ${roofY} L279 ${roofY} C301 ${roofY} 320 ${roofY+9} 336 ${roofY+22} C350 ${roofY+34} 368 90 400 96 C422 100 440 112 443 128 L443 142 Z`}
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5"
      />
      <path
        d={`M187 ${roofY+22} C195 ${roofY+11} 210 ${roofY+1} 231 ${roofY+1} L278 ${roofY+1} C298 ${roofY+1} 316 ${roofY+10} 332 ${roofY+23} C346 ${roofY+35} 362 89 392 96 C374 97 348 97 325 97 L188 97 C187 83 187 73 187 ${roofY+22} Z`}
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1"
      />
      <rect x="51" y="116" width="14" height="8" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="51" y="127" width="10" height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="437" y="113" width="12" height="11" rx="3" fill={C.tail} opacity="0.85" />
      {isLarge && (
        <rect x="192" y={roofY - 4} width="148" height="3" rx="1.5"
          fill={C.bodyStroke} opacity="0.8" />
      )}
      <line x1="258" y1="97" x2="256" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={368} cy={154} />
      {isEV && <EVBadge x={183} y={120} />}
    </svg>
  )
}

function TruckSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="202" ry="8" fill={C.shadow} />
      <path d="M52 142 C52 126 63 112 80 104 C97 96 120 92 155 92 L155 62 C155 50 167 41 187 41 L248 41 C268 41 279 52 279 65 L282 82 L435 80 L438 88 C441 99 442 118 441 133 L441 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M158 63 C158 52 168 42 187 42 L248 42 C267 42 275 52 275 65 L275 92 L158 92 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      {[302, 330, 358, 386].map(x => (
        <rect key={x} x={x} y="81" width="6" height="8" rx="1" fill={C.bodyStroke} opacity="0.8" />
      ))}
      <line x1="432" y1="81" x2="432" y2="142" stroke={C.bodyStroke} strokeWidth="2" opacity="0.7" />
      <rect x="53" y="116" width="13" height="8" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="53" y="127" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="436" y="108" width="10" height="12" rx="3" fill={C.tail} opacity="0.85" />
      <Wheel cx={115} cy={154} r={28} />
      <Wheel cx={378} cy={154} r={28} />
    </svg>
  )
}

function SportsSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="210" ry="7" fill={C.shadow} />
      <path d="M42 146 C42 134 54 122 70 114 C86 106 112 102 148 101 C168 101 183 91 198 79 C212 68 232 62 258 60 L295 60 C321 60 342 68 360 82 C377 95 406 104 432 110 C444 113 450 125 449 138 L449 146 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M202 80 C216 69 235 62 259 61 L294 61 C318 61 338 69 356 82 C372 94 398 104 426 110 C408 111 381 111 360 111 L202 111 C202 97 202 87 202 80 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <line x1="135" y1="102" x2="148" y2="116" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <line x1="125" y1="105" x2="138" y2="119" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.4" />
      <rect x="90" y="138" width="290" height="4" rx="2" fill={C.bodyStroke} opacity="0.6" />
      <rect x="43" y="122" width="16" height="6" rx="2" fill={C.accent} opacity="0.95" />
      <rect x="43" y="131" width="20" height="3" rx="1.5" fill={C.accent} opacity="0.3" />
      <rect x="433" y="116" width="18" height="6" rx="2" fill={C.tail} opacity="0.9" />
      <rect x="435" y="124" width="14" height="3" rx="1.5" fill={C.tail} opacity="0.4" />
      <Wheel cx={122} cy={154} r={28} />
      <Wheel cx={372} cy={154} r={28} />
    </svg>
  )
}

function MinivanSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="196" ry="8" fill={C.shadow} />
      <path d="M48 142 C48 126 60 112 78 104 C95 96 120 92 155 92 L160 50 C161 40 170 32 190 32 L312 32 C332 32 343 40 344 50 L348 92 C370 92 398 98 420 107 C434 112 445 124 446 135 L446 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M163 51 C164 41 172 33 190 33 L312 33 C330 33 340 41 341 51 L340 92 L164 92 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <line x1="264" y1="92" x2="262" y2="142" stroke={C.bodyStroke} strokeWidth="2" opacity="0.65" />
      <line x1="198" y1="92" x2="196" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.5" />
      <rect x="272" y="118" width="14" height="4" rx="2" fill={C.bodyStroke} opacity="0.9" />
      <rect x="49" y="114" width="13" height="9" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="49" y="125" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="440" y="110" width="11" height="13" rx="3" fill={C.tail} opacity="0.85" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={364} cy={154} />
    </svg>
  )
}

function CarVisual({ make, model, carType, isEV }) {
  const isLarge = carType === 'suv_large' || carType === 'suv_luxury'
  const visual = (() => {
    switch (carType) {
      case 'suv': case 'suv_large': case 'suv_luxury': case 'ev_suv':
        return <SUVSVG isEV={isEV} isLarge={isLarge} />
      case 'truck':   return <TruckSVG />
      case 'sports':  return <SportsSVG />
      case 'minivan': return <MinivanSVG />
      default:        return <SedanSVG isEV={isEV} />
    }
  })()

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0f0f18 0%,#080809 100%)' }}>
      <div className="px-6 pt-5 pb-2">{visual}</div>
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{make} {model}</p>
          <p className="text-[var(--text-muted)] text-xs mt-0.5 capitalize">
            {carType?.replace(/_/g, ' ')}
          </p>
        </div>
        {isEV && (
          <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded"
            style={{ color:'#C8FF00', background:'rgba(200,255,0,0.1)', border:'1px solid rgba(200,255,0,0.25)' }}>
            ELECTRIC
          </span>
        )}
      </div>
    </div>
  )
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

// ── Slider ────────────────────────────────────────────
function SliderInput({ label, value, onChange, min, max, step, prefix = '', suffix = '', inputMin, inputMax }) {
  const handleSlider = useCallback(e => onChange(Number(e.target.value)), [onChange])
  const handleInput  = useCallback(e => {
    const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num)) onChange(num)
  }, [onChange])
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">{prefix}</span>}
          <input type="number" value={value} min={inputMin ?? min} max={inputMax ?? max} step={step}
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
function VehiclePicker({ make, model, year, trim, onChange, onClear }) {
  const models   = getModels(make)
  const years    = getAvailableYears(make, model)
  const trimsMap = getTrims(make, model, year)
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
          <label className="input-label">Trim</label>
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

// ── Main page ─────────────────────────────────────────
export default function TCOCalculator() {
  const [price, setPrice]           = useState(30000)
  const [downPayment, setDownPayment] = useState(5000)
  const [loanTerm, setLoanTerm]     = useState(60)
  const [rate, setRate]             = useState(6.5)
  const [ownershipYears, setOwnershipYears] = useState(5)

  const [selMake,  setSelMake]  = useState('')
  const [selModel, setSelModel] = useState('')
  const [selYear,  setSelYear]  = useState('')
  const [selTrim,  setSelTrim]  = useState('')

  // Derived model data (type, specs, mpg, isEV)
  const modelData = useMemo(() => getModelData(selMake, selModel), [selMake, selModel])

  const handlePickerChange = useCallback((level, value) => {
    if (level === 'make')  { setSelMake(value); setSelModel(''); setSelYear(''); setSelTrim('') }
    if (level === 'model') { setSelModel(value); setSelYear(''); setSelTrim('') }
    if (level === 'year')  { setSelYear(value); setSelTrim('') }
    if (level === 'trim') {
      setSelTrim(value)
      if (selMake && selModel && selYear) {
        const t = getTrims(selMake, selModel, selYear)
        if (t[value]) setPrice(t[value])
      }
    }
  }, [selMake, selModel, selYear])

  const handleClear = useCallback(() => {
    setSelMake(''); setSelModel(''); setSelYear(''); setSelTrim('')
  }, [])

  const results = useMemo(() => calculateLoan({
    price, downPayment: Math.min(downPayment, price),
    loanTermMonths: loanTerm, annualRatePercent: rate, ownershipYears,
  }), [price, downPayment, loanTerm, rate, ownershipYears])

  const safeDown = Math.min(downPayment, price)
  const usingMSRP = !!(selMake && selModel && selYear && selTrim)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Vehicle TCO Calculator
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            Total Cost of Ownership
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-lg">
            Pick any vehicle from our database of 35 makes &amp; 266 models — or enter your own numbers.
          </p>
        </div>

        {/* Layout */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── Inputs ── */}
            <div className="card anim-3 flex flex-col gap-7">

              {/* Vehicle selector */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Select Your Vehicle</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                    Optional
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-5">
                  35 makes · 266 models · trims by year with MSRP, MPG &amp; specs.
                </p>
                <VehiclePicker
                  make={selMake} model={selModel} year={selYear} trim={selTrim}
                  onChange={handlePickerChange} onClear={handleClear}
                />
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Financing */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Purchase &amp; Financing</h2>
                  {usingMSRP && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ color:'#C8FF00', background:'rgba(200,255,0,0.08)', border:'1px solid rgba(200,255,0,0.2)' }}>
                      Using MSRP
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-5">
                  Adjust any value — results update live.
                </p>
              </div>

              <SliderInput label="Vehicle Purchase Price" value={price} onChange={setPrice}
                min={5000} max={150000} step={500} prefix="$" />

              <SliderInput label="Down Payment" value={safeDown}
                onChange={v => setDownPayment(Math.min(v, price))}
                min={0} max={Math.min(price, 50000)} step={500} prefix="$" />

              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <span className="text-sm text-[var(--text-muted)]">Loan amount</span>
                <span className="font-display font-bold text-white text-lg">{formatCurrency(results.loanAmount)}</span>
              </div>

              <SelectInput label="Loan Term" value={loanTerm} onChange={setLoanTerm} options={loanTermOptions} />

              <SliderInput label="Annual Interest Rate" value={rate} onChange={setRate}
                min={0} max={25} step={0.1} suffix="%" inputMin={0} inputMax={25} />

              <SelectInput label="Ownership Duration" value={ownershipYears}
                onChange={setOwnershipYears} options={ownershipOptions} />
            </div>

            {/* ── Results ── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">

              {/* Car visual + specs */}
              {selModel && modelData && (
                <div className="anim-3 flex flex-col gap-4">
                  <CarVisual
                    make={selMake} model={selModel}
                    carType={modelData.type} isEV={modelData.is_ev}
                  />
                  <SpecsPanel specs={modelData.specs} mpg={modelData.mpg} isEV={modelData.is_ev} />
                </div>
              )}

              <div className="anim-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  Your results
                </p>
                <ResultCard label="Monthly Payment" value={results.monthlyPayment} highlight delay={0} />
              </div>

              <div className="grid grid-cols-1 gap-4 anim-5">
                <ResultCard label="Total Interest Paid"  value={results.totalInterestPaid}  delay={60}  />
                <ResultCard label="Total Cost of Loan"   value={results.totalCostOfLoan}    delay={120} />
                <ResultCard label="True Cost Per Year"   value={results.trueAnnualCost}     delay={180} />
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                style={{ background:'rgba(200,255,0,0.04)', borderColor:'rgba(200,255,0,0.15)', color:'var(--text-muted)' }}>
                <span className="text-[var(--accent)] font-semibold">The real picture: </span>
                Over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}, you'll pay{' '}
                <span className="text-white font-semibold">
                  {formatCurrency(results.monthlyPayment * Math.min(ownershipYears * 12, loanTerm))}
                </span>{' '}
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
