import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
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
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-4 text-center gap-4">
      <p className="text-[var(--accent)] text-sm font-semibold uppercase tracking-widest">404</p>
      <h1 className="font-display font-extrabold text-white text-3xl">Page not found</h1>
      <p className="text-[var(--text-muted)] max-w-sm">That page doesn&apos;t exist. Let&apos;s get you back on the road.</p>
      <Link to="/" className="btn-primary mt-2">Back to Cash Pedal</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tco" element={<TCOCalculator />} />
        <Route path="/survey" element={<CarSurvey />} />
        <Route path="/salary" element={<SalaryCalculator />} />
        <Route path="/compare" element={<MultiVehicleComparison />} />
        <Route path="/checklist" element={<CarBuyingChecklist />} />
        <Route path="/wheelzard" element={<WheelZard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/about" element={<About />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
