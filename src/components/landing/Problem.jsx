const ITEMS = [
  {
    stat: '$9,150',
    title: 'Hidden per car',
    body: 'Average gap on a $30,000 vehicle between sticker and real 5-year cost (insurance, fuel, maintenance, registration, financing interest). Anchored to the same defaults the Cash Pedal calculator uses — 12,000 mi/yr, 6.5% loan rate, 5-year hold.',
  },
  {
    stat: '$92k',
    title: 'Drained per lifetime',
    body: "A typical American buys 10+ cars over their adult life. That hidden gap, compounded, is a paid-off house. A college fund. The retirement you actually want — not the one you settle for.",
  },
  {
    stat: '$440k',
    title: 'Or invested instead',
    body: 'The same dollars, put into a low-cost index fund at 7% real return over a working life, become roughly $440,000 by retirement. Your car choice IS a retirement choice.',
  },
]

export default function Problem() {
  return (
    <section id="problem" className="py-28">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Why this matters</div>
        <h2 className="section-h font-display">
          Your car is either a wealth-builder or a wealth-killer.
        </h2>
        <p className="section-sub">
          Most people pick a car the same way they pick a restaurant — what looks good, what's
          nearby, what fits the budget today. But two $40,000 cars can have a $25,000 swing in real
          cost over five years. That gap is your down payment, your emergency fund, your kid's
          first semester. Cash Pedal makes that invisible math visible — so you can put your money
          toward your future, not your dealer's quota.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {ITEMS.map(it => (
            <div key={it.title} className="problem-card">
              <div className="problem-stat">{it.stat}</div>
              <h3 className="font-display text-[17px] font-semibold mb-2">{it.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
