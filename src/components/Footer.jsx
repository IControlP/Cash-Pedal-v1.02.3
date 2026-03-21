import { Link } from 'react-router-dom'

const links = [
  { to: '/tco', label: 'TCO Calculator' },
  { to: '/compare', label: 'Compare Vehicles' },
  { to: '/salary', label: 'Salary Check' },
  { to: '/survey', label: 'Car Survey' },
  { to: '/checklist', label: 'Buying Checklist' },
  { to: '/wheelzard', label: 'Wheel-Zard AI' },
  { to: '/resources', label: 'Resources' },
  { to: '/about', label: 'About' },
]

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 justify-between mb-8">
          <div className="max-w-xs">
            <Link to="/" className="font-display font-bold text-base flex items-center gap-1.5 hover:opacity-80 transition-opacity mb-3">
              <span className="text-[var(--accent)]">$</span>
              <span className="text-white">Cash Pedal</span>
            </Link>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Know what you're really paying before you sign. Free vehicle cost tools — no account required.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors py-1"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>© {new Date().getFullYear()} Cash Pedal · cashpedal.io</span>
          <span>Results are estimates only — not financial advice.</span>
        </div>
      </div>
    </footer>
  )
}
