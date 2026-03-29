import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const faqs = [
  {
    q: 'What does Cash Pedal actually calculate?',
    a: 'Cash Pedal estimates the costs associated with owning a vehicle — financing, fuel, insurance, maintenance, registration, and depreciation. The goal is to show you the full picture, not just the monthly payment a dealer quotes you.',
  },
  {
    q: 'How accurate are the results?',
    a: 'The calculations are estimates based on typical costs for each vehicle tier and region. Actual costs vary by location, driving habits, insurance history, and vehicle condition. Use the results as a directional guide, not a financial guarantee.',
  },
  {
    q: 'What\'s included in the TCO calculation?',
    a: 'The TCO Calculator covers the financing cost (loan payment, interest paid, total loan cost) and true cost per year based on your ownership duration. Fuel, insurance, and maintenance estimates are available in the Salary Calculator.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. All tools on Cash Pedal are free and require no sign-up, no email, and no personal information. Open the calculator, enter your numbers, get your answer.',
  },
  {
    q: 'How does the Car Survey work?',
    a: 'The 10-question survey scores your answers across 9 vehicle categories using a weighted impact system. Your top match is the vehicle type that most closely aligns with your priorities, lifestyle, and attitude toward cars.',
  },
  {
    q: 'What is the 20/4/10 rule?',
    a: 'It\'s a widely used personal finance guideline: put at least 20% down, finance for no more than 4 years, and keep total vehicle costs (payment + insurance + fuel) under 10% of your gross income. The Salary Calculator uses this to show the income you\'d need.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. Cash Pedal provides educational estimates to help you understand vehicle costs. Nothing on this site constitutes professional financial advice. Consult a financial advisor for decisions specific to your situation.',
  },
  {
    q: 'How do I get in touch?',
    a: 'Email us at support@cashpedal.io — we\'re a small team and read everything.',
  },
]

const tools = [
  { to: '/tco', emoji: '🧮', title: 'TCO Calculator', desc: 'Monthly payment, total interest, and true annual cost.' },
  { to: '/compare', emoji: '⚖️', title: 'Compare Vehicles', desc: 'Side-by-side cost comparison for up to 5 vehicles.' },
  { to: '/salary', emoji: '💵', title: 'Salary Calculator', desc: 'The income you need using the 20/4/10 rule.' },
  { to: '/survey', emoji: '🎯', title: 'Car Survey', desc: 'Personality-based vehicle type matching.' },
  { to: '/checklist', emoji: '🔍', title: 'Buying Checklist', desc: 'Used car maintenance audit and seller questions.' },
  { to: '/wheelzard', emoji: '🤖', title: 'Wheel-Zard AI', desc: 'AI-powered vehicle advisor.' },
]

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">

          {/* Header */}
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            About
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-6">
            What is Cash Pedal?
          </h1>

          <div className="card mb-8 anim-2">
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              Cash Pedal is a free, no-signup toolkit for making smarter vehicle decisions. We built it because
              buying a car is one of the biggest financial commitments most people make — and most of the tools
              available are designed by dealerships, lenders, or media companies with something to sell you.
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              We don't have an agenda. No affiliate commissions built into the calculators, no upsells, no
              "sponsored results." Just the math — presented as clearly as possible — so you can make your own decision.
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Every tool on Cash Pedal runs entirely in your browser. No data is collected or stored.
            </p>
          </div>

          {/* How it works */}
          <h2 className="font-display font-bold text-white text-xl mb-4 anim-3">How it works</h2>
          <div className="flex flex-col gap-3 mb-10 anim-3">
            {[
              'Enter your vehicle details — price, financing, or ownership duration.',
              'Adjust the inputs until the scenario matches your real situation.',
              'Read the results. Use them to negotiate, compare, or decide.',
              'No submission, no account, no data collection.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 card">
                <span className="font-display font-bold text-[var(--accent)] text-lg shrink-0">{i + 1}</span>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Tools overview */}
          <h2 className="font-display font-bold text-white text-xl mb-4 anim-4">All tools</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-10 anim-4">
            {tools.map(({ to, emoji, title, desc }) => (
              <Link key={to} to={to} className="card hover:border-[var(--accent)] transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-display font-bold text-white group-hover:text-[var(--accent)] transition-colors">{title}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{desc}</p>
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <h2 className="font-display font-bold text-white text-xl mb-4 anim-5">FAQ</h2>
          <div className="flex flex-col gap-4 mb-10 anim-5">
            {faqs.map(({ q, a }) => (
              <div key={q} className="card">
                <p className="font-display font-bold text-white text-base mb-2">{q}</p>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="card border-[var(--accent)] anim-5" style={{ background: 'rgba(255,184,0,0.04)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Get in touch</p>
            <p className="text-[var(--text-muted)] text-sm mb-3">
              Questions, feedback, or found a bug? We'd love to hear from you.
            </p>
            <a
              href="mailto:support@cashpedal.io"
              className="text-[var(--accent)] font-semibold text-sm hover:underline"
            >
              support@cashpedal.io
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
