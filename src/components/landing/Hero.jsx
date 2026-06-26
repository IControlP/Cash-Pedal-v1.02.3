import { Link } from 'react-router-dom'
import { SUVSVG, getPal } from '../CarSVGs'

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
              Dealer or private party — know what you're actually agreeing to
            </h1>
            <p className="hero-sub anim-2">
              See the real cost before you sign anything.
            </p>
            <p className="hero-body anim-2">
              Whether you're at a dealership or buying off a private listing, both sides of that
              deal know more than you do. Cash Pedal shows you the true 5-year cost of any car —
              financing, insurance, fuel, depreciation, maintenance — so you walk in knowing the
              number they don't want you to have.
            </p>
            <div className="hero-cta anim-2">
              <Link to="/subscribe" className="btn-primary btn-lg">
                Get my 60-day access — $19 →
              </Link>
              <a href="#preview" className="btn-ghost btn-lg btn-ghost--scroll">
                See a sample report first
                <svg
                  className="scroll-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </a>
            </div>
            <div className="hero-meta anim-3">
              <span>One payment, no subscription</span>
              <span>·</span>
              <span>Pays for itself in minutes</span>
            </div>
            <p className="anim-3 mt-4 text-sm">
              <Link
                to="/tco"
                className="text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--accent)] transition-colors"
              >
                Not ready to commit? Run a free estimate on any car in under 2 minutes — no account, no payment, no dealer involved. → Try the free calculator
              </Link>
            </p>
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
