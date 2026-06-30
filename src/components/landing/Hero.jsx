import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent, trackHeroCtaClick } from '../../utils/analytics'
import HeroEntryCard from './HeroEntryCard'
import { getHeroVariant } from '../../utils/abTest'

const VARIANTS = {
  A: { headline: "Can you actually afford this car?",          cta: "Show my true cost" },
  B: { headline: "Before you buy, see the real 5-year cost",  cta: "Reveal my 5-year cost" },
}

const TRUST_ITEMS = ['Free to start', 'No signup required', 'Results in under 60 seconds']

const QUICK_START = [
  { emoji: '🎯', label: 'Car Survey',   sub: 'Find your fit',   to: '/survey'  },
  { emoji: '💰', label: 'Salary Check', sub: '20/4/10 rule',    to: '/salary'  },
  { emoji: '⚖️', label: 'Compare Cars', sub: 'Side-by-side',    to: '/compare' },
  { emoji: '✅', label: 'Checklist',    sub: 'Used car audit',   to: '/checklist' },
]

export default function Hero() {
  const [variant] = useState(() => getHeroVariant())
  const copy = VARIANTS[variant]

  useEffect(() => {
    trackEvent('ab_hero_impression', { ab_variant: variant })
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
              The car-buying decision that funds — or drains — your future
            </span>

            <h1 className="hero-h font-display anim-1">
              {copy.headline}
            </h1>

            <p className="hero-sub anim-2">
              Most buyers only compare the monthly payment. Cash Pedal shows the true
              5-year cost — financing, insurance, fuel, maintenance and depreciation — before you buy.
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
              <HeroEntryCard />
            </div>

            {/* Below-fold fallback CTA for visitors who scroll past the card.
                2. hero_cta_click — ab_variant is included so CTR can be
                split by A/B test arm alongside the existing landing_cta_click. */}
            <div className="hidden lg:flex hero-cta anim-3">
              <Link
                to="/tco"
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
            <HeroEntryCard />

            {/* Annotated cost teaser below the card on desktop */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Sticker price',  val: '$34,500', dim: true    },
                { label: 'Real 5-yr cost', val: '$61,200', accent: true  },
                { label: 'Hidden costs',   val: '$26,700', warn: true    },
                { label: 'Right car saves',val: '$9,150',  green: true   },
              ].map(({ label, val, dim, accent, warn, green }) => (
                <div key={label}
                  className="rounded-xl border px-3 py-2.5"
                  style={{
                    borderColor: accent ? 'rgba(255,184,0,0.35)'    : green ? 'rgba(95,224,184,0.3)' : 'var(--border)',
                    background:  accent ? 'rgba(255,184,0,0.05)'    : green ? 'rgba(95,224,184,0.05)' : 'rgba(255,255,255,0.02)',
                  }}>
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className={`font-display font-bold text-base leading-tight ${
                    accent ? 'text-[var(--accent)]' : green ? 'text-[var(--success)]' : warn ? 'text-[#f87171]' : 'text-white/50 line-through'
                  }`}>{val}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
