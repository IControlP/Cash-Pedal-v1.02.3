import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSubscription } from '../hooks/useSubscription'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Subscribe() {
  const [searchParams]   = useSearchParams()
  const success          = searchParams.get('success') === 'true'
  const sessionId        = searchParams.get('session_id') || ''

  const { isSubscribed, subscriberEmail, verifySubscription, activateFromSession, clearSubscription, resetDevices } = useSubscription()

  // ── States ────────────────────────────────────────────
  const [verifying,    setVerifying]    = useState(success && !!sessionId)
  const [sessionData,  setSessionData]  = useState(null)  // { email, expires }
  const [sessionErr,   setSessionErr]   = useState('')

  const [restoreEmail,      setRestoreEmail]      = useState('')
  const [restoring,         setRestoring]         = useState(false)
  const [restoreMsg,        setRestoreMsg]        = useState('')
  const [restoreErr,        setRestoreErr]        = useState('')
  const [deviceLimitEmail,  setDeviceLimitEmail]  = useState('')
  const [resettingDevices,  setResettingDevices]  = useState(false)
  const [deviceResetMsg,    setDeviceResetMsg]    = useState('')
  const [deviceResetErr,    setDeviceResetErr]    = useState('')

  const [cancelEmail,     setCancelEmail]     = useState(subscriberEmail)
  const [canceling,       setCanceling]       = useState(false)
  const [cancelMsg,       setCancelMsg]       = useState('')
  const [cancelErr,       setCancelErr]       = useState('')
  const [cancelPurchaseType, setCancelPurchaseType] = useState(null)

  const [checkoutEmail,   setCheckoutEmail]   = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutErr,     setCheckoutErr]     = useState('')

  // ── Verify Stripe session on success redirect ─────────
  useEffect(() => {
    if (!success || !sessionId) return
    ;(async () => {
      try {
        const res  = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (data.valid && data.email) {
          activateFromSession(data.email, data.expires)
          setSessionData({ email: data.email, expires: data.expires, purchaseType: data.purchaseType })
        } else {
          setSessionErr('We could not confirm your payment. If you were charged, please contact support.')
        }
      } catch {
        setSessionErr('Could not reach server. Please refresh the page or contact support.')
      } finally {
        setVerifying(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore access ────────────────────────────────────
  async function handleRestore(e) {
    e.preventDefault()
    setRestoreMsg(''); setRestoreErr(''); setDeviceLimitEmail(''); setDeviceResetMsg(''); setDeviceResetErr('')
    if (!restoreEmail.trim()) { setRestoreErr('Please enter your email.'); return }
    setRestoring(true)
    const result = await verifySubscription(restoreEmail)
    setRestoring(false)
    if (result.active) {
      setRestoreMsg(`Access restored for ${restoreEmail.trim().toLowerCase()}. You can now use all Pro features.`)
    } else if (result.reason === 'device_limit') {
      setDeviceLimitEmail(restoreEmail.trim().toLowerCase())
    } else if (result.error === 'network') {
      setRestoreErr('Could not reach server. Check your connection and try again.')
    } else {
      setRestoreErr('No active subscription found for that email.')
    }
  }

  // ── Reset devices ─────────────────────────────────────
  async function handleResetDevices() {
    setDeviceResetMsg(''); setDeviceResetErr('')
    setResettingDevices(true)
    const result = await resetDevices(deviceLimitEmail)
    setResettingDevices(false)
    if (result.success) {
      setDeviceResetMsg('All devices cleared. You can now restore access on this device.')
      setDeviceLimitEmail('')
      // Immediately re-verify so the user is logged in
      const verify = await verifySubscription(restoreEmail || deviceLimitEmail)
      if (verify.active) {
        setRestoreMsg(`Access restored for ${(restoreEmail || deviceLimitEmail).trim().toLowerCase()}. You can now use all Pro features.`)
      }
    } else if (result.error === 'network') {
      setDeviceResetErr('Connection error. Please try again.')
    } else {
      setDeviceResetErr(result.error || 'Could not reset devices. Please try again.')
    }
  }

  // ── Look up purchase type then cancel if subscription ────
  async function handleCancel(e) {
    e.preventDefault()
    setCancelMsg(''); setCancelErr(''); setCancelPurchaseType(null)
    if (!cancelEmail.trim()) { setCancelErr('Please enter your email.'); return }
    setCanceling(true)
    try {
      const statusRes  = await fetch(`/api/subscription-status?email=${encodeURIComponent(cancelEmail.trim().toLowerCase())}`)
      const statusData = await statusRes.json()

      if (statusData.purchaseType === 'one_time') {
        setCancelPurchaseType('one_time')
        setCanceling(false)
        return
      }

      const res  = await fetch('/api/cancel-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: cancelEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setCancelMsg(`Subscription canceled. Your access continues until ${fmt(data.access_until)}.`)
        clearSubscription()
      } else {
        setCancelErr(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setCancelErr('Connection error. Please try again.')
    }
    setCanceling(false)
  }

  // ── New checkout ──────────────────────────────────────
  async function handleNewCheckout() {
    setCheckoutErr('')
    setCheckoutLoading(true)
    try {
      const res  = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ passType: 'one_time', email: checkoutEmail || undefined, cancelPath: '/subscribe' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutErr(data.error || 'Could not start checkout.')
        setCheckoutLoading(false)
      }
    } catch {
      setCheckoutErr('Connection error. Please try again.')
      setCheckoutLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">

          {/* Page header */}
          <div className="mb-10">
            <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              <span className="w-4 h-px bg-[var(--accent)]" />
              CashPedal Pro
            </div>
            <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl mt-1">
              Manage Access
            </h1>
            <p className="anim-2 text-[var(--text-muted)] mt-2 text-base">
              One payment. 60 days of Pro access. Built for the car buying journey.
            </p>
          </div>

          {/* ── Payment success banner ── */}
          {success && (
            <div className="anim-2 mb-8 rounded-xl border p-5"
              style={{ borderColor: 'rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.06)' }}>
              {verifying ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-white text-sm">Confirming your payment…</p>
                </div>
              ) : sessionErr ? (
                <div>
                  <p className="text-red-400 font-semibold text-sm mb-1">Payment confirmation issue</p>
                  <p className="text-[var(--text-muted)] text-sm">{sessionErr}</p>
                </div>
              ) : sessionData ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <p className="font-display font-bold text-white text-lg">You're in!</p>
                  </div>
                  <p className="text-[var(--text-muted)] text-sm mb-1">
                    Access confirmed for <span className="text-white">{sessionData.email}</span>.
                  </p>
                  {sessionData.expires && (
                    <p className="text-[var(--text-muted)] text-sm">
                      {sessionData.purchaseType === 'subscription' ? 'Next billing date:' : 'Access until:'}{' '}
                      <span className="text-white">{fmt(sessionData.expires)}</span>
                    </p>
                  )}
                  <div className="flex gap-3 mt-4">
                    <Link to="/tco" className="btn-primary text-sm">Open TCO Calculator →</Link>
                    <Link to="/checklist" className="btn-ghost text-sm">Used Car Checklist →</Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Current status (if subscribed) ── */}
          {isSubscribed && !success && (
            <div className="anim-2 mb-8 card">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                <p className="font-display font-bold text-white">Active subscription</p>
              </div>
              <p className="text-[var(--text-muted)] text-sm mb-1">
                Subscribed as <span className="text-white">{subscriberEmail}</span>
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                All Pro features are unlocked.
              </p>
              <div className="flex gap-3 mt-4">
                <Link to="/tco" className="btn-primary text-sm">TCO Calculator →</Link>
                <Link to="/checklist" className="btn-ghost text-sm">Checklist →</Link>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">

            {/* ── Car Buying Pass (not subscribed) ── */}
            {!isSubscribed && !success && (
              <div className="card anim-3">
                <h2 className="font-display font-bold text-white text-lg mb-1">Car Buying Pass</h2>
                <p className="text-[var(--text-muted)] text-sm mb-4">
                  You're about to spend tens of thousands. $19 gives you every tool to make the smartest decision — and it's yours for 60 days. No subscription.
                </p>
                <ul className="mb-5 text-sm text-[var(--text-muted)] space-y-1.5">
                  {[
                    "See if that car costs $8k more than it looks over 5 years",
                    "Find which of 5 vehicles is actually the best deal",
                    "Know exactly what salary you need before you commit",
                    "Spot reliability red flags before you sign",
                    "Compare buy vs. lease — which actually wins for you",
                    "Get your full ranked vehicle type matches",
                    "Export a clean PDF to share or negotiate with",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <input
                  type="email"
                  className="input-field mb-3 text-sm"
                  placeholder="Email (optional — prefills checkout)"
                  value={checkoutEmail}
                  onChange={e => setCheckoutEmail(e.target.value)}
                />
                {checkoutErr && <p className="text-xs text-red-400 mb-2">{checkoutErr}</p>}
                <button
                  onClick={handleNewCheckout}
                  disabled={checkoutLoading}
                  className="btn-primary w-full disabled:opacity-40">
                  {checkoutLoading ? 'Redirecting to checkout…' : 'Get the Car Buying Pass — $19'}
                </button>
                <p className="text-center text-[var(--text-muted)] text-xs mt-3">
                  One payment · 60-day access · No recurring charges
                </p>
              </div>
            )}

            {/* ── Restore access ── */}
            <div className="card anim-4">
              <h2 className="font-display font-bold text-white text-lg mb-1">Restore Access</h2>
              <p className="text-[var(--text-muted)] text-sm mb-4">
                Already subscribed? Enter your email to restore Pro access on this device.
              </p>

              {deviceLimitEmail ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border p-4 text-sm"
                    style={{ borderColor: 'rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.06)' }}>
                    <p className="text-red-400 font-semibold mb-1">Device limit reached</p>
                    <p className="text-[var(--text-muted)] leading-relaxed">
                      This subscription is already active on 2 devices. To add this device,
                      reset your registered devices below — all other devices will need to
                      re-verify with their email.
                    </p>
                  </div>
                  {deviceResetErr && <p className="text-xs text-red-400">{deviceResetErr}</p>}
                  {deviceResetMsg && <p className="text-xs text-green-400">{deviceResetMsg}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setDeviceLimitEmail(''); setDeviceResetMsg(''); setDeviceResetErr('') }}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDevices}
                      disabled={resettingDevices}
                      className="flex-1 btn-primary disabled:opacity-40 text-sm">
                      {resettingDevices ? 'Resetting…' : 'Reset My Devices'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRestore} className="flex flex-col gap-3">
                  <input
                    type="email"
                    className="input-field text-sm"
                    placeholder="your@email.com"
                    value={restoreEmail}
                    onChange={e => setRestoreEmail(e.target.value)}
                  />
                  {restoreErr && <p className="text-xs text-red-400">{restoreErr}</p>}
                  {restoreMsg && <p className="text-xs text-green-400">{restoreMsg}</p>}
                  <button
                    type="submit"
                    disabled={restoring}
                    className="btn-primary w-full disabled:opacity-40 text-sm">
                    {restoring ? 'Checking…' : 'Restore Access'}
                  </button>
                </form>
              )}
            </div>

            {/* ── Pass & Subscription Info ── */}
            <div className="card anim-5">
              <h2 className="font-display font-bold text-white text-lg mb-1">Pass &amp; Subscription Info</h2>
              <p className="text-[var(--text-muted)] text-sm mb-4">
                Enter your email to check your access status or cancel a legacy subscription.
              </p>
              <form onSubmit={handleCancel} className="flex flex-col gap-3">
                <input
                  type="email"
                  className="input-field text-sm"
                  placeholder="your@email.com"
                  value={cancelEmail}
                  onChange={e => { setCancelEmail(e.target.value); setCancelPurchaseType(null) }}
                />
                {cancelErr && <p className="text-xs text-red-400">{cancelErr}</p>}
                {cancelPurchaseType === 'one_time' && (
                  <div className="rounded-lg border p-3 text-sm"
                    style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.04)' }}>
                    <p className="text-[var(--accent)] font-semibold mb-0.5">One-time pass</p>
                    <p className="text-[var(--text-muted)]">Your 60-day pass expires automatically — no cancellation needed.</p>
                  </div>
                )}
                {cancelMsg && (
                  <div className="rounded-lg border p-3 text-sm"
                    style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.04)' }}>
                    <p className="text-[var(--accent)] font-semibold mb-0.5">Subscription canceled</p>
                    <p className="text-[var(--text-muted)]">{cancelMsg}</p>
                  </div>
                )}
                {!cancelMsg && !cancelPurchaseType && (
                  <button
                    type="submit"
                    disabled={canceling}
                    className="py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    {canceling ? 'Checking…' : 'Cancel Subscription'}
                  </button>
                )}
              </form>
            </div>

            {/* ── FAQ ── */}
            <div className="card anim-5">
              <h2 className="font-display font-bold text-white text-lg mb-4">FAQ</h2>
              <div className="flex flex-col gap-4 text-sm">
                {[
                  {
                    q: "What's always free?",
                    a: 'Single-vehicle TCO (year 1), basic affordability score, buy vs. lease (single vehicle), state taxes & fees, ZIP-based fuel pricing, top car quiz match, used-car checklist, Wheel-Zard AI, and the resource library.',
                  },
                  {
                    q: 'What does Pro unlock?',
                    a: 'The Car Buying Pass unlocks: full 5-year ownership forecast (see which car costs $8k more over time), multi-vehicle comparison (up to 5), buy vs. lease comparison, repair & reliability risk score, salary optimization tool, full quiz ranked results, and PDF report export.',
                  },
                  {
                    q: 'Is there a recurring charge?',
                    a: 'No. The Car Buying Pass is a single $19 payment. There is no subscription, no auto-renewal, and no cancellation needed.',
                  },
                  {
                    q: 'What happens when my pass expires?',
                    a: 'After 60 days, you revert to the free tier. If you\'re still in the market, you can purchase another pass.',
                  },
                  {
                    q: 'How do I access Pro on a new device?',
                    a: 'Use the "Restore Access" form above with your email. Pro access is limited to 2 devices at a time. If you\'ve reached the limit, use "Reset My Devices" to clear your registered devices and re-register.',
                  },
                  {
                    q: 'Is my payment secure?',
                    a: 'Yes. Payments are processed by Stripe — we never store your card details.',
                  },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <p className="text-white font-semibold mb-1">{q}</p>
                    <p className="text-[var(--text-muted)] leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
