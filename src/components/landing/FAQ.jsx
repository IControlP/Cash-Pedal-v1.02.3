import { useState } from 'react'

const QS = [
  {
    q: 'How accurate are the forecasts?',
    a: 'Cash Pedal uses the same model your in-app calculator does — 12,000 mi/yr default, 6.5% loan rate, 5-year hold, plus state-level fuel, electricity, insurance, registration, and sales-tax data refreshed on a rolling cadence. Every assumption is visible and adjustable so you can tune the model to your actual situation. Results are estimates, not guarantees.',
  },
  {
    q: 'Is the offer actually one-time?',
    a: "Yes. $19, one payment, 60 days of full access. No subscription, no auto-renewal, no card on file after checkout. Cash Pedal is built for the window when you're actively car-shopping — not as another monthly bill.",
  },
  {
    q: 'What happens after 60 days?',
    a: "Access expires automatically. No card on file, nothing to cancel. If you're still shopping (it happens), you can buy another pass for $19. Most buyers only need one window — we built it that way on purpose.",
  },
  {
    q: 'Do you sell my data to dealers or insurers?',
    a: "No. Ever. We don't accept dealer placements or insurer kickbacks — it would compromise the math. We make money from one thing: the $19 shopper pass, full stop.",
  },
  {
    q: 'What about used cars?',
    a: "Fully supported back to 2015 model years. Depreciation estimates are applied per vehicle tier and model year, reflecting the real-world cost curve of used ownership.",
  },
  {
    q: 'Can I run more than two cars?',
    a: 'Yes — the 60-day pass is fully unlimited. Compare two at a time, stack up to six in a grid, or rerun the same pair with different financing scenarios. Whatever helps you decide.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="py-28">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="section-h font-display text-center mx-auto mb-14">The honest questions.</h2>
        <div className="max-w-[820px] mx-auto flex flex-col gap-3">
          {QS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                <button
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className="faq-chev">+</span>
                </button>
                {isOpen && <div className="faq-a">{item.a}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
