import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { trackPageView } from './utils/analytics'
import Landing from './pages/Landing'
import TCOCalculator from './pages/TCOCalculator'
import CarSurvey from './pages/CarSurvey'
import SalaryCalculator from './pages/SalaryCalculator'
import MultiVehicleComparison from './pages/MultiVehicleComparison'
import CarBuyingChecklist from './pages/CarBuyingChecklist'
import WheelZard from './pages/WheelZard'
import Resources from './pages/Resources'
import About from './pages/About'
import Subscribe from './pages/Subscribe'
import Privacy from './pages/Privacy'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import TermsGate, { TERMS_VERSION, LS_TERMS_ACCEPTED, LS_TERMS_VERSION } from './components/TermsGate'
import InAppBrowserBanner from './components/InAppBrowserBanner'

// Lazy-loaded so Recharts ships in its own chunk and stays out of the main bundle.
const MarketAnalytics = lazy(() => import('./pages/MarketAnalytics'))

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
    () => localStorage.getItem(LS_TERMS_ACCEPTED) === 'true' &&
          localStorage.getItem(LS_TERMS_VERSION) === TERMS_VERSION
  )
  // Skip the gate on the user's entry page; enforce it on every subsequent navigation.
  const [isEntry] = useState(() => {
    const alreadyVisited = sessionStorage.getItem(SS_NAVIGATED)
    sessionStorage.setItem(SS_NAVIGATED, '1')
    return !alreadyVisited
  })

  if (!accepted && !isEntry) return <TermsGate onAccepted={() => setAccepted(true)} />
  return element
}

export default function App() {
  return (
    <BrowserRouter>
      <InAppBrowserBanner />
      <PageViewTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tco"       element={<ToolRoute element={<TCOCalculator />} />} />
        <Route path="/survey"    element={<ToolRoute element={<CarSurvey />} />} />
        <Route path="/salary"    element={<ToolRoute element={<SalaryCalculator />} />} />
        <Route path="/compare"   element={<ToolRoute element={<MultiVehicleComparison />} />} />
        <Route path="/checklist" element={<ToolRoute element={<CarBuyingChecklist />} />} />
        <Route path="/wheelzard" element={<ToolRoute element={<WheelZard />} />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/market"    element={
          <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
            <MarketAnalytics />
          </Suspense>
        } />
        <Route path="/about"     element={<About />} />
        <Route path="/privacy"   element={<Privacy />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/blog"      element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  )
}
