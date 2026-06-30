import { getHeroVariant } from './abTest'

const GA_ID = 'G-65PBP0W12S'

// Wraps window.gtag safely — no-ops if the script hasn't loaded yet
function gtag(...args) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

function fbq(...args) {
  if (typeof window.fbq === 'function') {
    window.fbq(...args)
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

// Returns 'mobile' | 'tablet' | 'desktop' based on viewport width.
// No personal data — just screen-size bucket.
function getDeviceType() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// Reads utm_source from the current URL query string; falls back to 'referral'
// if a referrer domain exists, or 'direct'. No PII collected.
function getTrafficSource() {
  if (typeof window === 'undefined') return 'direct'
  const p = new URLSearchParams(window.location.search)
  if (p.get('utm_source')) return p.get('utm_source')
  if (document.referrer) {
    try { return new URL(document.referrer).hostname } catch { /* ignore */ }
  }
  return 'direct'
}

export function trackPageView(path) {
  // GA4 — send an explicit page_view event on every SPA route change.
  // Re-calling gtag('config', …) (the old Universal Analytics pattern) does
  // NOT reliably register page views in GA4, which is why traffic wasn't
  // showing up. The initial config in index.html sets send_page_view:false,
  // so this event is the single source of truth for page views. GA4 keys off
  // page_location / page_title (not the UA-era page_path).
  gtag('event', 'page_view', {
    page_location: window.location.href,
    page_title:    document.title,
    page_path:     path,
  })
  // Meta Pixel — fires on every SPA route change so Meta knows which page was viewed
  fbq('track', 'PageView', { page_path: path })
}

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

// ── GTM Section 8: Critical Events ───────────────────────────────────────────

// Top of funnel — what % of visitors engage with the calculator?
export function trackCalculatorStarted({ sourcePage = '', entryPoint = '' } = {}) {
  trackEvent('calculator_started', { source_page: sourcePage, entry_point: entryPoint, ab_variant: getHeroVariant() })
  fbq('trackCustom', 'CalculatorStarted', { source_page: sourcePage, entry_point: entryPoint })
}

// Core conversion — user has a full result on screen
export function trackCalculatorCompleted({ vehicleCount = 1, hasEV = false, ownershipYears = 5 } = {}) {
  trackEvent('calculator_completed', {
    vehicle_count:   vehicleCount,
    has_ev:          hasEV,
    ownership_years: ownershipYears,
    ab_variant:      getHeroVariant(),
  })
  fbq('trackCustom', 'CalculatorCompleted', { vehicle_count: vehicleCount })
}

// Viral loop indicator — user shares a result link
export function trackShareLinkCreated(comparisonType = '') {
  trackEvent('share_link_created', { comparison_type: comparisonType })
}

// Which features drive upgrade intent?
export function trackUpgradePromptSeen(featureName = '', triggerLocation = '') {
  trackEvent('upgrade_prompt_seen', { feature_name: featureName, trigger_location: triggerLocation })
}

// Pre-purchase intent
export function trackUpgradeClicked(featureName = '', priceShown = '') {
  trackEvent('upgrade_clicked', { feature_name: featureName, price_shown: priceShown, ab_variant: getHeroVariant() })
}

// Email funnel — lead traded name + email for free Pro calculations
export function trackEmailUnlockClaimed(featureName = '') {
  trackEvent('email_unlock_claimed', { feature_name: featureName })
}

// Revenue event — Stripe purchase confirmed
export function trackProPurchaseComplete(planType = 'one_time', pricePaid = 19) {
  trackEvent('pro_purchase_complete', { plan_type: planType, price_paid: pricePaid })
  fbq('track', 'Purchase', { value: pricePaid, currency: 'USD' })
}

// Pro feature usage
export function trackPdfExported(vehicleCount = 1) {
  trackEvent('pdf_exported', { vehicle_count: vehicleCount })
}

// Content → tool conversion rate
export function trackArticleToCalculator(articleSlug = '') {
  trackEvent('article_to_calculator', { article_slug: articleSlug })
}

// ── Funnel tracking events ────────────────────────────────────────────────────

// 1. landing_page_view — fires on Landing page mount.
// Captures device type and traffic source (UTM / referrer) so paid vs organic
// drop-off can be segmented in GA4.
export function trackLandingPageView() {
  const p = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  trackEvent('landing_page_view', {
    device_type:    getDeviceType(),
    traffic_source: getTrafficSource(),
    utm_medium:     p.get('utm_medium') || '',
    utm_campaign:   p.get('utm_campaign') || '',
  })
  fbq('trackCustom', 'LandingPageView', {
    device_type:    getDeviceType(),
    traffic_source: getTrafficSource(),
  })
}

// 2. hero_cta_click — fires when a visitor clicks any hero-section CTA.
// ab_variant is included so click-through rate can be split by A/B test arm.
export function trackHeroCtaClick({ ctaText = '', ctaLocation = 'hero_primary', abVariant = '' } = {}) {
  trackEvent('hero_cta_click', {
    cta_text:     ctaText,
    cta_location: ctaLocation,
    ab_variant:   abVariant,
    device_type:  getDeviceType(),
  })
}

// 3. simple_year_selected — fires when a year is chosen in the vehicle picker.
// Includes make/model context so we can see which picker paths get abandoned.
export function trackSimpleYearSelected({ year = '', make = '', model = '', mode = 'simple' } = {}) {
  trackEvent('simple_year_selected', { year, make, model, mode, device_type: getDeviceType() })
}

// 4. simple_make_selected — fires when a make is chosen in the vehicle picker.
export function trackSimpleMakeSelected({ make = '', mode = 'simple' } = {}) {
  trackEvent('simple_make_selected', { make, mode, device_type: getDeviceType() })
}

// 5. simple_model_selected — fires when a model is chosen in the vehicle picker.
export function trackSimpleModelSelected({ make = '', model = '', mode = 'simple' } = {}) {
  trackEvent('simple_model_selected', { make, model, mode, device_type: getDeviceType() })
}

// 6. simple_estimate_started — fires when the user selects a year, which
// triggers auto-trim selection and kicks off the estimate computation.
export function trackSimpleEstimateStarted({ make = '', model = '', year = '', mode = 'simple' } = {}) {
  trackEvent('simple_estimate_started', { make, model, year, mode, device_type: getDeviceType() })
}

// 7. estimate_generated — fires once a full estimate is on screen (trim set,
// all cost buckets computed). Distinguishes simple vs detailed mode.
export function trackEstimateGenerated({ make = '', model = '', year = '', mode = 'simple', hasEV = false } = {}) {
  trackEvent('estimate_generated', {
    make, model, year, mode,
    has_ev:      hasEV,
    device_type: getDeviceType(),
  })
  fbq('track', 'ViewContent', { content_name: `${make} ${model} ${year}`.trim(), content_category: 'vehicle_estimate' })
}

// 8. detailed_mode_opened — fires when the user switches from Simple to Detailed.
export function trackDetailedModeOpened({ make = '', model = '', year = '' } = {}) {
  trackEvent('detailed_mode_opened', { make, model, year, device_type: getDeviceType() })
}

// 9. pro_cta_viewed — fires when the paywall / upgrade modal is displayed.
// Fired alongside the existing upgrade_prompt_seen event.
export function trackProCtaViewed({ featureName = '', triggerLocation = '' } = {}) {
  trackEvent('pro_cta_viewed', {
    feature_name:     featureName,
    trigger_location: triggerLocation,
    device_type:      getDeviceType(),
  })
}

// 10. pro_cta_clicked — fires when the user clicks the upgrade/purchase CTA
// inside the paywall. Fired alongside the existing upgrade_clicked event.
export function trackProCtaClicked({ featureName = '', priceShown = '' } = {}) {
  trackEvent('pro_cta_clicked', {
    feature_name: featureName,
    price_shown:  priceShown,
    device_type:  getDeviceType(),
  })
}

// ab_hero_impression — fires once on Hero mount, tagged with the A/B variant.
export function trackAbHeroImpression(variant = '') {
  trackEvent('ab_hero_impression', { ab_variant: variant })
  fbq('trackCustom', 'HeroImpression', { ab_variant: variant })
}

// landing_sticky_cta_seen — fires the first time the sticky CTA becomes visible.
export function trackLandingStickyCTASeen() {
  trackEvent('landing_sticky_cta_seen', {})
  fbq('trackCustom', 'LandingStickyCTASeen', {})
}

// ── Terms-gate removal A/B test ───────────────────────────────────────────────

// terms_gate_removed_test_active — fires once when a free-estimate tool mounts,
// marking the visitor as being in the no-T&C-gate experience. Lets us segment
// the whole funnel (started → generated → pro) for the frictionless flow.
export function trackTermsGateRemovedTestActive({ sourcePage = '' } = {}) {
  trackEvent('terms_gate_removed_test_active', {
    source_page: sourcePage,
    device_type: getDeviceType(),
  })
  fbq('trackCustom', 'TermsGateRemovedTestActive', { source_page: sourcePage })
}

// free_estimate_started — fires when the user begins generating a free estimate
// (vehicle selection kicks off the computation), with no acceptance step in the way.
export function trackFreeEstimateStarted({ make = '', model = '', year = '', mode = 'simple' } = {}) {
  trackEvent('free_estimate_started', {
    make, model, year, mode,
    device_type: getDeviceType(),
  })
}

// free_estimate_generated — fires once the free estimate is on screen.
export function trackFreeEstimateGenerated({ make = '', model = '', year = '', mode = 'simple', hasEV = false } = {}) {
  trackEvent('free_estimate_generated', {
    make, model, year, mode,
    has_ev:      hasEV,
    device_type: getDeviceType(),
  })
  fbq('track', 'ViewContent', { content_name: `${make} ${model} ${year}`.trim(), content_category: 'free_vehicle_estimate' })
}

// 11. checkout_started — fires the moment the Stripe checkout session is
// requested, from either the paywall modal or the /subscribe page.
export function trackCheckoutStarted({ planType = 'one_time', price = 19 } = {}) {
  trackEvent('checkout_started', {
    plan_type:      planType,
    price,
    device_type:    getDeviceType(),
    traffic_source: getTrafficSource(),
  })
}

// 12. purchase_completed — fires after Stripe redirects back and the session
// is verified. Also sends Meta Pixel Purchase alongside pro_purchase_complete.
export function trackPurchaseCompleted({ planType = 'one_time', pricePaid = 19 } = {}) {
  trackEvent('purchase_completed', {
    plan_type:      planType,
    price_paid:     pricePaid,
    device_type:    getDeviceType(),
    traffic_source: getTrafficSource(),
  })
  // Meta Pixel — deduplication handled by Stripe session ID on the server
  fbq('track', 'Purchase', { value: pricePaid, currency: 'USD' })
}

// 13. estimate_viewed — fires when the results screen first appears.
// Lets us measure how many visitors who start the flow actually see an estimate.
export function trackEstimateViewed({ make = '', model = '', year = '' } = {}) {
  trackEvent('estimate_viewed', { make, model, year, device_type: getDeviceType() })
}

// 14. personalization_expanded — fires when the user opens the personalize panel.
// Indicates interest in a more accurate estimate; high-intent signal.
export function trackPersonalizationExpanded({ make = '', model = '', year = '' } = {}) {
  trackEvent('personalization_expanded', { make, model, year, device_type: getDeviceType() })
}

// 15. personalization_completed — fires once when any personalization value is
// first changed. Separates users who glance at the panel from those who act on it.
export function trackPersonalizationCompleted({ make = '', model = '', year = '' } = {}) {
  trackEvent('personalization_completed', { make, model, year, device_type: getDeviceType() })
}
