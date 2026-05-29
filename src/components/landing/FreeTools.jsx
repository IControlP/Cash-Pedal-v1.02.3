import { Link } from 'react-router-dom'

const TOOLS = [
  { emoji: '🧮', label: 'TCO Calculator',   desc: 'Run your numbers in 2 minutes',        to: '/tco'       },
  { emoji: '💵', label: 'Salary Check',      desc: '20/4/10 rule affordability check',     to: '/salary'    },
  { emoji: '🎯', label: 'Vehicle Survey',    desc: 'Find your ideal car type',             to: '/survey'    },
  { emoji: '🔍', label: 'Buying Checklist',  desc: 'Used car inspection guide',            to: '/checklist' },
  { emoji: '🤖', label: 'Wheel-Zard AI',     desc: 'AI vehicle advisor',                   to: '/wheelzard' },
]

export default function FreeTools() {
  return (
    <section className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Try it free</div>
        <h2 className="section-h font-display">See the math before you pay for it.</h2>
        <p className="section-sub">
          Five tools, no signup required. Get a feel for the depth of Cash Pedal's analysis
          before you commit to anything.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TOOLS.map(tool => (
            <Link
              key={tool.to}
              to={tool.to}
              className="card flex flex-col gap-3 hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors group"
              style={{ textDecoration: 'none' }}
            >
              <span className="text-3xl">{tool.emoji}</span>
              <div>
                <div className="font-display font-bold text-white text-[15px] group-hover:text-[var(--accent)] transition-colors">
                  {tool.label}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
                  {tool.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          All five tools are free, forever.{' '}
          <span className="text-white">
            The $19 pass unlocks unlimited detailed reports, PDF exports, and multi-vehicle comparisons.
          </span>
        </p>
      </div>
    </section>
  )
}
