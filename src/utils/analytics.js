// Wraps window.gtag safely — no-ops if GA hasn't loaded or measurement ID isn't set
function gtag(...args) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

const GA_ID = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_GA_MEASUREMENT_ID
  : null

export function trackPageView(path) {
  if (!GA_ID) return
  gtag('config', GA_ID, { page_path: path })
}

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

// ── GTM Section 8: Critical Events ───────────────────────────────────────────

// Top of funnel — what % of visitors engage with the calculator?
export function trackCalculatorStarted({ sourcePage = '', entryPoint = '' } = {}) {
  trackEvent('calculator_started', { source_page: sourcePage, entry_point: entryPoint })
}

// Core conversion — user has a full result on screen
export function trackCalculatorCompleted({ vehicleCount = 1, hasEV = false, ownershipYears = 5 } = {}) {
  trackEvent('calculator_completed', {
    vehicle_count:   vehicleCount,
    has_ev:          hasEV,
    ownership_years: ownershipYears,
  })
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
  trackEvent('upgrade_clicked', { feature_name: featureName, price_shown: priceShown })
}

// Email funnel — lead traded name + email for free Pro calculations
export function trackEmailUnlockClaimed(featureName = '') {
  trackEvent('email_unlock_claimed', { feature_name: featureName })
}

// Revenue event — Stripe purchase confirmed
export function trackProPurchaseComplete(planType = 'one_time', pricePaid = 19) {
  trackEvent('pro_purchase_complete', { plan_type: planType, price_paid: pricePaid })
}

// Pro feature usage
export function trackPdfExported(vehicleCount = 1) {
  trackEvent('pdf_exported', { vehicle_count: vehicleCount })
}

// Content → tool conversion rate
export function trackArticleToCalculator(articleSlug = '') {
  trackEvent('article_to_calculator', { article_slug: articleSlug })
}
