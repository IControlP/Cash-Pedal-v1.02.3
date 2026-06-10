import { Link } from 'react-router-dom'
import { useSubscription } from '../hooks/useSubscription'

const DEFAULT_BULLETS = [
  'Unlimited detailed cost breakdowns — every make, model, and trim',
  'Compare up to 5 finalists side by side and see the true winner',
  'Money-pit flags, full survey matches, and unlimited used-car checklists',
]

// End-of-page funnel card shown to non-subscribers on the free tools.
// Each tool passes copy that bridges what the user just did to the next
// step of the buying journey that Pro unlocks.
export default function ProUpsell({ headline, body, bullets = DEFAULT_BULLETS }) {
  const { isSubscribed } = useSubscription()
  if (isSubscribed) return null

  return (
    <div className="mt-10 rounded-xl border p-6 sm:p-8"
      style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.04)' }}>
      <div className="grid md:grid-cols-[1.4fr_auto] gap-6 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">
            Cash Pedal Pro · 60-day pass
          </p>
          <h2 className="font-display font-bold text-white text-xl sm:text-2xl mb-2">{headline}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-4">{body}</p>
          <ul className="text-sm text-[var(--text-muted)] space-y-1.5">
            {bullets.map(b => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-stretch md:items-center gap-2 md:min-w-[230px]">
          <div className="text-center">
            <span className="font-display font-extrabold text-white text-4xl">$19</span>
            <p className="text-xs text-[var(--text-muted)] mt-1">one payment · 60 days · no subscription</p>
          </div>
          <Link to="/subscribe" className="btn-primary justify-center text-sm px-6 py-3">
            Get the Car Buying Pass →
          </Link>
          <p className="text-[11px] text-[var(--text-muted)] text-center">
            Pays for itself the first time it flags a money pit.
          </p>
        </div>
      </div>
    </div>
  )
}
