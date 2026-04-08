import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import VEHICLES from '../data/vehicles.json'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Monthly payment (standard loan amortization)
function monthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12 / 100
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// ── Pro mode cost estimation ─────────────────────────────

// Brand-specific annual insurance multipliers (relative to $1,450 national avg)
const INS_BRAND_MULT = {
  BMW: 1.28, 'Mercedes-Benz': 1.32, Audi: 1.22, Porsche: 1.35, Maserati: 1.45,
  Lexus: 1.15, Acura: 1.10, Infiniti: 1.10, Cadillac: 1.18, Lincoln: 1.12,
  'Land Rover': 1.25, Jaguar: 1.26, 'Alfa Romeo': 1.20, Genesis: 1.12, Volvo: 1.10,
  Ford: 1.05, Jeep: 1.08, Ram: 1.08, Dodge: 1.18, GMC: 1.02,
  Chevrolet: 1.00, Buick: 0.95, Chrysler: 1.05,
  Toyota: 0.88, Honda: 0.88, Subaru: 0.93, Mazda: 0.93,
  Hyundai: 0.85, Kia: 0.85, Nissan: 0.96, Mitsubishi: 0.90,
  Tesla: 1.18, Rivian: 1.22, Lucid: 1.30, Polestar: 1.18,
}

// Price brackets → insurance value multiplier
const INS_VALUE_BRACKETS = [
  [0, 15000, 0.82],
  [15000, 30000, 1.00],
  [30000, 50000, 1.18],
  [50000, 80000, 1.38],
  [80000, Infinity, 1.62],
]

// Annual maintenance cost base by brand tier
const MAINT_LUXURY_MAKES = new Set(['BMW','Mercedes-Benz','Audi','Porsche','Lexus','Land Rover',
  'Jaguar','Maserati','Alfa Romeo','Genesis','Lucid','Rivian'])
const MAINT_PREMIUM_MAKES = new Set(['Acura','Infiniti','Volvo','Lincoln','Cadillac','Tesla','Buick','Mini','Polestar'])
const MAINT_ECONOMY_MAKES = new Set(['Kia','Hyundai','Nissan','Mitsubishi','Fiat','Chrysler'])

const MAINT_BASE_ANNUAL = { luxury: 2200, premium: 1400, standard: 950, economy: 720 }
const MAINT_EV_DISCOUNT = 0.55 // EVs ~45% less maintenance

function determineMaintTier(make) {
  if (MAINT_LUXURY_MAKES.has(make)) return 'luxury'
  if (MAINT_PREMIUM_MAKES.has(make)) return 'premium'
  if (MAINT_ECONOMY_MAKES.has(make)) return 'economy'
  return 'standard'
}

// Monthly fuel by vehicle type
const FUEL_BY_TYPE = {
  electric: 58,   // avg electricity cost to charge
  hybrid:   90,
  truck:    210,
  suv:      170,
  luxury_suv: 180,
  sports:   175,
  compact:  115,
  economy:  100,
  sedan:    130,
}

function classifyType(make, model, isEv, rawType) {
  if (isEv) return 'electric'
  const m = (model ?? '').toLowerCase()
  const mk = (make ?? '').toLowerCase()
  if (m.includes('hybrid') || m.includes('phev') || m.includes('4xe') ||
      ['prius','insight','sienna','maverick'].some(k => m.includes(k))) return 'hybrid'
  if (['corvette','mustang','camaro','challenger','charger','911','cayman',
       'boxster','z4','supra','miata','mx-5','gt-r','370z','400z','brz','gr86','nsx']
    .some(k => m.includes(k))) return 'sports'
  if (['f-150','f-250','f-350','silverado','sierra','ram 1500','ram 2500',
       'tundra','tacoma','frontier','ridgeline','gladiator','ranger','colorado','canyon','titan']
    .some(k => m.includes(k))) return 'truck'
  const luxBrands = ['bmw','mercedes-benz','audi','lexus','acura','infiniti','cadillac',
    'lincoln','jaguar','land rover','porsche','maserati','alfa romeo','genesis']
  if (luxBrands.includes(mk)) {
    const luxSuvKw = ['x1','x2','x3','x4','x5','x6','x7','gla','glb','glc','gle','gls',
      'q3','q4','q5','q7','q8','ux','nx','rx','gx','lx','rdx','mdx','qx50','qx55','qx60',
      'qx80','navigator','nautilus','aviator','corsair','cayenne','macan','e-pace','f-pace',
      'range rover','discovery','defender','escalade','xt4','xt5','xt6','gv70','gv80']
    return luxSuvKw.some(k => m.includes(k)) ? 'luxury_suv' : 'luxury'
  }
  const suvKw = ['suburban','tahoe','yukon','pilot','highlander','rav4','cr-v','explorer',
    'expedition','escape','equinox','traverse','pathfinder','armada','palisade','telluride',
    'sorento','santa fe','tucson','cx-5','cx-9','cx-50','outback','forester','ascent',
    'wrangler','grand cherokee','durango','atlas','tiguan','4runner','sequoia','land cruiser']
  if (suvKw.some(k => m.includes(k))) return 'suv'
  if (rawType === 'suv') return 'suv'
  if (['civic','corolla','elantra','sentra','forte','jetta','golf','mazda3','impreza'].some(k => m.includes(k))) return 'compact'
  if (['spark','mirage','rio','versa','accent','yaris','fit'].some(k => m.includes(k))) return 'economy'
  return rawType || 'sedan'
}

