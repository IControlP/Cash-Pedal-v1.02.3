const ITEMS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-5" />
      </svg>
    ),
    title: 'See your car as a financial decision',
    body: "Every Cash Pedal report ends with a wealth-impact verdict: what the savings between two cars become if you invest them instead. Your car shouldn't just be a ride — it should be a step toward the life you're building.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    title: 'Money-pit detector, built in',
    body: "Some cars look like deals and aren't. Cash Pedal flags vehicles with red-flag depreciation curves, runaway insurance costs, or maintenance traps — before you sign and find out the expensive way.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3h7v7" />
        <path d="M10 21H3v-7" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
    ),
    title: '"What if" the rest of your plan',
    body: 'Sensitivity sliders for every assumption — gas prices, hold time, miles driven, financing rate. See exactly how a longer commute or a higher rate changes which car wins for your situation.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
    title: 'Shareable PDF for the family CFO',
    body: "Send it to your spouse before you spiral. Send it to your financial advisor as part of the bigger plan. Send it to yourself in three years when you're tempted to upgrade early.",
  },
]

export default function Features() {
  return (
    <section className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Why Cash Pedal</div>
        <h2 className="section-h font-display">
          Built for buyers who care about year 10, not just year 1.
        </h2>
        <p className="section-sub">
          Most car calculators tell you a monthly payment. We tell you whether this purchase sets
          you up for financial stability — or quietly works against it.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {ITEMS.map(it => (
            <div key={it.title} className="feature-card">
              <div className="feature-icon">{it.icon}</div>
              <h3 className="font-display text-lg font-bold tracking-tight mb-2">{it.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
