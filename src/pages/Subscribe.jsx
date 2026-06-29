import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useSubscription } from '../hooks/useSubscription'
import { SUVSVG, SedanSVG, getPal } from '../components/CarSVGs'
import { trackProPurchaseComplete, trackCheckoutStarted, trackPurchaseCompleted } from '../utils/analytics'

const INCLUDED = [
  {
    title: 'Unlimited comparisons',
    body: 'Stack as many cars as you want, run as many scenarios as you need. Two-at-a-time deep dives, or six-up grid views for shortlists.',
  },
  {
    title: 'Wealth-impact verdicts',
    body: 'Every report ends with the future-value of the difference if you invested it instead. Your car choice shapes your financial stability — pick right and that savings compounds into something real.',
  },
  {
    title: 'Live market data',
    body: 'Fuel, electricity, insurance, registration, sales tax, financing rates — all localized to your ZIP and refreshed weekly.',
  },
  {
    title: 'Money-pit detector',
    body: 'Red-flag warnings for vehicles with steep depreciation, runaway insurance, or maintenance traps — before you sign.',
  },
  {
    title: 'Shareable PDF reports',
    body: 'Send the math to your spouse, financial advisor, or finance manager. Branded with your scenario, not ours.',
  },
  {
    title: 'Negotiation-grade detail',
    body: 'Every cost broken down by year, by category, with sensitivity sliders for the assumptions you want to test.',
  },
]