function estimateProMonthlyCosts(price, make, model, isEv, rawType) {
  const vehicleType = classifyType(make, model, isEv, rawType)
  const fuel = FUEL_BY_TYPE[vehicleType] ?? 130

  const [,, valueMult] = INS_VALUE_BRACKETS.find(([mn, mx]) => price >= mn && price < mx) ?? [0, 0, 1.0]
  const brandMult = INS_BRAND_MULT[make] ?? 1.0
  const annualIns = Math.round(1450 * valueMult * brandMult / 50) * 50
  const insurance = Math.round(annualIns / 12)

  const maintTier = determineMaintTier(make)
  const annualMaint = MAINT_BASE_ANNUAL[maintTier] * (isEv ? MAINT_EV_DISCOUNT : 1.0)
  const maintenance = Math.round(annualMaint / 12)

  const registration = price >= 80000 ? 55 : price >= 50000 ? 40 : price >= 30000 ? 30 : 20

  return {
    fuel,
    insurance,
    maintenance,
    registration,
    total: fuel + insurance + maintenance + registration,
    vehicleType,
    maintTier,
  }
}

// Generic tier-based estimates (basic mode, unchanged)
function estimateAdditionalMonthlyCosts(vehiclePrice) {
  if (vehiclePrice >= 60000) {
    return { fuel: 250, insurance: 280, maintenance: 180, registration: 50, total: 760, tier: 'Luxury' }
  } else if (vehiclePrice >= 35000) {
    return { fuel: 180, insurance: 180, maintenance: 120, registration: 35, total: 515, tier: 'Premium' }
  } else if (vehiclePrice >= 20000) {
    return { fuel: 150, insurance: 130, maintenance: 80, registration: 25, total: 385, tier: 'Standard' }
  } else {
    return { fuel: 120, insurance: 100, maintenance: 60, registration: 20, total: 300, tier: 'Economy' }
  }
}

const loanTermOptions = [
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
  { value: 72, label: '72 months' },
]

const TYPE_LABELS = {
  electric: 'Electric', hybrid: 'Hybrid', truck: 'Truck', suv: 'SUV',
  luxury_suv: 'Luxury SUV', sports: 'Sports', compact: 'Compact',
  economy: 'Economy', sedan: 'Sedan', luxury: 'Luxury',
}

