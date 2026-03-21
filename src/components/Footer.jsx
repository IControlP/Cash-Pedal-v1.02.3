import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="font-display font-bold text-base flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <span className="text-[var(--accent)]">$</span>
          <span className="text-white">Cash Pedal</span>
        </Link>

        <p className="text-[var(--text-muted)] text-sm text-center sm:text-left">
          Know what you're really paying before you sign.
        </p>

        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
          <Link to="/tco" className="hover:text-[var(--accent)] transition-colors">
            TCO Calculator
          </Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Cash Pedal</span>
        </div>
      </div>
    </footer>
  )
}
