import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const tools = [
  {
    to: '/tco',
    emoji: '🧮',
    title: 'TCO Calculator',
    desc: 'Monthly payment, total interest, and true annual cost — updating live as you type.',
    cta: 'Run the numbers',
    featured: true,
  },
  {
    to: '/compare',
    emoji: '⚖️',
    title: 'Multi-Vehicle Comparison',
    desc: 'Line up to 5 vehicles side by side and see every cost metric compared at a glance.',
    cta: 'Compare vehicles',
    featured: true,
  },
  {
    to: '/salary',
    emoji: '💵',
    title: 'Salary Calculator',
    desc: "Using the 20/4/10 rule, see exactly what income you'd need to afford any vehicle responsibly.",
    cta: 'Check affordability',
    featured: false,
  },
  {
    to: '/survey',
    emoji: '🎯',
    title: 'Car Survey',
    desc: '10 questions. Instantly matched to your ideal vehicle type — SUV, EV, truck, sports car, and more.',
    cta: 'Find your match',
    featured: false,
  },
  {
    to: '/checklist',
    emoji: '🔍',
    title: 'Used Car Buying Checklist',
    desc: 'Enter the mileage, get a full maintenance audit, negotiation leverage calculator, and seller questions.',
    cta: 'Build your checklist',
    featured: false,
  },
  {
    to: '/wheelzard',
    emoji: '🤖',
    title: 'Wheel-Zard AI',
    desc: 'Ask anything about vehicles, costs, or buying decisions. Powered by a custom GPT trained on automotive data.',
    cta: 'Ask Wheel-Zard',
    featured: false,
  },
  {
    to: '/resources',
    emoji: '🔗',
    title: 'Resources',
    desc: 'Curated links for shopping, financing, insurance, maintenance research, and vehicle history.',
    cta: 'View resources',
    featured: false,
  },
  {
    to: '/about',
    emoji: 'ℹ️',
    title: 'About & FAQ',
    desc: 'How Cash Pedal works, what the math includes, and answers to common questions.',
    cta: 'Learn more',
    featured: false,
  },
]

const reasons = [
  {
    icon: '⚡',
    title: 'No signup. No fluff.',
    body: "Open any tool, enter your numbers, get your answer. No account, no email, no BS.",
  },
  {
    icon: '🔢',
    title: 'Real math, live.',
    body: 'Every number updates the moment you move a slider. See how a 1% rate change reshapes your 5-year cost instantly.',
  },
  {
    icon: '🛠️',
    title: 'Eight tools, one place.',
    body: 'From affordability checks to used car audits to AI advice — everything you need before you sign.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-20 overflow-hidden">

          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(138,43,226,0.15) 0%, transparent 70%)',
            }}
          />

          {/* Accent pill */}
          <div className="anim-0 mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Free · No signup · 8 tools
          </div>

          <h1
            className="anim-1 font-display font-extrabold text-white leading-[1.07] tracking-tight max-w-3xl mx-auto"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
          >
            Stop guessing what{' '}
            <span className="text-[var(--accent)]">your car</span>{' '}
            actually costs you.
          </h1>

          <p className="anim-2 mt-6 text-[var(--text-muted)] text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            Cash Pedal is a free toolkit for making smarter vehicle decisions — calculators, comparisons,
            checklists, and AI advice. No account required.
          </p>

          <div className="anim-3 mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link to="/tco" className="btn-primary text-base px-8 py-4 shadow-[0_4px_20px_rgba(255,184,0,0.3)]">
              Try the TCO Calculator →
            </Link>
            <a
              href="#tools"
              className="text-[var(--text-muted)] text-sm hover:text-white transition-colors"
            >
              See all 8 tools ↓
            </a>
          </div>
        </section>

        {/* ── Tools grid ────────────────────────────────── */}
        <section id="tools" className="px-4 sm:px-6 py-20 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 text-center">
              The full toolkit
            </p>
            <h2
              className="font-display font-extrabold text-white text-center mb-10"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)' }}
            >
              Everything you need before you sign
            </h2>

            {/* Featured tools */}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {tools.filter(t => t.featured).map((tool, i) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`card group hover:border-[var(--accent)] transition-all duration-200 flex flex-col gap-3 anim-${i + 2}`}
                  style={{ background: 'rgba(255,184,0,0.03)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{tool.emoji}</span>
                    <h3 className="font-display font-bold text-white text-lg group-hover:text-[var(--accent)] transition-colors">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">{tool.desc}</p>
                  <span className="text-xs font-semibold text-[var(--accent)] mt-auto">
                    {tool.cta} →
                  </span>
                </Link>
              ))}
            </div>

            {/* Other tools */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.filter(t => !t.featured).map((tool, i) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`card group hover:border-[#3a3a3e] hover:bg-[var(--surface-hover)] transition-all duration-200 flex flex-col gap-2 anim-${Math.min(i + 3, 5)}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{tool.emoji}</span>
                    <h3 className="font-display font-bold text-white text-base group-hover:text-[var(--accent)] transition-colors">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed">{tool.desc}</p>
                  <span className="text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mt-1">
                    {tool.cta} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why section ───────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-12">
              Why Cash Pedal
            </p>
            <div className="grid sm:grid-cols-3 gap-5">
              {reasons.map((r, i) => (
                <div key={r.title} className={`card hover:border-[#3a3a3e] transition-colors anim-${i + 2}`}>
                  <div className="text-3xl mb-4">{r.icon}</div>
                  <h3 className="font-display font-bold text-white text-lg mb-2">{r.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA band ──────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-20 border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="font-display font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
            >
              Your next vehicle decision starts{' '}
              <span className="text-[var(--accent)]">here.</span>
            </h2>
            <p className="text-[var(--text-muted)] text-lg mb-8">
              Run the numbers in under 60 seconds. No account required.
            </p>
            <Link
              to="/tco"
              className="btn-primary text-base px-8 py-4 shadow-[0_4px_20px_rgba(255,184,0,0.3)]"
            >
              Open the Calculator →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