export default function SalaryCalculator() {
  // Finance mode
  const [mode, setMode] = useState('buy')

  // Pro mode
  const [proMode, setProMode] = useState(false)
  const [selMake, setSelMake] = useState('')
  const [selModel, setSelModel] = useState('')
  const [selYear, setSelYear] = useState('')
  const [selTrim, setSelTrim] = useState('')

  // Buy inputs
  const [vehiclePrice, setVehiclePrice] = useState(30000)
  const [downPct, setDownPct] = useState(20)
  const [loanTerm, setLoanTerm] = useState(48)
  const [rate, setRate] = useState(6.5)

  // Lease inputs
  const [leaseMsrp, setLeaseMsrp] = useState(30000)
  const [leaseMonthly, setLeaseMonthly] = useState(400)
  const [leaseTerm, setLeaseTerm] = useState(36)

  // Cascade: make → model → year → trim
  const makes = useMemo(() => Object.keys(VEHICLES).sort(), [])

  const models = useMemo(() => {
    if (!selMake) return []
    return Object.keys(VEHICLES[selMake] || {}).sort()
  }, [selMake])

  const years = useMemo(() => {
    if (!selMake || !selModel) return []
    const trimsByYear = VEHICLES[selMake]?.[selModel]?.trims_by_year || {}
    return Object.keys(trimsByYear).sort((a, b) => Number(b) - Number(a))
  }, [selMake, selModel])

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

  // When trim selected, auto-populate price field
  useEffect(() => {
    if (!proMode || !selectedVehicleInfo?.price) return
    const p = selectedVehicleInfo.price
    if (mode === 'lease') setLeaseMsrp(p)
    else setVehiclePrice(p)
  }, [proMode, selectedVehicleInfo?.price, mode])

  // Reset cascade on upstream change
  function handleMakeChange(v) { setSelMake(v); setSelModel(''); setSelYear(''); setSelTrim('') }
  function handleModelChange(v) { setSelModel(v); setSelYear(''); setSelTrim('') }
  function handleYearChange(v) { setSelYear(v); setSelTrim('') }

  const activePrice = mode === 'lease' ? leaseMsrp : vehiclePrice

  const proExtras = useMemo(() => {
    if (!proMode || !selectedVehicleInfo) return null
    const { make, model, is_ev, type } = selectedVehicleInfo
    return estimateProMonthlyCosts(activePrice, make, model, is_ev, type)
  }, [proMode, selectedVehicleInfo, activePrice])

  const results = useMemo(() => {
    const extra = proExtras
      ? { ...proExtras, tier: TYPE_LABELS[proExtras.vehicleType] ?? 'Vehicle' }
      : mode === 'lease'
        ? estimateAdditionalMonthlyCosts(leaseMsrp)
        : estimateAdditionalMonthlyCosts(vehiclePrice)

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
        downPayment: null,
        loanAmount: null,
      }
    }
    const downPayment = vehiclePrice * (downPct / 100)
    const loanAmount = vehiclePrice - downPayment
    const payment = monthlyPayment(loanAmount, rate, loanTerm)
    const totalMonthly = payment + extra.total
    return {
      downPayment,
      loanAmount,
      payment,
      extra,
      totalMonthly,
      conservative: (totalMonthly / 0.10) * 12,
      comfortable: (totalMonthly / 0.15) * 12,
      aggressive: (totalMonthly / 0.20) * 12,
      conservativeMonthly: totalMonthly / 0.10,
    }
  }, [mode, vehiclePrice, downPct, loanTerm, rate, leaseMsrp, leaseMonthly, leaseTerm, proExtras])

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
            {mode === 'lease'
              ? 'Enter your lease payment and see the gross income needed to keep vehicle costs under 10–20% of your salary.'
              : 'The 20/4/10 rule: 20% down, max 4-year loan, total vehicle costs ≤ 10% of gross income. See the salary you need.'}
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">

            {/* Inputs */}
            <div className="card anim-3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-white text-lg">Vehicle Details</h2>
                {/* Pro toggle */}
                <button
                  onClick={() => setProMode(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={{
                    background: proMode ? 'var(--accent)' : 'transparent',
                    color: proMode ? '#000' : 'var(--text-muted)',
                    borderColor: proMode ? 'var(--accent)' : 'var(--border)',
                  }}
                >
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
                    className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: mode === opt.value ? 'var(--accent)' : 'transparent',
                      color: mode === opt.value ? '#000' : 'var(--text-muted)',
                    }}>
                    {opt.label}
                  </button>
                ))}
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
                            <span>{selectedVehicleInfo.mpg} mpg</span>
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

                  {/* Monthly lease payment */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">Monthly Lease Payment</label>
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
                      Total lease cost: {fmt(leaseMonthly * leaseTerm)} · No equity at lease end
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

              {/* Monthly cost breakdown */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Estimated monthly costs · {results.extra.tier} tier
                  </p>
                  {proMode && selectedVehicleInfo?.make && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)', border: '1px solid rgba(200,255,0,0.25)' }}>
                      Pro estimates
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: mode === 'lease' ? 'Lease payment' : 'Loan payment', val: results.payment },
                    { label: results.extra.vehicleType === 'electric' ? 'Electricity (fuel equiv.)' : 'Fuel', val: results.extra.fuel },
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
                {proMode && selectedVehicleInfo?.make && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                    Estimates use brand-specific insurance rates and maintenance tiers for {selectedVehicleInfo.make}
                    {selectedVehicleInfo.is_ev ? ', adjusted for EV lower fuel and service costs' : ''}.
                  </p>
                )}
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
        </div>
      </main>
      <Footer />
    </div>
  )
}
