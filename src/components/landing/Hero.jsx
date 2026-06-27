import { Link } from 'react-router-dom'
import { SUVSVG, getPal } from '../CarSVGs'

const QUICK_START = [
  { emoji: '🧮', label: 'TCO Calculator',  sub: 'True 5-yr cost',      to: '/tco' },
  { emoji: '🎯', label: 'Car Survey',       sub: 'Find your fit',        to: '/survey' },
  { emoji: '💰', label: 'Salary Check',     sub: '20/4/10 rule',         to: '/salary' },
  { emoji: '⚖️', label: 'Compare Cars',     sub: 'Side-by-side',         to: '/compare' },
]

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="max-w-[1240px] mx-auto px-7 py-20 lg:py-24">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          {/* Copy */}
          <div>
            <span className="eyebrow anim-0">
              <span className="dot" />
              The car-buying decision that funds — or drains — your future
            </span>
            <h1 className="hero-h font-display anim-1">
              Know what you're actually agreeing to
            </h1>
            <p className="hero-sub anim-2">
              See the true 5-year cost of any car — financing, insurance, fuel, depreciation, maintenance — before you sign anything.
            </p>
            <div className="hero-cta anim-2">
              <Link to="/tco" className="btn-primary btn-lg">
                Try the free calculator →
              </Link>
              <Link to="/subscribe" className="btn-ghost btn-lg">
                Get full access — $19
              </Link>
            </div>
            <div className="hero-meta anim-3">
              <span>Free to start</span>
              <span>·</span>
              <span>No signup required</span>
              <span>·</span>
              <span>Results in under 2 min</span>
            </div>

            {/* Quick-start tool chips */}
            <div className="anim-3 mt-8">
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>
                Jump straight to a tool
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_START.map(({ emoji, label, sub, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex flex-col gap-0.5 px-3 py-3 rounded-xl border transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] group"
                    style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs font-semibold text-white group-hover:text-[var(--accent)] transition-colors leading-tight">{label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight">{sub}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Annotated hero car — hidden below lg where grid collapses */}
          <div className="hero-visual anim-1 hidden lg:block">
            <div className="hero-car-wrap">
              <SUVSVG pal={getPal('Rivian')} isEV isLarge />
            </div>

            <div className="cost-card" style={{ top: '4%', left: '0%' }}>
              <div className="cost-label">What the dealer shows</div>
              <div className="cost-val muted">$48,500</div>
              <div className="cost-delta">Sticker price</div>
            </div>

            <div className="cost-card" style={{ top: '6%', right: '0%' }}>
              <div className="cost-label">Hidden 5-yr drain</div>
              <div className="cost-val">$28,200</div>
              <div className="cost-delta">Costs they don't mention</div>
            </div>

            <div className="cost-card cost-card--gold" style={{ bottom: '14%', left: '-4%' }}>
              <div className="cost-label">Real 5-yr cost of this car</div>
              <div className="cost-val gold">$76,700</div>
              <div className="cost-delta up">The honest number</div>
            </div>

            <div className="cost-card cost-card--green" style={{ bottom: '2%', right: '-2%' }}>
              <div className="cost-label">Picking the right car saves</div>
              <div className="cost-val green">$9,150</div>
              <div className="cost-delta up">= $49,700 in 25 years at 7%</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
