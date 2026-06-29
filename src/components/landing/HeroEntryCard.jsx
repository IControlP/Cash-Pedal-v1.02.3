import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../../utils/analytics'
import VEHICLES from '../../data/vehicles.json'

const MAKES = Object.keys(VEHICLES).sort()

function getModels(make) {
  return make ? Object.keys(VEHICLES[make] ?? {}).sort() : []
}

function getYears(make, model) {
  if (!make || !model) return []
  return Object.keys(VEHICLES[make]?.[model]?.trims_by_year ?? {}).sort((a, b) => b - a)
}

export default function HeroEntryCard() {
  const navigate = useNavigate()
  const [make, setMake]   = useState('')
  const [model, setModel] = useState('')
  const [year, setYear]   = useState('')

  const models = getModels(make)
  const years  = getYears(make, model)

  function handleMake(val) {
    setMake(val)
    setModel('')
    setYear('')
  }
  function handleModel(val) {
    setModel(val)
    setYear('')
    const ys = getYears(make, val)
    if (ys.length === 1) setYear(ys[0])
  }

  function handleSubmit(e) {
    e.preventDefault()
    trackEvent('hero_entry_card_submit', { make, model, year })
    if (typeof window.fbq === 'function') window.fbq('track', 'Search', { search_string: `${make} ${model} ${year}`.trim() })
    const params = new URLSearchParams()
    if (make)  params.set('make',  make)
    if (model) params.set('model', model)
    if (year)  params.set('year',  year)
    navigate(`/tco?${params.toString()}`)
  }

  const canSubmit = !!make

  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Free calculator — no signup
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Make */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Make
          </label>
          <select
            value={make}
            onChange={e => handleMake(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select make…</option>
            {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Model — shown after make */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Model
          </label>
          <select
            value={model}
            onChange={e => handleModel(e.target.value)}
            className="input-field"
            disabled={!make}
          >
            <option value="">{make ? 'Select model…' : '— pick a make first —'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Year — shown after model */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Year
          </label>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="input-field"
            disabled={!model}
          >
            <option value="">{model ? 'Select year…' : '— pick a model first —'}</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full justify-center mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontSize: '1rem', padding: '0.9rem 1.5rem' }}
        >
          Show my true cost →
        </button>
      </form>

      <p className="text-[11px] text-center text-[var(--text-muted)]">
        No make selected? You can still set a price range on the next page.
      </p>
    </div>
  )
}
