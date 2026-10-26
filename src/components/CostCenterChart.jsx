import { useState } from 'react'
import { PILLAR_COLORS } from '../data/lifestyleSurvey'

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const pctText = n => `${Math.round(n * 100)}%`

const PILLAR_LABELS = { foundation: 'Foundation', lifestyle: 'Lifestyle', cushion: 'Cushion' }

function Legend() {
  return (
    <div className="flex gap-4 flex-wrap mb-4" aria-label="Legend">
      {Object.keys(PILLAR_LABELS).map(k => (
        <span key={k} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: PILLAR_COLORS[k] }} />
          {PILLAR_LABELS[k]}
        </span>
      ))}
    </div>
  )
}

function TableView({ rows, columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {columns.map(c => <th key={c.key} className={`py-2 pr-4 font-semibold ${c.right ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-t" style={{ borderColor: 'var(--border)' }}>
              {columns.map(c => <td key={c.key} className={`py-2 pr-4 text-white ${c.right ? 'text-right tabular-nums' : ''}`}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ViewToggle({ table, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!table)}
      className="text-xs text-[var(--text-muted)] hover:text-white underline underline-offset-2">
      {table ? 'View as chart' : 'View as table'}
    </button>
  )
}

// Ranked horizontal bars: where each dollar of take-home pay goes.
export function CostCenterChart({ centers }) {
  const [table, setTable] = useState(false)
  const rows = centers.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
  const max = Math.max(1, ...rows.map(r => r.amount))
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <Legend />
        <ViewToggle table={table} onChange={setTable} />
      </div>
      {table ? (
        <TableView rows={rows} columns={[
          { key: 'label', label: 'Cost center', render: r => r.label },
          { key: 'pillar', label: 'Pillar', render: r => PILLAR_LABELS[r.pillar] },
          { key: 'amount', label: 'Per month', right: true, render: r => usd(r.amount) },
          { key: 'share', label: '% of take-home', right: true, render: r => pctText(r.share) },
        ]} />
      ) : (
        <ul className="flex flex-col gap-2.5" role="list">
          {rows.map(r => (
            <li key={r.key} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] sm:grid-cols-[11rem_1fr_auto] items-center gap-3"
              title={`${r.label}: ${usd(r.amount)}/mo (${pctText(r.share)} of take-home) — ${PILLAR_LABELS[r.pillar]}`}>
              <span className="text-sm text-white truncate">{r.label}</span>
              <span className="h-3.5 rounded-r" style={{ width: '100%' }} aria-hidden="true">
                <span className="block h-full" style={{
                  width: `${Math.max(2, (r.amount / max) * 100)}%`, background: PILLAR_COLORS[r.pillar],
                  borderRadius: '0 4px 4px 0',
                }} />
              </span>
              <span className="text-sm text-white tabular-nums text-right whitespace-nowrap">
                {usd(r.amount)} <span className="text-[var(--text-muted)] text-xs">· {pctText(r.share)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// "Now" vs "New" by cost center, with the change called out in text + arrow.
export function ScenarioChart({ rows, nowLabel = 'Now', nextLabel = 'New' }) {
  const [table, setTable] = useState(false)
  const shown = rows.filter(r => r.amount > 0 || r.before > 0)
  const max = Math.max(1, ...shown.flatMap(r => [r.amount, r.before]))
  const arrow = d => (d > 0 ? '▲' : d < 0 ? '▼' : '–')
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#8a7aa6' }} />{nowLabel}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }} />{nextLabel}</span>
        </div>
        <ViewToggle table={table} onChange={setTable} />
      </div>
      {table ? (
        <TableView rows={shown} columns={[
          { key: 'label', label: 'Cost center', render: r => r.label },
          { key: 'before', label: nowLabel, right: true, render: r => usd(r.before) },
          { key: 'amount', label: nextLabel, right: true, render: r => usd(r.amount) },
          { key: 'delta', label: 'Change', right: true, render: r => `${arrow(r.delta)} ${usd(Math.abs(r.delta))}` },
        ]} />
      ) : (
        <ul className="flex flex-col gap-4" role="list">
          {shown.map(r => (
            <li key={r.key} title={`${r.label}: ${nowLabel} ${usd(r.before)} → ${nextLabel} ${usd(r.amount)}`}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-white">{r.label}</span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  {usd(r.before)} → {usd(r.amount)} <span className="text-white">{arrow(r.delta)} {usd(Math.abs(r.delta))}</span>
                </span>
              </div>
              <div className="flex flex-col gap-1" aria-hidden="true">
                <span className="block h-2" style={{ width: `${Math.max(1, (r.before / max) * 100)}%`, background: '#8a7aa6', borderRadius: '0 3px 3px 0' }} />
                <span className="block h-2" style={{ width: `${Math.max(1, (r.amount / max) * 100)}%`, background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
