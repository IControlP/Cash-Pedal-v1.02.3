import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const GPT_URL = 'https://chatgpt.com/g/g-698e3ceaa11c81919b86766878324f99-wheel-zard'

const quickTopics = [
  "What car should I buy for under $30,000?",
  "Best reliable SUV for families?",
  "How much does it cost to own a Tesla?",
  "Compare Honda Civic vs Toyota Corolla",
  "Should I buy new or used?",
  "Most reliable cars for long-term ownership?",
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
    return "For a precise cost breakdown, try our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> or <a href='/salary' class='text-[var(--accent)] hover:underline'>Salary Calculator</a>. They'll show you exactly what a specific vehicle will cost you over time — no GPT needed."
  }
  if (/\b(recommend|suggest|which car|best car|what car)\b/.test(m)) {
    return "For personalized recommendations I need to ask you a few questions — the full Wheel-Zard GPT is best for that. Or try our <a href='/survey' class='text-[var(--accent)] hover:underline'>Car Survey</a> for a quick personality-based match!"
  }
  if (/\b(electric|ev|tesla|hybrid|gas|fuel|mpg)\b/.test(m)) {
    return "EVs win on fuel cost ($0.03–0.05/mile vs $0.10–0.15/mile for gas) and maintenance (no oil changes, fewer brake jobs from regen braking). The trade-off: higher upfront cost and charging logistics. For high-mileage drivers or anyone with home charging, the math usually favors EV or hybrid within 3-5 years."
  }
  if (/\b(lease|buy|finance|loan|own)\b/.test(m)) {
    return "Buying wins if you keep the car 5+ years and drive a lot. Leasing makes sense if you want a new car every 3 years, drive < 12K miles/year, and want lower monthly payments. The hidden cost of leasing: you never build equity. Run the numbers in our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a>."
  }
  return null
}

export default function WheelZard() {
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
            text: `That's a great question. For the most accurate, personalized answer I'd recommend taking it to the full Wheel-Zard GPT — it has access to detailed vehicle data and can ask follow-up questions. You can also check our calculators for specific cost questions.`,
            cta: true,
          },
        ])
      }
    }, 600)
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
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
