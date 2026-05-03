import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSubscription } from '../hooks/useSubscription'

const GPT_URL = 'https://chatgpt.com/g/g-698e3ceaa11c81919b86766878324f99-wheel-zard'

const quickTopics = [
  "Should I buy new or used?",
  "Is leasing or buying better?",
  "EV vs gas — which saves more money?",
  "Most reliable cars for long-term ownership?",
  "Best reliable SUV for families?",
  "Should I buy a Honda Civic or Toyota Corolla?",
]

const capabilities = [
  { emoji: '🚗', title: 'Vehicle Recommendations', desc: 'Get personalized picks based on your lifestyle, budget, and needs.' },
  { emoji: '💰', title: 'Cost Analysis', desc: 'Understand total cost of ownership beyond the sticker price.' },
  { emoji: '⛽', title: 'Gas vs Electric', desc: 'Compare fuel costs, EV incentives, and long-term savings.' },
  { emoji: '🔧', title: 'Maintenance Insights', desc: 'Know what to expect in repairs and service for any vehicle.' },
  { emoji: '📊', title: 'Comparison Guidance', desc: 'Get help narrowing down your shortlist to the best option.' },
  { emoji: '🎯', title: 'Buying Advice', desc: 'New vs used, lease vs buy — Wheel-Zard breaks it down.' },
]

// Simple local response logic for quick questions
function getLocalResponse(msg) {
  const m = msg.toLowerCase()
  if (/^(hi|hello|hey|sup|yo)\b/.test(m)) {
    return "Hey! I'm Wheel-Zard 🤖 — your AI vehicle advisor. Ask me anything about cars, costs, or buying decisions. For deep personalized recommendations, I'll link you to the full version."
  }
  if (/\b(help|what can you|capabilities)\b/.test(m)) {
    return "I can help with: vehicle recommendations, cost of ownership estimates, gas vs electric comparisons, maintenance expectations, and lease vs buy decisions. For complex personalized analysis, use the full Wheel-Zard GPT below."
  }
  if (/\b(thank|thanks|great|awesome)\b/.test(m)) {
    return "Happy to help! Let me know if you have more questions, or try the full Wheel-Zard GPT for deeper analysis."
  }
  if (/\b(budget|afford|cost|price|expensive|cheap)\b/.test(m)) {
    return "For a precise cost breakdown, try our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> or <a href='/salary' class='text-[var(--accent)] hover:underline'>Salary Calculator</a>. They'll show you exactly what a specific vehicle will cost you over time, including insurance, fuel, maintenance, and taxes — no GPT needed."
  }
  if (/\b(recommend|suggest|which car|best car|what car)\b/.test(m)) {
    return "For personalized recommendations I need to ask you a few questions — the full Wheel-Zard GPT is best for that. Or try our <a href='/survey' class='text-[var(--accent)] hover:underline'>Car Survey</a> for a quick personality-based match!"
  }
  if (/\bvs\.?\b|\bversus\b|\bcompare\b|\bor the\b|\bor a\b/.test(m) && /\b(car|truck|suv|sedan|vehicle|accord|camry|civic|corolla|tacoma|f-150|rav4|cr-v|tesla|mazda|honda|toyota|ford|chevy|chevrolet|bmw|audi|subaru|hyundai|kia|nissan)\b/.test(m)) {
    return "Head-to-head comparisons are what our <a href='/compare' class='text-[var(--accent)] hover:underline'>Multi-Vehicle Comparison</a> tool is built for. You can line up the two (or more) vehicles side by side and see monthly cost, 5-year TCO, insurance, fuel, and maintenance all at once. For a deeper narrative comparison — pros, cons, and which fits your lifestyle — the full Wheel-Zard GPT below handles that well."
  }
  if (/\b(reliable|reliability|repair|breakdown|maintenance)\b/.test(m)) {
    return "Reliability leaders by segment: <strong class='text-white'>Sedans</strong> — Toyota Camry, Honda Accord. <strong class='text-white'>SUVs</strong> — Toyota 4Runner, Honda CR-V, Mazda CX-5. <strong class='text-white'>Trucks</strong> — Toyota Tacoma, Honda Ridgeline. <strong class='text-white'>EVs</strong> — Tesla Model 3/Y (fewer mechanical issues, but higher part costs). Generally: Japanese brands cost 15–30% less to maintain than European luxury brands. Our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> includes brand-specific maintenance multipliers and a Repair Risk Score."
  }
  if (/\b(electric|ev|tesla|hybrid|gas|fuel|mpg|charging)\b/.test(m)) {
    return "EV fuel cost with <strong class='text-white'>home charging</strong>: roughly $0.04–0.06/mile depending on your state's electricity rate. With <strong class='text-white'>public DC fast charging</strong>: $0.09–0.16/mile — approaching gas prices in some states. Gas vehicles typically run $0.11–0.18/mile at current pump prices. The EV advantage shrinks if you rely heavily on public charging. EVs also save $500–$900/yr on maintenance (no oil changes, extended brake life from regen braking). For high-mileage drivers with home charging, the math usually favors EV or hybrid within 3–5 years. Run your specific numbers in our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a>."
  }
  if (/\b(lease|buy|finance|loan|own)\b/.test(m)) {
    return "<strong class='text-white'>Buy if:</strong> you keep the car 5+ years, drive 15k+ miles/year, or want to build equity. Total cost over 7–10 years is almost always lower. <strong class='text-white'>Lease if:</strong> you want a new car every 3 years, drive under 12k miles/year, and want predictable monthly costs with no resale hassle. The hidden cost of leasing: no equity, mileage overage fees ($0.15–0.25/mile), and you'll always have a payment. Run both scenarios in our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> — it models exact lease vs. buy costs side by side."
  }
  if (/\b(new|used|pre.?owned|second.?hand)\b/.test(m)) {
    return "<strong class='text-white'>New</strong>: full warranty, latest features, financing incentives — but loses 15–20% of value in year one. <strong class='text-white'>Used (1–3 years old)</strong>: someone else absorbed the steepest depreciation. Sweet spot for value. <strong class='text-white'>Used (4–7 years old)</strong>: lowest price, but warranty typically expired — budget for repairs. Use our <a href='/checklist' class='text-[var(--accent)] hover:underline'>Used Car Checklist</a> before any private party or dealer used purchase to estimate negotiation leverage."
  }
  return null
}

