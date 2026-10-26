import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { trackEvent } from '../utils/analytics'
import { safeGet, safeSet } from '../utils/safeStorage'
import {
  computeLifestyle, debtPayoffGain, AGE_RANGES, DEFAULT_PRIORITIES,
  costCenters, compareScenarios, equivalentIncome, moveInCash, emergencyFund, priorityShifts,
} from '../utils/lifestyle.js'
import { priorityQuestions, STATE_LIST, LIFE_STAGES, PILLAR_COLORS } from '../data/lifestyleSurvey'
import { CostCenterChart, ScenarioChart } from '../components/CostCenterChart'

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const STORAGE_KEY = 'cp_lifestyle_profile'

const DEFAULT_FORM = {
  married: false, income1: '', income2: '', age: '25-34', state: 'TX',
  children: 0, roommates: 0, debt: '', saved: '',
  destState: '', newIncome: '', newState: '',
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

function PrioritySliders({ priorities, onChange }) {
  return (
    <div className="flex flex-col gap-5">
      {priorityQuestions.map(q => (
        <div key={q.key}>
          <p className="text-sm text-white font-semibold mb-2">{q.emoji} {q.text}</p>
          <input
            type="range" min="1" max="5" step="1" value={priorities[q.key]}
            onChange={e => onChange(q.key, Number(e.target.value))}
            className="w-full accent-[var(--accent)]" aria-label={q.text}
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{q.low}</span><span className="text-right">{q.high}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LifestyleCalculator() {
  const [step, setStep] = useState('stage') // stage | profile | survey | results
  const [stageId, setStageId] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES)
  const [q, setQ] = useState(0)

  useEffect(() => {
    try {
      const saved = JSON.parse(safeGet(STORAGE_KEY) || 'null')
      if (saved?.form) setForm(f => ({ ...f, ...saved.form }))
      if (saved?.priorities) setPriorities(p => ({ ...p, ...saved.priorities }))
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const income1 = Number(form.income1) || 0
  const income2 = form.married ? Number(form.income2) || 0 : 0
  const canContinue = income1 > 0

  const profile = useMemo(() => ({
    incomes: form.married ? [income1, income2] : [income1],
    age: form.age, state: form.state, married: form.married,
    children: form.children, roommates: form.roommates,
    debtMonthly: Number(form.debt) || 0, savedForHome: Number(form.saved) || 0,
  }), [form, income1, income2])

  const stage = LIFE_STAGES.find(x => x.id === stageId) ?? null
  const destState = form.destState && form.destState !== form.state ? form.destState : ''
  const newIncome = Number(form.newIncome) || 0
  // The what-if: a new state (city move) and/or a new salary (new job).
  const scenario = useMemo(() => {
    if (!stage?.scenario) return null
    if (stage.scenario === 'city') return destState ? { state: destState } : null
    const st = form.newState || form.state
    if (!newIncome && st === form.state) return null
    return { state: st, ...(newIncome ? { incomes: form.married ? [newIncome, income2] : [newIncome] } : {}) }
  }, [stage, destState, newIncome, form.newState, form.state, form.married, income2])

  const result = useMemo(() => (step === 'results' && canContinue ? computeLifestyle(profile, priorities) : null), [step, profile, priorities, canContinue])
  const payoff = useMemo(() => (result ? debtPayoffGain(profile, priorities) : null), [result, profile, priorities])
  const ownPlace = useMemo(() => (result && !form.married && form.children === 0 && form.roommates > 0
    ? computeLifestyle({ ...profile, roommates: 0 }, priorities) : null), [result, form, profile, priorities])

  const compare = useMemo(() => (result && scenario ? compareScenarios(profile, scenario, priorities) : null), [result, scenario, profile, priorities])
  const needIncome = useMemo(() => (result && stage?.scenario === 'city' && destState ? equivalentIncome(profile, destState, priorities) : null), [result, stage, destState, profile, priorities])
  const centers = useMemo(() => (result ? costCenters(result) : []), [result])
  const shifts = useMemo(() => (result && stage?.id === 'intention' ? priorityShifts(profile, priorities) : null), [result, stage, profile, priorities])

  function chooseStage(st) {
    setStageId(st.id)
    setPriorities(st.preset)
    setForm(f => ({ ...f, roommates: st.roommates != null && !f.married && f.children === 0 ? st.roommates : f.roommates }))
    trackEvent('lifestyle_stage_selected', { stage: st.id })
    setStep('profile')
    window.scrollTo?.({ top: 0 })
  }

  function persist() {
    try { safeSet(STORAGE_KEY, JSON.stringify({ form, priorities, stageId })) } catch { /* storage blocked */ }
  }

  function goSurvey() {
    trackEvent('lifestyle_profile_completed', { state: form.state, married: form.married, children: form.children })
    setQ(0); setStep('survey')
  }

  function answer(value) {
    const key = priorityQuestions[q].key
    setPriorities(p => ({ ...p, [key]: value }))
    if (q < priorityQuestions.length - 1) setQ(q + 1)
    else {
      persist()
      trackEvent('lifestyle_survey_completed', { state: form.state })
      setStep('results')
      window.scrollTo?.({ top: 0 })
    }
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
              <select className="input-field" value={form.state} onChange={e => set('state', e.target.value)}>
                {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Children">
            <Segmented
              value={form.children}
              onChange={v => setForm(f => ({ ...f, children: v, roommates: v ? 0 : f.roommates }))}
              options={[{ value: 0, label: 'None' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3+' }]}
            />
          </Field>
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
              <select className="input-field" value={form.destState} onChange={e => set('destState', e.target.value)}>
                <option value="">Choose a state…</option>
                {STATE_LIST.filter(([c]) => c !== form.state).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </Field>
          )}
          {stage?.scenario === 'job' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="New job's gross annual income">
                <MoneyInput value={form.newIncome} onChange={v => set('newIncome', v)} placeholder="95000" />
              </Field>
              <Field label="New job's state" hint="Leave as is if you're not relocating.">
                <select className="input-field" value={form.newState || form.state} onChange={e => set('newState', e.target.value)}>
                  {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
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
    const item = priorityQuestions[q]
    return shell(
      <>
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(q / priorityQuestions.length) * 100}%` }} />
          </div>
          <span className="text-xs text-[var(--text-muted)] font-semibold tabular-nums">{q + 1} / {priorityQuestions.length}</span>
        </div>
        <div className="card text-center">
          <div className="text-5xl mb-4">{item.emoji}</div>
          <h2 className="font-display font-bold text-white text-2xl mb-6">{item.text}</h2>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => answer(v)}
                className="py-4 rounded-xl border font-bold text-lg transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]"
                style={{ borderColor: priorities[item.key] === v ? 'var(--accent)' : 'var(--border)', color: 'white' }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{item.low}</span><span className="text-right">{item.high}</span>
          </div>
        </div>
        <div className="flex justify-between mt-6 text-sm">
          <button className="text-[var(--text-muted)] hover:text-white" onClick={() => (q === 0 ? setStep('profile') : setQ(q - 1))}>← Back</button>
          <button className="text-[var(--text-muted)] hover:text-white" onClick={() => answer(priorities[item.key])}>Skip →</button>
        </div>
      </>
    )
  }

  // ── Step 3: results ──
  const r = result
  const typeLabel = t => r.neighborhoods.find(n => n.type === t)?.label ?? ''
  return shell(
    <>
      <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-2">Here's the life you can build</h1>
      <p className="text-[var(--text-muted)] mb-8">
        Based on about {usd(r.tax.monthly)}/month take-home in {STATE_LIST.find(s => s[0] === form.state)?.[1]}.
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
                  {e.months != null ? `A 3-month safety net (${usd(e.target)}) is about ${e.months} months away` : `A 3-month safety net is ${usd(e.target)}`}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Using half of your Cushion ({usd(e.monthly)}/month). Trimming dining out by a quarter would add {usd(trim)}/month
                  {payoff?.monthly > 0 ? `, and clearing debt payments frees ${usd(payoff.monthly)}/month` : ''}.
                </p>
              </>
            )
          })()}
          {stage.id === 'intention' && shifts && (
            <>
              <p className="text-white font-semibold">Your priorities, in dollars</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">Compared with a neutral set of priorities, here is where your money moves.</p>
              {shifts.every(x => x.delta === 0) && (
                <p className="text-sm text-[var(--text-muted)]">Your answers match the neutral split. Move the sliders below to see money shift toward what you care about.</p>
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
                  ? `In ${STATE_LIST.find(x => x[0] === destState)?.[1]}, at the same income`
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
                <ScenarioChart rows={compare.rows} nowLabel={STATE_LIST.find(x => x[0] === form.state)?.[1] ?? 'Now'}
                  nextLabel={stage.scenario === 'city' ? STATE_LIST.find(x => x[0] === destState)?.[1] : 'New job'} />
              </div>
            </>
          )}
        </section>
      )}

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">🏡 Where you can live</h2>
        <p className="text-white font-semibold text-lg">{r.housing.headline}</p>
        <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">{r.housing.detail}</p>
        {ownPlace && (
          <p className="text-sm mb-4" style={{ color: 'var(--success, #5FE0B8)' }}>
            Compared with living alone, roommates add about {usd(r.pillars.lifestyle + r.pillars.cushion - ownPlace.pillars.lifestyle - ownPlace.pillars.cushion)}/month to Lifestyle and Cushion.
          </p>
        )}
        {r.housing.verdict === 'buy-soon' && r.housing.monthsToReady != null && (
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Down payment target about {usd(r.housing.downPaymentNeeded)}; at your Cushion pace that is roughly {Math.ceil(r.housing.monthsToReady / 12)} year(s).
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {r.neighborhoods.map(n => (
            <div key={n.type} className="rounded-xl border p-3"
              style={{ borderColor: n.best ? 'var(--accent)' : 'var(--border)', background: n.best ? 'var(--accent-muted)' : 'transparent', opacity: n.rentFits ? 1 : 0.55 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-sm">{n.label}</span>
                {n.best && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Best fit</span>}
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">{n.blurb}</p>
              <p className="text-sm text-white">
                Rent ~{usd(n.rent)}/mo{form.roommates > 0 ? ' each' : ''}
                <span className="text-[var(--text-muted)]"> · {n.buyable ? 'buy ' : 'home '}~{usd(n.typicalPrice)}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: n.rentFits ? 'var(--success, #5FE0B8)' : 'var(--text-muted)' }}>
                {n.rentFits ? 'Fits your budget' : 'A stretch right now'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Top fit for your priorities: {typeLabel(r.best)}. Home figures are typical for your state and household size.
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <section className="card">
          <h2 className="font-display font-bold text-white text-xl mb-3">🍽️ Dining, travel & fun</h2>
          <p className="text-white font-semibold">About {r.lifestyle.mealsOutPerPersonPerWeek} meals out per person, each week</p>
          <p className="text-sm text-[var(--text-muted)] mb-3">{usd(r.lifestyle.dining)}/mo for dining</p>
          <p className="text-white font-semibold">About {r.lifestyle.getawaysPerYear} getaways a year</p>
          <p className="text-sm text-[var(--text-muted)] mb-3">{usd(r.lifestyle.travel)}/mo for travel</p>
          <p className="text-sm text-[var(--text-muted)]">{usd(r.lifestyle.fun)}/mo for hobbies and entertainment</p>
        </section>
        <section className="card">
          <h2 className="font-display font-bold text-white text-xl mb-3">🚗 Your car</h2>
          {r.car.maxPrice > 0 ? (
            <>
              <p className="text-white font-semibold">{r.car.tier} tier — up to about {usd(r.car.maxPrice)}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">
                Payment, fuel, insurance and upkeep fit inside {usd(r.car.monthlyBudget)}/month of your Foundation.
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Your transport budget of {usd(r.car.monthlyBudget)}/month fits transit, a ride-share mix or a paid-off car.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Link className="btn-ghost text-sm" to="/affordability">See cars you can buy →</Link>
            <Link className="btn-ghost text-sm" to="/tco">True cost of a car →</Link>
          </div>
        </section>
      </div>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">🛟 Your Cushion</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {usd(r.cushion.total)}/month: about {usd(r.cushion.homeFund)} toward a home fund and {usd(r.cushion.retirementAndEmergency)} to retirement and your safety net.
        </p>
      </section>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">Adjust your priorities</h2>
        <p className="text-sm text-[var(--text-muted)] mb-5">Drag a slider and watch your results shift in real time.</p>
        <PrioritySliders priorities={priorities} onChange={(k, v) => setPriorities(p => ({ ...p, [k]: v }))} />
      </section>

      <div className="flex gap-3 flex-wrap">
        <button className="btn-ghost" onClick={() => { persist(); setStep('profile') }}>← Edit my details</button>
        <button className="btn-ghost" onClick={() => { setPriorities(DEFAULT_PRIORITIES); setQ(0); setStep('survey') }}>Retake the survey</button>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-6">
        Estimates only, based on 2025 tax rules, state-level price data and a {6.75}% 30-year mortgage. Not financial, tax or legal advice.
      </p>
    </>
  )
}
