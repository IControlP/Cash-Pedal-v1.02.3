import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { trackEvent } from '../utils/analytics'
import { safeGet, safeSet } from '../utils/safeStorage'
import {
  computeLifestyle, debtPayoffGain, AGE_RANGES, housingMenu, incomeForWishList,
  costCenters, compareScenarios, equivalentIncome, moveInCash, emergencyFund, priorityShifts,
} from '../utils/lifestyle.js'
import { SURVEY_QUESTIONS, SURVEY_SECTIONS, STATE_LIST, LIFE_STAGES, PILLAR_COLORS } from '../data/lifestyleSurvey'
import { CostCenterChart, ScenarioChart } from '../components/CostCenterChart'

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
  married: false, income1: '', income2: '', age: '25-34', state: 'TX',
  children: 0, under6: '', roommates: 0, debt: '', saved: '',
  city: '', destState: '', destCity: '', newIncome: '', newState: '', newCity: '',
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
      <Field label="Getaways per year">{pick('trips', [[0.5, '0–1'], [2.5, '2–3'], [4.5, '4–5'], [7, '6+']].map(([v, l]) => ({ value: v, label: l })), prefs.trips ?? 2.5)}</Field>
    </div>
  )
}

export default function LifestyleCalculator() {
  const [step, setStep] = useState('stage') // stage | profile | survey | results
  const [stageId, setStageId] = useState(null)
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
      if (saved?.stageId) setStageId(saved.stageId)
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
  const income1 = Number(form.income1) || 0
  const income2 = form.married ? Number(form.income2) || 0 : 0
  const canContinue = income1 > 0

  const profile = useMemo(() => ({
    incomes: form.married ? [income1, income2] : [income1],
    age: form.age, state: form.state, married: form.married,
    children: form.children, childrenUnder6: form.under6 === '' ? form.children : Math.min(form.under6, form.children), roommates: form.roommates,
    debtMonthly: Number(form.debt) || 0, savedForHome: Number(form.saved) || 0,
    city: cityRow(form.state, form.city),
    prefs,
  }), [form, income1, income2, cities, prefs])

  const stage = LIFE_STAGES.find(x => x.id === stageId) ?? null
  const destState = form.destState && form.destState !== form.state ? form.destState : ''
  const newIncome = Number(form.newIncome) || 0
  // The what-if: a new state (city move) and/or a new salary (new job).
  const scenario = useMemo(() => {
    if (!stage?.scenario) return null
    if (stage.scenario === 'city') return destState ? { state: destState, city: cityRow(destState, form.destCity) } : null
    const st = form.newState || form.state
    const cityId = st === form.state && !form.newState ? form.city : form.newCity
    if (!newIncome && st === form.state && cityId === form.city) return null
    return { state: st, city: cityRow(st, cityId), ...(newIncome ? { incomes: form.married ? [newIncome, income2] : [newIncome] } : {}) }
  }, [stage, destState, newIncome, form.newState, form.newCity, form.destCity, form.city, form.state, form.married, income2, cities])

  const result = useMemo(() => (step === 'results' && canContinue ? computeLifestyle(profile) : null), [step, profile, canContinue])
  const payoff = useMemo(() => (result ? debtPayoffGain(profile) : null), [result, profile])
  const ownPlace = useMemo(() => (result && !form.married && form.children === 0 && form.roommates > 0
    ? computeLifestyle({ ...profile, roommates: 0 }) : null), [result, form, profile])

  const compare = useMemo(() => (result && scenario ? compareScenarios(profile, scenario) : null), [result, scenario, profile])
  const needIncome = useMemo(() => (result && stage?.scenario === 'city' && destState ? equivalentIncome(profile, destState, undefined, cityRow(destState, form.destCity)) : null), [result, stage, destState, form.destCity, profile, cities])
  const centers = useMemo(() => (result ? costCenters(result) : []), [result])
  const menu = useMemo(() => housingMenu(profile), [profile])
  const wishIncome = useMemo(() => (result ? incomeForWishList(profile) : null), [result, profile])
  const shifts = useMemo(() => (result && stage?.id === 'intention' ? priorityShifts(profile) : null), [result, stage, profile])

  function chooseStage(st) {
    setStageId(st.id)
    setPrefs({ ...st.prefs })
    setForm(f => ({ ...f, roommates: st.roommates != null && !f.married && f.children === 0 ? st.roommates : f.roommates }))
    trackEvent('lifestyle_stage_selected', { stage: st.id })
    setStep('profile')
    window.scrollTo?.({ top: 0 })
  }

  function persist() {
    try { safeSet(STORAGE_KEY, JSON.stringify({ form, prefs, stageId })) } catch { /* storage blocked */ }
  }

  // Questions visible for a given set of answers (some depend on earlier ones).
  const visibleFor = answers => {
    const m = housingMenu({ ...profile, prefs: answers })
    return SURVEY_QUESTIONS.filter(item => !item.when || item.when({ menu: m, profile, answers }))
  }

  function goSurvey() {
    trackEvent('lifestyle_profile_completed', { state: form.state, married: form.married, children: form.children })
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

  // ── Step 0: life stage ──
  if (step === 'stage') {
    return shell(
      <>
        <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">See the life your income can build</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">What brings you here? We'll tailor your results to where you are right now.</p>
        <div className="grid gap-3">
          {LIFE_STAGES.map(st => (
            <button key={st.id} type="button" onClick={() => chooseStage(st)}
              className="card text-left flex items-start gap-4 transition-colors hover:border-[var(--accent)]">
              <span className="text-3xl">{st.emoji}</span>
              <span>
                <span className="block text-white font-bold text-lg">{st.label}</span>
                <span className="block text-sm text-[var(--text-muted)]">{st.blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-6">United States only. Estimates for education, not financial advice.</p>
      </>
    )
  }

  // ── Step 1: profile ──
  if (step === 'profile') {
    return shell(
      <>
        <button className="text-sm text-[var(--text-muted)] hover:text-white mb-4" onClick={() => setStep('stage')}>← {stage?.label}</button>
        <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">Your financial profile</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">
          Tell us a little about you, then what matters most. We'll show the home, neighborhoods, nights out and
          car your budget supports.
        </p>
        <div className="card flex flex-col gap-6">
          <Field label="Household">
            <Segmented
              value={form.married}
              onChange={v => setForm(f => ({ ...f, married: v, roommates: v ? 0 : f.roommates }))}
              options={[{ value: false, label: 'Just me' }, { value: true, label: 'Married / partnered' }]}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={form.married ? 'Your gross annual income' : 'Gross annual income'}>
              <MoneyInput value={form.income1} onChange={v => set('income1', v)} placeholder="75000" />
            </Field>
            {form.married && (
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
          {!form.married && form.children === 0 && (
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
          {stage?.scenario === 'city' && (
            <Field label="Where are you thinking of moving?" hint="We'll compare your costs and the pay needed to keep your lifestyle.">
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="input-field" value={form.destState} onChange={e => setForm(f => ({ ...f, destState: e.target.value, destCity: '' }))}>
                  <option value="">Choose a state…</option>
                  {STATE_LIST.filter(([c]) => c !== form.state).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
                {form.destState && <CitySelect state={form.destState} value={form.destCity} onChange={v => set('destCity', v)} cities={cities} />}
              </div>
            </Field>
          )}
          {stage?.scenario === 'job' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="New job's gross annual income">
                <MoneyInput value={form.newIncome} onChange={v => set('newIncome', v)} placeholder="95000" />
              </Field>
              <Field label="New job's state" hint="Leave as is if you're not relocating.">
                <div className="grid gap-3">
                  <select className="input-field" value={form.newState || form.state} onChange={e => setForm(f => ({ ...f, newState: e.target.value, newCity: '' }))}>
                    {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                  </select>
                  {form.newState && form.newState !== form.state && <CitySelect state={form.newState} value={form.newCity} onChange={v => set('newCity', v)} cities={cities} />}
                </div>
              </Field>
            </div>
          )}
          <button className="btn-primary justify-center py-4" disabled={!canContinue} onClick={goSurvey}>
            Next: what matters to you →
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
    const ctx = { menu, profile, answers: prefs }
    const sec = SURVEY_SECTIONS[item.section]
    return shell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(idx / list.length) * 100}%` }} />
          </div>
          <span className="text-xs text-[var(--text-muted)] font-semibold tabular-nums">{idx + 1} / {list.length}</span>
        </div>
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
      <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2">Here's the life you can build</h1>
      <p className="text-[var(--text-muted)] mb-8">
        Based on about {usd(r.tax.monthly)}/month take-home in {profile.city ? `${profile.city.name}, ${profile.city.state}` : STATE_LIST.find(s => s[0] === form.state)?.[1]}.
      </p>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-4">Your budget pillars</h2>
        <PillarBar pillars={r.pillars} />
        {r.housing.stretched && (
          <p className="text-sm text-[var(--text-muted)] mt-4">
            Your fixed costs are using most of your budget right now. {form.roommates === 0 && !form.married && form.children === 0
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

      {stage && (
        <section className="card mb-6" style={{ borderColor: 'var(--accent)' }}>
          <h2 className="font-display font-bold text-white text-xl mb-1">{stage.emoji} {stage.label}</h2>
          {stage.id === 'moving-out' && (() => {
            const m = moveInCash(r)
            return (
              <>
                <p className="text-white font-semibold">Plan on about {usd(m.total)} in cash to move in</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  First month plus deposit (~{usd(m.firstAndDeposit)}) and about {usd(m.setup)} to furnish and set up. Once you're in,
                  you can still direct {usd(r.pillars.lifestyle)}/month to Lifestyle and {usd(r.pillars.cushion)}/month to Cushion.
                </p>
              </>
            )
          })()}
          {stage.id === 'improve' && (() => {
            const e = emergencyFund(r)
            const trim = Math.round(r.lifestyle.dining * 0.25)
            return (
              <>
                <p className="text-white font-semibold">
                  {e.gap <= 0 ? `Your safety net is already at its ${usd(e.target)} target`
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
          {stage.id === 'intention' && shifts && (
            <>
              <p className="text-white font-semibold">Your answers, in dollars</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">Compared with a neutral set of answers, here is where your money moves.</p>
              {shifts.every(x => x.delta === 0) && (
                <p className="text-sm text-[var(--text-muted)]">Your answers match the neutral split. Change your answers below to see money shift toward what you care about.</p>
              )}
              <ul className="flex flex-col gap-1.5">
                {[...shifts.slice(0, 3), ...shifts.slice(-1)].filter((x, i, a) => x.delta !== 0 && a.indexOf(x) === i).map(x => (
                  <li key={x.key} className="flex justify-between text-sm">
                    <span className="text-white">{x.label}</span>
                    <span className="tabular-nums text-white">{x.delta > 0 ? '▲' : '▼'} {usd(Math.abs(x.delta))}/mo</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {stage.scenario && !compare && (
            <p className="text-sm text-[var(--text-muted)]">
              {stage.scenario === 'city' ? 'Choose a destination state to compare.' : 'Enter a new salary or a new state to compare.'}{' '}
              <button className="underline" onClick={() => setStep('profile')}>Add it now</button>
            </p>
          )}
          {compare && (
            <>
              <p className="text-white font-semibold mt-1">
                {stage.scenario === 'city'
                  ? `In ${scenario?.city ? `${scenario.city.name}, ${scenario.city.state}` : STATE_LIST.find(x => x[0] === destState)?.[1]}, at the same income`
                  : 'With the new job'}
                : take-home {compare.takeHomeDelta >= 0 ? 'rises ▲' : 'falls ▼'} {usd(Math.abs(compare.takeHomeDelta))}/month, and what's left for Lifestyle and Cushion {compare.discretionaryDelta >= 0 ? 'grows ▲' : 'shrinks ▼'} {usd(Math.abs(compare.discretionaryDelta))}/month.
              </p>
              {needIncome && (
                <p className="text-sm mt-1" style={{ color: 'var(--success, #5FE0B8)' }}>
                  To keep today's Lifestyle and Cushion there, you'd want about {usd(needIncome.income)}/year
                  ({needIncome.ratio >= 1 ? `${Math.round((needIncome.ratio - 1) * 100)}% more` : `${Math.round((1 - needIncome.ratio) * 100)}% less`} than now).
                </p>
              )}
              <div className="mt-5">
                <ScenarioChart rows={compare.rows} nowLabel={profile.city?.name ?? STATE_LIST.find(x => x[0] === form.state)?.[1] ?? 'Now'}
                  nextLabel={stage.scenario === 'city' ? (scenario?.city?.name ?? STATE_LIST.find(x => x[0] === destState)?.[1]) : 'New job'} />
              </div>
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
          That buys about {r.lifestyle.mealsOutPerPersonPerWeek} meals out per person each week and {r.lifestyle.getawaysPerYear} getaways a year.
        </p>
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
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-6">
        Estimates only, based on 2026 federal and state tax rules, state-level price data and a {6.75}% 30-year mortgage. Not financial, tax or legal advice.
      </p>
    </>
  )
}