export default function Subscribe() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showEmailEntry, setShowEmailEntry] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [verifyStatus, setVerifyStatus] = useState(null) // null | 'loading' | 'success' | 'not_found' | 'device_limit' | 'error'
  const [showPromoEntry, setShowPromoEntry] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoStatus, setPromoStatus] = useState(null) // null | 'loading' | 'success' | 'invalid' | 'error'
  const sub = useSubscription() || {}

  // Verify Stripe session and activate subscription after checkout redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId || searchParams.get('success') !== 'true') return
    // Clear URL params immediately to avoid re-verifying on refresh
    setSearchParams({}, { replace: true })
    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          sub.activateFromSession?.(data.email, data.expires)
          // 12. purchase_completed — Stripe session verified, access unlocked.
          trackProPurchaseComplete(data.purchaseType || 'one_time', 19)
          trackPurchaseCompleted({ planType: data.purchaseType || 'one_time', pricePaid: 19 })
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const isActive = !!sub.isSubscribed
  const expiresAt = sub.expiresAt || sub.pass_expires_at || sub.passExpiresAt
  const daysLeft = typeof sub.daysRemaining === 'number'
    ? Math.max(0, sub.daysRemaining)
    : (expiresAt
        ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
        : null)

  async function handlePromoCode(e) {
    e.preventDefault()
    if (!promoInput.trim()) return
    setPromoStatus('loading')
    const result = await sub.verifyPromoCode(promoInput)
    if (result.valid) {
      setPromoStatus('success')
    } else if (result.error === 'network') {
      setPromoStatus('error')
    } else {
      setPromoStatus('invalid')
    }
  }

  async function handleVerifyEmail(e) {
    e.preventDefault()
    const email = emailInput.trim()
    if (!email) return
    setVerifyStatus('loading')
    const result = await sub.verifySubscription(email)
    if (result.active) {
      setVerifyStatus('success')
    } else if (result.reason === 'device_limit') {
      setVerifyStatus('device_limit')
    } else if (result.error === 'network') {
      setVerifyStatus('error')
    } else {
      setVerifyStatus('not_found')
    }
  }

  async function handleCheckout() {
    // 11. checkout_started — Stripe checkout session is about to be created.
    trackCheckoutStarted({ planType: 'one_time', price: 19 })
    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST' })
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <div className="landing-page">
      <div className="bg-glow" />
      <div className="grid-bg" />

      <Navbar />

      <main className="relative z-10 pt-14">
        <section className="py-16 lg:py-20">
          <div className="max-w-[1180px] mx-auto px-7">
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-start">
              {/* Left: pitch */}
              <div>
                <span className="eyebrow anim-0">
                  <span className="dot" />
                  60-day shopper pass · one payment
                </span>
                <h1 className="font-display text-[clamp(36px,5vw,56px)] font-bold leading-[1.05] tracking-tight mt-5 mb-5 anim-1">
                  $19 to know <span className="text-gold-gradient">this car is right</span> for you.
                </h1>
                <p className="text-[17px] text-[var(--text-muted)] leading-relaxed mb-7 anim-2">
                  You're about to make the second-largest purchase of your life. For one payment of
                  $19, Cash Pedal gives you the confidence to know you're making the right choice —
                  for your finances, your needs, and the costs that won't show up until after you
                  sign. When you're done, we go away. <strong className="text-white">No subscription. No card on file. No upsells.</strong>
                </p>

                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-4 anim-3">
                  {INCLUDED.map(item => (
                    <li key={item.title} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full mt-0.5 grid place-items-center"
                        style={{ background: 'rgba(95,224,184,0.18)', color: 'var(--success)', fontSize: 11, fontWeight: 800 }}>
                        ✓
                      </span>
                      <div>
                        <div className="font-display font-semibold text-[14px] text-white mb-0.5">{item.title}</div>
                        <div className="text-[13px] text-[var(--text-muted)] leading-snug">{item.body}</div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Mini comparison teaser */}
                <div className="mt-10 grid grid-cols-2 gap-3 max-w-[480px] anim-4">
                  <MiniCar make="Rivian R1S" carType="suv_large" isEV winner />
                  <MiniCar make="BMW X5" carType="sedan" />
                </div>
                <p className="mt-3 text-xs text-[var(--text-dim)] anim-4">
                  Sample comparison — runs in seconds inside the app.
                </p>
              </div>

              {/* Right: offer card */}
              <div className="lg:sticky lg:top-24 anim-2">
                {isActive ? (
                  /* Already a member */
                  <div className="offer-card-lg" style={{ borderColor: 'rgba(95,224,184,0.45)', boxShadow: '0 0 0 1px rgba(95,224,184,0.10) inset, 0 40px 80px -30px rgba(95,224,184,0.30)' }}>
                    <span className="offer-badge" style={{ background: 'var(--success)', color: '#07251e' }}>
                      ✓ MEMBERSHIP ACTIVE
                    </span>
                    <div className="font-display font-bold leading-none tracking-tight mt-1" style={{ fontSize: 88, color: 'var(--success)' }}>
                      {daysLeft != null ? daysLeft : '—'}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">
                      {daysLeft === 1 ? 'day' : 'days'} left on your shopper pass
                    </div>
                    {expiresAt && (
                      <div className="font-mono text-xs text-[var(--text-muted)] opacity-70 mb-6">
                        expires {new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    <Link to="/tco" className="btn-primary w-full justify-center text-base py-3.5">
                      Open the calculator →
                    </Link>

                    <div className="mt-4 text-xs text-[var(--text-muted)] flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                      <span><Pip /> Unlimited comparisons</span>
                      <span><Pip /> PDF exports unlocked</span>
                      <span><Pip /> No renewal</span>
                    </div>

                    {daysLeft != null && daysLeft <= 7 && daysLeft > 0 && (
                      <div className="mt-6 pt-5 border-t border-[var(--border)]/60 text-left">
                        <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                          Still shopping after this expires?
                        </div>
                        <p className="text-xs text-white leading-relaxed mb-3">
                          Most decisions land inside 60 days. If you need another window, you can buy a fresh pass anytime — no auto-renewal pressure either way.
                        </p>
                        <button
                          onClick={handleCheckout}
                          disabled={loading}
                          className="text-xs font-semibold text-[var(--accent)] hover:underline"
                        >
                          {loading ? 'Opening…' : 'Renew for another 60 days · $19 →'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Buy CTA */
                  <div className="offer-card-lg">
                    <span className="offer-badge">60-DAY SHOPPER PASS</span>

                    <div className="offer-price">
                      <span className="offer-dollar">$</span>
                      <span className="offer-amount">19</span>
                    </div>
                    <div className="text-sm text-[var(--text-muted)] mb-1">
                      one-time · 60 days of unlimited access
                    </div>
                    <div className="font-mono text-xs text-[var(--text-muted)] opacity-70 mb-6">
                      less than one tank of gas
                    </div>

                    <button
                      className="btn-primary w-full justify-center text-base py-3.5"
                      onClick={handleCheckout}
                      disabled={loading}
                    >
                      {loading ? 'Opening checkout…' : 'Unlock my 60 days →'}
                    </button>

                    <div className="mt-4 text-xs text-[var(--text-muted)] flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                      <span><Pip /> Instant access</span>
                      <span><Pip /> No subscription</span>
                      <span><Pip /> Stripe-secured</span>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[var(--border)]/60 text-left grid gap-3">
                      <FineLine label="When does access start?" value="Immediately after payment." />
                      <FineLine label="What expires after 60 days?" value="Unlimited comparisons + PDF exports. Saved reports remain readable." />
                      <FineLine label="Auto-renew?" value="Never. There is no card on file after checkout." />
                      <FineLine label="Refunds" value="7-day money back, no questions asked." />
                    </div>

                    <div className="mt-6 pt-5 border-t border-[var(--border)]/60 text-left">
                      {!showEmailEntry ? (
                        <button
                          className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                          onClick={() => setShowEmailEntry(true)}
                        >
                          Already a subscriber? →
                        </button>
                      ) : (
                        <div>
                          <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                            Restore access
                          </div>
                          <form onSubmit={handleVerifyEmail} className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="your@email.com"
                              value={emailInput}
                              onChange={e => { setEmailInput(e.target.value); setVerifyStatus(null) }}
                              className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-dim)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]/60"
                              style={{ background: 'rgba(255,255,255,0.04)' }}
                              disabled={verifyStatus === 'loading' || verifyStatus === 'success'}
                            />
                            <button
                              type="submit"
                              disabled={verifyStatus === 'loading' || verifyStatus === 'success'}
                              className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                              style={{ background: 'var(--accent)', color: '#07251e' }}
                            >
                              {verifyStatus === 'loading' ? '…' : 'Verify'}
                            </button>
                          </form>
                          {verifyStatus === 'not_found' && (
                            <p className="mt-2 text-xs text-red-400">No active subscription found for that email.</p>
                          )}
                          {verifyStatus === 'device_limit' && (
                            <p className="mt-2 text-xs text-yellow-400">Device limit reached. <a href="mailto:hello@cashpedal.io" className="underline">Contact support</a> to reset.</p>
                          )}
                          {verifyStatus === 'error' && (
                            <p className="mt-2 text-xs text-red-400">Network error — please try again.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border)]/60 text-left">
                      {!showPromoEntry ? (
                        <button
                          className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                          onClick={() => setShowPromoEntry(true)}
                        >
                          Have a promo code? →
                        </button>
                      ) : (
                        <div>
                          <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                            Promo code
                          </div>
                          <form onSubmit={handlePromoCode} className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Enter code"
                              value={promoInput}
                              onChange={e => { setPromoInput(e.target.value); setPromoStatus(null) }}
                              className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-dim)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]/60"
                              style={{ background: 'rgba(255,255,255,0.04)' }}
                              disabled={promoStatus === 'loading' || promoStatus === 'success'}
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={promoStatus === 'loading' || promoStatus === 'success'}
                              className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                              style={{ background: 'var(--accent)', color: '#07251e' }}
                            >
                              {promoStatus === 'loading' ? '…' : promoStatus === 'success' ? '✓' : 'Apply'}
                            </button>
                          </form>
                          {promoStatus === 'invalid' && (
                            <p className="mt-2 text-xs text-red-400">Invalid promo code.</p>
                          )}
                          {promoStatus === 'error' && (
                            <p className="mt-2 text-xs text-red-400">Network error — please try again.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="mt-4 text-center text-[11px] text-[var(--text-dim)] leading-relaxed">
                  {isActive ? (
                    <>Need help? <a href="mailto:hello@cashpedal.io" className="underline hover:text-white">hello@cashpedal.io</a></>
                  ) : (
                    <>By purchasing you agree to our <Link to="/tco" className="underline hover:text-white">terms</Link> and{' '}
                    <Link to="/privacy" className="underline hover:text-white">privacy policy</Link>. <br />
                    Cash Pedal does not accept dealer placements or insurer kickbacks.</>
                  )}
                </p>
              </div>
            </div>

            {/* Closing value reminder */}
            <div className="mt-20 max-w-[820px] mx-auto text-center">
              <div className="section-eyebrow">Why $19 pays for itself</div>
              <p className="font-display text-[24px] sm:text-[28px] leading-tight tracking-tight">
                Most buyers discover the real cost of their car after they've already signed.
                Cash Pedal gives you full visibility before you're locked in — so a surprise bill
                in year two isn't a surprise at all.
              </p>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Spot one hidden maintenance trap, catch one inflated insurance estimate, or find a
                better financing rate — and the pass pays for itself{' '}
                <span className="text-white">many times over.</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Pip() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: 'var(--success)' }} />
}

function FineLine({ label, value }) {
  return (
    <div className="flex justify-between items-baseline gap-3 text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  )
}

function MiniCar({ make, carType, isEV, winner }) {
  const pal = getPal(make.split(' ')[0])
  const Svg = carType === 'suv_large' ? SUVSVG : SedanSVG
  return (
    <div
      className="car-visual-wrap rounded-xl border p-3"
      style={{
        background: 'linear-gradient(160deg,#1f0838,#0f0520)',
        borderColor: winner ? 'rgba(95,224,184,0.5)' : 'var(--border)',
      }}
    >
      <Svg pal={pal} isEV={isEV} isLarge={carType === 'suv_large'} />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] font-semibold text-white truncate">{make}</span>
        {winner && (
          <span
            className="text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: 'var(--success)', color: '#07251e' }}
          >
            WINNER
          </span>
        )}
      </div>
    </div>
  )
}
