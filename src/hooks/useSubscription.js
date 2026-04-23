import { useState, useEffect } from 'react'

export const LS_SUB_EMAIL       = 'cashpedal_subscriber_email'
export const LS_SUB_EXPIRES     = 'cashpedal_sub_expires'
export const LS_SUB_VERIFIED_AT = 'cashpedal_sub_verified_at'

// Permanent pro user — bypasses all subscription checks and never expires
export const PRO_USER_EMAIL = 'pro@cashpedal.io'

const VERIFY_INTERVAL_MS = 24 * 60 * 60 * 1000 // re-verify once per day

function isActiveFromStorage() {
  const email   = localStorage.getItem(LS_SUB_EMAIL)
  const expires = localStorage.getItem(LS_SUB_EXPIRES)
  if (!email) return false
  if (email === PRO_USER_EMAIL) return true
  if (expires && new Date(expires) < new Date()) return false
  return true
}

export function useSubscription() {
  const [isSubscribed,    setIsSubscribed]    = useState(isActiveFromStorage)
  const [subscriberEmail, setSubscriberEmail] = useState(() => localStorage.getItem(LS_SUB_EMAIL) || '')

  // Re-verify against server once per day if we think they're subscribed
  useEffect(() => {
    const email      = localStorage.getItem(LS_SUB_EMAIL)
    const verifiedAt = localStorage.getItem(LS_SUB_VERIFIED_AT)
    if (!email) return
    if (email === PRO_USER_EMAIL) return // pro user never needs re-verification

    const stale = !verifiedAt || (Date.now() - parseInt(verifiedAt, 10)) > VERIFY_INTERVAL_MS
    if (stale) {
      verifySubscription(email).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifySubscription(email) {
    const clean = (email || '').trim().toLowerCase()
    if (!clean) return { active: false }

    // Pro user is always active — no API call needed
    if (clean === PRO_USER_EMAIL) {
      localStorage.setItem(LS_SUB_EMAIL,       clean)
      localStorage.setItem(LS_SUB_VERIFIED_AT, String(Date.now()))
      localStorage.removeItem(LS_SUB_EXPIRES)
      setIsSubscribed(true)
      setSubscriberEmail(clean)
      return { active: true, email: clean }
    }

    try {
      const res  = await fetch(`/api/subscription-status?email=${encodeURIComponent(clean)}`)
      const data = await res.json()

      if (data.active) {
        localStorage.setItem(LS_SUB_EMAIL,       clean)
        localStorage.setItem(LS_SUB_VERIFIED_AT, String(Date.now()))
        if (data.expires) localStorage.setItem(LS_SUB_EXPIRES, data.expires)
        setIsSubscribed(true)
        setSubscriberEmail(clean)
        return { active: true, email: clean, expires: data.expires }
      } else {
        // Only wipe stored credentials if the server explicitly says they're inactive
        if (localStorage.getItem(LS_SUB_EMAIL) === clean) {
          localStorage.removeItem(LS_SUB_EMAIL)
          localStorage.removeItem(LS_SUB_EXPIRES)
          localStorage.removeItem(LS_SUB_VERIFIED_AT)
          setIsSubscribed(false)
          setSubscriberEmail('')
        }
        return { active: false }
      }
    } catch {
      // Network failure — keep cached state, don't log the user out
      return { active: isActiveFromStorage(), error: 'network' }
    }
  }

  function activateFromSession(email, expires) {
    const clean = (email || '').trim().toLowerCase()
    localStorage.setItem(LS_SUB_EMAIL,       clean)
    localStorage.setItem(LS_SUB_VERIFIED_AT, String(Date.now()))
    if (expires) localStorage.setItem(LS_SUB_EXPIRES, expires)
    setIsSubscribed(true)
    setSubscriberEmail(clean)
  }

  function clearSubscription() {
    if (localStorage.getItem(LS_SUB_EMAIL) === PRO_USER_EMAIL) return
    localStorage.removeItem(LS_SUB_EMAIL)
    localStorage.removeItem(LS_SUB_EXPIRES)
    localStorage.removeItem(LS_SUB_VERIFIED_AT)
    setIsSubscribed(false)
    setSubscriberEmail('')
  }

  return { isSubscribed, subscriberEmail, verifySubscription, activateFromSession, clearSubscription }
}
