import { getSessionId } from './session'

// Fire-and-forget calculation snapshot for market analytics. Fired at the
// same moment the calculator_completed GA4 event fires, capturing the numbers
// the visitor actually entered (asking price, mileage, financing terms) —
// pass null for anything left at its default or not part of the flow.
// Location is coarsened before it leaves the browser: only the first 3 zip
// digits are ever sent (the server truncates again regardless). Pseudonymous:
// the only identifier is the browser-generated session UUID.
export function trackCalculation({
  make, model, year = null, state = null, zip = null,
  listingType = 'unspecified', askingPrice = null, mileage = null,
  financingTermMonths = null, apr = null, downPayment = null,
} = {}) {
  if (!make || !model) return
  try {
    const zipStr = zip == null ? '' : String(zip).trim()
    const zip3   = /^\d{5}$/.test(zipStr) ? zipStr.slice(0, 3) : null
    fetch('/api/track-calculation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        make,
        model,
        year: year ? parseInt(year, 10) : null,
        state: state || null,
        zip3,
        listing_type:          listingType,
        asking_price:          askingPrice ?? null,
        mileage:               mileage ?? null,
        financing_term_months: financingTermMonths ?? null,
        apr:                   apr ?? null,
        down_payment:          downPayment ?? null,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never block the UI on analytics
  }
}
