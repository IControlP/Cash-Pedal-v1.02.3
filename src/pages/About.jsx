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
    a: 'For fuel and loan math, outputs are close to exact given the inputs you provide. Insurance estimates typically land within 10–20% of your actual quote — the model is calibrated to 2025 Bankrate/Quadrant state averages but your personal rate depends on driving record, credit score, and coverage choices. Depreciation follows manufacturer and segment curves and should be treated as a planning range, not a precise prediction. Use Cash Pedal to compare options and understand your cost exposure, not as a substitute for actual insurance quotes or dealer figures.',
  },
  {
    q: 'What\'s included in the TCO calculation?',
    a: 'The TCO Calculator covers financing (loan payment, total interest, total loan cost), fuel, insurance, maintenance, registration fees, and depreciation — all broken down annually over your ownership period. The Salary Calculator applies those same costs to the 20/4/10 affordability rule.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. All basic tools are free and require no sign-up. Cash Pedal Pro ($10/month) unlocks unlimited detailed TCO analyses, unlimited used-car checklists, and multi-vehicle comparison exports — no account required for the free tier.',
  },
  {
    q: 'How does the Car Survey work?',
    a: 'The 13-question survey scores your answers across 9 vehicle categories using a weighted impact system. Your top match is the vehicle type that most closely aligns with your priorities, lifestyle, and attitude toward cars.',
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
              Cash Pedal is a free, no-signup toolkit for buying your next car with confidence. We built it because
              buying a car is one of the biggest financial commitments most people make — and most of the tools
              available are designed by dealerships, lenders, or media companies with something to sell you.
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed mb-4">
              We don't have an agenda. No affiliate commissions built into the calculators, no upsells, no
              "sponsored results." Just the math — presented clearly enough that you can make the right call
              for your own situation, and not be caught off guard by what comes after.
            </p>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Calculation tools run entirely in your browser — no account is required. If you subscribe
              or accept our terms, limited data is stored for service delivery. See our{' '}
              <Link to="/privacy" className="text-[var(--accent)] underline hover:brightness-110">Privacy Policy</Link>.
            </p>
          </div>

          {/* How it works */}
          <h2 className="font-display font-bold text-white text-xl mb-4 anim-3">How it works</h2>
          <div className="flex flex-col gap-3 mb-10 anim-3">
            {[
              'Enter your vehicle details — price, financing, or ownership duration.',
              'Adjust the inputs until the scenario matches your real situation.',
              'Read the results. Use them to negotiate, compare, or decide.',
              'No account required. Calculator tools run in your browser.',
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

          {/* Methodology */}
          <h2 className="font-display font-bold text-white text-xl mb-4 anim-4">Methodology & data sources</h2>
          <div className="card mb-10 anim-4">
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-4">
              Every cost component is modeled separately and combined into a single annual figure. Here's what drives each one:
            </p>
            <div className="flex flex-col gap-4">
              {[
                {
                  label: 'Loan & lease math',
                  detail: 'Standard amortization formula. Inputs you provide (rate, term, down payment) determine exact payment and total interest — no approximation.',
                },
                {
                  label: 'Depreciation',
                  detail: 'Brand-specific multipliers applied to segment depreciation curves (economy through luxury). Mileage deviation from 13,500 mi/yr (FHWA 2024 national average) adjusts residual value. Curves are derived from historical transaction data and are rechecked annually.',
                },
                {
                  label: 'Insurance',
                  detail: 'Base rates calibrated to Bankrate / Quadrant Information Services state averages (November 2025). State, vehicle segment, brand, vehicle age, and current market value all adjust the estimate. Multi-car discount applies an 15% reduction. Your actual premium will differ based on driving record, credit score, and coverage level.',
                },
                {
                  label: 'Fuel',
                  detail: 'State average gas prices from the U.S. Energy Information Administration (EIA). Electric rates from EIA state residential averages. Combined with EPA MPG / MPGe ratings for the selected vehicle. Default mileage: 13,500 mi/yr (FHWA 2024).',
                },
                {
                  label: 'Maintenance',
                  detail: 'Tier-based estimates anchored to AAA\'s annual "Your Driving Costs" study. Brand reliability multipliers adjust for manufacturers with above- or below-average repair frequency. Escalates ~8%/yr to reflect aging and out-of-warranty costs.',
                },
                {
                  label: 'Registration & fees',
                  detail: 'State-specific registration fee schedules, typically declining as vehicle value depreciates. Sales tax uses state rates applied to purchase price.',
                },
              ].map(({ label, detail }) => (
                <div key={label}>
                  <p className="text-white text-sm font-semibold mb-1">{label}</p>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
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
