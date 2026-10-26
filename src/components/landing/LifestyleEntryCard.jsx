import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../../utils/analytics'
import { STATE_LIST } from '../../data/lifestyleSurvey'

// Landing entry point: income + state, then hand off to /lifestyle prefilled.
export default function LifestyleEntryCard() {
  const navigate = useNavigate()
  const [income, setIncome] = useState('')
  const [state, setState] = useState('TX')
  const uid = useId()

  function submit(e) {
    e.preventDefault()
    trackEvent('lifestyle_entry_submit', { state })
    const params = new URLSearchParams({ state })
    if (income) params.set('income', income)
    navigate(`/lifestyle?${params.toString()}`)
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Start here</p>
      <div>
        <label className="input-label" htmlFor={`${uid}-income`}>Gross annual income</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
          <input id={`${uid}-income`} className="input-field" style={{ paddingLeft: '1.75rem' }} inputMode="numeric"
            placeholder="75000" value={income} onChange={e => setIncome(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
      </div>
      <div>
        <label className="input-label" htmlFor={`${uid}-state`}>State</label>
        <select id={`${uid}-state`} className="input-field" value={state} onChange={e => setState(e.target.value)}>
          {STATE_LIST.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-primary justify-center py-3.5">Show what I can have →</button>
    </form>
  )
}
