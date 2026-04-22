import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/tco', label: 'TCO Calculator' },
  { to: '/compare', label: 'Compare' },
  { to: '/salary', label: 'Salary Check' },
  { to: '/survey', label: 'Car Survey' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/wheelzard', label: 'Wheel-Zard' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="font-display font-bold text-lg tracking-tight flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <span className="text-[var(--accent)]">$</span>
          <span className="text-white">Cash Pedal</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === to
                  ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/subscribe"
            className={`ml-1 px-3 py-1.5 rounded-md text-sm font-bold transition-all border ${
              pathname === '/subscribe'
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[rgba(200,255,0,0.06)]'
                : 'border-[rgba(200,255,0,0.35)] text-[var(--accent)] hover:bg-[rgba(200,255,0,0.06)]'
            }`}
          >
            Pro
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                pathname === to
                  ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/about"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2.5 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-white"
          >
            About
          </Link>
          <Link
            to="/resources"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2.5 rounded-md text-sm font-medium text-[var(--text-muted)] hover:text-white"
          >
            Resources
          </Link>
          <Link
            to="/subscribe"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2.5 rounded-md text-sm font-bold border"
            style={{ borderColor: 'rgba(200,255,0,0.35)', color: 'var(--accent)' }}
          >
            Get Pro →
          </Link>
        </div>
      )}
    </nav>
  )
}
