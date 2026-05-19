import { Link } from 'react-router-dom'

const BULLETS = [
  <><strong>Unlimited comparisons</strong> for 60 days — stack as many cars as you want, run as many scenarios as you need.</>,
  <><strong>Full wealth-impact reports</strong> on every vehicle, with shareable PDF exports for your spouse, advisor, or future self.</>,
  <><strong>Live market data</strong> — fuel, electricity, insurance, registration, sales tax, financing rates, all localized to your ZIP.</>,
  <><strong>Money-pit detector</strong> flags vehicles with red-flag depreciation, runaway insurance, or maintenance traps before you sign.</>,
  <span className="muted">One payment. No subscription. No card on file after this. We never sell your data or take dealer kickbacks.</span>,
]

export default function CTAOffer() {
  return (
    <section id="cta" className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="cta-card">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            {/* Pitch */}
            <div>
              <span className="eyebrow">
                <span className="dot" />
                Limited-window offer · built for active shoppers
              </span>
              <h2 className="font-display text-[clamp(28px,3.4vw,40px)] font-bold tracking-tight leading-tight mt-3 mb-4">
                The car-shopping window is short.
                <br />
                So is the price.
              </h2>
              <p className="text-[16px] text-[var(--text-muted)] leading-relaxed mb-6">
                You're going to spend the next 30–60 days picking your next vehicle. For one
                payment of <strong className="text-[var(--accent)]">$19</strong>, Cash Pedal rides
                along with you for the whole stretch — unlimited comparisons, every brand, every
                trim, the full wealth-impact verdict on each one. When you sign, we go away.
                No subscription, no upsells, no renewals.
              </p>
              <ul className="cta-bullets">
                {BULLETS.map((b, i) => (
                  <li key={i}>
                    <span className="check">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price card */}
            <div className="offer-card">
              <span className="offer-badge">60-DAY SHOPPER PASS</span>
              <div className="offer-price">
                <span className="offer-dollar">$</span>
                <span className="offer-amount">19</span>
              </div>
              <div className="text-sm text-[var(--text-muted)] mb-1">
                one-time · 60 days of full access
              </div>
              <div className="font-mono text-xs text-[var(--text-muted)] mb-5">
                less than one tank of gas
              </div>
              <Link to="/subscribe" className="btn-primary w-full justify-center">
                Unlock my 60 days →
              </Link>
              <div className="offer-foot">
                <span><span className="pip" /> Instant access</span>
                <span><span className="pip" /> No subscription</span>
                <span><span className="pip" /> Stripe-secured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