export default function WheelZard() {
  const { isSubscribed } = useSubscription()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hey, I'm Wheel-Zard 🤖 — your AI vehicle advisor. Ask me anything about cars, costs, or buying decisions. For complex, personalized analysis, I'll send you to the full GPT version.",
    },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(text) {
    const msg = text ?? input.trim()
    if (!msg) return

    setMessages(m => [...m, { role: 'user', text: msg }])
    setInput('')

    const localReply = getLocalResponse(msg)
    setTimeout(() => {
      if (localReply) {
        setMessages(m => [...m, { role: 'assistant', text: localReply, html: true }])
      } else {
        setMessages(m => [
          ...m,
          {
            role: 'assistant',
            text: `That's a good question. For the most accurate, personalized answer I'd recommend taking it to the full Wheel-Zard GPT — it has access to detailed vehicle data and can ask follow-up questions. You can also check our calculators for specific cost questions.`,
            cta: true,
          },
        ])
      }
    }, 150)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* Chat panel */}
            <div className="flex flex-col">
              <div className="mb-4">
                <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                  <span className="w-4 h-px bg-[var(--accent)]" />
                  AI Vehicle Advisor
                </div>
                <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight">
                  Wheel-Zard 🤖
                </h1>
                <p className="anim-2 text-[var(--text-muted)] mt-1 text-base">
                  Ask anything about cars, costs, or buying decisions.
                </p>
              </div>

              {/* Messages */}
              <div className="card flex flex-col gap-4 mb-4 anim-3" style={{ minHeight: '360px', maxHeight: '480px', overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-sm shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-tr-sm'
                          : 'bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-tl-sm'
                      }`}
                    >
                      {msg.html
                        ? <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                        : msg.text
                      }
                      {msg.cta && (
                        <a
                          href={GPT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-2 px-4 mt-3 inline-flex"
                        >
                          Open Wheel-Zard GPT →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick topics */}
              <div className="flex flex-wrap gap-2 mb-4 anim-4">
                {quickTopics.map(t => (
                  <button
                    key={t}
                    onClick={() => handleSend(t)}
                    className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-white hover:border-[#3a3a3e] transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-3 anim-4">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Wheel-Zard anything..."
                  className="input-field flex-1"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>

              {/* Full GPT link */}
              <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] anim-5">
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  For in-depth personalized advice — model comparisons, full cost breakdowns, and tailored recommendations — try the full Wheel-Zard GPT:
                </p>
                <a
                  href={GPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm py-2.5"
                >
                  Open Full Wheel-Zard GPT ↗
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4 anim-4">
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">What I can help with</p>
                <div className="flex flex-col gap-3">
                  {capabilities.map(({ emoji, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">Quick tools</p>
                <div className="flex flex-col gap-2">
                  {[
                    { to: '/tco', label: '🧮 TCO Calculator' },
                    { to: '/compare', label: '⚖️ Compare Vehicles' },
                    { to: '/survey', label: '🎯 Car Survey' },
                    { to: '/salary', label: '💵 Salary Check' },
                    { to: '/checklist', label: '🔍 Buying Checklist' },
                  ].map(({ to, label }) => (
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

              {!isSubscribed && (
                <div className="rounded-xl border p-4"
                  style={{ borderColor: 'rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.04)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--accent)' }}>
                    Cash Pedal Pro
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                    Unlock unlimited detailed TCO analyses with make/model/trim-level breakdowns, unlimited used-car
                    checklists, and multi-vehicle comparisons.
                  </p>
                  <ul className="text-xs text-[var(--text-muted)] space-y-1 mb-4">
                    {['Unlimited detailed TCO analyses', 'Unlimited checklists', 'Multi-vehicle comparison export'].map(f => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span style={{ color: 'var(--accent)' }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/tco" className="btn-primary text-xs py-2 block text-center">
                    Try Pro — $10/month →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
