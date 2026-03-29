import { useState, useMemo } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PaywallModal from '../components/PaywallModal'
import { useSubscription } from '../hooks/useSubscription'
import { maintenanceItems, sellerQuestions } from '../data/checklistData'
import VEHICLES from '../data/vehicles.json'

const MAKES = Object.keys(VEHICLES).sort()
function getModels(make) { return make ? Object.keys(VEHICLES[make] ?? {}).sort() : [] }
function getAvailableYears(make, model) {
  const d = VEHICLES[make]?.[model]
  if (!d) return []
  return Object.keys(d.trims_by_year).sort((a, b) => b - a)
}
function getTrims(make, model, year) {
  const d = VEHICLES[make]?.[model]
  if (!d || !year) return {}
  return d.trims_by_year[year] ?? {}
}

const FREE_CHECKLIST_LIMIT = 5
const LS_CHECKLIST_COUNT   = 'cashpedal_checklist_count'

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const statusOptions = [
  { value: 'unknown', label: '❓ Unknown', color: 'text-[var(--text-muted)]' },
  { value: 'confirmed', label: '✅ Confirmed', color: 'text-green-400' },
  { value: 'not_done', label: '❌ Not Done', color: 'text-red-400' },
]

const importanceBadge = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  medium: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30',
}

export default function CarBuyingChecklist() {
  const { isSubscribed } = useSubscription()

  const [checklistCount, setChecklistCount] = useState(() =>
    parseInt(localStorage.getItem(LS_CHECKLIST_COUNT) || '0', 10)
  )
  const [showPaywall, setShowPaywall] = useState(false)

  const [step, setStep] = useState('input') // input | checklist
  const [vehicleInfo, setVehicleInfo] = useState({ year: '', make: '', model: '', trim: '', mileage: 80000, price: '' })
  const [statuses, setStatuses] = useState({})
  const [notes, setNotes] = useState({})
  const [activeTab, setActiveTab] = useState('maintenance')

  const categories = useMemo(() => {
    const cats = {}
    maintenanceItems.forEach(item => {
      if (!cats[item.category]) cats[item.category] = []
      cats[item.category].push(item)
    })
    return cats
  }, [])

  // Items that should have been done by this mileage
  const dueItems = useMemo(() =>
    maintenanceItems.filter(item => vehicleInfo.mileage >= item.interval),
    [vehicleInfo.mileage]
  )

  // Items due in the next year (~12,000 miles)
  const upcomingItems = useMemo(() =>
    maintenanceItems.filter(item => {
      const milesTilDue = item.interval - (vehicleInfo.mileage % item.interval)
      return milesTilDue <= 12000 && !dueItems.includes(item)
    }),
    [vehicleInfo.mileage, dueItems]
  )

  const confirmed = dueItems.filter(i => statuses[i.id] === 'confirmed')
  const notDone = dueItems.filter(i => statuses[i.id] === 'not_done')
  const unknown = dueItems.filter(i => !statuses[i.id] || statuses[i.id] === 'unknown')

  const negotiationSavings = notDone.reduce((s, i) => s + i.cost, 0) +
    unknown.reduce((s, i) => s + i.cost * 0.5, 0)

  function handleStart(e) {
    e.preventDefault()
    if (!isSubscribed && checklistCount >= FREE_CHECKLIST_LIMIT) {
      setShowPaywall(true)
      return
    }
    const next = checklistCount + 1
    setChecklistCount(next)
    localStorage.setItem(LS_CHECKLIST_COUNT, String(next))
    setStep('checklist')
  }

  if (step === 'input') {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        {showPaywall && (
          <PaywallModal
            feature="checklist"
            usedCount={FREE_CHECKLIST_LIMIT}
            cancelPath="/checklist"
            onUnlocked={() => setShowPaywall(false)}
          />
        )}
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-20 pb-16">
          <div className="max-w-xl w-full">
            <div className="anim-0 text-4xl mb-4">🔍</div>
            <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">
              Used Car Buying Checklist
            </h1>
            <p className="anim-2 text-[var(--text-muted)] text-base mb-8 leading-relaxed">
              Enter the vehicle details and we'll generate a maintenance checklist, negotiation leverage calculator,
              and the critical questions to ask before you buy.
            </p>

            <form onSubmit={handleStart} className="card anim-3 flex flex-col gap-5">
              <h2 className="font-display font-bold text-white text-lg">Vehicle Info</h2>
              <div className="h-px bg-[var(--border)]" />

              {/* Make */}
              <div>
                <label className="input-label">Make</label>
                <select
                  className="input-field"
                  value={vehicleInfo.make}
                  onChange={e => setVehicleInfo(v => ({ ...v, make: e.target.value, model: '', year: '', trim: '' }))}
                  required
                >
                  <option value="">Select make…</option>
                  {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Model */}
              {vehicleInfo.make && (
                <div>
                  <label className="input-label">Model</label>
                  <select
                    className="input-field"
                    value={vehicleInfo.model}
                    onChange={e => setVehicleInfo(v => ({ ...v, model: e.target.value, year: '', trim: '' }))}
                    required
                  >
                    <option value="">Select model…</option>
                    {getModels(vehicleInfo.make).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Year */}
              {vehicleInfo.model && (
                <div>
                  <label className="input-label">Year</label>
                  <select
                    className="input-field"
                    value={vehicleInfo.year}
                    onChange={e => setVehicleInfo(v => ({ ...v, year: e.target.value, trim: '' }))}
                    required
                  >
                    <option value="">Select year…</option>
                    {getAvailableYears(vehicleInfo.make, vehicleInfo.model).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trim */}
              {vehicleInfo.year && (
                <div>
                  <label className="input-label">Trim</label>
                  <select
                    className="input-field"
                    value={vehicleInfo.trim}
                    onChange={e => {
                      const t = e.target.value
                      const msrp = getTrims(vehicleInfo.make, vehicleInfo.model, vehicleInfo.year)[t] ?? ''
                      setVehicleInfo(v => ({ ...v, trim: t, price: msrp ? String(msrp) : v.price }))
                    }}
                    required
                  >
                    <option value="">Select trim…</option>
                    {Object.entries(getTrims(vehicleInfo.make, vehicleInfo.model, vehicleInfo.year)).map(([t, price]) => (
                      <option key={t} value={t}>{t} — ${price.toLocaleString()}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="input-label" style={{ margin: 0 }}>Current Mileage</label>
                  <span className="text-sm font-bold text-white">{vehicleInfo.mileage.toLocaleString()} mi</span>
                </div>
                <input
                  type="range" min={0} max={300000} step={1000}
                  value={vehicleInfo.mileage}
                  onChange={e => setVehicleInfo(v => ({ ...v, mileage: Number(e.target.value) }))}
                  style={{ background: `linear-gradient(to right, var(--accent) ${(vehicleInfo.mileage / 300000) * 100}%, var(--border) ${(vehicleInfo.mileage / 300000) * 100}%)` }}
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>0</span><span>300,000</span>
                </div>
              </div>

              <div>
                <label className="input-label">Asking Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">$</span>
                  <input
                    type="number"
                    value={vehicleInfo.price}
                    onChange={e => setVehicleInfo(v => ({ ...v, price: e.target.value }))}
                    placeholder="18,000"
                    className="input-field"
                    style={{ paddingLeft: '1.75rem' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary justify-center py-4">
                Generate My Checklist →
              </button>

              {!isSubscribed && (
                <p className="text-center text-[var(--text-muted)] text-xs mt-1">
                  {Math.max(0, FREE_CHECKLIST_LIMIT - checklistCount)} of {FREE_CHECKLIST_LIMIT} free checklists remaining
                  {checklistCount >= FREE_CHECKLIST_LIMIT && (
                    <> · <a href="/subscribe" className="text-[var(--accent)] hover:underline">Subscribe for unlimited</a></>
                  )}
                </p>
              )}
            </form>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const vehicleLabel = [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model, vehicleInfo.trim].filter(Boolean).join(' ') || 'Your Vehicle'

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-1">Checklist</p>
              <h1 className="font-display font-extrabold text-white text-2xl sm:text-3xl">{vehicleLabel}</h1>
              <p className="text-[var(--text-muted)] text-sm mt-1">{vehicleInfo.mileage.toLocaleString()} miles</p>
            </div>
            <button onClick={() => setStep('input')} className="btn-ghost text-sm shrink-0">
              ← Start Over
            </button>
          </div>

          {/* Negotiation leverage banner */}
          <div
            className="rounded-xl p-5 mb-6 border"
            style={{ background: 'rgba(255,184,0,0.04)', borderColor: 'rgba(255,184,0,0.2)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Negotiation Leverage</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[var(--text-muted)] text-xs mb-1">Confirmed done</p>
                <p className="font-display font-bold text-green-400 text-xl">{confirmed.length}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-xs mb-1">Not done</p>
                <p className="font-display font-bold text-red-400 text-xl">{notDone.length}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-xs mb-1">Unknown</p>
                <p className="font-display font-bold text-yellow-400 text-xl">{unknown.length}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-xs mb-1">Suggested reduction</p>
                <p className="font-display font-bold text-[var(--accent)] text-xl">{fmt(negotiationSavings)}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Reduction = all "not done" costs + 50% of "unknown" costs. Use this as your negotiation floor.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {[
              { key: 'maintenance', label: `Maintenance Due (${dueItems.length})` },
              { key: 'upcoming', label: `Coming Up (${upcomingItems.length})` },
              { key: 'questions', label: 'Seller Questions' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
                  activeTab === key
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Maintenance due tab */}
          {activeTab === 'maintenance' && (
            <div className="flex flex-col gap-3">
              {dueItems.length === 0 ? (
                <div className="card text-center py-10">
                  <p className="text-[var(--text-muted)]">No maintenance items appear due at {vehicleInfo.mileage.toLocaleString()} miles.</p>
                </div>
              ) : (
                Object.entries(
                  dueItems.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = []
                    acc[item.category].push(item)
                    return acc
                  }, {})
                ).map(([cat, items]) => (
                  <div key={cat} className="card">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">{cat}</p>
                    <div className="flex flex-col gap-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${item.critical ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                {item.name}
                              </span>
                              {item.critical && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                                  Critical
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Due every {item.interval.toLocaleString()} mi · Est. {fmt(item.cost)}
                            </p>
                          </div>
                          <select
                            value={statuses[item.id] || 'unknown'}
                            onChange={e => setStatuses(s => ({ ...s, [item.id]: e.target.value }))}
                            className="input-field text-xs py-1.5 w-auto shrink-0"
                            style={{ width: 'auto', minWidth: '140px' }}
                          >
                            {statusOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Upcoming tab */}
          {activeTab === 'upcoming' && (
            <div className="flex flex-col gap-3">
              {upcomingItems.length === 0 ? (
                <div className="card text-center py-10">
                  <p className="text-[var(--text-muted)]">No upcoming maintenance in the next 12,000 miles.</p>
                </div>
              ) : (
                <div className="card">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                    Services due in the next 12,000 miles
                  </p>
                  <div className="flex flex-col gap-4">
                    {upcomingItems.map(item => {
                      const milesTilDue = item.interval - (vehicleInfo.mileage % item.interval)
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Due in ~{milesTilDue.toLocaleString()} miles · Est. {fmt(item.cost)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full"
                                style={{ width: `${100 - (milesTilDue / 12000) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1">approaching</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seller questions tab */}
          {activeTab === 'questions' && (
            <div className="flex flex-col gap-4">
              {sellerQuestions.map(section => (
                <div key={section.category} className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <p className="font-display font-bold text-white text-base">{section.category}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${importanceBadge[section.importance]}`}>
                      {section.importance}
                    </span>
                  </div>
                  <div className="flex flex-col gap-5">
                    {section.questions.map((item, qi) => (
                      <div key={qi}>
                        <p className="text-sm font-semibold text-white mb-1">{item.q}</p>
                        <p className="text-xs text-[var(--text-muted)] mb-2 leading-relaxed">{item.why}</p>
                        <textarea
                          value={notes[`${section.category}-${qi}`] || ''}
                          onChange={e => setNotes(n => ({ ...n, [`${section.category}-${qi}`]: e.target.value }))}
                          placeholder="Seller's answer..."
                          rows={2}
                          className="input-field text-sm resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
