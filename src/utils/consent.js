// ── Cookie / tracker consent manager ──────────────────────────────────────────
//
// Global opt-in model: NONE of the third-party trackers (Google Analytics,
// Microsoft Clarity, Meta Pixel) are allowed to load until the visitor grants
// consent. This is what makes the site GDPR/ePrivacy compliant (prior opt-in)
// and satisfies California CPRA (the Meta Pixel counts as "sharing" for
// cross-context behavioral advertising, which the visitor can decline).
//
// The scripts used to live as unconditional inline <script> tags in index.html;
// they were removed from there so nothing fires before a choice is made. This
// module is the single place that injects them, and only after consent.
//
// Consent categories:
//   necessary   — always on, not tracked here (session UUID, login state, etc.)
//   analytics   — Google Analytics 4 + Microsoft Clarity
//   advertising — Meta (Facebook) Pixel

import { safeGet, safeSet } from './safeStorage'

// Bump CONSENT_VERSION when the set of trackers or categories materially
// changes — returning visitors will then be re-prompted for a fresh choice.
export const CONSENT_VERSION = 1
const STORAGE_KEY = 'cashpedal_cookie_consent'

// Third-party IDs (kept identical to the originals that were in index.html)
const GA_ID          = 'G-65PBP0W12S'
const CLARITY_ID     = 'x7nktllrep'
const META_PIXEL_ID  = '1771464733854543'

// Events other components listen for
export const CONSENT_OPEN_EVENT    = 'cashpedal:consent-open'    // ask the banner to open settings
export const CONSENT_CHANGED_EVENT = 'cashpedal:consent-changed' // fired after a choice is saved

// ── Stored-state helpers ──────────────────────────────────────────────────────

// Returns the saved consent object, or null if the visitor hasn't decided yet
// (or their saved choice predates the current CONSENT_VERSION).
export function getConsent() {
  try {
    const raw = safeGet(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.v !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function hasDecision() {
  return getConsent() !== null
}

// Global Privacy Control — a browser/extension signal that, under California
// CPRA (and similar laws), must be treated as a valid opt-out of the "sale" or
// "sharing" of personal information. We map that to the advertising category:
// when GPC is present, the Meta Pixel never loads, regardless of any prior
// choice. GPC does not cover first-party analytics, so those are unaffected.
export function gpcEnabled() {
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true
}

// Persist a choice and immediately apply it (load any newly-permitted scripts).
// prefs: { analytics: boolean, advertising: boolean }
export function setConsent({ analytics = false, advertising = false } = {}) {
  const record = {
    v: CONSENT_VERSION,
    ts: Date.now(),
    analytics: !!analytics,
    advertising: !!advertising,
  }
  safeSet(STORAGE_KEY, JSON.stringify(record))
  applyConsent(record)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }))
  }
  return record
}

// ── Script loaders (idempotent) ───────────────────────────────────────────────

let gaLoaded      = false
let clarityLoaded = false
let metaLoaded    = false

function loadGoogleAnalytics() {
  if (gaLoaded || typeof document === 'undefined') return
  gaLoaded = true

  window.dataLayer = window.dataLayer || []
  // eslint-disable-next-line no-inner-declarations
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  // send_page_view:false — the SPA router owns page_view events (analytics.js)
  gtag('config', GA_ID, { send_page_view: false })

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)

  // The initial PageViewTracker mount already ran (and no-oped because gtag
  // wasn't present yet), so fire one page_view now for the current page.
  if (typeof window !== 'undefined') {
    gtag('event', 'page_view', {
      page_location: window.location.href,
      page_title:    document.title,
      page_path:     window.location.pathname + window.location.search,
    })
  }
}

function loadClarity() {
  if (clarityLoaded || typeof document === 'undefined') return
  clarityLoaded = true
  ;(function (c, l, a, r, i) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    const t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
    const y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', CLARITY_ID)
}

function loadMetaPixel() {
  if (metaLoaded || typeof document === 'undefined') return
  metaLoaded = true
  ;(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }
    if (!f._fbq) f._fbq = n
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []
    t = b.createElement(e); t.async = !0; t.src = v
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  window.fbq('init', META_PIXEL_ID)
  window.fbq('track', 'PageView')
}

// Load whatever the given consent record permits. Scripts already loaded are
// left untouched; declining after previously accepting does NOT unload an
// already-running tracker in the current tab — a page reload clears it (the
// scripts simply won't be re-injected).
export function applyConsent(record = getConsent()) {
  if (!record) return
  if (record.analytics) {
    loadGoogleAnalytics()
    loadClarity()
  }
  // Honor a Global Privacy Control opt-out: advertising trackers stay off even
  // if the stored record permits them.
  if (record.advertising && !gpcEnabled()) {
    loadMetaPixel()
  }
}

// Call once on app boot: re-applies a returning visitor's saved consent so
// their trackers load without re-prompting.
export function initConsent() {
  const record = getConsent()
  if (record) applyConsent(record)
}

// Ask the consent UI to open its preferences panel (used by footer links).
export function openConsentSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))
  }
}
