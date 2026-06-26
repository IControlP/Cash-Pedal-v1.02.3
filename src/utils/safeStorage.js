// Wrappers around localStorage / sessionStorage that never throw.
//
// In locked-down iOS in-app browsers (Instagram/Facebook) and Safari Private
// Mode, touching web storage can throw a SecurityError or QuotaExceededError.
// An unguarded `localStorage.getItem` in a render path (e.g. the Navbar's
// subscription hook) would crash the component and blank the whole SPA — which
// shows up in session recordings as a JS error immediately followed by the page
// being hidden. These helpers degrade to a no-op instead.

export function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
