import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../hooks/useSubscription'
import { useBonusCredits, BONUS_CREDITS } from '../hooks/useBonusCredits'
import { trackUpgradePromptSeen, trackUpgradeClicked, trackEmailUnlockClaimed } from '../utils/analytics'

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
  useEffect(() => {
    trackUpgradePromptSeen(feature, cancelPath)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [email,       setEmail]       = useState('')
  const [restoreMode, setRestoreMode] = useState(false)
  const [promoMode,   setPromoMode]   = useState(false)
  const [promoCode,   setPromoCode]   = useState('')
  const [promoErr,    setPromoErr]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [restoreErr,  setRestoreErr]  = useState('')
  const [checkoutErr, setCheckoutErr] = useState('')
  const [deviceLimit, setDeviceLimit] = useState(false)
  const [bonusMode,   setBonusMode]   = useState(false)
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [bonusErr,    setBonusErr]    = useState('')
  const [bonusDone,   setBonusDone]   = useState(null) // { creditsLeft, restored } when claimed

  const { verifySubscription, verifyPromoCode } = useSubscription()
  const { claimed, creditsLeft, claimBonus } = useBonusCredits()

  async function handleCheckout() {
    trackUpgradeClicked(feature, '$19')
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

  async function handleBonusClaim(e) {
    e.preventDefault()
    setBonusErr('')
    if (!firstName.trim() || !lastName.trim()) { setBonusErr('Please enter your first and last name.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setBonusErr('Please enter a valid email address.'); return }
    setLoading(true)
    const result = await claimBonus({ firstName, lastName, email })
    setLoading(false)
    if (result.success) {
      if (result.creditsLeft <= 0) {
        setBonusErr('This email has already used all its free Pro calculations.')
        return
      }
      if (!result.restored) trackEmailUnlockClaimed(feature)
      setBonusDone({ creditsLeft: result.creditsLeft, restored: !!result.restored })
      setTimeout(() => onUnlocked('bonus'), 1600)
    } else if (result.error === 'network') {
      setBonusErr('Could not reach server. Please check your connection.')
    } else if (result.error === 'device_claimed') {
      setBonusErr('Free calculations were already claimed from this browser with a different email.')
    } else {
      setBonusErr('Something went wrong. Please try again.')
    }
  }

  async function handlePromo(e) {
    e.preventDefault()
    setPromoErr('')
    if (!promoCode.trim()) { setPromoErr('Please enter your promo code.'); return }
    setLoading(true)
    const result = await verifyPromoCode(promoCode)
    setLoading(false)
    if (result.valid) {
      onUnlocked()
    } else if (result.error === 'network') {
      setPromoErr('Could not reach server. Please check your connection.')
    } else {
      setPromoErr('Invalid promo code.')
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

        {bonusMode ? (
          bonusDone ? (
            <div className="text-center py-6 mb-4">
              <div className="text-3xl mb-3">🎉</div>
              <p className="text-white font-bold text-lg font-display">
                {bonusDone.restored
                  ? `Welcome back — ${bonusDone.creditsLeft} free Pro calculation${bonusDone.creditsLeft !== 1 ? 's' : ''} left!`
                  : `You've got ${bonusDone.creditsLeft} free Pro calculations!`}
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-2">
                {bonusDone.restored
                  ? 'Unlocking now — your remaining balance was restored.'
                  : `Unlocking now — we'll send car-buying tips to ${email.trim().toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleBonusClaim} className="flex flex-col gap-3 mb-4">
              <p className="text-sm text-white font-semibold">Get {BONUS_CREDITS} free Pro calculations</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 min-w-0"
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <input
                  type="text"
                  className="input-field flex-1 min-w-0"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <input
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={255}
              />
              {bonusErr && <p className="text-xs text-red-400">{bonusErr}</p>}
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                By claiming, you agree to receive occasional car-buying tips and Cash Pedal updates by email.
                Unsubscribe any time. We never sell your data — see our{' '}
                <a href="/privacy" className="text-[var(--accent)] underline hover:brightness-110">Privacy Policy</a>.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setBonusMode(false); setBonusErr('') }}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-40 text-sm">
                  {loading ? 'Claiming…' : `Claim ${BONUS_CREDITS} Free Calculations`}
                </button>
              </div>
            </form>
          )
        ) : promoMode ? (
          <form onSubmit={handlePromo} className="flex flex-col gap-3 mb-4">
            <p className="text-sm text-white font-semibold">Enter your promo code</p>
            <input
              type="text"
              className="input-field"
              placeholder="Promo code"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              autoFocus
            />
            {promoErr && <p className="text-xs text-red-400">{promoErr}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPromoMode(false); setPromoErr(''); setPromoCode('') }}
                className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-40 text-sm">
                {loading ? 'Checking…' : 'Apply Code'}
              </button>
            </div>
          </form>
        ) : restoreMode ? (
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
              {loading ? 'Redirecting…' : 'Get the Car Buying Pass — $19'}
            </button>
            <p className="text-center text-xs text-[var(--text-muted)]">
              One payment. Access lasts 60 days. No subscription, no surprises.
            </p>
            {!claimed ? (
              <button
                onClick={() => { setBonusMode(true); setBonusErr('') }}
                className="w-full py-2.5 rounded-xl border text-sm font-semibold transition-colors hover:brightness-110"
                style={{ borderColor: 'rgba(255,184,0,0.35)', color: 'var(--accent)', background: 'rgba(255,184,0,0.05)' }}>
                🎁 Not ready to buy? Get {BONUS_CREDITS} free Pro calculations →
              </button>
            ) : creditsLeft > 0 ? (
              <button
                onClick={() => onUnlocked('bonus')}
                className="w-full py-2.5 rounded-xl border text-sm font-semibold transition-colors hover:brightness-110"
                style={{ borderColor: 'rgba(255,184,0,0.35)', color: 'var(--accent)', background: 'rgba(255,184,0,0.05)' }}>
                Use 1 of your {creditsLeft} free Pro calculation{creditsLeft !== 1 ? 's' : ''} →
              </button>
            ) : (
              <p className="text-center text-xs text-[var(--text-muted)]">
                You've used all {BONUS_CREDITS} free Pro calculations from your email unlock.
              </p>
            )}
            <button
              onClick={() => { setRestoreMode(true); setRestoreErr('') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-center">
              Already have a pass? Restore access →
            </button>
            <button
              onClick={() => { setPromoMode(true); setPromoErr(''); setPromoCode('') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-center">
              Have a promo code? →
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
