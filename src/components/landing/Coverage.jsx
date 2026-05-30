import { CarSilhouette, getPal } from '../CarSVGs'

const LINEUP = [
  { make: 'BMW', model: '330i xDrive', carType: 'sedan' },
  { make: 'Tesla', model: 'Model 3 Long Range', carType: 'sedan', isEV: true },
  { make: 'Toyota', model: 'Camry Hybrid', carType: 'sedan' },
  { make: 'Ford', model: 'F-150 Lariat', carType: 'truck' },
  { make: 'Rivian', model: 'R1S Adventure', carType: 'suv_large', isEV: true },
  { make: 'Jeep', model: 'Wrangler Rubicon', carType: 'suv' },
  { make: 'Porsche', model: '911 Carrera', carType: 'sports' },
  { make: 'Ferrari', model: 'F8 Tributo', carType: 'sports' },
  { make: 'Mercedes-Benz', model: 'GLS 580', carType: 'suv_large' },
  { make: 'Toyota', model: 'Sienna Hybrid', carType: 'minivan' },
  { make: 'Honda', model: 'Civic Touring', carType: 'sedan' },
  { make: 'Hyundai', model: 'Ioniq 5', carType: 'suv', isEV: true },
]

export default function Coverage() {
  return (
    <section id="coverage" className="py-20">
      <div className="max-w-[1240px] mx-auto px-7">
        <div className="section-eyebrow">Coverage</div>
        <h2 className="section-h font-display">If you'd cross-shop it, we've got it.</h2>
        <p className="section-sub">
          Every major US-market manufacturer back to model year 2015. Gas, hybrid, plug-in, electric
          — including configurations the dealer won't quote you on.
        </p>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {LINEUP.map((c, i) => {
            const pal = getPal(c.make)
            return (
              <div key={i} className="car-visual-wrap car-card">
                <div className="px-4 pt-4 pb-2">
                  <CarSilhouette carType={c.carType} isEV={c.isEV} pal={pal} />
                </div>
                <div className="car-card-label">
                  <span className="flex items-center min-w-0">
                    <span
                      className="brand-chip"
                      style={{ background: pal.body }}
                    />
                    <span className="b">{c.make}</span>
                    <span className="mx-1 opacity-60">·</span>
                    <span className="truncate">{c.model}</span>
                  </span>
                  {c.isEV && <span className="pill-ev">ELECTRIC</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 items-center text-sm text-[var(--text-muted)] opacity-80">
          <span><strong className="text-[var(--accent)] font-mono">11,000+</strong> trims indexed</span>
          <span>·</span>
          <span>
            <strong className="text-[var(--accent)] font-mono">36</strong> brands · model years{' '}
            <strong className="text-[var(--accent)] font-mono">2015 → 2026</strong>
          </span>
          <span>·</span>
          <span>Data refreshed weekly</span>
        </div>
      </div>
    </section>
  )
}
