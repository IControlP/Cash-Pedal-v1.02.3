import { Link } from 'react-router-dom'

// Internal links from the calculators to the /guides answer pages. Kept as
// plain strings (not imported from src/data/guides.js) so this component
// doesn't pull the vehicle catalog into whichever chunk renders it.
const SALARIES = [50000, 60000, 75000, 100000, 150000]
const PRICES = [25000, 30000, 40000, 50000, 60000]
const fmt = n => '$' + n.toLocaleString('en-US')

export default function GuideLinks({ kind = 'salary' }) {
  const links = kind === 'salary'
    ? SALARIES.map(s => ({ to: `/guides/how-much-car-can-i-afford-${s}-salary`, label: `How much car on ${fmt(s)}?` }))
    : PRICES.map(p => ({ to: `/guides/salary-needed-for-${p}-car`, label: `Salary for a ${fmt(p)} car` }))
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 w-full">
      <h2 className="font-display font-bold text-white text-lg mb-3">Popular questions</h2>
      <div className="flex flex-wrap gap-2">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)] rounded-full px-3 py-1.5 transition-colors">
            {l.label}
          </Link>
        ))}
        <Link to="/guides" className="text-sm text-[var(--accent)] px-3 py-1.5">All guides →</Link>
      </div>
    </section>
  )
}
