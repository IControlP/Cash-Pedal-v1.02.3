// ──────────────────────────────────────────────────────────────────────
// Car SVG silhouettes — Tabler-style line art (shared module)
// Single source of truth for vehicle illustrations across the app.
//
// Animation hooks (defined in src/index.css):
//   .wheel-rim-inner  — hub spins on parent :hover .car-visual-wrap
//   .headlight-fx     — headlight pulse on parent :hover
//   .speed-line       — sports-car speed lines on parent :hover
//   .ev-bolt          — EV bolt steady glow
// ──────────────────────────────────────────────────────────────────────

export const DEFAULT_PAL = {
  body:      '#E8E4F0',
  stroke:    '#E8E4F0',
  win:       'rgba(16,30,52,0.88)',
  headlight: '#FFE066',
  tail:      '#FF6B8A',
  rim:       '#FFE066',
  shadow:    'rgba(0,0,0,0.45)',
}

export const BRAND_PALETTE = {
  'Acura':         { body: '#7BC8FF', rim: '#E0F0FF', headlight: '#E8F4FF' },
  'Alfa Romeo':    { body: '#FF7A6B', rim: '#FFE066', headlight: '#FFEE00' },
  'Audi':          { body: '#D8D8E0', rim: '#FFFFFF', headlight: '#E8F4FF' },
  'BMW':           { body: '#7BC8FF', rim: '#E0F0FF', headlight: '#E8F4FF' },
  'Buick':         { body: '#9CC8FF', rim: '#D8E8FF' },
  'Cadillac':      { body: '#FFE066', rim: '#FFF0A0', headlight: '#FFFFFF' },
  'Chevrolet':     { body: '#5BB8FF', rim: '#D0E8FF' },
  'Chrysler':      { body: '#B8C8E8', rim: '#E0E8F4' },
  'Dodge':         { body: '#FFB070', rim: '#FFE0B8', headlight: '#FFD060' },
  'Ferrari':       { body: '#FF7A6B', rim: '#FFE066', headlight: '#FFEE00' },
  'Fiat':          { body: '#FF8A7A', rim: '#F4DCD0' },
  'Ford':          { body: '#5BB8FF', rim: '#D0E8FF', headlight: '#E8F4FF' },
  'GMC':           { body: '#FF8470', rim: '#FFD0B8' },
  'Genesis':       { body: '#C8C0E0', rim: '#E0DCF0' },
  'Honda':         { body: '#FF8A7A', rim: '#F4DCD0' },
  'Hyundai':       { body: '#7BC8FF', rim: '#D8E8FF' },
  'Infiniti':      { body: '#B8C0E0', rim: '#D8DCF0' },
  'Jaguar':        { body: '#9CE07A', rim: '#FFE066', headlight: '#FFE066' },
  'Jeep':          { body: '#9CE07A', rim: '#D8E8B8', headlight: '#FFE066' },
  'Kia':           { body: '#FF7A6B', rim: '#F4DCD0' },
  'Lexus':         { body: '#D0CCE0', rim: '#E8E4F0' },
  'Lincoln':       { body: '#C8C8D8', rim: '#E0E0E8' },
  'Mazda':         { body: '#FF7A6B', rim: '#F4DCD0' },
  'Mercedes-Benz': { body: '#D8D8E0', rim: '#FFFFFF', headlight: '#E8F4FF' },
  'Mini':          { body: '#FF8A7A', rim: '#F4DCD0' },
  'Mitsubishi':    { body: '#FF8A7A', rim: '#F4DCD0' },
  'Nissan':        { body: '#FF8A7A', rim: '#F4DCD0' },
  'Porsche':       { body: '#FFE066', rim: '#FFF0A0', headlight: '#FFFFFF' },
  'Ram':           { body: '#5BB8FF', rim: '#D0E8FF' },
  'Rivian':        { body: '#5FE0B8', rim: '#A8F4D8', headlight: '#9FE5FF' },
  'Subaru':        { body: '#7BC8FF', rim: '#D8E8FF' },
  'Tesla':         { body: '#F0F0F0', rim: '#FFFFFF', headlight: '#9FE5FF' },
  'Toyota':        { body: '#FF8A7A', rim: '#F4DCD0', headlight: '#FFE8B8' },
  'Volkswagen':    { body: '#7BC8FF', rim: '#D8E8FF' },
  'Volvo':         { body: '#9CC8FF', rim: '#D8E8FF' },
}

