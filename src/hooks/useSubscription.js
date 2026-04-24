import { useState, useEffect } from 'react'

const SUB_CHANGED = 'cashpedal_sub_changed'

export const LS_SUB_EMAIL       = 'cashpedal_subscriber_email'
export const LS_SUB_EXPIRES     = 'cashpedal_sub_expires'
export const LS_SUB_VERIFIED_AT = 'cashpedal_sub_verified_at'

// Permanent pro users — bypass all subscription checks and never expire
export const PRO_USER_EMAIL = 'pro@cashpedal.io'
const PRO_USERS = new Set([PRO_USER_EMAIL, 'noah@cashpedal.io'])

const VERIFY_INTERVAL_MS = 24 * 60 * 60 * 1000 // re-verify once per day

function isActiveFromStorage() {
  const email   = localStorage.getItem(LS_SUB_EMAIL)
  const expires = localStorage.getItem(LS_SUB_EXPIRES)
  if (!email) return false
  if (PRO_USERS.has(email)) return true
  if (expires && new Date(expires) < new Date()) return false
  return true
}

export function useSubscription() {
  const [isSubscribed,    setIsSubscribed]    = useState(isActiveFromStorage)
  const [subscriberEmail, setSubscriberEmail] = useState(() => localStorage.getItem(LS_SUB_EMAIL) || '')

  // Sync state across all hook instances when any one of them changes subscription
  useEffect(() => {
    function onChanged() {
      setIsSubscribed(isActiveFromStorage())
      setSubscriberEmail(localStorage.getItem(LS_SUB_EMAIL) || '')
    }
    window.addEventListener(SUB_CHANGED, onChanged)
    return () => window.removeEventListener(SUB_CHANGED, onChanged)
  }, [])

  // Re-verify against server once per day if we think they're subscribed
  useEffect(() => {
    const email      = localStorage.getItem(LS_SUB_EMAIL)
    const verifiedAt = localStorage.getItem(LS_SUB_VERIFIED_AT)
    if (!email) return
    if (PRO_USERS.has(email)) return // pro users never need re-verification

    const stale = !verifiedAt || (Date.now() - parseInt(verifiedAt, 10)) > VERIFY_INTERVAL_MS
    if (stale) {
      verifySubscription(email).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifySubscription(email) {
    const clean = (email || '').trim().toLowerCase()
    if (!clean) return { active: false }

    // Pro user is always active — no API call needed
    if (PRO_USERS.has(clean)) {
      localStorage.setItem(LS_SUB_EMAIL,       clean)
      localStorage.setItem(LS_SUB_VERIFIED_AT, String(Date.now()))
      localStorage.removeItem(LS_SUB_EXPIRES)
      setIsSubscribed(true)
      setSubscriberEmail(clean)
      window.dispatchEvent(new Event(SUB_CHANGED))
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
        window.dispatchEvent(new Event(SUB_CHANGED))
        return { active: true, email: clean, expires: data.expires }
      } else {
        // Device limit reached — don't wipe existing local state; let the UI surface the error
        if (data.reason === 'device_limit') {
          return { active: false, reason: 'device_limit', limit: data.limit, current: data.current }
        }

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
    window.dispatchEvent(new Event(SUB_CHANGED))
  }

  function clearSubscription() {
    if (PRO_USERS.has(localStorage.getItem(LS_SUB_EMAIL))) return
    localStorage.removeItem(LS_SUB_EMAIL)
    localStorage.removeItem(LS_SUB_EXPIRES)
    localStorage.removeItem(LS_SUB_VERIFIED_AT)
    setIsSubscribed(false)
    setSubscriberEmail('')
    window.dispatchEvent(new Event(SUB_CHANGED))
  }

  async function resetDevices(email) {
    const clean = (email || '').trim().toLowerCase()
    if (!clean) return { success: false, error: 'Email required' }
    try {
      const res  = await fetch('/api/reset-devices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: clean }),
      })
      const data = await res.json()
      return data.success ? { success: true } : { success: false, error: data.error }
    } catch {
      return { success: false, error: 'network' }
    }
  }

  return { isSubscribed, subscriberEmail, verifySubscription, activateFromSession, clearSubscription, resetDevices }
}
