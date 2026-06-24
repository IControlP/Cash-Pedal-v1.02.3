const ITEMS = [
  {
    stat: '$9,150',
    title: 'Hidden per car',
    body: 'Average gap on a $30,000 vehicle between sticker and real 5-year cost (insurance, fuel, maintenance, registration, financing interest). Anchored to the same defaults the Cash Pedal calculator uses — 12,000 mi/yr, 6.5% loan rate, 5-year hold.',
  },
  {
    stat: '$92k',
    title: 'Drained per lifetime',
    body: "A typical American buys 10+ cars over their adult life. That hidden gap, compounded, is a paid-off house. A college fund. The financial security you can actually build — instead of watching it drain away.",
  },
  {
    stat: '$440k',
    title: 'Or invested instead',
    body: 'The same dollars, put into a low-cost index fund at 7% real return over a working life, become roughly $440,000 in long-term wealth. Your car choice IS a financial stability choice.',
  },
]

export default function Problem() {
  return (
    <section id="problem" className="py-28">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Why this matters</div>
        <h2 className="section-h font-display">
          The wrong car doesn't just cost more. It catches you off guard.
        </h2>
        <p className="section-sub">
          Most buyers focus on one number: the price. Dealers count on that. Private party sellers
          count on it too. But two cars with the same sticker price can have a $25,000 swing in what
          they actually cost you over five years — and that gap doesn't show up until after you've
          already signed. Cash Pedal makes that number visible before you commit — whether you're
          negotiating with a dealer or meeting a stranger in a parking lot.
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
