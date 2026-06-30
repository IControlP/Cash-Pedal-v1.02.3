import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent, trackLandingStickyCTASeen } from '../../utils/analytics'

/**
 * Mobile-only sticky CTA for the landing page.
 *
 * Paid-ad traffic (mostly mobile) tends to bounce in the first few seconds or
 * scroll a little and leave. This keeps the one obvious next step — opening the
 * free calculator — a single tap away as they scroll, without nagging on first
 * paint. It appears once the visitor has scrolled past the hero, and can be
 * dismissed so it never blocks content.
 */
export default function LandingStickyCTA() {
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const trackedRef = useRef(false)

  useEffect(() => {
    function onScroll() {
      // Reveal after the visitor has scrolled roughly past the hero.
      setVisible(window.scrollY > window.innerHeight * 0.7)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fire one impression event the first time it actually shows.
  useEffect(() => {
    if (visible && !dismissed && !trackedRef.current) {
      trackedRef.current = true
      trackLandingStickyCTASeen()
    }
  }, [visible, dismissed])

  if (dismissed) return null

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">See your car’s real 5-year cost</p>
          <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
            Free · No signup · Under 2 min
          </p>
        </div>
        <Link
          to="/tco"
          onClick={() => trackEvent('landing_cta_click', { location: 'sticky_bar' })}
          className="shrink-0 text-sm font-bold px-4 py-2.5 rounded-xl"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          Start free →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)]"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
