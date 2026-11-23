import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { trackEvent } from '../utils/analytics'
import { safeGet, safeSet } from '../utils/safeStorage'
import {
  computeLifestyle, debtPayoffGain, AGE_RANGES, housingMenu, incomeForWishList,
  costCenters, compareProfiles, applyLifeEvents, incomeToKeepLifestyle, HOUSEHOLD_EVENTS,
  moveInCash, emergencyFund, priorityShifts,
} from '../utils/lifestyle.js'
import { SURVEY_QUESTIONS, SURVEY_SECTIONS, STATE_LIST, MODES, LIFE_EVENTS, PILLAR_COLORS } from '../data/lifestyleSurvey'
import { CostCenterChart, ScenarioChart } from '../components/CostCenterChart'

const householdPartnered = p => !!p.married || (!!p.cohabiting && (p.incomes?.length ?? 0) > 1)

// City picker for a state; "Statewide average" keeps the state-level data.
function CitySelect({ state, value, onChange, cities }) {
  const list = cities?.[state] ?? []
  if (!list.length) return null
  return (
    <select className="input-field" value={value} onChange={e => onChange(e.target.value)} aria-label="City">
      <option value="">Statewide average</option>
      {list.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
}

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const STORAGE_KEY = 'cp_lifestyle_profile'

const DEFAULT_FORM = {
  married: false, cohabiting: false, income1: '', income2: '', age: '25-34', state: 'TX',
  children: 0, under6: '', roommates: 0, debt: '', saved: '',
  city: '', destState: '', destCity: '', newIncome: '', newState: '', newCity: '', partnerIncome: '', babies: 1,
}

const PILLARS = [
  { key: 'foundation', label: 'Foundation', sub: 'Housing, bills, groceries, car, debt', color: PILLAR_COLORS.foundation },
  { key: 'lifestyle', label: 'Lifestyle', sub: 'Dining, travel, fun', color: PILLAR_COLORS.lifestyle },
  { key: 'cushion', label: 'Cushion', sub: 'Savings, home fund, safety net', color: PILLAR_COLORS.cushion },
]

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  )
}

function MoneyInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
      <input
        className="input-field" style={{ paddingLeft: '1.75rem' }}
        inputMode="numeric" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button
          key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          className="px-3.5 py-2 rounded-lg border text-sm font-semibold transition-colors"
          style={{
            borderColor: value === o.value ? 'var(--accent)' : 'var(--border)',
            background: value === o.value ? 'var(--accent-muted)' : 'transparent',
            color: value === o.value ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

function PillarBar({ pillars }) {
  const total = pillars.foundation + pillars.lifestyle + pillars.cushion
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden mb-4" role="img" aria-label="Pillar split of monthly take-home pay">
        {PILLARS.map(p => (
          <div key={p.key} style={{ width: `${Math.max(0, pillars[p.key]) / total * 100}%`, background: p.color }} />
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {PILLARS.map(p => (
          <div key={p.key} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{p.label}</span>
            </div>
            <p className="font-display font-bold text-2xl text-white">
              {usd(Math.max(0, pillars[p.key]))}<span className="text-sm font-normal text-[var(--text-muted)]"> /mo</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{p.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// One survey question rendered as tappable cards (priced in the visitor's region)
// or a 1–5 scale.
function Question({ item, ctx, value, onAnswer }) {
  const help = typeof item.help === 'function' ? item.help(ctx) : item.help
  if (item.type === 'scale') {
    return (
      <>
        <h2 className="font-display font-bold text-white text-2xl mb-6 text-center">{item.text}</h2>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} type="button" onClick={() => onAnswer(v)}
              className="py-4 rounded-xl border font-bold text-lg transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]"
              style={{ borderColor: value === v ? 'var(--accent)' : 'var(--border)', color: 'white' }}>{v}</button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>{item.low}</span><span className="text-right">{item.high}</span></div>
      </>
    )
  }
  const options = item.options(ctx)
  return (
    <>
      <h2 className="font-display font-bold text-white text-2xl mb-2">{item.text}</h2>
      {help && <p className="text-sm text-[var(--text-muted)] mb-5">{help}</p>}
      <div className={`grid gap-3 ${help ? '' : 'mt-5'} ${options.length > 3 ? 'sm:grid-cols-2' : ''}`}>
        {options.map(o => {
          const on = value === o.value
          return (
            <button key={String(o.value)} type="button" onClick={() => onAnswer(o.value)}
              className="text-left rounded-xl border p-4 transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-muted)' : 'rgba(255,255,255,0.02)' }}>
              <span className="flex items-center justify-between gap-2">
                <span className="block text-white font-bold">{o.label}</span>
                {o.tag && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] shrink-0">{o.tag}</span>}
              </span>
              {o.sub && <span className="block text-sm text-[var(--text-muted)] mt-1">{o.sub}</span>}
              {o.detail && <span className="block text-sm text-white mt-1.5 tabular-nums">{o.detail}</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Each wish with what the budget can fund.
function TableOfWishes({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
            <th className="py-2 pr-4 font-semibold">Item</th>
            <th className="py-2 pr-4 font-semibold text-right">You want</th>
            <th className="py-2 pr-4 font-semibold text-right">Budget funds</th>
            <th className="py-2 font-semibold text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(w => (
            <tr key={w.key} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2 pr-4 text-white">{w.label}</td>
              <td className="py-2 pr-4 text-white text-right tabular-nums">{usd(w.wish)}</td>
              <td className="py-2 pr-4 text-white text-right tabular-nums">{usd(w.funded)}</td>
              <td className="py-2 text-right whitespace-nowrap" style={{ color: w.funded >= w.wish ? 'var(--success, #5FE0B8)' : 'var(--text-muted)' }}>
                {w.funded >= w.wish ? '✓ Funded' : `▼ ${Math.round((w.funded / w.wish) * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Quick what-if controls on the results page: the same answers as the survey.
function WhatIf({ prefs, r, menu, onChange }) {
  const areas = menu.areas
  const sizes = menu.sizes[prefs.area ?? r.best] ?? menu.sizes['inner-suburb']
  const pick = (key, options, current) => (
    <Segmented value={current} onChange={v => onChange(key, v)} options={options} />
  )
  return (
    <div className="flex flex-col gap-5">
      <Field label="Area">{pick('area', areas.map(a => ({ value: a.type, label: a.label })), prefs.area ?? r.best)}</Field>
      {!menu.roommates && <Field label="Size">{pick('bedrooms', sizes.map(z => ({ value: z.bedrooms, label: z.bedrooms === 0 ? 'Studio' : `${z.bedrooms} BR` })), r.housing.bedrooms)}</Field>}
      <Field label="Cars">{pick('cars', [0, 1, 2, 3].map(n => ({ value: n, label: String(n) })), r.car.cars)}</Field>
      <Field label="Meals out per week">{pick('mealsPerWeek', [[0.5, '≤1'], [2.5, '2–3'], [5, '4–6'], [8, 'Daily']].map(([v, l]) => ({ value: v, label: l })), prefs.mealsPerWeek ?? 2.5)}</Field>
      <Field label="Travel plan">
        <select className="input-field" value={prefs.travelPlan ?? 'weekends'} onChange={e => onChange('travelPlan', e.target.value)} aria-label="Travel plan">
          {menu.travel.plans.map(pl => <option key={pl.id} value={pl.id}>{pl.label} — about {usd(pl.annual)}/yr</option>)}
        </select>
      </Field>
    </div>
  )
}

export default function LifestyleCalculator() {
  const [step, setStep] = useState('mode') // mode | events | profile | survey | results
  const [mode, setMode] = useState(null) // current | dream | change
  const [events, setEvents] = useState([]) // life events, when mode is 'change'
  const [cities, setCities] = useState(null) // { [state]: city rows sorted by population }
  const [form, setForm] = useState(DEFAULT_FORM)
  const [prefs, setPrefs] = useState({}) // survey answers
  const [qKey, setQKey] = useState(null)

  useEffect(() => {
    import('../data/lifestyleCities.json').then(m => {
      const by = {}
      for (const c of m.default.cities) (by[c.state] ??= []).push(c)
      setCities(by)
    }).catch(() => setCities({}))
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(safeGet(STORAGE_KEY) || 'null')
      if (saved?.form) setForm(f => ({ ...f, ...saved.form }))
      if (saved?.prefs) setPrefs(p => ({ ...p, ...saved.prefs }))
    } catch { /* ignore corrupt cache */ }
    // Prefill from the landing entry card (?income=75000&state=TX)
    const qs = new URLSearchParams(window.location.search)
    const income = (qs.get('income') || '').replace(/[^0-9]/g, '')
    const st = (qs.get('state') || '').toUpperCase()
    setForm(f => ({
      ...f,
      ...(income ? { income1: income } : {}),
      ...(STATE_LIST.some(([c]) => c === st) ? { state: st } : {}),
    }))
  }, [])

  const cityRow = (st, id) => (id ? cities?.[st]?.find(c => c.id === id) ?? null : null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const partnered = form.married || form.cohabiting
  const income1 = Number(form.income1) || 0
  const income2 = partnered ? Number(form.income2) || 0 : 0
  const canContinue = income1 > 0

  // Today's household and finances.
  const profile = useMemo(() => ({
    incomes: partnered ? [income1, income2] : [income1],
    age: form.age, state: form.state, married: form.married, cohabiting: form.cohabiting,
    children: form.children, childrenUnder6: form.under6 === '' ? form.children : Math.min(form.under6, form.children), roommates: form.roommates,
    debtMonthly: Number(form.debt) || 0, savedForHome: Number(form.saved) || 0,
    city: cityRow(form.state, form.city),
    prefs,
  }), [form, income1, income2, partnered, cities, prefs])

  // Life events: the life after the change, composed from today's profile.
  const eventInputs = useMemo(() => ({
    newIncome: Number(form.newIncome) || 0,
    jobState: form.newState || '', jobCity: cityRow(form.newState, form.newCity),
    destState: form.destState, destCity: cityRow(form.destState, form.destCity),
    partnerIncome: Number(form.partnerIncome) || 0, babies: form.babies,
  }), [form, cities])
  const after = useMemo(() => (mode === 'change' ? applyLifeEvents(profile, events, eventInputs) : null), [mode, profile, events, eventInputs])
  // Today's profile for comparison. When the household itself changes, the home size
  // they picked for the new life isn't today's, so today's uses the size the household needs.
  const before = useMemo(() => (events.some(e => HOUSEHOLD_EVENTS.includes(e)) ? { ...profile, prefs: { ...prefs, bedrooms: undefined, cars: undefined } } : profile), [profile, events, prefs])
  const activeProfile = after ?? profile
  const changed = !!after && JSON.stringify([after.incomes, after.state, after.city?.id, after.married, after.cohabiting, after.children]) !== JSON.stringify([profile.incomes, profile.state, profile.city?.id, profile.married, profile.cohabiting, profile.children])

  const result = useMemo(() => (step === 'results' && canContinue ? computeLifestyle(activeProfile) : null), [step, activeProfile, canContinue])
  const payoff = useMemo(() => (result ? debtPayoffGain(activeProfile) : null), [result, activeProfile])
  const ownPlace = useMemo(() => (result && !householdPartnered(activeProfile) && (activeProfile.children | 0) === 0 && activeProfile.roommates > 0
    ? computeLifestyle({ ...activeProfile, roommates: 0 }) : null), [result, activeProfile])

  const compare = useMemo(() => (result && changed ? compareProfiles(before, after) : null), [result, changed, before, after])
  const needIncome = useMemo(() => (result && changed ? incomeToKeepLifestyle(before, after) : null), [result, changed, before, after])
  const centers = useMemo(() => (result ? costCenters(result) : []), [result])
  const menu = useMemo(() => housingMenu(activeProfile), [activeProfile])
  const wishIncome = useMemo(() => (result ? incomeForWishList(activeProfile) : null), [result, activeProfile])
  const shifts = useMemo(() => (result ? priorityShifts(activeProfile) : null), [result, activeProfile])
  const modeInfo = MODES.find(m => m.id === mode) ?? null

  function chooseMode(m) {
    setMode(m.id)
    setEvents([])
    trackEvent('lifestyle_mode_selected', { mode: m.id })
    setStep(m.id === 'change' ? 'events' : 'profile')
    window.scrollTo?.({ top: 0 })
  }

  function confirmEvents() {
    const picked = LIFE_EVENTS.filter(e => events.includes(e.id))
    // A move-out seeds the survey with a first-place starting point.
    const seed = picked.find(e => e.prefs)
    if (seed) {
      setPrefs(p => ({ ...seed.prefs, ...p }))
      setForm(f => ({ ...f, roommates: seed.roommates != null && !f.married && !f.cohabiting && f.children === 0 ? seed.roommates : f.roommates }))
    }
    trackEvent('lifestyle_events_selected', { events: events.join(',') })
    setStep('profile')
    window.scrollTo?.({ top: 0 })
  }

  function persist() {
    try { safeSet(STORAGE_KEY, JSON.stringify({ form, prefs, mode, events })) } catch { /* storage blocked */ }
  }

  // Questions visible for a given set of answers (some depend on earlier ones).
  const visibleFor = answers => {
    const m = housingMenu({ ...activeProfile, prefs: answers })
    return SURVEY_QUESTIONS.filter(item => !item.when || item.when({ menu: m, profile: activeProfile, answers }))
  }

  function goSurvey() {
    trackEvent('lifestyle_profile_completed', { mode, state: form.state, partnered, children: form.children })
    setQKey(visibleFor(prefs)[0].key); setStep('survey')
  }

  function finishSurvey() {
    persist()
    trackEvent('lifestyle_survey_completed', { state: form.state, questions: visibleFor(prefs).length })
    setStep('results')
    window.scrollTo?.({ top: 0 })
  }

  function answer(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    const list = visibleFor(next)
    const i = list.findIndex(x => x.key === key)
    if (i >= 0 && i < list.length - 1) setQKey(list[i + 1].key)
    else { setPrefs(next); setStep('results'); persist(); trackEvent('lifestyle_survey_completed', { state: form.state, questions: list.length }); window.scrollTo?.({ top: 0 }) }
  }

  function back() {
    const list = visibleFor(prefs)
    const i = list.findIndex(x => x.key === qKey)
    if (i <= 0) setStep('profile')
    else setQKey(list[i - 1].key)
  }

  const shell = children => (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  )

  // ── Step 0: how do you want to use this? ──
  if (step === 'mode') {
    return shell(
      <>
        <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">See the life your income can build</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">
          Cash Pedal turns your income into a clear, priced picture of your life, wherever you live. What would you like to explore?
        </p>
        <div className="grid gap-3">
          {MODES.map(m => (
            <button key={m.id} type="button" onClick={() => chooseMode(m)}
              className="card text-left flex items-start gap-4 transition-colors hover:border-[var(--accent)]">
              <span className="text-3xl">{m.emoji}</span>
              <span>
                <span className="block text-white font-bold text-lg">{m.label}</span>
                <span className="block text-sm text-[var(--text-muted)]">{m.blurb}</span>
                {m.id === 'change' && (
                  <span className="block text-xs text-[var(--text-muted)] mt-2">
                    {LIFE_EVENTS.map(e => `${e.emoji} ${e.label.replace(/^(Taking|Moving to|Getting|Moving in with|Having|Moving out of) (a |an |my )?/i, '').replace(/^./, c => c.toUpperCase())}`).join(' · ')}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-6">United States only. Estimates for education, not financial advice.</p>
      </>
    )
  }

  // ── Step 0b: which life events? ──
  if (step === 'events') {
    const toggle = id => setEvents(es => (es.includes(id) ? es.filter(x => x !== id) : [...es, id]))
    return shell(
      <>
        <button className="text-sm text-[var(--text-muted)] hover:text-white mb-4" onClick={() => setStep('mode')}>← Back</button>
        <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">What's changing?</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">Pick one or several. We'll compare your life today with your life after.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {LIFE_EVENTS.map(e => {
            const on = events.includes(e.id)
            return (
              <button key={e.id} type="button" onClick={() => toggle(e.id)} aria-pressed={on}
                className="card text-left flex items-start gap-3 transition-colors hover:border-[var(--accent)]"
                style={{ borderColor: on ? 'var(--accent)' : undefined, background: on ? 'var(--accent-muted)' : undefined }}>
                <span className="text-2xl">{e.emoji}</span>
                <span>
                  <span className="block text-white font-bold">{e.label}</span>
                  <span className="block text-sm text-[var(--text-muted)]">{e.blurb}</span>
                </span>
              </button>
            )
          })}
        </div>
        <button className="btn-primary justify-center py-4 w-full mt-6" disabled={events.length === 0} onClick={confirmEvents}>
          Continue →
        </button>
      </>
    )
  }

  // ── Step 1: profile ──
  if (step === 'profile') {
    return shell(
      <>
        <button className="text-sm text-[var(--text-muted)] hover:text-white mb-4" onClick={() => setStep(mode === 'change' ? 'events' : 'mode')}>← {modeInfo?.label}</button>
        <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">{mode === 'change' ? 'Your life today' : 'Your financial profile'}</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">
          {mode === 'change'
            ? "Start with where you are now. We'll ask about the change next."
            : "Tell us a little about you, then what matters most. We'll show the home, neighborhoods, nights out and car your budget supports."}
        </p>
        <div className="card flex flex-col gap-6">
          <Field label="Household">
            <Segmented
              value={form.married ? 'married' : form.cohabiting ? 'cohabit' : 'single'}
              onChange={v => setForm(f => ({ ...f, married: v === 'married', cohabiting: v === 'cohabit', roommates: v === 'single' ? f.roommates : 0 }))}
              options={[{ value: 'single', label: 'Just me' }, { value: 'cohabit', label: 'Living with a partner' }, { value: 'married', label: 'Married' }]}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={partnered ? 'Your gross annual income' : 'Gross annual income'}>
              <MoneyInput value={form.income1} onChange={v => set('income1', v)} placeholder="75000" />
            </Field>
            {partnered && (
              <Field label="Partner's gross annual income" hint="Leave blank if one income.">
                <MoneyInput value={form.income2} onChange={v => set('income2', v)} placeholder="60000" />
              </Field>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Age range">
              <select className="input-field" value={form.age} onChange={e => set('age', e.target.value)}>
                {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="State">
              <select className="input-field" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value, city: '' }))}>
                {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </Field>
            {(cities?.[form.state]?.length ?? 0) > 0 && (
              <Field label="City" hint="Rent, home prices and local price levels for your city.">
                <CitySelect state={form.state} value={form.city} onChange={v => set('city', v)} cities={cities} />
              </Field>
            )}
          </div>
          <Field label="Children">
            <Segmented
              value={form.children}
              onChange={v => setForm(f => ({ ...f, children: v, under6: '', roommates: v ? 0 : f.roommates }))}
              options={[{ value: 0, label: 'None' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3+' }]}
            />
          </Field>
          {form.children > 0 && (
            <Field label="How many are under 6?" hint="Young children are priced at full-time daycare, which costs far more than after-school care.">
              <Segmented
                value={form.under6 === '' ? form.children : Math.min(form.under6, form.children)}
                onChange={v => set('under6', v)}
                options={Array.from({ length: form.children + 1 }, (_, i) => ({ value: i, label: String(i) }))}
              />
            </Field>
          )}
          {!partnered && form.children === 0 && (
            <Field label="Living arrangement" hint="Roommates split rent and utilities, which frees money for the rest of your life.">
              <Segmented
                value={form.roommates}
                onChange={v => set('roommates', v)}
                options={[{ value: 0, label: 'My own place' }, { value: 1, label: '1 roommate' }, { value: 2, label: '2 roommates' }, { value: 3, label: '3 roommates' }]}
              />
            </Field>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Existing debt payments (monthly)" hint="Student loans, car loan, cards — required minimums. Optional.">
              <MoneyInput value={form.debt} onChange={v => set('debt', v)} placeholder="0" />
            </Field>
            <Field label="Saved toward a home (optional)">
              <MoneyInput value={form.saved} onChange={v => set('saved', v)} placeholder="0" />
            </Field>
          </div>
          {mode === 'change' && (
            <div className="rounded-xl border p-4 flex flex-col gap-5" style={{ borderColor: 'var(--accent)' }}>
              <p className="text-xs uppercase tracking-widest font-semibold text-[var(--accent)]">After the change</p>
              {events.includes('job') && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="💼 New job's gross annual income">
                    <MoneyInput value={form.newIncome} onChange={v => set('newIncome', v)} placeholder="95000" />
                  </Field>
                  {!events.includes('city') && (
                    <Field label="Is the job in a different state?" hint="Leave as is if you're not relocating.">
                      <div className="grid gap-3">
                        <select className="input-field" value={form.newState || form.state} onChange={e => setForm(f => ({ ...f, newState: e.target.value === f.state ? '' : e.target.value, newCity: '' }))}>
                          {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                        </select>
                        {form.newState && <CitySelect state={form.newState} value={form.newCity} onChange={v => set('newCity', v)} cities={cities} />}
                      </div>
                    </Field>
                  )}
                </div>
              )}
              {events.includes('city') && (
                <Field label="🚚 Where are you moving?" hint="We'll compare your costs and the pay needed to keep your lifestyle.">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <select className="input-field" value={form.destState} onChange={e => setForm(f => ({ ...f, destState: e.target.value, destCity: '' }))}>
                      <option value="">Choose a state…</option>
                      {STATE_LIST.filter(([c]) => c !== form.state).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                    </select>
                    {form.destState && <CitySelect state={form.destState} value={form.destCity} onChange={v => set('destCity', v)} cities={cities} />}
                  </div>
                </Field>
              )}
              {(events.includes('marriage') || events.includes('cohabit')) && (partnered ? (
                <p className="text-sm text-[var(--text-muted)]">You already share a household with a partner, so we'll keep it as is.</p>
              ) : (
                <Field label={events.includes('marriage') ? "💍 Your spouse's gross annual income" : "🏠 Your partner's gross annual income"}
                  hint={events.includes('marriage') ? 'Married couples file one joint return.' : 'Unmarried partners are taxed on their own incomes.'}>
                  <MoneyInput value={form.partnerIncome} onChange={v => set('partnerIncome', v)} placeholder="60000" />
                </Field>
              ))}
              {events.includes('baby') && (
                <Field label="👶 How many babies?" hint="Priced as full-time daycare, with a bigger home and higher health and grocery costs.">
                  <Segmented value={form.babies} onChange={v => set('babies', v)} options={[1, 2, 3].map(n => ({ value: n, label: String(n) }))} />
                </Field>
              )}
              {events.includes('move-out') && (
                <p className="text-sm text-[var(--text-muted)]">📦 We'll show the cash to move into a first place and what it leaves for you. Choose your housing in the next questions.</p>
              )}
            </div>
          )}
          <button className="btn-primary justify-center py-4" disabled={!canContinue} onClick={goSurvey}>
            {mode === 'change' ? 'Next: your life after the change →' : mode === 'dream' ? 'Next: design your dream →' : 'Next: what matters to you →'}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Estimates for education only, not financial advice. Nothing you enter here is stored on our servers.
        </p>
      </>
    )
  }

  // ── Step 2: survey ──
  if (step === 'survey') {
    const list = visibleFor(prefs)
    const idx = Math.max(0, list.findIndex(x => x.key === qKey))
    const item = list[idx]
    const ctx = { menu, profile: activeProfile, answers: prefs }
    const sec = SURVEY_SECTIONS[item.section]
    return shell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(idx / list.length) * 100}%` }} />
          </div>
          <span className="text-xs text-[var(--text-muted)] font-semibold tabular-nums">{idx + 1} / {list.length}</span>
        </div>
        {idx === 0 && modeInfo && <p className="text-sm text-[var(--text-muted)] mb-3">{modeInfo.survey}</p>}
        <p className="text-xs uppercase tracking-widest font-semibold text-[var(--accent)] mb-4">{sec.emoji} {sec.label}</p>
        <div className="card">
          <Question item={item} ctx={ctx} value={prefs[item.key]} onAnswer={v => answer(item.key, v)} />
        </div>
        <div className="flex justify-between mt-6 text-sm">
          <button className="text-[var(--text-muted)] hover:text-white" onClick={back}>← Back</button>
          <button className="text-[var(--text-muted)] hover:text-white" onClick={() => (idx < list.length - 1 ? setQKey(list[idx + 1].key) : finishSurvey())}>
            {idx < list.length - 1 ? 'Skip →' : 'See my results →'}
          </button>
        </div>
      </>
    )
  }

  // ── Step 3: results ──
  const r = result
  return shell(
    <>
      <p className="text-xs uppercase tracking-widest font-semibold text-[var(--accent)] mb-2">{modeInfo?.emoji} {modeInfo?.label}</p>
      <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2">
        {mode === 'dream' ? 'Your dream lifestyle, priced' : mode === 'change' ? 'Your life after the change' : "Here's the life you can build"}
      </h1>
      <p className="text-[var(--text-muted)] mb-8">
        Based on about {usd(r.tax.monthly)}/month take-home in {activeProfile.city ? `${activeProfile.city.name}, ${activeProfile.city.state}` : STATE_LIST.find(x => x[0] === activeProfile.state)?.[1]}.
      </p>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-4">Your budget pillars</h2>
        <PillarBar pillars={r.pillars} />
        {r.housing.stretched && (
          <p className="text-sm text-[var(--text-muted)] mt-4">
            Your fixed costs are using most of your budget right now. {activeProfile.roommates === 0 && !householdPartnered(activeProfile) && !(activeProfile.children | 0)
              ? 'Adding a roommate or paying down debt is the quickest way to open up room.'
              : 'Paying down debt or choosing a lower-cost neighborhood type opens up room.'}
          </p>
        )}
        {payoff?.monthly > 0 && (
          <p className="text-sm mt-4" style={{ color: 'var(--success, #5FE0B8)' }}>
            Clearing your debt payments would free about {usd(payoff.monthly)}/month for Lifestyle and Cushion
            {payoff.homePrice > 0 ? ` and raise your home budget by about ${usd(payoff.homePrice)}` : ''}.
          </p>
        )}
      </section>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">Where your money goes</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Each cost center per month, and its share of your take-home pay.</p>
        <CostCenterChart centers={centers} />
      </section>

      {modeInfo && (
        <section className="card mb-6" style={{ borderColor: 'var(--accent)' }}>
          <h2 className="font-display font-bold text-white text-xl mb-2">
            {mode === 'current' ? '🧭 Your life today' : mode === 'dream' ? '✨ Your dream, in dollars' : '🔀 Today vs after the change'}
          </h2>

          {mode === 'current' && (() => {
            const e = emergencyFund(r)
            const trim = Math.round(r.lifestyle.dining * 0.25)
            return (
              <>
                <p className="text-white font-semibold">
                  {e.gap <= 0 ? `Your safety net is at its ${usd(e.target)} target`
                    : e.months != null ? `Your ${usd(e.target)} safety net is about ${e.months} month${e.months === 1 ? '' : 's'} away`
                    : `Your safety net target is ${usd(e.target)}`}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {e.gap > 0 ? `You have about ${usd(e.have)} today and are directing ${usd(e.monthly)}/month to it. ` : ''}
                  Trimming dining out by a quarter would add {usd(trim)}/month
                  {payoff?.monthly > 0 ? `, and clearing debt payments frees ${usd(payoff.monthly)}/month` : ''}.
                </p>
              </>
            )
          })()}

          {mode === 'dream' && (
            <>
              <p className="text-white font-semibold">
                {r.lifestyle.coverage >= 0.999
                  ? (r.housing.pick?.status === 'stretch' ? 'Your day-to-day dream fits, but your dream home is a stretch.' : 'Your dream fits your income today.')
                  : `Your income funds about ${Math.round(r.lifestyle.coverage * 100)}% of your dream lifestyle${r.housing.pick?.status === 'stretch' ? ', and your dream home is a stretch' : ''}.`}
              </p>
              {wishIncome && (
                <p className="text-sm mt-1" style={{ color: 'var(--success, #5FE0B8)' }}>
                  To fund all of it where you live, you'd want roughly {usd(wishIncome.income)}/year, about {Math.round((wishIncome.ratio - 1) * 100)}% more than today.
                </p>
              )}
              {shifts && shifts.some(x => x.delta !== 0) && (
                <>
                  <p className="text-sm text-[var(--text-muted)] mt-3 mb-2">Compared with a typical life at your income, your dream spends differently here:</p>
                  <ul className="flex flex-col gap-1.5">
                    {[...shifts.slice(0, 3), ...shifts.slice(-2)].filter((x, i, arr) => x.delta !== 0 && arr.indexOf(x) === i).map(x => (
                      <li key={x.key} className="flex justify-between text-sm">
                        <span className="text-white">{x.label}</span>
                        <span className="tabular-nums text-white">{x.delta > 0 ? '▲' : '▼'} {usd(Math.abs(x.delta))}/mo</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {mode === 'change' && (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                {LIFE_EVENTS.filter(e => events.includes(e.id)).map(e => `${e.emoji} ${e.label}`).join('  ·  ')}
              </p>
              {events.includes('move-out') && (() => {
                const m = moveInCash(r)
                return (
                  <p className="text-sm text-white mb-3">
                    📦 Plan on about {usd(m.total)} in cash to move in: first month plus deposit (~{usd(m.firstAndDeposit)}) and about {usd(m.setup)} to furnish and set up.
                  </p>
                )
              })()}
              {!compare && !events.every(e => e === 'move-out') && (
                <p className="text-sm text-[var(--text-muted)]">
                  Add the details of the change (a new income, a destination, your partner's income) so we can compare.{' '}
                  <button className="underline" onClick={() => setStep('profile')}>Add them now</button>
                </p>
              )}
              {compare && (
                <>
                  <p className="text-white font-semibold">
                    Take-home {compare.takeHomeDelta >= 0 ? 'rises ▲' : 'falls ▼'} {usd(Math.abs(compare.takeHomeDelta))}/month, and what's left for Lifestyle and Cushion {compare.discretionaryDelta >= 0 ? 'grows ▲' : 'shrinks ▼'} {usd(Math.abs(compare.discretionaryDelta))}/month.
                  </p>
                  {(events.includes('marriage') || events.includes('cohabit') || events.includes('job') || events.includes('city')) && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Income taxes and payroll taxes: {usd(compare.now.tax.federal + compare.now.tax.state + compare.now.tax.fica)} → {usd(compare.next.tax.federal + compare.next.tax.state + compare.next.tax.fica)} a year.
                    </p>
                  )}
                  {events.includes('baby') && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">Child care alone adds about {usd(compare.next.foundation.childcare - compare.now.foundation.childcare)}/month.</p>
                  )}
                  {needIncome && (
                    <p className="text-sm mt-1" style={{ color: 'var(--success, #5FE0B8)' }}>
                      To keep today's Lifestyle and Cushion after the change, you'd want about {usd(needIncome.income)}/year household income
                      ({needIncome.ratio >= 1 ? `${Math.round((needIncome.ratio - 1) * 100)}% more` : `${Math.round((1 - needIncome.ratio) * 100)}% less`} than the new figure).
                    </p>
                  )}
                  <div className="mt-5">
                    <ScenarioChart rows={compare.rows} nowLabel="Today" nextLabel="After" />
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-3">🏡 Your home</h2>
        {r.housing.pick && (() => {
          const k = r.housing.pick
          const size = k.bedrooms === 0 ? 'studio' : `${k.bedrooms}-bedroom`
          return (
            <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--accent)', background: 'var(--accent-muted)' }}>
              <p className="text-xs uppercase tracking-widest font-semibold text-[var(--accent)] mb-1">Your pick</p>
              <p className="text-white font-bold text-lg">{k.label} · {size}</p>
              <p className="text-white tabular-nums">Rent about {usd(k.rent)}/mo{r.housing.people > 1 ? ' each' : ''} · typical home {usd(k.price)}</p>
              <p className="text-sm mt-2" style={{ color: k.status === 'comfortable' ? 'var(--success, #5FE0B8)' : 'var(--text-muted)' }}>
                {k.status === 'comfortable' && 'Fits comfortably inside your Foundation budget.'}
                {k.status === 'possible' && `Possible — about ${usd(k.overBudget)}/month comes out of your Lifestyle budget to cover it.`}
                {k.status === 'stretch' && `A stretch — ${usd(k.overCap)}/month above the 30%-of-income rent guideline.`}
              </p>
              {k.status === 'stretch' && (
                <p className="text-sm text-white mt-2">
                  {k.smallerSize ? `A ${k.smallerSize.bedrooms === 0 ? 'studio' : `${k.smallerSize.bedrooms}-bedroom`} in the same area runs about ${usd(k.smallerSize.rent)}/mo and fits. ` : ''}
                  {k.alternative ? `Closest option that fits at your size: ${k.alternative.label}, about ${usd(k.alternative.rent)}/mo.` : ''}
                </p>
              )}
            </div>
          )
        })()}
        <p className="text-white font-semibold text-lg">{r.housing.headline}</p>
        <p className="text-sm text-[var(--text-muted)] mt-1 mb-2">{r.housing.detail}</p>
        {r.housing.tenure !== 'rent' && r.housing.wantedPriceGap > 0 && (
          <p className="text-sm text-white mb-2">
            Your pick costs about {usd(r.housing.wantedPrice)} to buy; your budget supports about {usd(r.housing.maxPrice)}, a gap of {usd(r.housing.wantedPriceGap)}.
          </p>
        )}
        {r.housing.tenure !== 'rent' && r.housing.downPaymentNeeded > 0 && (
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Down payment plus closing about {usd(r.housing.downPaymentNeeded)}
            {r.housing.monthsToReady != null ? `; at your Cushion pace that is roughly ${r.housing.monthsToReady <= 6 ? 'now' : `${Math.ceil(r.housing.monthsToReady / 12)} year(s)`}.` : '.'}
          </p>
        )}
        {r.housing.tenure === 'rent' && r.housing.verdict !== 'rent' && (
          <p className="text-sm text-[var(--text-muted)] mb-2">You chose to rent. Buying is within reach whenever you want it.</p>
        )}
        {ownPlace && (
          <p className="text-sm mb-3" style={{ color: 'var(--success, #5FE0B8)' }}>
            Compared with living alone, roommates add about {usd(r.pillars.lifestyle + r.pillars.cushion - ownPlace.pillars.lifestyle - ownPlace.pillars.cushion)}/month to Lifestyle and Cushion.
          </p>
        )}
        <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-muted)] mt-4 mb-2">Compare areas at your size</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {r.neighborhoods.map(n => (
            <div key={n.type} className="rounded-xl border p-3"
              style={{ borderColor: n.type === r.housing.pick?.type ? 'var(--accent)' : 'var(--border)', opacity: n.rentFits ? 1 : 0.55 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-sm">{n.label}</span>
                {n.type === r.housing.pick?.type && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Your pick</span>}
                {!r.housing.pick && n.best && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Best fit</span>}
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">{n.blurb}</p>
              <p className="text-sm text-white">
                Rent ~{usd(n.rent)}/mo{r.housing.people > 1 ? ' each' : ''}
                <span className="text-[var(--text-muted)]"> · {n.buyable ? 'buy ' : 'home '}~{usd(n.typicalPrice)}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: n.comfortable ? 'var(--success, #5FE0B8)' : 'var(--text-muted)' }}>
                {n.comfortable ? 'Fits your budget' : n.rentFits ? 'Possible — uses some of your Lifestyle budget' : 'A stretch right now'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Prices are for {profile.city ? `${profile.city.name}` : 'your state'} (Census ACS rents and home values). Area types apply national multipliers to the local median.
        </p>
      </section>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">🍽️ Your wish list vs your budget</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Your answers, priced for {profile.city ? profile.city.name : 'your state'}, against your {usd(r.lifestyle.total)}/month Lifestyle budget.
        </p>
        <TableOfWishes rows={r.lifestyle.wishes} />
        {r.lifestyle.coverage < 0.999 ? (
          <p className="text-sm text-white mt-4">
            The full list costs {usd(r.lifestyle.wishTotal)}/month, so everything is scaled to {Math.round(r.lifestyle.coverage * 100)}%.
            {wishIncome ? ` To fund it all with your home pick, you'd want roughly ${usd(wishIncome.income)}/year (${Math.round((wishIncome.ratio - 1) * 100)}% more).` : ''}
          </p>
        ) : (
          <p className="text-sm mt-4" style={{ color: 'var(--success, #5FE0B8)' }}>
            Your whole list fits, with {usd(r.lifestyle.flex)}/month of room to grow — more travel, a bigger home, or a faster Cushion.
          </p>
        )}
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Your dining budget buys about {r.lifestyle.mealsOutPerPersonPerWeek} meals out per person each week.
        </p>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-1">✈️ What your travel budget buys</p>
          <p className="text-sm text-white">
            {usd(r.lifestyle.travel)}/month, or {usd(r.lifestyle.travel * 12)} a year.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Your plan — {r.lifestyle.travelPlan.summary} — runs about {usd(r.lifestyle.travelPlan.annual)} a year for your household, flying from {r.lifestyle.travelPlan.region}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-semibold">Trip</th>
                  <th className="py-2 pr-4 font-semibold text-right">Costs about</th>
                  <th className="py-2 font-semibold text-right">Your budget buys</th>
                </tr>
              </thead>
              <tbody>
                {r.lifestyle.travelBuys.map(t => (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 pr-4 text-white">
                      {t.label}
                      {t.example && <span className="block text-xs text-[var(--text-muted)]">e.g. {t.example}</span>}
                    </td>
                    <td className="py-2 pr-4 text-white text-right tabular-nums whitespace-nowrap">{usd(t.total)}</td>
                    <td className="py-2 text-right whitespace-nowrap" style={{ color: t.perYear >= 0.85 ? 'var(--success, #5FE0B8)' : 'var(--text-muted)' }}>{t.phrase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Typical economy airfare and mid-range stays for your household; real prices swing with season and how early you book.
          </p>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <section className="card">
          <h2 className="font-display font-bold text-white text-xl mb-3">🚗 Your car{r.car.cars > 1 ? 's' : ''}</h2>
          {r.car.cars === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Car-free: about {usd(r.car.monthlyBudget)}/month covers transit, rideshare and car-share.</p>
          ) : r.car.maxPrice > 0 ? (
            <>
              <p className="text-white font-semibold">{r.car.tier} tier — up to about {usd(r.car.maxPrice)}{r.car.cars > 1 ? ' each' : ''}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">
                Payment, fuel, insurance and upkeep for {r.car.cars} car{r.car.cars > 1 ? 's' : ''} fit inside {usd(r.car.householdBudget ?? r.car.monthlyBudget)}/month of your Foundation.
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Your transport budget of {usd(r.car.householdBudget ?? r.car.monthlyBudget)}/month is best spent on transit, car-share or ride-share, or on keeping a car you already own paid off.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Link className="btn-ghost text-sm" to="/affordability">See cars you can buy →</Link>
            <Link className="btn-ghost text-sm" to="/tco">True cost of a car →</Link>
          </div>
        </section>
        <section className="card">
          <h2 className="font-display font-bold text-white text-xl mb-3">🛟 Your Cushion</h2>
          <p className="text-white font-semibold">{usd(r.cushion.total)}/month</p>
          <ul className="text-sm text-[var(--text-muted)] mt-2 flex flex-col gap-1">
            <li>Emergency fund: {usd(r.cushion.emergency)}</li>
            <li>Home fund: {usd(r.cushion.homeFund)}</li>
            {r.cushion.extraDebt > 0 && <li>Extra debt payoff: {usd(r.cushion.extraDebt)}</li>}
            <li>Retirement: {usd(r.cushion.retirement)}</li>
          </ul>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            {r.cushion.emergencyGap > 0
              ? `Safety-net target ${usd(r.cushion.emergencyTarget)}${r.cushion.monthsToEmergencyFund ? `, about ${r.cushion.monthsToEmergencyFund} months away` : ''}.`
              : `Your safety net is at its ${usd(r.cushion.emergencyTarget)} target.`}
          </p>
        </section>
      </div>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">What if…?</h2>
        <p className="text-sm text-[var(--text-muted)] mb-5">Change an answer and watch everything above update.</p>
        <WhatIf prefs={prefs} r={r} menu={menu} onChange={(k, v) => setPrefs(p => ({ ...p, [k]: v }))} />
      </section>

      <div className="flex gap-3 flex-wrap">
        <button className="btn-ghost" onClick={() => { persist(); setStep('profile') }}>← Edit my details</button>
        <button className="btn-ghost" onClick={goSurvey}>Edit my answers</button>
        <button className="btn-ghost" onClick={() => { persist(); setStep('mode') }}>Explore something else</button>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-6">
        Estimates only, based on 2026 federal and state tax rules, state-level price data and a {6.75}% 30-year mortgage. Not financial, tax or legal advice.
      </p>
    </>
  )
}
