import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-display font-800 text-lg tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-[var(--accent)]">$</span>
          <span className="text-white font-bold">Cash Pedal</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/tco"
            className={`btn-${pathname === '/tco' ? 'primary' : 'ghost'} text-sm py-2 px-4`}
          >
            TCO Calculator
          </Link>
        </div>
      </div>
    </nav>
  )
}
