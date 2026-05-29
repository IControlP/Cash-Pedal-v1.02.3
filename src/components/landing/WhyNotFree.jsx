const THEIRS = [
  'Estimated monthly payment',
  'Basic 5-year ownership cost (national averages)',
  'Dealer inventory links (they earn referral fees)',
  'One car at a time',
]

const OURS = [
  'Full 7-category cost breakdown: fuel, insurance, maintenance, depreciation, financing, registration, taxes',
  'Costs localized to your ZIP code and driving habits',
  'Sensitivity sliders — see how a rate change or longer hold shifts the winner',
  'Side-by-side comparison across up to 5 vehicles',
  'Wealth-impact verdict: what the savings compounds to over 25 years',
  'PDF report to share with your spouse or financial advisor',
  'No dealer referral fees — we don\'t make money if you pick the expensive car',
]

export default function WhyNotFree() {
  return (
    <section className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Why not just use KBB or Edmunds?</div>
        <h2 className="section-h font-display">They show you a payment. We show you the truth.</h2>
        <p className="section-sub">
          The free tools are fine for a rough estimate. Cash Pedal is built for the moment when you actually need to decide.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Their column */}
          <div className="card" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-5">
              What KBB / Edmunds show you
            </div>
            <ul className="flex flex-col gap-4">
              {THEIRS.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: 'rgba(160,140,191,0.45)' }}>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Our column */}
          <div className="card" style={{ borderColor: 'rgba(255,184,0,0.28)', background: 'rgba(255,184,0,0.03)' }}>
            <div className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--accent)' }}>
              What Cash Pedal adds
            </div>
            <ul className="flex flex-col gap-4">
              {OURS.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-white">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-center text-[var(--text-muted)]">
          Edmunds and KBB are built to help dealers sell cars.{' '}
          <span className="text-white font-semibold">Cash Pedal is built to help you buy the right one.</span>
        </p>
      </div>
    </section>
  )
}
