import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  estimateCurrentValue,
  estimateInsurance,
  computeAnnualFuel,
  generateMaintenanceByYear,
  computeAnnualRegistration,
  classifySegment,
  requiresPremiumFuel,
} from '../../utils/vehicleCosts'
import EmailCaptureModal from '../EmailCaptureModal'

const CARS = [
  { label: 'Toyota Camry Hybrid 2024',   make: 'Toyota',        model: 'Camry Hybrid', year: 2024, price: 32000, isEV: false, mpg: 46,   mpge: null },
  { label: 'Toyota Corolla 2024',         make: 'Toyota',        model: 'Corolla',      year: 2024, price: 22000, isEV: false, mpg: 31,   mpge: null },
  { label: 'Toyota RAV4 2024',            make: 'Toyota',        model: 'RAV4',         year: 2024, price: 30000, isEV: false, mpg: 30,   mpge: null },
  { label: 'Toyota Tacoma 2024',          make: 'Toyota',        model: 'Tacoma',       year: 2024, price: 33000, isEV: false, mpg: 23,   mpge: null },
  { label: 'Toyota 4Runner 2024',         make: 'Toyota',        model: '4Runner',      year: 2024, price: 42000, isEV: false, mpg: 17,   mpge: null },
  { label: 'Honda Civic 2024',            make: 'Honda',         model: 'Civic',        year: 2024, price: 24000, isEV: false, mpg: 36,   mpge: null },
  { label: 'Honda CR-V Hybrid 2024',      make: 'Honda',         model: 'CR-V Hybrid',  year: 2024, price: 34000, isEV: false, mpg: 40,   mpge: null },
  { label: 'Tesla Model 3 RWD 2024',      make: 'Tesla',         model: 'Model 3',      year: 2024, price: 40000, isEV: true,  mpg: null, mpge: 132  },
  { label: 'Tesla Model Y AWD 2024',      make: 'Tesla',         model: 'Model Y',      year: 2024, price: 48000, isEV: true,  mpg: null, mpge: 122  },
  { label: 'Chevrolet Bolt EV 2024',      make: 'Chevrolet',     model: 'Bolt EV',      year: 2024, price: 27000, isEV: true,  mpg: null, mpge: 120  },
  { label: 'Hyundai Ioniq 6 2024',        make: 'Hyundai',       model: 'Ioniq 6',      year: 2024, price: 39000, isEV: true,  mpg: null, mpge: 140  },
  { label: 'Subaru Outback 2024',         make: 'Subaru',        model: 'Outback',      year: 2024, price: 28000, isEV: false, mpg: 30,   mpge: null },
  { label: 'Mazda CX-5 2024',             make: 'Mazda',         model: 'CX-5',         year: 2024, price: 29000, isEV: false, mpg: 28,   mpge: null },
  { label: 'Ford F-150 2024',             make: 'Ford',          model: 'F-150',        year: 2024, price: 36000, isEV: false, mpg: 21,   mpge: null },
  { label: 'Jeep Wrangler 2024',          make: 'Jeep',          model: 'Wrangler',     year: 2024, price: 34000, isEV: false, mpg: 18,   mpge: null },
  { label: 'BMW 3 Series 2024',           make: 'BMW',           model: '3 Series',     year: 2024, price: 44000, isEV: false, mpg: 26,   mpge: null },
  { label: 'Mercedes-Benz C-Class 2024',  make: 'Mercedes-Benz', model: 'C-Class',      year: 2024, price: 46000, isEV: false, mpg: 27,   mpge: null },
]

const MILES_OPTIONS = [
  { label: '8k',  value: 8000  },
  { label: '12k', value: 12000 },
  { label: '15k', value: 15000 },
  { label: '20k', value: 20000 },
  { label: '25k', value: 25000 },
]

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

