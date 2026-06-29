import { getSessionId } from './session'

// Fire-and-forget market-analytics search event. Recorded when a visitor
// selects a real make/model in a tool. State is optional — it's only sent
// when the visitor has entered a ZIP/state. Pseudonymous: the only identifier
// is the browser-generated session UUID (no email, no IP stored).
export function trackSearch({ make, model, year = null, state = null }) {
  if (!make || !model) return
  try {
    fetch('/api/track-search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        make,
        model,
        year: year ? parseInt(year, 10) : null,
        state: state || null,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never block the UI on analytics
  }
}
