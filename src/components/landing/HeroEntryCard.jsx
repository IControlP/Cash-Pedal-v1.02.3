import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent, trackHeroEntryCardSubmit } from '../../utils/analytics'

export default function HeroEntryCard() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState(null)
  const [make, setMake]   = useState('')
  const [model, setModel] = useState('')
  const [year, setYear]   = useState('')

  useEffect(() => {
    import('../../data/vehicles.json').then(m => setVehicles(m.default))
  }, [])

  const makes  = vehicles ? Object.keys(vehicles).sort() : []
  const models = (make && vehicles) ? Object.keys(vehicles[make] ?? {}).sort() : []
  const years  = (make && model && vehicles)
    ? Object.keys(vehicles[make]?.[model]?.trims_by_year ?? {}).sort((a, b) => b - a)
    : []

  function handleMake(val) {
    setMake(val)
    setModel('')
    setYear('')
  }
  function handleModel(val) {
    setModel(val)
    setYear('')
    const ys = (make && vehicles)
      ? Object.keys(vehicles[make]?.[val]?.trims_by_year ?? {}).sort((a, b) => b - a)
      : []
    if (ys.length === 1) setYear(ys[0])
  }

  function handleSubmit(e) {
    e.preventDefault()
    trackHeroEntryCardSubmit({ make, model, year })
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
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
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
            <option value="">{make ? 'Select model…' : 'Select model…'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {!make && <p className="text-[10px] text-[var(--text-muted)]">Select a make first</p>}
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
            <option value="">{model ? 'Select year…' : 'Select year…'}</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {!model && <p className="text-[10px] text-[var(--text-muted)]">Select a model first</p>}
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
