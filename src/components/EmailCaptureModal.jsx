import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailCaptureModal({ isOpen, onClose }) {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setLoading(false)
    const saved = localStorage.getItem('cashpedal_prefill_email') || ''
    setEmail(saved)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setLoading(true)
    localStorage.setItem('cashpedal_prefill_email', clean)
    try {
      const cancelPath = location.pathname || '/subscribe'
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, cancelPath }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Something went wrong — please try again.')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(8,4,20,0.88)', backdropFilter: 'blur(4px)' }}
    >
      <div className="card w-full max-w-md relative" style={{ background: 'var(--surface)' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <span className="eyebrow" style={{ fontSize: '11px' }}>
          <span className="dot" />
          60-day shopper pass · $19 one-time
        </span>

        <h2 className="font-display font-bold text-white text-2xl leading-tight mt-3 mb-2">
          Where should we send your receipt?
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
          Enter your email — we'll pre-fill it on the Stripe checkout so you can look up your access later.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            disabled={loading}
            autoComplete="email"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Opening checkout…' : 'Continue to checkout →'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          No spam. No subscription. One payment of $19.
        </p>
      </div>
    </div>
  )
}
