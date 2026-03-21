import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const features = [
  {
    icon: '⚡',
    title: 'No signup. No fluff.',
    body: 'Open the calculator, type your numbers, get your answer. That\'s it. No account, no email, no BS.',
  },
  {
    icon: '🔢',
    title: 'Real math, live.',
    body: 'Every number updates the moment you move a slider. See how a 1% rate change reshapes your 5-year cost in real time.',
  },
  {
    icon: '🚗',
    title: 'Beyond the sticker price.',
    body: 'Monthly payments are just the start. Cash Pedal shows you total interest, true annual cost, and the full picture.',
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
                'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,255,0,0.07) 0%, transparent 70%)',
            }}
          />

          {/* Accent pill */}
          <div className="anim-0 mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Free Vehicle TCO Calculator
          </div>

          <h1 className="anim-1 font-display font-extrabold text-white leading-[1.07] tracking-tight max-w-3xl mx-auto"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
          >
            Stop guessing what{' '}
            <span className="text-[var(--accent)]">your car</span>{' '}
            actually costs you.
          </h1>

          <p className="anim-2 mt-6 text-[var(--text-muted)] text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            Cash Pedal calculates the true total cost of owning any vehicle —
            so you know exactly what you're committing to before you sign.
          </p>

          <div className="anim-3 mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link to="/tco" className="btn-primary text-base px-8 py-4 shadow-[0_4px_20px_rgba(200,255,0,0.3)]">
              Try the Vehicle TCO Calculator →
            </Link>
            <a
              href="#how-it-works"
              className="text-[var(--text-muted)] text-sm hover:text-white transition-colors"
            >
              How it works ↓
            </a>
          </div>

          {/* Hero preview strip */}
          <div className="anim-4 mt-16 w-full max-w-2xl mx-auto">
            <div className="card border-[var(--border)] overflow-hidden">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)] mb-4">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="ml-2 text-xs text-[var(--text-muted)] font-mono">cashpedal.io/tco</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Monthly Payment', value: '$478' },
                  { label: 'Total Interest', value: '$4,680' },
                  { label: 'Total Loan Cost', value: '$29,680' },
                  { label: 'True Cost / Year', value: '$5,936' },
                ].map(item => (
                  <div key={item.label} className="bg-[var(--bg)] rounded-lg p-3">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">
                      {item.label}
                    </p>
                    <p className="font-display font-bold text-white text-xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Value props ───────────────────────────────── */}
        <section id="how-it-works" className="px-4 sm:px-6 py-20 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-12">
              Why Cash Pedal
            </p>
            <div className="grid sm:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`card hover:border-[#3a3a3e] transition-all duration-200 anim-${i + 2}`}
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-display font-bold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">{f.body}</p>
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
              className="btn-primary text-base px-8 py-4 shadow-[0_4px_20px_rgba(200,255,0,0.3)]"
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