export const BRAND_TAGLINES = {
  'Acura':         'Precision crafted performance',
  'Alfa Romeo':    'La meccanica delle emozioni',
  'Audi':          'Vorsprung durch Technik',
  'BMW':           'The Ultimate Driving Machine',
  'Buick':         'The art of American luxury',
  'Cadillac':      'Dare greatly',
  'Chevrolet':     'Find new roads',
  'Chrysler':      'Imported from Detroit',
  'Dodge':         'Domestic. Not domesticated.',
  'Ferrari':       'The art of pure power',
  'Fiat':          'Made in Italy, loved worldwide',
  'Ford':          'Built Ford Tough',
  'GMC':           'Professional grade',
  'Genesis':       'Genesis of inspiration',
  'Honda':         'The power of dreams',
  'Hyundai':       'New thinking, new possibilities',
  'Infiniti':      'Inspired performance',
  'Jaguar':        'Grace. Space. Pace.',
  'Jeep':          'Go anywhere, do anything',
  'Kia':           'Movement that inspires',
  'Lexus':         'Experience amazing',
  'Lincoln':       'Quiet luxury',
  'Mazda':         'Feel alive',
  'Mercedes-Benz': 'The best or nothing',
  'Mini':          'Not normal',
  'Mitsubishi':    'Drive your ambition',
  'Nissan':        'Innovation that excites',
  'Porsche':       'There is no substitute',
  'Ram':           'Guts. Glory. Ram.',
  'Rivian':        'Electric adventure awaits',
  'Subaru':        "Love. It's what makes a Subaru",
  'Tesla':         'Accelerating sustainable energy',
  'Toyota':        "Let's go places",
  'Volkswagen':    'Das Auto',
  'Volvo':         'For life',
}

export function getPal(make) {
  const brand = BRAND_PALETTE[make] || {}
  return { ...DEFAULT_PAL, ...brand }
}

const STROKE_W = 3

export function Wheel({ cx, cy, r = 15, pal = DEFAULT_PAL }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={pal.body} strokeWidth={STROKE_W} />
      <g className="wheel-rim-inner">
        <circle cx={cx} cy={cy} r={r * 0.5} fill={pal.body} />
        <circle cx={cx} cy={cy} r={r * 0.22} fill={pal.rim} />
        <rect x={cx - 0.8} y={cy - r * 0.45} width="1.6" height={r * 0.9} fill={pal.rim} opacity="0.55" />
        <rect x={cx - r * 0.45} y={cy - 0.8} width={r * 0.9} height="1.6" fill={pal.rim} opacity="0.55" />
      </g>
    </g>
  )
}

export function EVBolt({ x, y }) {
  return (
    <g className="ev-bolt">
      <path
        d={`M${x} ${y+8} L${x+5} ${y} L${x+4} ${y+5} L${x+9} ${y+5} L${x+3} ${y+13} L${x+5} ${y+8} Z`}
        fill="none"
        stroke="#4FC3F7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  )
}

export function SedanSVG({ isEV, pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 260 120" fill="none" className="w-full">
      <ellipse cx="130" cy="114" rx="108" ry="3" fill={pal.shadow} />
      <path d="M 14 92 L 14 74 C 14 70 18 68 24 68 L 78 68 L 92 40 C 96 34 102 32 110 32 L 158 32 C 168 32 174 36 178 44 L 188 68 L 232 68 C 240 68 244 72 244 78 L 244 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="78" y1="68" x2="188" y2="68" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="135" y1="32" x2="135" y2="68" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <circle cx="20" cy="76" r="2.4" fill={pal.headlight} className="headlight-fx" />
      <circle cx="238" cy="76" r="2.4" fill={pal.tail} />
      {isEV && <EVBolt x={108} y={50} />}
      <Wheel cx={56} cy={96} r={14} pal={pal} />
      <Wheel cx={204} cy={96} r={14} pal={pal} />
    </svg>
  )
}

export function SUVSVG({ isEV, isLarge, pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 260 120" fill="none" className="w-full">
      <ellipse cx="130" cy="114" rx="110" ry="3" fill={pal.shadow} />
      <path d="M 14 92 L 14 68 C 14 64 18 62 24 62 L 64 62 C 70 36 80 28 100 26 L 174 26 C 188 28 196 36 200 62 L 232 62 C 240 62 244 66 244 72 L 244 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="64" y1="62" x2="200" y2="62" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="120" y1="26" x2="120" y2="62" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="160" y1="26" x2="160" y2="62" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      {isLarge && <line x1="100" y1="22" x2="180" y2="22" stroke={pal.body} strokeWidth={STROKE_W - 1} strokeLinecap="round" />}
      <circle cx="20" cy="72" r="2.4" fill={pal.headlight} className="headlight-fx" />
      <circle cx="238" cy="72" r="2.4" fill={pal.tail} />
      {isEV && <EVBolt x={108} y={42} />}
      <Wheel cx={56} cy={96} r={15} pal={pal} />
      <Wheel cx={204} cy={96} r={15} pal={pal} />
    </svg>
  )
}

export function TruckSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 260 120" fill="none" className="w-full">
      <ellipse cx="130" cy="114" rx="110" ry="3" fill={pal.shadow} />
      <path d="M 14 92 L 14 68 C 14 64 18 62 24 62 L 50 62 L 60 32 C 64 26 68 24 76 24 L 116 24 C 122 24 124 28 126 32 L 130 62 L 130 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 130 92 L 130 56 L 240 56 C 244 56 246 60 246 64 L 246 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="62" x2="126" y2="62" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="92" y1="24" x2="92" y2="62" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="130" y1="56" x2="130" y2="92" stroke={pal.body} strokeWidth={STROKE_W - 0.5} strokeLinecap="round" opacity="0.55" />
      <circle cx="20" cy="72" r="2.4" fill={pal.headlight} className="headlight-fx" />
      <circle cx="238" cy="68" r="2.4" fill={pal.tail} />
      <Wheel cx={50} cy={96} r={15} pal={pal} />
      <Wheel cx={210} cy={96} r={15} pal={pal} />
    </svg>
  )
}

