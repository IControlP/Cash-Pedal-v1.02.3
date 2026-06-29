import { safeGet, safeSet } from './safeStorage'
import { safeUUID } from './safeId'

// Anonymous, per-browser session UUID. Used to dedupe analytics, market-search
// rankings, and bonus-credit tracking — no email/IP, just a random id stored
// in localStorage. (Previously lived in the now-removed TermsGate component.)
export const LS_SESSION_ID = 'cashpedal_session_id'

export function getSessionId() {
  let sid = safeGet(LS_SESSION_ID)
  if (!sid) {
    sid = safeUUID()
    safeSet(LS_SESSION_ID, sid)
  }
  return sid
}