const CATS = [
  { key: 'depreciation',     label: 'Depreciation',  color: '#FFB800' },
  { key: 'totalFuel',        label: 'Fuel / charge', color: '#5FE0B8' },
  { key: 'totalInsurance',   label: 'Insurance',     color: '#7BC8FF' },
  { key: 'totalMaintenance', label: 'Maintenance',   color: '#FF8A7A' },
  { key: 'totalReg',         label: 'Reg. & taxes',  color: '#C8A0FF' },
  { key: 'totalInterest',    label: 'Financing',     color: '#FFE066' },
]

function calcTCO(car, state, miles) {
  const { price, make, model, year, isEV, mpg, mpge } = car
  const YEARS = 5

  const finalValue    = estimateCurrentValue(price, make, model, YEARS)
  const depreciation  = Math.round(price - finalValue)

  const annualIns     = estimateInsurance(price, make, model, year, state)
  const totalInsurance = Math.round(annualIns * YEARS)

  const isPremium     = requiresPremiumFuel(make, model)
  const annualFuel    = computeAnnualFuel(isEV, mpg, mpge, state, miles, null, isPremium)
  const totalFuel     = Math.round(annualFuel * YEARS)

  const segment       = classifySegment(make, model)
  const maintArr      = generateMaintenanceByYear(isEV, miles, segment, make, YEARS)
  const totalMaintenance = Math.round(maintArr.reduce((s, v) => s + v, 0))

  let totalReg = 0
  for (let y = 1; y <= YEARS; y++) {
    totalReg += computeAnnualRegistration(state, estimateCurrentValue(price, make, model, y))
  }
  totalReg = Math.round(totalReg)

  const loanAmt  = price * 0.80
  const mr       = 0.065 / 12
  const n        = 60
  const monthly  = loanAmt * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1)
  const totalInterest = Math.round(monthly * n - loanAmt)

  const total = depreciation + totalInsurance + totalFuel + totalMaintenance + totalReg + totalInterest
  return { depreciation, totalInsurance, totalFuel, totalMaintenance, totalReg, totalInterest, total }
}

const fmt = n => '$' + Math.round(n).toLocaleString()

