import { Link } from 'react-router-dom'

export default function LandingFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]/60 py-10 text-[13px] text-[var(--text-muted)]">
      <div className="max-w-[1240px] mx-auto px-7 flex flex-wrap gap-6 justify-between items-center">
        <div>© {new Date().getFullYear()} Cash Pedal · Smart vehicle ownership decisions.</div>
        <div className="flex flex-wrap gap-5">
          <Link to="/about" className="hover:text-white transition-colors">Methodology</Link>
          <Link to="/about" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/about" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/resources" className="hover:text-white transition-colors">Press kit</Link>
          <a href="mailto:hello@cashpedal.io" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
