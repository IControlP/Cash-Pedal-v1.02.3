import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getConsent,
  hasDecision,
  setConsent,
  gpcEnabled,
  CONSENT_OPEN_EVENT,
} from '../utils/consent'

// Global opt-in cookie/tracker consent banner.
//
// Shown on first visit (no saved decision). Trackers stay off until the visitor
// chooses. "Reject all" keeps only strictly-necessary storage. A preferences
// panel lets the visitor toggle Analytics and Advertising independently. Footer
// links dispatch CONSENT_OPEN_EVENT to reopen this as a settings panel so a
// choice can be changed or withdrawn at any time (GDPR Art. 7(3) / CPRA opt-out).

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-b-0">
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold">{label}</p>
        <p className="text-[var(--text-muted)] text-xs mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`shrink-0 mt-1 w-11 h-6 rounded-full transition-colors relative ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ background: checked ? 'var(--accent)' : 'var(--surface-hover)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export default function CookieConsent() {
  const [visible, setVisible]   = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [analytics, setAnalytics]     = useState(false)
  const [advertising, setAdvertising] = useState(false)
  const gpc = gpcEnabled()

  // Show the banner on first load if no decision has been made yet.
  useEffect(() => {
    if (!hasDecision()) setVisible(true)
  }, [])

  // Let footer links / anywhere reopen the settings panel.
  useEffect(() => {
    const openSettings = () => {
      const current = getConsent()
      setAnalytics(current?.analytics ?? true)
      setAdvertising(current?.advertising ?? true)
      setShowPrefs(true)
      setVisible(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, openSettings)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openSettings)
  }, [])

  if (!visible) return null

  const close = () => {
    setVisible(false)
    setShowPrefs(false)
  }

  const acceptAll = () => {
    // A GPC signal is a binding opt-out of advertising/"sharing" — never store
    // advertising consent while it's present, even on "Accept all".
    setConsent({ analytics: true, advertising: !gpc, method: 'accept_all' })
    close()
  }

  const rejectAll = () => {
    setConsent({ analytics: false, advertising: false, method: 'reject_all' })
    close()
  }

  const savePrefs = () => {
    setConsent({ analytics, advertising: gpc ? false : advertising, method: 'save_prefs' })
    close()
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl border border-[var(--border)] shadow-2xl p-5 sm:p-6"
        style={{ background: 'var(--surface)' }}
      >
        {!showPrefs ? (
          <>
            <h2 className="font-display font-bold text-white text-base sm:text-lg mb-2">
              We value your privacy
            </h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-4">
              We use cookies and similar technologies for analytics (Google Analytics,
              Microsoft Clarity) and advertising measurement (Meta Pixel) to understand how the
              site is used and improve it. These do not load until you choose. Strictly necessary
              storage is always on. Read our{' '}
              <Link to="/privacy" className="text-[var(--accent)] underline" onClick={close}>
                Privacy &amp; Cookie Policy
              </Link>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={acceptAll}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold"
              >
                Accept all
              </button>
              <button
                onClick={rejectAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Reject all
              </button>
              <button
                onClick={() => {
                  const current = getConsent()
                  setAnalytics(current?.analytics ?? true)
                  setAdvertising(current?.advertising ?? true)
                  setShowPrefs(true)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Manage preferences
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display font-bold text-white text-base sm:text-lg mb-3">
              Cookie preferences
            </h2>
            <div className="mb-4">
              <Toggle
                label="Strictly necessary"
                description="Required for the site to work — login state, your saved calculator inputs, and security. Always active."
                checked
                disabled
                onChange={() => {}}
              />
              <Toggle
                label="Analytics"
                description="Google Analytics and Microsoft Clarity — anonymous usage stats and session insights that help us improve the tools."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Toggle
                label="Advertising"
                description={
                  gpc
                    ? 'Meta Pixel — your browser is sending a Global Privacy Control (GPC) signal, so advertising/"sharing" is turned off and cannot be enabled here.'
                    : 'Meta Pixel — measures ad performance and may share activity with Meta for cross-context advertising. California residents can decline this here.'
                }
                checked={gpc ? false : advertising}
                disabled={gpc}
                onChange={setAdvertising}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={savePrefs}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold"
              >
                Save preferences
              </button>
              <button
                onClick={rejectAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Reject all
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Accept all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
