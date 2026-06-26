import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

// Catch-all for unknown URLs — ad clicks and shared deep links sometimes land on
// stale or malformed paths. Without this, React Router renders nothing and the
// visitor sees a blank page, reading as an instant bounce.
export default function NotFound() {
  return (
    <div className="landing-page min-h-screen">
      <div className="bg-glow" />
      <div className="grid-bg" />
      <Navbar />
      <main className="relative z-10 pt-14 flex items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🛣️</div>
          <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">
            This road doesn’t exist
          </h1>
          <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
            The page you’re looking for may have moved or never existed. Let’s get you back on track.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/" className="btn-primary">
              Back to home
            </Link>
            <Link to="/tco" className="btn-ghost">
              Try the free calculator
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
