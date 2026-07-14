import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { trackPageView } from './utils/analytics'
import ErrorBoundary from './components/ErrorBoundary'

// Landing stays in the main bundle — it's the most-visited route and
// keeping it eager gives the fastest possible first paint on '/'.
import Landing from './pages/Landing'

// Every other page is lazy-loaded into its own chunk. This keeps the initial
// JS bundle small: TCOCalculator alone is ~3 700 lines + vehicles.json (517 KB).
const TCOFlow                = lazy(() => import('./pages/TCOFlow'))
const TCOCalculator          = lazy(() => import('./pages/TCOCalculator'))
const CarSurvey              = lazy(() => import('./pages/CarSurvey'))
const SalaryCalculator       = lazy(() => import('./pages/SalaryCalculator'))
const Affordability          = lazy(() => import('./pages/Affordability'))
const MultiVehicleComparison = lazy(() => import('./pages/MultiVehicleComparison'))
const CarBuyingChecklist     = lazy(() => import('./pages/CarBuyingChecklist'))
const WheelZard              = lazy(() => import('./pages/WheelZard'))
const Resources              = lazy(() => import('./pages/Resources'))
const About                  = lazy(() => import('./pages/About'))
const Subscribe              = lazy(() => import('./pages/Subscribe'))
const Privacy                = lazy(() => import('./pages/Privacy'))
const Terms                  = lazy(() => import('./pages/Terms'))
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/"           element={<Landing />} />
            <Route path="/tco"        element={<TCOFlow />} />
            <Route path="/tco-full"   element={<TCOCalculator />} />
            <Route path="/survey"     element={<CarSurvey />} />
            <Route path="/salary"     element={<SalaryCalculator />} />
            <Route path="/affordability" element={<Affordability />} />
            <Route path="/compare"    element={<MultiVehicleComparison />} />
            <Route path="/checklist"  element={<CarBuyingChecklist />} />
            <Route path="/wheelzard"  element={<WheelZard />} />
            <Route path="/resources"  element={<Resources />} />
            <Route path="/market"     element={<MarketAnalytics />} />
            <Route path="/about"      element={<About />} />
            <Route path="/privacy"    element={<Privacy />} />
            <Route path="/terms"      element={<Terms />} />
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
