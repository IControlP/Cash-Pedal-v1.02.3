import { useState } from 'react'
import { useSubscription } from '../hooks/useSubscription'

const FEATURE_COPY = {
  tco: {
    icon: '🔬',
    title: 'Detailed TCO Analysis',
    description: 'vehicle-specific cost breakdowns with depreciation curves, insurance models by state, and itemized maintenance estimates',
    freeLimit: 3,
    unit: 'detailed analysis',
    units: 'detailed analyses',
  },
  checklist: {
    icon: '🔍',
    title: 'Used Car Checklist',
    description: 'maintenance audits, negotiation leverage calculations, and seller question guides',
    freeLimit: 5,
    unit: 'checklist',
    units: 'checklists',
  },
}

export default function PaywallModal({ feature, usedCount, cancelPath, onUnlocked }) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.tco

  const [email,        setEmail]        = useState('')
  const [restoreMode,  setRestoreMode]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [restoreErr,   setRestoreErr]   = useState('')
  const [checkoutErr,  setCheckoutErr]  = useState('')

  const { verifySubscription, activateFromSession } = useSubscription()

  async function handleCheckout() {
    setCheckoutErr('')
    setLoading(true)
    try {
      const res  = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email || undefined, cancelPath }),
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
    setRestoreErr('')
    if (!email.trim()) { setRestoreErr('Please enter your email address.'); return }
    setLoading(true)
    const result = await verifySubscription(email)
    setLoading(false)
    if (result.active) {
      onUnlocked()
    } else if (result.error === 'network') {
      setRestoreErr('Could not reach server. Please check your connection.')
    } else {
      setRestoreErr('No active subscription found for that email. Subscribe below to get access.')
      setRestoreMode(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md">

        {/* Icon + heading */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{copy.icon}</div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            <span className="w-4 h-px bg-[var(--accent)]" />
            CashPedal Pro
            <span className="w-4 h-px bg-[var(--accent)]" />
          </div>
          <h2 className="font-display font-extrabold text-white text-xl sm:text-2xl">
            Free limit reached
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed">
            You've used <span className="text-white font-semibold">{usedCount} of {copy.freeLimit}</span> free {copy.units}.
            Unlock unlimited access to {copy.description}.
          </p>
        </div>

        {/* Pricing card */}
        <div className="rounded-xl border p-4 mb-5 text-center"
          style={{ borderColor: 'rgba(200,255,0,0.25)', background: 'rgba(200,255,0,0.04)' }}>
          <div className="font-display font-extrabold text-white text-3xl">
            $10<span className="text-lg font-normal text-[var(--text-muted)]">/month</span>
          </div>
          <ul className="mt-3 text-sm text-[var(--text-muted)] space-y-1.5 text-left mx-auto max-w-xs">
            {[
              'Unlimited detailed TCO analyses',
              'Unlimited used-car checklists',
              'Add results to multi-car comparison',
              'Cancel anytime from your account',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Restore existing subscription */}
        {restoreMode ? (
          <form onSubmit={handleRestore} className="flex flex-col gap-3 mb-4">
            <p className="text-sm text-white font-semibold">Restore your subscription</p>
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
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {/* Optional email for checkout prefill */}
            <input
              type="email"
              className="input-field text-sm"
              placeholder="Email (optional — prefills checkout)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {checkoutErr && <p className="text-xs text-red-400">{checkoutErr}</p>}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-40">
              {loading ? 'Redirecting…' : 'Subscribe — $10/month'}
            </button>
            <button
              onClick={() => { setRestoreMode(true); setRestoreErr('') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-center">
              Already subscribed? Restore access →
            </button>
          </div>
        )}

        <p className="text-center text-[var(--text-muted)] text-xs leading-relaxed">
          Secure payment via Stripe. Cancel anytime — access lasts through the end of your billing period.
          Simple calculator &amp; basic results are always free.
        </p>
      </div>
    </div>
  )
}
