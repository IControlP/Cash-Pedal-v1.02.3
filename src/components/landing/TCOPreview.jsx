import { SUVSVG, getPal } from '../CarSVGs'

const BARS = [
  { label: 'Depreciation', a: 82, b: 76, av: '$35,000', bv: '$32,500', color: '#FFB800' },
  { label: 'Fuel / charge', a: 14, b: 80, av: '$4,500',  bv: '$16,500', color: '#5FE0B8' },
  { label: 'Insurance',    a: 68, b: 60, av: '$12,500', bv: '$11,000', color: '#7BC8FF' },
  { label: 'Maintenance',  a: 24, b: 64, av: '$3,500',  bv: '$9,000',  color: '#FF8A7A' },
  { label: 'Reg. & taxes', a: 60, b: 44, av: '$8,900',  bv: '$6,550',  color: '#C8A0FF' },
  { label: 'Financing',    a: 72, b: 60, av: '$12,300', bv: '$10,300', color: '#FFE066' },
]

export default function TCOPreview() {
  return (
    <section id="preview" className="py-28" style={{ scrollMarginTop: '72px' }}>
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Sample report</div>
        <h2 className="section-h font-display">
          See exactly which car protects your future.
        </h2>
        <p className="section-sub">
          A real Cash Pedal comparison. Two cars, five years, every dollar accounted for — with a
          wealth-impact verdict that shows what picking the cheaper car becomes if you invest the
          difference instead of spending it.
        </p>

        <div className="tco-preview">
          <div className="tco-window">
            <div className="tco-header">
              <div className="tco-dots">
                <span /><span /><span />
              </div>
              <div className="tco-url">
                <span className="lock">🔒</span>
                cashpedal.io / report / r1s-vs-x5
              </div>
              <div style={{ width: 40 }} />
            </div>

            <div className="tco-body">
              <h3 className="tco-title font-display">
                Rivian R1S Adventure vs BMW X5 xDrive40i
              </h3>
              <p className="tco-subtitle">
                5-year forecast · 12,000 mi/yr · ZIP 94110 · 6.5% loan / $5k down · Refreshed today
              </p>

              <div className="grid md:grid-cols-2 gap-5">
                <CarColumn
                  winner
                  name="Rivian R1S"
                  trim="Adventure · Electric · AWD"
                  total="$76,700"
                  perMile="$1.28 / mile"
                  side="a"
                  svg={<SUVSVG pal={getPal('Rivian')} isEV isLarge />}
                />
                <CarColumn
                  name="BMW X5"
                  trim="xDrive40i · Gas · AWD"
                  total="$85,850"
                  perMile="$1.43 / mile"
                  side="b"
                  svg={<SUVSVG pal={getPal('BMW')} isLarge />}
                />
              </div>

              <div className="verdict">
                <div className="verdict-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M14 7h7v7" />
                  </svg>
                </div>
                <div className="verdict-text">
                  <div className="v-label">Wealth impact</div>
                  <div className="v-line">
                    Pick the R1S and invest the <span className="num">$9,150</span> savings — at 7%
                    real return over 25 years it becomes <span className="gold">$49,700</span> in
                    long-term savings.
                  </div>
                </div>
                <div className="verdict-cta">
                  <span>Your future self thanks you</span>
                  <strong>+$49,700</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CarColumn({ winner, name, trim, total, perMile, side, svg }) {
  return (
    <div className={`tco-car car-visual-wrap ${winner ? 'tco-car--winner' : ''}`}>
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <div className="font-display font-bold text-[17px]">{name}</div>
          <div className="text-xs text-[var(--text-muted)] opacity-80">{trim}</div>
        </div>
      </div>
      {svg}
      <div className="tco-bars">
        {BARS.map(b => (
          <div key={b.label} className="tco-bar-row">
            <div className="tco-bar-label">{b.label}</div>
            <div className="tco-bar-track">
              <div
                className="tco-bar-fill"
                style={{ width: b[side] + '%', background: b.color }}
              />
            </div>
            <div className="tco-bar-val">{side === 'a' ? b.av : b.bv}</div>
          </div>
        ))}
      </div>
      <div className="tco-total-row">
        <div>
          <div className="tco-total-label">True 5-yr cost</div>
          <div className="tco-total-sub">{perMile}</div>
        </div>
        <div className="tco-total-val">{total}</div>
      </div>
    </div>
  )
}
