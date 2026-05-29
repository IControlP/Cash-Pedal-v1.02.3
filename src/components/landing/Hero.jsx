import { useState } from 'react'
import { SUVSVG, getPal } from '../CarSVGs'
import EmailCaptureModal from '../EmailCaptureModal'

export default function Hero() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <section className="hero-section">
        <div className="max-w-[1240px] mx-auto px-7 py-20 lg:py-24">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
            {/* Copy */}
            <div>
              <span className="eyebrow anim-0">
                <span className="dot" />
                The car-buying decision that funds — or drains — your future
              </span>
              <h1 className="hero-h font-display anim-1">
                Pick a <span className="text-gold-gradient">car.</span>
                <br />
                Not a <span className="hero-strike">money pit.</span>
              </h1>
              <p className="hero-sub anim-2">
                Your next vehicle is the <strong>second-largest purchase</strong> of your life — and
                there's no one-size answer. Cash Pedal shows you whether that car actually fits your
                situation: your income, your needs, and the costs that won't show up until after you
                sign. Buy with confidence. Not optimism.
              </p>
              <div className="hero-cta anim-2">
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-primary btn-lg"
                >
                  Get my 60-day access — $19 →
                </button>
                <a href="#preview" className="btn-ghost btn-lg">
                  See a sample report first
                </a>
              </div>
              <div className="hero-meta anim-3">
                <span>Less than one tank of gas</span>
                <span>·</span>
                <span>Pays for itself on the first car you don't buy wrong</span>
              </div>
            </div>

            {/* Annotated hero car — hidden below lg where grid collapses */}
            <div className="hero-visual anim-1 hidden lg:block">
              <div className="hero-car-wrap">
                <SUVSVG pal={getPal('Rivian')} isEV isLarge />
              </div>

              <div className="cost-card" style={{ top: '4%', left: '0%' }}>
                <div className="cost-label">What the dealer shows</div>
                <div className="cost-val muted">$48,500</div>
                <div className="cost-delta">Sticker price</div>
              </div>

              <div className="cost-card" style={{ top: '6%', right: '0%' }}>
                <div className="cost-label">Hidden 5-yr drain</div>
                <div className="cost-val">$28,200</div>
                <div className="cost-delta">Costs they don't mention</div>
              </div>

              <div className="cost-card cost-card--gold" style={{ bottom: '14%', left: '-4%' }}>
                <div className="cost-label">Real 5-yr cost of this car</div>
                <div className="cost-val gold">$76,700</div>
                <div className="cost-delta up">The honest number</div>
              </div>

              <div className="cost-card cost-card--green" style={{ bottom: '2%', right: '-2%' }}>
                <div className="cost-label">Picking the right car saves</div>
                <div className="cost-val green">$9,150</div>
                <div className="cost-delta up">= $49,700 in 25 years at 7%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EmailCaptureModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
