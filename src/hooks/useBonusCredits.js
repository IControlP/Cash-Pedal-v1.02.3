import { useState, useEffect } from 'react'
import { getSessionId } from '../components/TermsGate'

const BONUS_CHANGED = 'cashpedal_bonus_changed'

export const LS_BONUS_CLAIMED = 'cashpedal_bonus_claimed'
export const LS_BONUS_LEFT    = 'cashpedal_bonus_credits_left'
export const LS_BONUS_EMAIL   = 'cashpedal_bonus_email'

// Credits granted once per email in exchange for name + email.
// The server (bonus_credits table) is the source of truth for the balance;
// localStorage is only a cache so the UI can render counts instantly.
export const BONUS_CREDITS = 5

const SYNC_INTERVAL_MS = 60 * 60 * 1000 // re-sync balance at most once per hour
const LS_BONUS_SYNCED_AT = 'cashpedal_bonus_synced_at'

function readClaimed() {
  return localStorage.getItem(LS_BONUS_CLAIMED) === 'true'
}

function readCreditsLeft() {
  if (!readClaimed()) return 0
  const n = parseInt(localStorage.getItem(LS_BONUS_LEFT) || '0', 10)
  return Number.isNaN(n) ? 0 : Math.max(0, n)
}

function writeState(claimed, left, email) {
  localStorage.setItem(LS_BONUS_CLAIMED, String(claimed))
  localStorage.setItem(LS_BONUS_LEFT, String(Math.max(0, left)))
  if (email) localStorage.setItem(LS_BONUS_EMAIL, email)
  window.dispatchEvent(new Event(BONUS_CHANGED))
}

export function useBonusCredits() {
  const [claimed,     setClaimed]     = useState(readClaimed)
  const [creditsLeft, setCreditsLeft] = useState(readCreditsLeft)

  // Sync state across all hook instances when any one of them changes credits
  useEffect(() => {
    function onChanged() {
      setClaimed(readClaimed())
      setCreditsLeft(readCreditsLeft())
    }
    window.addEventListener(BONUS_CHANGED, onChanged)
    return () => window.removeEventListener(BONUS_CHANGED, onChanged)
  }, [])

  // Re-sync the cached balance against the server periodically, so a stale
  // or tampered local count converges to the server's authoritative one.
  useEffect(() => {
    const email = localStorage.getItem(LS_BONUS_EMAIL)
    if (!readClaimed() || !email) return
    const syncedAt = parseInt(localStorage.getItem(LS_BONUS_SYNCED_AT) || '0', 10)
    if (Date.now() - syncedAt < SYNC_INTERVAL_MS) return

    fetch('/api/bonus-status', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success || data.claimed === null) return // degraded server — keep cache
        localStorage.setItem(LS_BONUS_SYNCED_AT, String(Date.now()))
        writeState(data.claimed, data.claimed ? data.creditsLeft : 0, null)
        setClaimed(data.claimed)
        setCreditsLeft(data.claimed ? Math.max(0, data.creditsLeft) : 0)
      })
      .catch(() => {}) // network failure — keep cached state
  }, [])

  // Submits the lead to the server; the server grants the credits.
  // Returns { success, creditsLeft, restored } or { success: false, error }.
  async function claimBonus({ firstName, lastName, email }) {
    const cleanFirst = (firstName || '').trim()
    const cleanLast  = (lastName  || '').trim()
    const cleanEmail = (email     || '').trim().toLowerCase()
    if (!cleanFirst || !cleanLast) return { success: false, error: 'name_required' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { success: false, error: 'invalid_email' }

    try {
      const res = await fetch('/api/claim-bonus', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          first_name: cleanFirst,
          last_name:  cleanLast,
          email:      cleanEmail,
        }),
      })
      const data = await res.json()
      if (!data.success) return { success: false, error: data.error || 'server' }

      writeState(true, data.creditsLeft, cleanEmail)
      localStorage.setItem(LS_BONUS_SYNCED_AT, String(Date.now()))
      setClaimed(true)
      setCreditsLeft(Math.max(0, data.creditsLeft))
      return { success: true, creditsLeft: data.creditsLeft, restored: !!data.restored }
    } catch {
      return { success: false, error: 'network' }
    }
  }

  // Spends one credit via the server. Returns true if a credit was consumed.
  // The server logs the spend as a usage event, so callers must not also
  // trackUsage() for bonus-gated actions.
  async function spendCredit(feature) {
    if (readCreditsLeft() <= 0) return false

    const email = localStorage.getItem(LS_BONUS_EMAIL)
    if (!email) {
      // Legacy client-only claim (pre-server-enforcement) — honor the cached
      // balance locally since there's no server row to decrement.
      const left = readCreditsLeft()
      writeState(true, left - 1, null)
      setCreditsLeft(left - 1)
      return true
    }

    try {
      const res = await fetch('/api/spend-bonus', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: getSessionId(), email, feature }),
      })
      const data = await res.json()
      if (data.success) {
        writeState(true, data.creditsLeft, null)
        setCreditsLeft(Math.max(0, data.creditsLeft))
        return true
      }
      // Server says no — trust it and zero the cache
      writeState(true, 0, null)
      setCreditsLeft(0)
      return false
    } catch {
      // Network failure — degrade gracefully like the subscription hook:
      // spend from cache now; the next status sync reconciles with the server.
      const left = readCreditsLeft()
      writeState(true, left - 1, null)
      setCreditsLeft(left - 1)
      return true
    }
  }

  return { claimed, creditsLeft, claimBonus, spendCredit }
}
