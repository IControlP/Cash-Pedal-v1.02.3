import { useState, useEffect } from 'react'
import { getSessionId } from '../components/TermsGate'

const BONUS_CHANGED = 'cashpedal_bonus_changed'

export const LS_BONUS_CLAIMED = 'cashpedal_bonus_claimed'
export const LS_BONUS_LEFT    = 'cashpedal_bonus_credits_left'

// Credits granted once per device in exchange for name + email
export const BONUS_CREDITS = 5

function readClaimed() {
  return localStorage.getItem(LS_BONUS_CLAIMED) === 'true'
}

function readCreditsLeft() {
  if (!readClaimed()) return 0
  const n = parseInt(localStorage.getItem(LS_BONUS_LEFT) || '0', 10)
  return Number.isNaN(n) ? 0 : Math.max(0, n)
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

  // Submits the lead to the server; grants the credits locally only on success.
  async function claimBonus({ firstName, lastName, email }) {
    if (readClaimed()) return { success: false, error: 'already_claimed' }

    const cleanFirst = (firstName || '').trim()
    const cleanLast  = (lastName  || '').trim()
    const cleanEmail = (email     || '').trim().toLowerCase()
    if (!cleanFirst || !cleanLast) return { success: false, error: 'name_required' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { success: false, error: 'invalid_email' }

    try {
      const res = await fetch('/api/user-data', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id:         crypto.randomUUID(),
          session_id:        getSessionId(),
          first_name:        cleanFirst,
          last_name:         cleanLast,
          email:             cleanEmail,
          calculation_count: parseInt(localStorage.getItem('cashpedal_calculation_count') || '0', 10) || 0,
          source:            'email_unlock',
        }),
      })
      const data = await res.json()
      if (!data.success) return { success: false, error: data.error || 'server' }
    } catch {
      return { success: false, error: 'network' }
    }

    localStorage.setItem(LS_BONUS_CLAIMED, 'true')
    localStorage.setItem(LS_BONUS_LEFT, String(BONUS_CREDITS))
    setClaimed(true)
    setCreditsLeft(BONUS_CREDITS)
    window.dispatchEvent(new Event(BONUS_CHANGED))
    return { success: true, credits: BONUS_CREDITS }
  }

  // Spends one credit. Returns true if a credit was available and consumed.
  function spendCredit() {
    const left = readCreditsLeft()
    if (left <= 0) return false
    localStorage.setItem(LS_BONUS_LEFT, String(left - 1))
    setCreditsLeft(left - 1)
    window.dispatchEvent(new Event(BONUS_CHANGED))
    return true
  }

  return { claimed, creditsLeft, claimBonus, spendCredit }
}
