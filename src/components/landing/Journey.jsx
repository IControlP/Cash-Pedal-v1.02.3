import { Link } from 'react-router-dom'

// The five sequential steps most buyers move through, each mapped to the
// tool that answers the question for that exact moment in the journey.
const STAGES = [
  {
    n: '01',
    tag: 'Still dreaming',
    tool: 'Car Survey',
    to: '/survey',
    q: '"I don\'t even know what kind of car I want."',
    body: 'Answer 10 quick questions about your life and driving. We match you to the body styles and segments that actually fit — sedan, SUV, truck, EV — before you fall for the wrong one.',
    cta: 'Take the survey',
  },
  {
    n: '02',
    tag: 'Setting the budget',
    tool: 'Salary Check',
    to: '/salary',
    q: '"What can I actually afford?"',
    body: 'The proven 20/4/10 rule, run against your income in seconds. Get the honest price ceiling — and the monthly payment — that keeps a car from eating your paycheck.',
    cta: 'Check my number',
  },
  {
    n: '03',
    tag: 'Pricing it for real',
    tool: 'TCO Calculator',
    to: '/tco',
    q: '"What will this car really cost me?"',
    body: 'The core engine. Pull any trim back to 2015, add your ZIP and driving habits, and see the true 5-year cost — fuel, insurance, maintenance, depreciation, interest — not just the sticker.',
    cta: 'Run the numbers',
    featured: true,
  },
  {
    n: '04',
    tag: 'Down to finalists',
    tool: 'Compare',
    to: '/compare',
    q: '"Which of these is the smarter buy?"',
    body: 'Stack up to 5 cars side by side. One clear financial winner, category by category — so the choice between your top picks comes down to facts, not gut feel.',
    cta: 'Compare cars',
  },
  {
    n: '05',
    tag: 'At the lot',
    tool: 'Buying Checklist',
    to: '/checklist',
    q: '"Is this specific used car a money pit?"',
    body: "Whether you're at a dealership or meeting a private seller, this mileage-aware inspection list tells you exactly what to check, what to ask, and what should send you walking before you hand over a deposit.",
    cta: 'Open the checklist',
  },
]

// Tools that aren't a single step — they ride along the whole way.
const COMPANIONS = [
  {
    tool: 'Blog',
    to: '/blog',
    body: 'Go deeper on the why behind the math — guides on depreciation, loans, leasing, and avoiding dealer traps.',
  },
  {
    tool: 'Market Data',
    to: '/market',
    body: "See what cars everyone else is shopping right now — nationally and in your state — for a read on demand and resale.",
  },
]

export default function Journey() {
  return (
    <section id="journey" className="py-24">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Where to start</div>
        <h2 className="section-h font-display">
          Five tools. One smart car-buying decision.
        </h2>
        <p className="section-sub">
          Cash Pedal walks you through the whole journey — from "what kind of car do I even want?"
          to standing at the lot. Click any step below to open that tool now.
        </p>

        <div className="journey-rail">
          {STAGES.map(s => (
            <Link
              key={s.n}
              to={s.to}
              className={`journey-card${s.featured ? ' journey-card--featured' : ''}`}
            >
              <div className="journey-top">
                <span className="journey-num">{s.n}</span>
                <span className="journey-tag">{s.tag}</span>
              </div>
              <h3 className="journey-q font-display">{s.q}</h3>
              <div className="journey-tool">
                {s.tool}
                {s.featured && <span className="journey-core">core tool</span>}
              </div>
              <p className="journey-body">{s.body}</p>
              <span className="journey-cta">{s.cta} →</span>
            </Link>
          ))}
        </div>

        <div className="journey-companions">
          <div className="journey-companions-label">Along for the whole ride</div>
          <div className="grid md:grid-cols-2 gap-5">
            {COMPANIONS.map(c => (
              <Link key={c.tool} to={c.to} className="journey-companion">
                <h4 className="journey-companion-tool font-display">{c.tool}</h4>
                <p className="journey-body">{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