export function SportsSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 260 120" fill="none" className="w-full">
      <ellipse cx="130" cy="114" rx="112" ry="3" fill={pal.shadow} />
      <path d="M 8 92 L 12 76 C 14 72 18 70 24 70 L 90 70 L 104 48 C 108 42 116 40 124 40 L 156 40 C 166 42 172 46 178 56 L 196 70 L 234 70 C 244 70 250 74 250 80 L 250 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="90" y1="70" x2="196" y2="70" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line className="speed-line" x1="14" y1="60" x2="44" y2="60" stroke={pal.body} strokeWidth="2" strokeLinecap="round" />
      <line className="speed-line" x1="8" y1="68" x2="38" y2="68" stroke={pal.body} strokeWidth="2" strokeLinecap="round" style={{ animationDelay: '0.12s' }} />
      <circle cx="16" cy="76" r="2.4" fill={pal.headlight} className="headlight-fx" />
      <circle cx="244" cy="76" r="2.4" fill={pal.tail} />
      <Wheel cx={58} cy={96} r={14} pal={pal} />
      <Wheel cx={204} cy={96} r={14} pal={pal} />
    </svg>
  )
}

export function MinivanSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 260 120" fill="none" className="w-full">
      <ellipse cx="130" cy="114" rx="108" ry="3" fill={pal.shadow} />
      <path d="M 14 92 L 14 64 C 14 60 18 58 24 58 L 56 58 C 60 32 70 22 90 22 L 188 22 C 200 22 206 32 208 58 L 232 58 C 240 58 244 62 244 68 L 244 92"
        stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="56" y1="58" x2="208" y2="58" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="96" y1="22" x2="96" y2="58" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="142" y1="22" x2="142" y2="58" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="186" y1="22" x2="186" y2="58" stroke={pal.body} strokeWidth={STROKE_W} strokeLinecap="round" />
      <circle cx="20" cy="68" r="2.4" fill={pal.headlight} className="headlight-fx" />
      <circle cx="238" cy="68" r="2.4" fill={pal.tail} />
      <Wheel cx={56} cy={96} r={15} pal={pal} />
      <Wheel cx={204} cy={96} r={15} pal={pal} />
    </svg>
  )
}

// Convenience renderer: pick the right body shape by carType string
export function CarSilhouette({ carType, isEV, pal }) {
  const isLarge = carType === 'suv_large' || carType === 'suv_luxury'
  switch (carType) {
    case 'suv': case 'suv_large': case 'suv_luxury': case 'ev_suv':
      return <SUVSVG isEV={isEV} isLarge={isLarge} pal={pal} />
    case 'truck':   return <TruckSVG pal={pal} />
    case 'sports':  return <SportsSVG pal={pal} />
    case 'minivan': return <MinivanSVG pal={pal} />
    default:        return <SedanSVG isEV={isEV} pal={pal} />
  }
}

// CarVisual — silhouette + make/model/tagline footer card. Drop-in replacement
// for the inline version that used to live in TCOCalculator.jsx.
export function CarVisual({ make, model, carType, isEV }) {
  const pal = getPal(make)
  const tagline = BRAND_TAGLINES[make]

  return (
    <div
      className="car-visual-wrap rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1f0838 0%,#0f0520 100%)' }}
    >
      <div className="px-6 pt-5 pb-2">
        <CarSilhouette carType={carType} isEV={isEV} pal={pal} />
      </div>
      <div className="px-5 py-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {make} {model}
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5 capitalize">
              {carType?.replace(/_/g, ' ')}
            </p>
          </div>
          {isEV && (
            <span
              className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded"
              style={{
                color: '#4FC3F7',
                background: 'rgba(64,196,255,0.1)',
                border: '1px solid rgba(64,196,255,0.3)',
              }}
            >
              ELECTRIC
            </span>
          )}
        </div>
        {tagline && (
          <p
            className="text-[10px] mt-1.5 italic"
            style={{ color: pal.body, opacity: 0.75 }}
          >
            "{tagline}"
          </p>
        )}
      </div>
    </div>
  )
}
