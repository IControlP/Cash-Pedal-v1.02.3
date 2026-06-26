// Generate a UUID that works in every browser, including older in-app webviews
// (Instagram/Facebook on iOS) where `crypto.randomUUID` is missing. Calling an
// absent `crypto.randomUUID` throws "undefined is not an object", which would
// crash whatever code path needs an id (session tracking, consent records).
export function safeUUID() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    // Build a v4 UUID from crypto.getRandomValues when available.
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'))
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
    }
  } catch {
    // fall through to Math.random fallback
  }
  // Last-resort fallback — not cryptographically strong, but always works.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
