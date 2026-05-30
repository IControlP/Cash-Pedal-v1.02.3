import { SedanSVG, SUVSVG, SportsSVG, getPal } from '../CarSVGs'

export default function HowItWorks() {
  return (
    <section id="how" className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-h font-display">Three inputs. A smarter financial future.</h2>
        <p className="section-sub">
          No spreadsheet, no dealer math, no guesswork. Punch in your candidates, your state, and
          your driving habits — we surface the car that fits your life AND your financial plan.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Step n="01" title="Pick the cars you're weighing" visual={<SedanSVG pal={getPal('BMW')} />}>
            Any combination — new, used, gas, EV, hybrid, plug-in. Pull from our database of
            11,000+ trims back to 2015.
          </Step>
          <Step n="02" title="Tell us how you'll drive" visual={<SUVSVG pal={getPal('Rivian')} isEV />}>
            Annual miles, your state, parking situation. We localize fuel, electricity, insurance
            estimates, and registration in real time.
          </Step>
          <Step n="03" title="See the financial winner" visual={<SportsSVG pal={getPal('Porsche')} />}>
            One verdict per car, broken into seven categories — plus what the difference looks like
            invested toward your financial stability instead. Buy with confidence, not regret.
          </Step>
        </div>
      </div>
    </section>
  )
}

function Step({ n, title, visual, children }) {
  return (
    <div className="step-card">
      <div className="step-num">{n}</div>
      <h3 className="font-display text-xl font-bold tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5">{children}</p>
      <div className="step-visual car-visual-wrap">{visual}</div>
    </div>
  )
}