export default function LiveTCOPreview() {
  const [idxA, setIdxA]       = useState(0)   // Camry Hybrid
  const [idxB, setIdxB]       = useState(15)  // BMW 3 Series
  const [miles, setMiles]     = useState(12000)
  const [state, setState]     = useState('CA')
  const [modalOpen, setModal] = useState(false)

  const carA = CARS[idxA]
  const carB = CARS[idxB]

  const rA = useMemo(() => calcTCO(carA, state, miles), [carA, state, miles])
  const rB = useMemo(() => calcTCO(carB, state, miles), [carB, state, miles])

  const aWins  = rA.total <= rB.total
  const savings = Math.abs(rA.total - rB.total)
  const wealth  = Math.round(savings * Math.pow(1.07, 25))
  const winner  = aWins ? carA : carB

  const maxes = CATS.reduce((acc, c) => {
    acc[c.key] = Math.max(rA[c.key], rB[c.key], 1)
    return acc
  }, {})

  return (
    <>
      <section id="preview" className="py-28">
        <div className="max-w-[1240px] mx-auto px-7">
          <div className="section-eyebrow">Live calculator — no signup</div>
          <h2 className="section-h font-display">Run your numbers right now.</h2>
          <p className="section-sub">
            Pick any two vehicles and see the real 5-year cost breakdown instantly.
            These are not estimates — they use the same calculation engine as the full app.
          </p>

          {/* Controls */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Car A
              </label>
              <select value={idxA} onChange={e => setIdxA(+e.target.value)} className="input-field text-sm">
                {CARS.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Car B
              </label>
              <select value={idxB} onChange={e => setIdxB(+e.target.value)} className="input-field text-sm">
                {CARS.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Miles / year
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {MILES_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setMiles(o.value)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: miles === o.value ? 'var(--accent)' : 'var(--surface)',
                      color:      miles === o.value ? '#080809'       : 'var(--text-muted)',
                      border:     `1px solid ${miles === o.value ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Your state
              </label>
              <select value={state} onChange={e => setState(e.target.value)} className="input-field text-sm">
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Results window */}
          <div className="tco-preview">
            <div className="tco-window">
              <div className="tco-header">
                <div className="tco-dots"><span /><span /><span /></div>
                <div className="tco-url">
                  <span className="lock">🔒</span>
                  cashpedal.io · live comparison
                </div>
                <div style={{ width: 40 }} />
              </div>

              <div className="tco-body">
                <h3 className="tco-title font-display">
                  {carA.model} vs {carB.model}
                </h3>
                <p className="tco-subtitle">
                  5-year forecast · {(miles / 1000).toFixed(0)}k mi/yr · {state} · 6.5% APR / 20% down · live data
                </p>

                <div className="grid md:grid-cols-2 gap-5">
                  {[
                    { car: carA, r: rA, wins: aWins  },
                    { car: carB, r: rB, wins: !aWins },
                  ].map(({ car, r, wins }) => (
                    <div key={car.label} className={`tco-car car-visual-wrap ${wins ? 'tco-car--winner' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-display font-bold text-[17px]">{car.model}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {car.make} · {car.isEV ? 'Electric' : `${car.mpg} MPG`} · {fmt(car.price)} MSRP
                          </div>
                        </div>
                        {wins && (
                          <span className="text-[10px] font-extrabold tracking-widest px-2 py-1 rounded shrink-0 ml-2"
                            style={{ background: 'var(--success)', color: '#07251e' }}>
                            WINNER
                          </span>
                        )}
                      </div>

                      <div className="tco-bars">
                        {CATS.map(cat => (
                          <div key={cat.key} className="tco-bar-row">
                            <div className="tco-bar-label">{cat.label}</div>
                            <div className="tco-bar-track">
                              <div
                                className="tco-bar-fill"
                                style={{
                                  width: `${Math.round((r[cat.key] / maxes[cat.key]) * 100)}%`,
                                  background: cat.color,
                                  transition: 'width 0.35s ease',
                                }}
                              />
                            </div>
                            <div className="tco-bar-val">{fmt(r[cat.key])}</div>
                          </div>
                        ))}
                      </div>

                      <div className="tco-total-row">
                        <div>
                          <div className="tco-total-label">True 5-yr cost</div>
                          <div className="tco-total-sub">
                            ${(r.total / (miles * 5)).toFixed(2)} / mile
                          </div>
                        </div>
                        <div className="tco-total-val">{fmt(r.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {savings > 0 && (
                  <div className="verdict">
                    <div className="verdict-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
                      </svg>
                    </div>
                    <div className="verdict-text">
                      <div className="v-label">Wealth impact</div>
                      <div className="v-line">
                        Pick the {winner.model} and invest the{' '}
                        <span className="num">{fmt(savings)}</span> savings — at 7% real return over
                        25 years that becomes <span className="gold">{fmt(wealth)}</span>.
                      </div>
                    </div>
                    <div className="verdict-cta">
                      <span>Your future self thanks you</span>
                      <strong>+{fmt(wealth)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Post-calculator nudge */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="font-display font-semibold text-white text-[15px]">This is the free preview.</div>
              <div className="text-sm text-[var(--text-muted)] mt-0.5">
                The full pass adds sensitivity sliders, year-by-year breakdowns, PDF export, and up to 5 cars at once.
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/tco" className="btn-ghost text-sm py-2.5 px-4">
                More free comparisons →
              </Link>
              <button onClick={() => setModal(true)} className="btn-primary text-sm py-2.5 px-4">
                Full report — $19 →
              </button>
            </div>
          </div>
        </div>
      </section>

      <EmailCaptureModal isOpen={modalOpen} onClose={() => setModal(false)} />
    </>
  )
}
