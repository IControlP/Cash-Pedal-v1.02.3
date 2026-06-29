import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { trackPageView } from './utils/analytics'
import TermsGate, { TERMS_VERSION, LS_TERMS_ACCEPTED, LS_TERMS_VERSION } from './components/TermsGate'
import ErrorBoundary from './components/ErrorBoundary'
import { safeGet, safeSessionGet, safeSessionSet } from './utils/safeStorage'

// Landing stays in the main bundle — it's the most-visited route and
// keeping it eager gives the fastest possible first paint on '/'.
import Landing from './pages/Landing'

// Every other page is lazy-loaded into its own chunk. This keeps the initial
// JS bundle small: TCOCalculator alone is ~3 700 lines + vehicles.json (517 KB).
const TCOCalculator          = lazy(() => import('./pages/TCOCalculator'))
const CarSurvey              = lazy(() => import('./pages/CarSurvey'))
const SalaryCalculator       = lazy(() => import('./pages/SalaryCalculator'))
const MultiVehicleComparison = lazy(() => import('./pages/MultiVehicleComparison'))
const CarBuyingChecklist     = lazy(() => import('./pages/CarBuyingChecklist'))
const WheelZard              = lazy(() => import('./pages/WheelZard'))
const Resources              = lazy(() => import('./pages/Resources'))
const About                  = lazy(() => import('./pages/About'))
const Subscribe              = lazy(() => import('./pages/Subscribe'))
const Privacy                = lazy(() => import('./pages/Privacy'))
const Blog                   = lazy(() => import('./pages/Blog'))
const BlogPost               = lazy(() => import('./pages/BlogPost'))
const NotFound               = lazy(() => import('./pages/NotFound'))
const MarketAnalytics        = lazy(() => import('./pages/MarketAnalytics'))

// Full-screen blank while a page chunk loads — no spinner avoids CLS.
const PageFallback = () => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
)

function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])
  return null
}

const SS_NAVIGATED = 'cashpedal_navigated'

function ToolRoute({ element }) {
  const [accepted, setAccepted] = useState(
    () => safeGet(LS_TERMS_ACCEPTED) === 'true' &&
          safeGet(LS_TERMS_VERSION) === TERMS_VERSION
  )
  // Skip the gate on the user's entry page; enforce it on every subsequent navigation.
  const [isEntry] = useState(() => {
    const alreadyVisited = safeSessionGet(SS_NAVIGATED)
    safeSessionSet(SS_NAVIGATED, '1')
    return !alreadyVisited
  })

  if (!accepted && !isEntry) return <TermsGate onAccepted={() => setAccepted(true)} />
  return element
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/"           element={<Landing />} />
            <Route path="/tco"        element={<ToolRoute element={<TCOCalculator />} />} />
            <Route path="/survey"     element={<ToolRoute element={<CarSurvey />} />} />
            <Route path="/salary"     element={<ToolRoute element={<SalaryCalculator />} />} />
            <Route path="/compare"    element={<ToolRoute element={<MultiVehicleComparison />} />} />
            <Route path="/checklist"  element={<ToolRoute element={<CarBuyingChecklist />} />} />
            <Route path="/wheelzard"  element={<ToolRoute element={<WheelZard />} />} />
            <Route path="/resources"  element={<Resources />} />
            <Route path="/market"     element={<MarketAnalytics />} />
            <Route path="/about"      element={<About />} />
            <Route path="/privacy"    element={<Privacy />} />
            <Route path="/subscribe"  element={<Subscribe />} />
            <Route path="/blog"       element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="*"           element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
