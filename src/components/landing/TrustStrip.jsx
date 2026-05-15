export default function TrustStrip() {
  const outlets = ['CAR & DRIVER', 'Edmunds', 'MotorTrend', '/r/whatcarshouldIbuy', 'Autoblog']
  return (
    <div className="border-y border-[var(--border)]/60 bg-white/[0.015]">
      <div className="max-w-[1240px] mx-auto px-7 py-5 flex flex-wrap gap-10 items-center">
        <span className="font-display text-[11px] tracking-[0.18em] uppercase text-[var(--text-muted)]">
          Featured in
        </span>
        <div className="flex flex-wrap gap-8 flex-1">
          {outlets.map(name => (
            <span
              key={name}
              className="font-display font-bold text-[17px] text-[var(--text-muted)] opacity-70 tracking-tight"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
