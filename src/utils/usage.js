import { getSessionId } from '../components/TermsGate'
import { LS_SUB_EMAIL } from '../hooks/useSubscription'
import { LS_BONUS_EMAIL } from '../hooks/useBonusCredits'

// Fire-and-forget first-party usage event. Works for anonymous visitors —
// the only identifier is the browser-generated session UUID. If the visitor
// has identified themselves (subscriber email), it's attached so usage can
// be tied to the account; otherwise the event stays pseudonymous.
//
// Note: bonus-credit spends are logged server-side by /api/spend-bonus, so
// callers should NOT also call trackUsage for 'bonus'-gated actions.
export function trackUsage(feature, gate = null) {
  try {
    fetch('/api/track-usage', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        feature,
        gate,
        email: localStorage.getItem(LS_SUB_EMAIL) || localStorage.getItem(LS_BONUS_EMAIL) || undefined,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never block the UI on analytics
  }
}
