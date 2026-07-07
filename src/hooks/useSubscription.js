import { useState, useEffect } from 'react'
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage'
import { getSessionId } from '../utils/session'

const SUB_CHANGED = 'cashpedal_sub_changed'

export const LS_SUB_EMAIL       = 'cashpedal_subscriber_email'
export const LS_SUB_EXPIRES     = 'cashpedal_sub_expires'
export const LS_SUB_VERIFIED_AT = 'cashpedal_sub_verified_at'
export const LS_PROMO_ACCESS    = 'cashpedal_promo_access'
export const LS_PROMO_EXPIRES   = 'cashpedal_promo_expires'

const VERIFY_INTERVAL_MS = 24 * 60 * 60 * 1000 // re-verify once per day

function isActiveFromStorage() {
  if (safeGet(LS_PROMO_ACCESS) === 'true') {
    // Time-boxed grants (beta code) store an expiry; unlimited codes don't.
    const promoExpires = safeGet(LS_PROMO_EXPIRES)
    if (!promoExpires || new Date(promoExpires) > new Date()) return true
  }
  const email   = safeGet(LS_SUB_EMAIL)
  const expires = safeGet(LS_SUB_EXPIRES)
  if (!email) return false
  if (expires && new Date(expires) < new Date()) return false
  return true
}

export function useSubscription() {
  const [isSubscribed,    setIsSubscribed]    = useState(isActiveFromStorage)
  const [subscriberEmail, setSubscriberEmail] = useState(() => safeGet(LS_SUB_EMAIL) || '')

  // Sync state across all hook instances when any one of them changes subscription
  useEffect(() => {
    function onChanged() {
      setIsSubscribed(isActiveFromStorage())
      setSubscriberEmail(safeGet(LS_SUB_EMAIL) || '')
    }
    window.addEventListener(SUB_CHANGED, onChanged)
    return () => window.removeEventListener(SUB_CHANGED, onChanged)
  }, [])

  // Re-verify against server once per day if we think they're subscribed
  useEffect(() => {
    const email      = safeGet(LS_SUB_EMAIL)
    const verifiedAt = safeGet(LS_SUB_VERIFIED_AT)
    if (!email) return

    const stale = !verifiedAt || (Date.now() - parseInt(verifiedAt, 10)) > VERIFY_INTERVAL_MS
    if (stale) {
      verifySubscription(email).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifySubscription(email) {
    const clean = (email || '').trim().toLowerCase()
    if (!clean) return { active: false }

    try {
      const res  = await fetch('/api/subscription-status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: clean }),
      })
      const data = await res.json()

      if (data.active) {
        safeSet(LS_SUB_EMAIL,       clean)
        safeSet(LS_SUB_VERIFIED_AT, String(Date.now()))
        if (data.expires) safeSet(LS_SUB_EXPIRES, data.expires)
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
        if (safeGet(LS_SUB_EMAIL) === clean) {
          safeRemove(LS_SUB_EMAIL)
          safeRemove(LS_SUB_EXPIRES)
          safeRemove(LS_SUB_VERIFIED_AT)
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
    safeSet(LS_SUB_EMAIL,       clean)
    safeSet(LS_SUB_VERIFIED_AT, String(Date.now()))
    if (expires) safeSet(LS_SUB_EXPIRES, expires)
    setIsSubscribed(true)
    setSubscriberEmail(clean)
    window.dispatchEvent(new Event(SUB_CHANGED))
  }

  function clearSubscription() {
    safeRemove(LS_SUB_EMAIL)
    safeRemove(LS_SUB_EXPIRES)
    safeRemove(LS_SUB_VERIFIED_AT)
    safeRemove(LS_PROMO_ACCESS)
    safeRemove(LS_PROMO_EXPIRES)
    setIsSubscribed(false)
    setSubscriberEmail('')
    window.dispatchEvent(new Event(SUB_CHANGED))
  }

  async function verifyPromoCode(code) {
    if (!code || !code.trim()) return { valid: false }
    try {
      const res  = await fetch('/api/verify-promo-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: code.trim(), session_id: getSessionId() }),
      })
      const data = await res.json()
      if (data.valid) {
        safeSet(LS_PROMO_ACCESS, 'true')
        // Capped codes return an expiry; unlimited codes grant permanent access
        if (data.expiresAt) safeSet(LS_PROMO_EXPIRES, data.expiresAt)
        else safeRemove(LS_PROMO_EXPIRES)
        setIsSubscribed(true)
        window.dispatchEvent(new Event(SUB_CHANGED))
        return { valid: true, expiresAt: data.expiresAt || null }
      }
      return { valid: false, error: data.error }
    } catch {
      return { valid: false, error: 'network' }
    }
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

  return { isSubscribed, subscriberEmail, verifySubscription, activateFromSession, clearSubscription, resetDevices, verifyPromoCode }
}
