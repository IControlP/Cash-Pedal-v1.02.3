import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../hooks/useSubscription'

const FEATURES = [
  "See if that car costs $8k more than it looks over 5 years",
  "Find which of 5 vehicles is actually the best deal",
  "Know exactly what salary you need before you commit",
  "Spot reliability red flags before you sign",
  "Compare buy vs. lease — which actually wins for you",
  "Get your full ranked vehicle type matches",
  "Export a clean PDF to share or negotiate with",
]

export default function PaywallModal({ feature, usedCount, cancelPath, onUnlocked }) {
  const [email,       setEmail]       = useState('')
  const [restoreMode, setRestoreMode] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [restoreErr,  setRestoreErr]  = useState('')
  const [checkoutErr, setCheckoutErr] = useState('')
  const [deviceLimit, setDeviceLimit] = useState(false)

  const { verifySubscription } = useSubscription()

  async function handleCheckout() {
    setCheckoutErr('')
    setLoading(true)
    try {
      const res  = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ passType: 'one_time', email: email || undefined, cancelPath }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutErr(data.error || 'Could not start checkout. Please try again.')
        setLoading(false)
      }
    } catch {
      setCheckoutErr('Connection error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  async function handleRestore(e) {
    e.preventDefault()
    setRestoreErr(''); setDeviceLimit(false)
    if (!email.trim()) { setRestoreErr('Please enter your email address.'); return }
    setLoading(true)
    const result = await verifySubscription(email)
    setLoading(false)
    if (result.active) {
      onUnlocked()
    } else if (result.reason === 'device_limit') {
      setDeviceLimit(true)
    } else if (result.error === 'network') {
      setRestoreErr('Could not reach server. Please check your connection.')
    } else {
      setRestoreErr('No active pass found for that email. Get access below.')
      setRestoreMode(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Cash Pedal Pro
            <span className="w-4 h-px bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-extrabold text-white text-xl sm:text-2xl leading-snug">
            Is this car right for you?<br />Know before you sign — $19.
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed">
            Get the confidence to say yes — or the clarity to walk away. One payment, no subscription.
          </p>
        </div>

        <div className="rounded-xl border p-4 mb-5"
          style={{ borderColor: 'rgba(255,184,0,0.25)', background: 'rgba(255,184,0,0.04)' }}>
          <div className="text-center mb-3">
            <div className="font-display font-extrabold text-white text-3xl">$19</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">60 days of full Pro access · One payment · No subscription</p>
          </div>
          <ul className="text-sm text-[var(--text-muted)] space-y-1.5">
            {FEATURES.map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {restoreMode ? (
          deviceLimit ? (
            <div className="flex flex-col gap-3 mb-4">
              <div className="rounded-xl border p-4 text-sm"
                style={{ borderColor: 'rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.06)' }}>
                <p className="text-red-400 font-semibold mb-1">Device limit reached</p>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  This pass is already active on 2 devices. To use it here,
                  go to your subscription page to reset your registered devices.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDeviceLimit(false); setRestoreErr('') }}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                  Back
                </button>
                <Link to="/subscribe" className="flex-1 btn-primary text-sm text-center">
                  Manage Devices
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRestore} className="flex flex-col gap-3 mb-4">
              <p className="text-sm text-white font-semibold">Restore your pass</p>
              <input
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
              {restoreErr && <p className="text-xs text-red-400">{restoreErr}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRestoreMode(false); setRestoreErr('') }}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-40 text-sm">
                  {loading ? 'Checking…' : 'Restore Access'}
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <input
                type="email"
                className="input-field text-sm"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)] px-1">
                {email.trim()
                  ? <span style={{ color: 'var(--accent)' }}>✓ You can restore access on any device with this email.</span>
                  : 'Add your email to restore access later or use on another device.'}
              </p>
            </div>
            {checkoutErr && <p className="text-xs text-red-400">{checkoutErr}</p>}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-40">
              {loading ? 'Redirecting…' : 'Get the Car Buying Pass — $19'}
            </button>
            <p className="text-center text-xs text-[var(--text-muted)]">
              One payment. Access lasts 60 days. No subscription, no surprises.
            </p>
            <button
              onClick={() => { setRestoreMode(true); setRestoreErr('') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-center">
              Already have a pass? Restore access →
            </button>
          </div>
        )}

        <p className="text-center text-[var(--text-muted)] text-xs leading-relaxed">
          Secure payment via Stripe. Simple calculator &amp; basic results are always free.
        </p>
      </div>
    </div>
  )
}
