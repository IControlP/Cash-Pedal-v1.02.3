import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// State code → full name, for the picker and headings.
const STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
  KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
  MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana',
  NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico',
  NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin',
  WY:'Wyoming', DC:'Washington, D.C.',
}

const ACCENT = 'rgb(200,255,0)'
const BAR_COLORS = ['#c8ff00', '#a3e635', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#5FE0B8', '#facc15', '#38bdf8', '#fb7185']

function StatCard({ label, value }) {
  return (
    <div className="card flex flex-col gap-1 py-4">
      <span className="text-2xl sm:text-3xl font-display font-extrabold text-white tabular-nums">{value}</span>
      <span className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
    </div>
  )
}

// Horizontal ranking bar chart for a list of { make, model, searches }.
function RankingChart({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-8 text-center">
        Not enough data yet — check back as more shoppers run the numbers.
      </p>
    )
  }
  const data = rows.map(r => ({ name: `${r.make} ${r.model}`, searches: r.searches }))
  const height = Math.max(data.length * 38, 120)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category" dataKey="name" width={150}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#15151b', border: '1px solid #2a2a30',
            borderRadius: 8, fontSize: 12, color: '#fff',
          }}
          formatter={v => [`${v} shoppers`, 'Searches']}
        />
        <Bar dataKey="searches" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function MarketAnalytics() {
  const [data, setData]       = useState(null)
  const [state, setState]     = useState('')
  const [stateData, setStateData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  // Initial national load
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/market-analytics')
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Re-fetch the state-scoped rankings when the picker changes
  const loadState = useCallback((code) => {
    setState(code)
    setStateData(null)
    if (!code) return
    fetch(`/api/market-analytics?state=${code}`)
      .then(r => r.json())
      .then(d => setStateData(d.stateTopModels || []))
      .catch(() => setStateData([]))
  }, [])

  const available    = data && data.available
  const totals       = data?.totals || {}
  const statesWithData = data?.statesWithData || []
  const fmt = n => (typeof n === 'number' ? n.toLocaleString() : '—')

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Market Analytics
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-3">
            What America is shopping for
          </h1>
          <p className="anim-2 text-[var(--text-muted)] text-base max-w-2xl">
            The most-researched vehicles on Cash Pedal over the last {data?.windowDays || 90} days,
            ranked by how many shoppers ran the numbers — nationally and state by state.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
          {loading && (
            <div className="card text-center py-16 text-[var(--text-muted)]">Loading market data…</div>
          )}

          {!loading && (error || !available) && (
            <div className="card text-center py-16">
              <p className="text-white font-semibold mb-1">Market data isn't available right now.</p>
              <p className="text-[var(--text-muted)] text-sm">
                Rankings appear once shoppers start running calculations. Try the{' '}
                <Link to="/tco" className="text-[var(--accent)] underline">TCO calculator</Link> to add to the data.
              </p>
            </div>
          )}

          {!loading && available && (
            <>
              {/* Headline stats */}
              <div className="grid grid-cols-3 gap-4 anim-2">
                <StatCard label="Searches tracked" value={fmt(totals.searches)} />
                <StatCard label="Models compared" value={fmt(totals.uniqueModels)} />
                <StatCard label="States with data" value={fmt(totals.statesCovered)} />
              </div>

              {/* National rankings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card anim-3">
                  <h2 className="font-display font-bold text-white text-lg mb-1">Top 10 vehicles nationally</h2>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Ranked by unique shoppers</p>
                  <RankingChart rows={data.topModels} />
                </div>
                <div className="card anim-4">
                  <h2 className="font-display font-bold text-white text-lg mb-1">Most-researched brands</h2>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Across all models</p>
                  <div className="flex flex-col divide-y divide-[var(--border)]">
                    {data.topMakes.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)] py-8 text-center">No brand data yet.</p>
                    )}
                    {data.topMakes.map((m, i) => {
                      const max = data.topMakes[0]?.searches || 1
                      return (
                        <div key={m.make} className="flex items-center gap-3 py-2.5">
                          <span className="text-xs font-bold text-[var(--text-muted)] w-5 shrink-0">{i + 1}</span>
                          <span className="text-sm font-semibold text-white w-28 shrink-0 truncate">{m.make}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(m.searches / max) * 100}%`, background: ACCENT }} />
                          </div>
                          <span className="text-xs text-[var(--text-muted)] tabular-nums w-10 text-right shrink-0">{m.searches}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* State breakdown */}
              <div className="card anim-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display font-bold text-white text-lg">Top vehicles by state</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">See what shoppers in a specific state are researching</p>
                  </div>
                  <select
                    className="input-field sm:w-64"
                    value={state}
                    onChange={e => loadState(e.target.value)}
                  >
                    <option value="">Select a state…</option>
                    {Object.entries(STATE_NAMES).map(([code, name]) => (
                      <option key={code} value={code} disabled={!statesWithData.includes(code)}>
                        {name}{statesWithData.includes(code) ? '' : ' — no data yet'}
                      </option>
                    ))}
                  </select>
                </div>

                {!state && (
                  <p className="text-sm text-[var(--text-muted)] py-8 text-center">
                    Pick a state above to see its top 10 most-researched vehicles.
                  </p>
                )}
                {state && stateData === null && (
                  <p className="text-sm text-[var(--text-muted)] py-8 text-center">Loading {STATE_NAMES[state]}…</p>
                )}
                {state && stateData !== null && (
                  <>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      Top vehicles in <span className="text-white font-semibold">{STATE_NAMES[state]}</span>
                    </p>
                    <RankingChart rows={stateData} />
                  </>
                )}
              </div>

              {/* Insights / data-licensing callout */}
              <div className="card anim-5 border-[rgba(200,255,0,0.25)]" style={{ background: 'rgba(200,255,0,0.04)' }}>
                <div className="flex items-start gap-4">
                  <span className="text-2xl shrink-0">📈</span>
                  <div>
                    <h2 className="font-display font-bold text-white text-lg mb-1">Market intelligence for your business</h2>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3 max-w-2xl">
                      Cash Pedal tracks real shopper demand by make, model, and state. Dealers, lenders,
                      and market researchers can license the full per-state dataset — search volume, brand
                      share, and demand trends refreshed continuously.
                    </p>
                    <a
                      href="mailto:support@cashpedal.io?subject=Market%20Insights%20Data%20Licensing"
                      className="btn-primary inline-block text-sm px-5 py-2"
                    >
                      Inquire about data licensing →
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
                Rankings reflect aggregate, anonymous research activity on Cash Pedal over the last
                {' '}{data.windowDays} days. No personal information is included.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
