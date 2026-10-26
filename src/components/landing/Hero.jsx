import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent, trackHeroCtaClick, trackAbHeroImpression } from '../../utils/analytics'
import LifestyleEntryCard from './LifestyleEntryCard'
import { getHeroVariant } from '../../utils/abTest'

const VARIANTS = {
  A: { headline: "See the life your income can build",        cta: "Show what I can have" },
  B: { headline: "Your income buys more than you think",      cta: "Show what I can have" },
}

const TRUST_ITEMS = ['Free to start', 'No signup required', 'Results in under 60 seconds']

const QUICK_START = [
  { emoji: '🚗', label: 'Cars You Can Buy', sub: 'By salary',   to: '/affordability'  },
  { emoji: '💰', label: 'Salary Check', sub: '20/4/10 rule',    to: '/salary'  },
  { emoji: '⚖️', label: 'Compare Cars', sub: 'Side-by-side',    to: '/compare' },
  { emoji: '✅', label: 'Checklist',    sub: 'Used car audit',   to: '/checklist' },
]

export default function Hero() {
  const [variant] = useState(() => getHeroVariant())
  const copy = VARIANTS[variant]

  useEffect(() => {
    trackAbHeroImpression(variant)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="hero-section">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-7 py-12 lg:py-20">

        {/* Desktop: two-column. Mobile: single column stacked */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">

          {/* ── Left: copy ── */}
          <div>
            <span className="eyebrow anim-0">
              <span className="dot" />
              Your home, your nights out, your next car — all in one budget
            </span>

            <h1 className="hero-h font-display anim-1">
              {copy.headline}
            </h1>

            <p className="hero-sub anim-2">
              Share your income and what matters most. Cash Pedal shows the home, neighborhoods,
              dining, travel and car your budget can support — built on three simple pillars:
              Foundation, Lifestyle and Cushion.
            </p>

            {/* Trust line */}
            <div className="hero-meta anim-2">
              {TRUST_ITEMS.map((item, i) => (
                <Fragment key={item}>
                  {i > 0 && <span>·</span>}
                  <span>{item}</span>
                </Fragment>
              ))}
            </div>

            {/* Mobile: entry card sits here, right below the trust line */}
            <div className="lg:hidden anim-3 mt-6">
              <LifestyleEntryCard />
            </div>

            {/* Below-fold fallback CTA for visitors who scroll past the card.
                2. hero_cta_click — ab_variant is included so CTR can be
                split by A/B test arm alongside the existing landing_cta_click. */}
            <div className="hidden lg:flex hero-cta anim-3">
              <Link
                to="/lifestyle"
                className="btn-primary btn-lg"
                onClick={() => {
                  trackEvent('landing_cta_click', { location: 'hero_primary', ab_variant: variant })
                  trackHeroCtaClick({ ctaText: copy.cta, ctaLocation: 'hero_primary', abVariant: variant })
                }}
              >
                {copy.cta} →
              </Link>
            </div>

            {/* Quick-start tool chips — secondary, below the fold on mobile */}
            <div className="anim-3 mt-8">
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-3"
                style={{ color: 'var(--text-dim)' }}>
                More free tools
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

          {/* ── Right: entry card (desktop only) ── */}
          <div className="hidden lg:block anim-1">
            <LifestyleEntryCard />

            {/* Sample pillar split */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Foundation', val: '50%', color: '#5FE0B8' },
                { label: 'Lifestyle',  val: '30%', color: 'var(--accent)' },
                { label: 'Cushion',    val: '20%', color: '#7aa2ff' },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl border px-3 py-2.5"
                  style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className="font-display font-bold text-base leading-tight" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
