import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ResultCard from '../components/ResultCard'
import PaywallModal from '../components/PaywallModal'
import { useSubscription } from '../hooks/useSubscription'
import VEHICLES from '../data/vehicles.json'
import {
  BRAND_DEPRECIATION_MULT,
  SEGMENT_CURVES, SEGMENT_MAX_DEPR,
  HIGH_RETENTION, POOR_RETENTION,
  classifySegment, applyModelAdjustments, estimateCurrentValue,
  INSURANCE_BASE_RATE, INSURANCE_VALUE_BRACKETS, INSURANCE_BRAND_MULT, STATE_INS_BASE,
  estimateInsurance,
  MAINT_BRAND_MULT, MAINT_LUXURY_MAKES, MAINT_PREMIUM_MAKES, MAINT_ECONOMY_MAKES,
  determineMaintTier, MAINT_TIER_COSTS, LABOR_RATE, generateMaintenanceServices,
  STATE_FUEL_PRICES, STATE_ELEC_RATES,
  getPublicChargingRate, getEffectiveElecRate, computeAnnualFuel,
  STATE_REG_FEE, STATE_VLF, computeAnnualRegistration,
  ZIP_RANGES, zipToState, resolveLocation,
} from '../utils/vehicleCosts'


// ── Loan math ────────────────────────────────────────
function calculateLoan({ price, downPayment, loanTermMonths, annualRatePercent, ownershipYears }) {
  const loanAmount = price - downPayment
  const r = annualRatePercent / 12 / 100
  const n = loanTermMonths
  let monthlyPayment = 0
  if (r === 0) {
    monthlyPayment = loanAmount / n
  } else {
    monthlyPayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }
  const totalPaid = monthlyPayment * n
  const totalInterestPaid = totalPaid - loanAmount
  const effectiveMonths = Math.min(ownershipYears * 12, n)
  const trueAnnualCost = (monthlyPayment * effectiveMonths) / ownershipYears
  return { loanAmount, monthlyPayment, totalInterestPaid, totalCostOfLoan: totalPaid, trueAnnualCost }
}

// ── Lease math ────────────────────────────────────────
// moneyFactor = APR / 2400 (standard industry conversion)
function calculateLease({ msrp, capCostReduction, acquisitionFee, leaseTermMonths, aprPercent, residualPct }) {
  const capCost = msrp - capCostReduction + acquisitionFee
  const residualValue = msrp * (residualPct / 100)
  const moneyFactor = aprPercent / 2400
  const depreciationFee = (capCost - residualValue) / leaseTermMonths
  const financeCharge = (capCost + residualValue) * moneyFactor
  const monthlyPayment = depreciationFee + financeCharge
  const totalLeaseCost = monthlyPayment * leaseTermMonths + capCostReduction
  const annualLeaseCost = monthlyPayment * 12
  return { monthlyPayment, totalLeaseCost, annualLeaseCost, residualValue, capCost }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

// ── Vehicle data helpers ──────────────────────────────
const MAKES = Object.keys(VEHICLES).sort()

// Latest model year present anywhere in the database — used as the lease year filter
const LEASE_YEAR = String(Math.max(
  ...Object.values(VEHICLES).flatMap(makeData =>
    Object.values(makeData).flatMap(modelData =>
      Object.keys(modelData.trims_by_year).map(Number)
    )
  )
))

function getModels(make)          { return make ? Object.keys(VEHICLES[make] ?? {}).sort() : [] }
function getModelData(make, model){ return VEHICLES[make]?.[model] ?? null }

// In lease mode only show models that have trims for the latest database year
function getLeasableModels(make) {
  if (!make) return []
  return Object.keys(VEHICLES[make] ?? {}).filter(
    model => Object.keys(VEHICLES[make][model]?.trims_by_year ?? {}).includes(LEASE_YEAR)
  ).sort()
}

function getAvailableYears(make, model) {
  const d = getModelData(make, model)
  if (!d) return []
  return Object.keys(d.trims_by_year).sort((a, b) => b - a) // newest first
}

function getTrims(make, model, year) {
  const d = getModelData(make, model)
  if (!d || !year) return {}
  return d.trims_by_year[year] ?? {}
}

// ── Car SVG silhouettes ───────────────────────────────
const DEFAULT_PAL = {
  body:       '#191921',
  stroke:     '#2a2a3a',
  glass:      'rgba(100,180,255,0.10)',
  glassEdge:  'rgba(120,190,255,0.28)',
  wheelOuter: '#0e0e16',
  rim:        '#22223a',
  hub:        '#2e2e50',
  spoke:      '#1a1a30',
  headlight:  '#FFB800',
  tail:       '#ff3333',
  shadow:     'rgba(0,0,0,0.45)',
}

const BRAND_PALETTE = {
  'Acura':         { body: '#162240', stroke: '#2A3A6A', rim: '#3A5A7A' },
  'Alfa Romeo':    { body: '#8B1422', stroke: '#6A0F1A', rim: '#C8C8C8', headlight: '#FFEE00' },
  'Audi':          { body: '#2A2A2A', stroke: '#3E3E3E', rim: '#C8C8C8' },
  'BMW':           { body: '#14285C', stroke: '#1E3A80', rim: '#C0C8D4', headlight: '#C0DDFF' },
  'Buick':         { body: '#142040', stroke: '#203062', rim: '#9898A8' },
  'Cadillac':      { body: '#140808', stroke: '#281010', rim: '#B89040' },
  'Chevrolet':     { body: '#0A1C5C', stroke: '#142E8C', rim: '#B8B8B8' },
  'Chrysler':      { body: '#141830', stroke: '#202850', rim: '#A8A8B8' },
  'Dodge':         { body: '#4A0800', stroke: '#780C00', rim: '#E06010', headlight: '#FF8800' },
  'Ferrari':       { body: '#990000', stroke: '#BB1111', rim: '#C8C8C8', headlight: '#FFEE00' },
  'Fiat':          { body: '#7A1010', stroke: '#9A1818', rim: '#C0C0C0' },
  'Ford':          { body: '#062050', stroke: '#0E3278', rim: '#B0B0B0' },
  'GMC':           { body: '#180C0C', stroke: '#2A1414', rim: '#AA2020' },
  'Genesis':       { body: '#161618', stroke: '#282830', rim: '#8080A0' },
  'Honda':         { body: '#220E0E', stroke: '#361616', rim: '#B0B0B0' },
  'Hyundai':       { body: '#061430', stroke: '#0E2050', rim: '#B0B0C0' },
  'Infiniti':      { body: '#141420', stroke: '#202030', rim: '#9090A8' },
  'Jaguar':        { body: '#08200E', stroke: '#143018', rim: '#B09030' },
  'Jeep':          { body: '#2A3820', stroke: '#3E502E', rim: '#786050' },
  'Kia':           { body: '#30080C', stroke: '#480E14', rim: '#C0C0C0' },
  'Lexus':         { body: '#141420', stroke: '#20202E', rim: '#9090A0' },
  'Lincoln':       { body: '#060610', stroke: '#101024', rim: '#B0B0C0' },
  'Mazda':         { body: '#680A14', stroke: '#960E1C', rim: '#C0C0C0' },
  'Mercedes-Benz': { body: '#1E1E1E', stroke: '#303030', rim: '#D0D0D0', headlight: '#DDEEFF' },
  'Mini':          { body: '#780808', stroke: '#980E0E', rim: '#C0C0C0' },
  'Mitsubishi':    { body: '#780606', stroke: '#980C0C', rim: '#C0C0C0' },
  'Nissan':        { body: '#200E0E', stroke: '#341616', rim: '#B8B8B8' },
  'Porsche':       { body: '#141410', stroke: '#201E18', rim: '#C8A030', headlight: '#FFFFFF' },
  'Ram':           { body: '#08183A', stroke: '#102A5C', rim: '#B0B0B0' },
  'Rivian':        { body: '#08220E', stroke: '#123218', rim: '#30A060', headlight: '#80FFD0' },
  'Subaru':        { body: '#081A46', stroke: '#102A6E', rim: '#B0B0C0' },
  'Tesla':         { body: '#180808', stroke: '#280C0C', rim: '#303030', headlight: '#80C8FF' },
  'Toyota':        { body: '#220808', stroke: '#361010', rim: '#B0B0B0' },
  'Volkswagen':    { body: '#06163A', stroke: '#0E2458', rim: '#C0C0C0' },
  'Volvo':         { body: '#081632', stroke: '#10244E', rim: '#B0B0C0' },
}

const BRAND_TAGLINES = {
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

function getPal(make) {
  const brand = BRAND_PALETTE[make] || {}
  return { ...DEFAULT_PAL, ...brand }
}

function Wheel({ cx, cy, r = 26, pal = DEFAULT_PAL }) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return (
      <line key={i}
        x1={cx} y1={cy}
        x2={cx + (r - 6) * Math.cos(a)}
        y2={cy + (r - 6) * Math.sin(a)}
        stroke={pal.spoke} strokeWidth="2"
      />
    )
  })
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={pal.wheelOuter} stroke={pal.stroke} strokeWidth="1.5" />
      <g className="wheel-rim-inner">
        <circle cx={cx} cy={cy} r={r - 6} fill={pal.rim} />
        {spokes}
        <circle cx={cx} cy={cy} r={6} fill={pal.hub} />
        <circle cx={cx} cy={cy} r={3} fill={pal.stroke} />
      </g>
    </g>
  )
}

function EVBolt({ x, y }) {
  return (
    <g className="ev-bolt">
      <rect x={x} y={y} width="36" height="16" rx="5"
        fill="rgba(64,196,255,0.15)" stroke="rgba(64,196,255,0.5)" strokeWidth="1" />
      <path d={`M${x+10} ${y+12} L${x+16} ${y+4} L${x+19} ${y+9} L${x+26} ${y+4} L${x+20} ${y+12} L${x+17} ${y+7} Z`}
        fill="#4FC3F7" />
      <text x={x + 30} y={y + 11} textAnchor="middle" fontSize="6"
        fontWeight="bold" fill="#4FC3F7" fontFamily="monospace">EV</text>
    </g>
  )
}

function SedanSVG({ isEV, pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="198" ry="8" fill={pal.shadow} />
      <path d="M54 142 C54 127 65 113 82 105 C99 97 120 94 144 93 C163 93 176 79 190 67 C202 56 220 50 242 50 L272 50 C294 50 313 57 331 70 C349 83 367 93 396 99 C417 104 433 115 437 130 L438 142 Z"
        fill={pal.body} stroke={pal.stroke} strokeWidth="1.5" />
      <path d="M194 68 C206 56 223 51 244 51 L271 51 C292 51 311 58 329 71 C345 83 361 92 390 99 C370 100 345 100 328 100 L197 100 C195 86 194 76 194 68 Z"
        fill={pal.glass} stroke={pal.glassEdge} strokeWidth="1" />
      <rect x="55" y="118" width="13" height="7" rx="3" fill={pal.headlight} opacity="0.9" className="headlight-fx" />
      <rect x="55" y="128" width="9"  height="4" rx="2" fill={pal.headlight} opacity="0.35" />
      <rect x="432" y="116" width="11" height="9" rx="3" fill={pal.tail} opacity="0.85" />
      <line x1="258" y1="100" x2="255" y2="142" stroke={pal.stroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} pal={pal} />
      <Wheel cx={362} cy={154} pal={pal} />
      {isEV && <EVBolt x={186} y={120} />}
    </svg>
  )
}

function SUVSVG({ isEV, isLarge, pal = DEFAULT_PAL }) {
  const roofY = isLarge ? 36 : 41
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="200" ry="8" fill={pal.shadow} />
      <path
        d={`M50 142 C50 126 62 112 79 104 C96 96 120 92 152 91 C166 91 175 ${roofY+33} 183 ${roofY+21} C191 ${roofY+11} 207 ${roofY} 229 ${roofY} L279 ${roofY} C301 ${roofY} 320 ${roofY+9} 336 ${roofY+22} C350 ${roofY+34} 368 90 400 96 C422 100 440 112 443 128 L443 142 Z`}
        fill={pal.body} stroke={pal.stroke} strokeWidth="1.5"
      />
      <path
        d={`M187 ${roofY+22} C195 ${roofY+11} 210 ${roofY+1} 231 ${roofY+1} L278 ${roofY+1} C298 ${roofY+1} 316 ${roofY+10} 332 ${roofY+23} C346 ${roofY+35} 362 89 392 96 C374 97 348 97 325 97 L188 97 C187 83 187 73 187 ${roofY+22} Z`}
        fill={pal.glass} stroke={pal.glassEdge} strokeWidth="1"
      />
      <rect x="51" y="116" width="14" height="8" rx="3" fill={pal.headlight} opacity="0.9" className="headlight-fx" />
      <rect x="51" y="127" width="10" height="4" rx="2" fill={pal.headlight} opacity="0.35" />
      <rect x="437" y="113" width="12" height="11" rx="3" fill={pal.tail} opacity="0.85" />
      {isLarge && (
        <rect x="192" y={roofY - 4} width="148" height="3" rx="1.5"
          fill={pal.stroke} opacity="0.8" />
      )}
      <line x1="258" y1="97" x2="256" y2="142" stroke={pal.stroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} pal={pal} />
      <Wheel cx={368} cy={154} pal={pal} />
      {isEV && <EVBolt x={183} y={114} />}
    </svg>
  )
}

function TruckSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="202" ry="8" fill={pal.shadow} />
      <path d="M52 142 C52 126 63 112 80 104 C97 96 120 92 155 92 L155 62 C155 50 167 41 187 41 L248 41 C268 41 279 52 279 65 L282 82 L435 80 L438 88 C441 99 442 118 441 133 L441 142 Z"
        fill={pal.body} stroke={pal.stroke} strokeWidth="1.5" />
      <path d="M158 63 C158 52 168 42 187 42 L248 42 C267 42 275 52 275 65 L275 92 L158 92 Z"
        fill={pal.glass} stroke={pal.glassEdge} strokeWidth="1" />
      {[302, 330, 358, 386].map(x => (
        <rect key={x} x={x} y="81" width="6" height="8" rx="1" fill={pal.stroke} opacity="0.8" />
      ))}
      <line x1="432" y1="81" x2="432" y2="142" stroke={pal.stroke} strokeWidth="2" opacity="0.7" />
      <rect x="53" y="116" width="13" height="8" rx="3" fill={pal.headlight} opacity="0.9" className="headlight-fx" />
      <rect x="53" y="127" width="9"  height="4" rx="2" fill={pal.headlight} opacity="0.35" />
      <rect x="436" y="108" width="10" height="12" rx="3" fill={pal.tail} opacity="0.85" />
      <Wheel cx={115} cy={154} r={28} pal={pal} />
      <Wheel cx={378} cy={154} r={28} pal={pal} />
    </svg>
  )
}

function SportsSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="210" ry="7" fill={pal.shadow} />
      <path d="M42 146 C42 134 54 122 70 114 C86 106 112 102 148 101 C168 101 183 91 198 79 C212 68 232 62 258 60 L295 60 C321 60 342 68 360 82 C377 95 406 104 432 110 C444 113 450 125 449 138 L449 146 Z"
        fill={pal.body} stroke={pal.stroke} strokeWidth="1.5" />
      <path d="M202 80 C216 69 235 62 259 61 L294 61 C318 61 338 69 356 82 C372 94 398 104 426 110 C408 111 381 111 360 111 L202 111 C202 97 202 87 202 80 Z"
        fill={pal.glass} stroke={pal.glassEdge} strokeWidth="1" />
      {/* Speed lines — animate on hover via CSS */}
      <line className="speed-line" x1="52" y1="118" x2="80" y2="118" stroke={pal.headlight} strokeWidth="1.5" opacity="0.7" />
      <line className="speed-line" x1="46" y1="124" x2="78" y2="124" stroke={pal.headlight} strokeWidth="1" opacity="0.5" style={{ animationDelay: '0.1s' }} />
      <line className="speed-line" x1="58" y1="130" x2="82" y2="130" stroke={pal.headlight} strokeWidth="0.8" opacity="0.35" style={{ animationDelay: '0.2s' }} />
      <line x1="135" y1="102" x2="148" y2="116" stroke={pal.stroke} strokeWidth="1.5" opacity="0.6" />
      <line x1="125" y1="105" x2="138" y2="119" stroke={pal.stroke} strokeWidth="1.5" opacity="0.4" />
      <rect x="90" y="138" width="290" height="4" rx="2" fill={pal.stroke} opacity="0.6" />
      <rect x="43" y="122" width="16" height="6" rx="2" fill={pal.headlight} opacity="0.95" className="headlight-fx" />
      <rect x="43" y="131" width="20" height="3" rx="1.5" fill={pal.headlight} opacity="0.3" />
      <rect x="433" y="116" width="18" height="6" rx="2" fill={pal.tail} opacity="0.9" />
      <rect x="435" y="124" width="14" height="3" rx="1.5" fill={pal.tail} opacity="0.4" />
      <Wheel cx={122} cy={154} r={28} pal={pal} />
      <Wheel cx={372} cy={154} r={28} pal={pal} />
    </svg>
  )
}

function MinivanSVG({ pal = DEFAULT_PAL }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="196" ry="8" fill={pal.shadow} />
      <path d="M48 142 C48 126 60 112 78 104 C95 96 120 92 155 92 L160 50 C161 40 170 32 190 32 L312 32 C332 32 343 40 344 50 L348 92 C370 92 398 98 420 107 C434 112 445 124 446 135 L446 142 Z"
        fill={pal.body} stroke={pal.stroke} strokeWidth="1.5" />
      <path d="M163 51 C164 41 172 33 190 33 L312 33 C330 33 340 41 341 51 L340 92 L164 92 Z"
        fill={pal.glass} stroke={pal.glassEdge} strokeWidth="1" />
      <line x1="264" y1="92" x2="262" y2="142" stroke={pal.stroke} strokeWidth="2" opacity="0.65" />
      <line x1="198" y1="92" x2="196" y2="142" stroke={pal.stroke} strokeWidth="1.5" opacity="0.5" />
      <rect x="272" y="118" width="14" height="4" rx="2" fill={pal.stroke} opacity="0.9" />
      <rect x="49" y="114" width="13" height="9" rx="3" fill={pal.headlight} opacity="0.9" className="headlight-fx" />
      <rect x="49" y="125" width="9"  height="4" rx="2" fill={pal.headlight} opacity="0.35" />
      <rect x="440" y="110" width="11" height="13" rx="3" fill={pal.tail} opacity="0.85" />
      <Wheel cx={118} cy={154} pal={pal} />
      <Wheel cx={364} cy={154} pal={pal} />
    </svg>
  )
}

function CarVisual({ make, model, carType, isEV }) {
  const pal = getPal(make)
  const isLarge = carType === 'suv_large' || carType === 'suv_luxury'
  const tagline = BRAND_TAGLINES[make]

  const visual = (() => {
    switch (carType) {
      case 'suv': case 'suv_large': case 'suv_luxury': case 'ev_suv':
        return <SUVSVG isEV={isEV} isLarge={isLarge} pal={pal} />
      case 'truck':   return <TruckSVG pal={pal} />
      case 'sports':  return <SportsSVG pal={pal} />
      case 'minivan': return <MinivanSVG pal={pal} />
      default:        return <SedanSVG isEV={isEV} pal={pal} />
    }
  })()

  return (
    <div className="car-visual-wrap rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1f0838 0%,#0f0520 100%)' }}>
      <div className="px-6 pt-5 pb-2">{visual}</div>
      <div className="px-5 py-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{make} {model}</p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5 capitalize">
              {carType?.replace(/_/g, ' ')}
            </p>
          </div>
          {isEV && (
            <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded"
              style={{ color:'#4FC3F7', background:'rgba(64,196,255,0.1)', border:'1px solid rgba(64,196,255,0.3)' }}>
              ELECTRIC
            </span>
          )}
        </div>
        {tagline && (
          <p className="text-[10px] mt-1.5 italic"
            style={{ color: pal.headlight !== DEFAULT_PAL.headlight ? pal.headlight : 'var(--accent)', opacity: 0.7 }}>
            "{tagline}"
          </p>
        )}
      </div>
    </div>
  )
}

// ── Vehicle specs panel ───────────────────────────────
function SpecsPanel({ specs, mpg, isEV }) {
  if (!specs && !mpg) return null

  const items = []
  if (specs?.horsepower) items.push({ label: 'Horsepower', value: `${specs.horsepower} hp` })
  if (specs?.seats)       items.push({ label: 'Seats',     value: `${specs.seats} seats` })
  if (specs?.cargo_cu_ft) items.push({ label: 'Cargo',     value: `${specs.cargo_cu_ft} cu ft` })

  if (mpg) {
    if (mpg.mpge_combined) {
      items.push({ label: 'Efficiency', value: `${mpg.mpge_combined} MPGe` })
    } else if (mpg.combined) {
      items.push({ label: 'MPG (comb.)', value: `${mpg.combined} mpg` })
      if (mpg.city && mpg.highway)
        items.push({ label: 'City / Hwy', value: `${mpg.city} / ${mpg.highway}` })
    }
  }

  if (!items.length) return null

  return (
    <div className="rounded-xl border border-[var(--border)] p-4"
      style={{ background:'var(--surface)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Vehicle Specs
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
            <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Maintenance breakdown panel ───────────────────────
function MaintenanceBreakdown({ isEV, annualMileage, segment, make }) {
  const services = generateMaintenanceServices(isEV, annualMileage, segment, make)
  return (
    <div className="px-4 pb-3 pt-2 border-t border-[var(--border)]"
      style={{ background: 'rgba(0,0,0,0.25)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
        Planned services
      </p>
      <div className="flex flex-col gap-1">
        {services.map(({ name, detail, annual }) => (
          <div key={name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white/75 truncate">{name}</span>
              <span className="text-[var(--text-muted)] opacity-70 shrink-0">{detail}</span>
            </div>
            <span className="text-white/60 font-mono ml-2 shrink-0">{annual > 0 ? `$${annual}` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────
function SliderInput({ label, value, onChange, min, max, step, prefix = '', suffix = '', inputMin, inputMax }) {
  const handleSlider = useCallback(e => onChange(Number(e.target.value)), [onChange])
  const handleInput  = useCallback(e => {
    const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
    if (!isNaN(num)) onChange(num)
  }, [onChange])
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">{prefix}</span>}
          <input type="number" value={value} min={inputMin ?? min} max={inputMax ?? max} step={step}
            onChange={handleInput} className="input-field"
            style={{ paddingLeft: prefix ? '1.75rem' : '1rem', paddingRight: suffix ? '2.5rem' : '1rem' }} />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        onChange={handleSlider}
        style={{ background:`linear-gradient(to right,var(--accent) ${pct}%,var(--border) ${pct}%)` }} />
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="input-label">{label}</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))} className="input-field">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Vehicle picker ────────────────────────────────────
function VehiclePicker({ make, model, year, trim, onChange, onClear, freeLeft, isSubscribed, isLease }) {
  // Lease mode: only models with trims in the latest database year
  const models    = isLease ? getLeasableModels(make) : getModels(make)
  const allYears  = getAvailableYears(make, model)
  // Lease: pin to the latest database year only
  const years     = isLease && allYears.length > 0 ? [LEASE_YEAR] : allYears
  const trimsMap  = getTrims(make, model, year)
  const trimNames = Object.keys(trimsMap)

  return (
    <div className="flex flex-col gap-4">
      {/* Make */}
      <div className="flex flex-col gap-2">
        <label className="input-label">Make</label>
        <select className="input-field" value={make} onChange={e => onChange('make', e.target.value)}>
          <option value="">Select make…</option>
          {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Model */}
      {make && (
        <div className="flex flex-col gap-2">
          <label className="input-label">Model</label>
          <select className="input-field" value={model} onChange={e => onChange('model', e.target.value)}>
            <option value="">Select model…</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Year */}
      {model && (
        <div className="flex flex-col gap-2">
          <label className="input-label">Year</label>
          <select className="input-field" value={year} onChange={e => onChange('year', e.target.value)}>
            <option value="">Select year…</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Trim */}
      {year && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="input-label">Trim</label>
            {!isSubscribed && (
              freeLeft > 0
                ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: '#FFB800', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)' }}>
                    {freeLeft} free
                  </span>
                : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    🔒 locked
                  </span>
            )}
          </div>
          <select className="input-field" value={trim} onChange={e => onChange('trim', e.target.value)}>
            <option value="">Select trim…</option>
            {trimNames.map(t => (
              <option key={t} value={t}>{t} — {formatCurrency(trimsMap[t])}</option>
            ))}
          </select>
        </div>
      )}

      {/* Clear */}
      {make && (
        <button onClick={onClear}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-left w-fit">
          ✕ Clear selection
        </button>
      )}
    </div>
  )
}

// ── Terms & data-collection constants ─────────────────
const TERMS_VERSION       = '4.0.0'
const CALC_TRIGGER        = 6
const LS_TERMS_ACCEPTED   = 'cashpedal_terms_accepted'
const LS_TERMS_VERSION    = 'cashpedal_terms_version'
const LS_SESSION_ID       = 'cashpedal_session_id'
const LS_CALC_COUNT       = 'cashpedal_calculation_count'
const LS_USER_SUBMITTED   = 'cashpedal_user_data_submitted'
const LS_LAST_CALC        = 'cashpedal_last_calc'

// ── Paywall constants ─────────────────────────────────
const FREE_DETAILED_LIMIT  = 3
const LS_DETAILED_COUNT    = 'cashpedal_detailed_calc_count'

function getSessionId() {
  let sid = localStorage.getItem(LS_SESSION_ID)
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem(LS_SESSION_ID, sid)
  }
  return sid
}

// ── Terms Gate ────────────────────────────────────────
function TermsGate({ onAccepted }) {
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)
  const [saving, setSaving] = useState(false)

  const allChecked = check1 && check2 && check3

  async function handleAccept() {
    if (!allChecked) return
    setSaving(true)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: crypto.randomUUID(),
          session_id: getSessionId(),
          terms_version: TERMS_VERSION,
          disclaimers_acknowledged: check1,
          liability_acknowledged: check2,
          final_consent_given: check3,
        }),
      })
    } catch (e) {
      console.warn('[terms] consent save failed:', e)
    }
    localStorage.setItem(LS_TERMS_ACCEPTED, 'true')
    localStorage.setItem(LS_TERMS_VERSION, TERMS_VERSION)
    setSaving(false)
    onAccepted()
  }

  const checkboxes = [
    {
      checked: check1, onChange: setCheck1,
      label: 'I understand that CashPedal provides cost estimates for informational and educational purposes only. These are approximations and not guarantees.',
    },
    {
      checked: check2, onChange: setCheck2,
      label: 'I acknowledge the limitation of liability and assumption of risk. CashPedal is not liable for any decisions I make based on these estimates.',
    },
    {
      checked: check3, onChange: setCheck3,
      label: 'I have read, understood, and agree to be bound by the complete Terms and Conditions above, including the binding arbitration clause, class action waiver, and California governing law provisions (Sections 11–12).',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-start justify-center py-12 px-4">
      <div className="card w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            <span className="w-4 h-px bg-[var(--accent)]" /> CashPedal
          </div>
          <h1 className="font-display font-extrabold text-white text-2xl sm:text-3xl">Welcome to CashPedal</h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm">
            Please review and accept our Terms and Conditions to continue
          </p>
        </div>

        {/* Expandable full terms */}
        <details className="mb-6 rounded-xl border border-[var(--border)] overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--accent)] select-none hover:bg-[var(--surface-hover)] transition-colors">
            View Full Terms and Conditions
          </summary>
          <div className="px-4 pb-4 pt-2 max-h-60 overflow-y-auto text-[var(--text-muted)] text-xs space-y-3 border-t border-[var(--border)]">
            <p className="text-white font-semibold">Terms and Conditions — Version {TERMS_VERSION} — Last Updated: March 2026</p>
            <p className="text-[var(--text-muted)] italic">Governing State: California | Operator: Sole Proprietor d/b/a CashPedal</p>

            <p><strong className="text-white">1. Acceptance of Terms</strong><br />
            By accessing or using CashPedal.io ("the Service"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree, you must immediately stop using the Service. These Terms constitute a legally binding agreement governed exclusively by California law, regardless of where you are located.</p>

            <p><strong className="text-white">2. Operator Identity</strong><br />
            CashPedal.io is operated by a sole proprietor doing business under the trade name "CashPedal." No corporation, LLC, or other legal entity is implied. Use of this Service does not create any agency, partnership, or employment relationship.</p>

            <p><strong className="text-white">3. Eligibility</strong><br />
            This Service is intended for users who are at least 18 years of age and capable of entering into a legally binding contract. If you are under 18, you may not use the Service.</p>

            <p><strong className="text-white">4. Service Description</strong><br />
            CashPedal provides vehicle Total Cost of Ownership (TCO) calculations for general informational and educational purposes only. All outputs are computer-generated approximations based on statistical models and assumed variables. The Service does not account for your specific financial circumstances, vehicle condition, geographic market, driving habits, insurance history, credit profile, or other individual factors. Fuel prices, depreciation rates, insurance premiums, tax rates, financing terms, and maintenance costs fluctuate continuously. <strong className="text-white">Actual costs may differ materially from any estimate produced by the Service.</strong> No output from this Service should be treated as a prediction, guarantee, or professional assessment.</p>

            <p><strong className="text-white">5. Intellectual Property &amp; License</strong><br />
            All content, design, code, data, and output on CashPedal.io is owned by or licensed to the operator. You receive a limited, non-exclusive, revocable, non-transferable license to access and use the Service for personal, non-commercial informational purposes only. You may not reproduce, redistribute, resell, scrape, reverse-engineer, or commercially exploit any portion of the Service without prior written consent.</p>

            <p><strong className="text-white">6. Disclaimer of Warranties</strong><br />
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, COMPLETENESS, OR NON-INFRINGEMENT. We expressly disclaim any warranty that estimates will reflect actual costs, data inputs are error-free, or the Service will be uninterrupted or secure. This disclaimer applies to the fullest extent permitted by applicable law.</p>

            <p><strong className="text-white">7. Not Financial, Legal, or Professional Advice</strong><br />
            Nothing on CashPedal.io constitutes financial, investment, legal, tax, insurance, or professional advice of any kind. Use of the Service does not create any advisory, fiduciary, or professional relationship. All information is provided for educational and general reference purposes only. <strong className="text-white">Consult a licensed financial advisor, attorney, insurance professional, or other qualified expert before making any financial decision.</strong> Reliance on this Service is entirely at your own risk.</p>

            <p><strong className="text-white">8. Limitation of Liability</strong><br />
            The following limitations apply only to claims arising from ordinary negligence or breach of contract. Consistent with California Civil Code §1668, these limitations do not apply to claims arising from fraud, willful misconduct, or intentional torts.<br /><br />
            TO THE MAXIMUM EXTENT PERMITTED BY CALIFORNIA LAW: (a) CashPedal shall not be liable for any indirect, incidental, special, consequential, or exemplary damages, including loss of profits, loss of data, or any financial loss arising from your use of or reliance on the Service; (b) CashPedal shall not be liable for any vehicle purchase, lease, financing, or ownership decision made in reliance on the Service's estimates; (c) our total cumulative liability for any negligence or contract-based claim shall not exceed the greater of: (i) the total fees you paid in the 12 months preceding the claim, or (ii) five dollars ($5.00). If the Service was accessed at no charge, our maximum liability for such claims is zero ($0.00).</p>

            <p><strong className="text-white">9. Assumption of Risk</strong><br />
            By using the Service, you expressly acknowledge that: vehicle ownership and purchase decisions carry inherent and substantial financial risk; TCO estimates are mathematical approximations and not guarantees; input assumptions materially affect outputs and may not reflect your real-world situation; you have independently verified or will independently verify any material information before acting on it; and you are solely and exclusively responsible for all financial decisions you make.</p>

            <p><strong className="text-white">10. Indemnification</strong><br />
            You agree to defend, indemnify, and hold harmless the operator of CashPedal from and against any and all third-party claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or relating to: (a) your use of or access to the Service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) your violation of any right of a third party. This obligation survives termination.</p>

            <p><strong className="text-white">11. Dispute Resolution &amp; Arbitration</strong><br />
            <strong className="text-white">PLEASE READ CAREFULLY — AFFECTS YOUR LEGAL RIGHTS INCLUDING YOUR RIGHT TO A JURY TRIAL.</strong><br /><br />
            Except as provided below, any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively by binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Exceptions: either party may bring qualifying claims in California small claims court, or seek emergency injunctive relief to prevent irreparable harm.<br /><br />
            <strong className="text-white">CCPA Carve-Out:</strong> Nothing in this arbitration provision limits any rights or remedies available to you under the CCPA/CPRA to the extent such rights may not be waived by private contract.<br /><br />
            <strong className="text-white">CLASS ACTION WAIVER: YOU AND CASHPEDAL EACH AGREE THAT DISPUTES MAY ONLY BE BROUGHT IN YOUR OR OUR INDIVIDUAL CAPACITY. YOU WAIVE ANY RIGHT TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION OR REPRESENTATIVE PROCEEDING.</strong><br /><br />
            Opt-Out Right: You may opt out of arbitration within 30 days of first accepting these Terms by emailing support@cashpedal.io with subject "Arbitration Opt-Out." Arbitration Location: San Diego County, California, or remotely by mutual agreement.</p>

            <p><strong className="text-white">12. Governing Law &amp; Jurisdiction</strong><br />
            These Terms shall be governed by the laws of the State of California, without regard to conflict-of-law principles. To the extent any matter is not subject to arbitration, the parties irrevocably consent to the exclusive jurisdiction of state and federal courts in San Diego County, California.</p>

            <p><strong className="text-white">13. California Consumer Rights Notice (Cal. Civil Code §1789.3)</strong><br />
            The Service is provided free of charge. To file a complaint, contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs at: 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834 | Tel: (800) 952-5210.</p>

            <p><strong className="text-white">14. Prohibited Conduct</strong><br />
            You agree not to: use the Service to provide commercial financial advice to third parties; submit false or fraudulent inputs; attempt to reverse-engineer or extract proprietary models or code; use automated bots or scrapers to harvest content; or use the Service in any manner that violates applicable law.</p>

            <p><strong className="text-white">15. User-Generated Content &amp; Reviews</strong><br />
            Consistent with California Civil Code §1670.8, nothing in these Terms restricts your right to make truthful statements about your experience with the Service.</p>

            <p><strong className="text-white">16. Privacy &amp; CCPA Compliance</strong><br />
            We collect limited data as described in our Privacy Policy at cashpedal.io/privacy, including acceptance logs for legal compliance. We do not sell your personal information. California residents have rights under the CCPA/CPRA, including the right to know, delete, opt out, and non-discrimination. To exercise your rights: support@cashpedal.io.</p>

            <p><strong className="text-white">17. Modifications to Terms</strong><br />
            We reserve the right to modify these Terms at any time. Changes will be indicated by an updated version number and "Last Updated" date. Your continued use after any modification constitutes acceptance of the revised Terms.</p>

            <p><strong className="text-white">18. Termination</strong><br />
            We reserve the right to suspend or terminate your access at any time, with or without notice, for any violation of these Terms. Sections 7, 8, 10, 11, 12, and 15 survive termination.</p>

            <p><strong className="text-white">19. Severability</strong><br />
            If any provision is found invalid or unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, or severed. Remaining provisions continue in full force.</p>

            <p><strong className="text-white">20. Entire Agreement</strong><br />
            These Terms, together with the Privacy Policy at cashpedal.io/privacy, constitute the entire agreement between you and CashPedal with respect to the Service and supersede all prior agreements.</p>

            <p><strong className="text-white">21. No Waiver</strong><br />
            Failure by CashPedal to enforce any right or provision shall not constitute a waiver. Any waiver must be in writing and signed by the operator to be effective.</p>

            <p><strong className="text-white">22. Contact</strong><br />
            For questions regarding these Terms, privacy rights requests, or arbitration opt-outs: <strong>support@cashpedal.io</strong></p>
          </div>
        </details>

        <div className="h-px bg-[var(--border)] mb-6" />

        <p className="text-white font-semibold text-sm mb-4">
          Required Acknowledgments — check all boxes to proceed:
        </p>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3 mb-5">
          {checkboxes.map(({ checked, onChange, label }, i) => (
            <label key={i}
              className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
              style={{
                borderColor: checked ? 'rgba(255,184,0,0.4)' : 'var(--border)',
                background: checked ? 'rgba(255,184,0,0.04)' : 'var(--surface)',
              }}>
              <input
                type="checkbox" checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-sm text-[var(--text-muted)] leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        {!allChecked && (
          <p className="text-xs text-yellow-400 mb-4">
            Please check all three boxes above to accept the terms.
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={!allChecked || saving}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'I Accept These Terms — Continue to CashPedal'}
        </button>

        <p className="text-center text-[var(--text-muted)] text-xs mt-4">
          Questions? Contact <strong className="text-white">support@cashpedal.io</strong>
        </p>
      </div>
    </div>
  )
}

// ── User Data Collector Modal ─────────────────────────
function UserDataModal({ calcCount, onClose }) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState([])
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = []
    if (firstName.trim().length < 2) errs.push('Please enter a valid first name (at least 2 letters)')
    if (lastName.trim().length  < 2) errs.push('Please enter a valid last name (at least 2 letters)')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.push('Please enter a valid email address')
    if (errs.length) { setErrors(errs); return }

    setSaving(true)
    setErrors([])
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id:         crypto.randomUUID(),
          session_id:        getSessionId(),
          first_name:        firstName.trim(),
          last_name:         lastName.trim(),
          email:             email.trim().toLowerCase(),
          calculation_count: calcCount,
        }),
      })
    } catch (e) {
      console.warn('[user-data] save failed:', e)
    }
    localStorage.setItem(LS_USER_SUBMITTED, 'true')
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md">
        {done ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-white font-bold text-xl font-display">Thank you!</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">Your information has been saved.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display font-bold text-white text-xl">
                You're Making Smart Decisions!
              </h2>
              <p className="text-[var(--text-muted)] text-sm mt-2 leading-relaxed">
                You've completed <strong className="text-white">6 vehicle calculations</strong>!
                Share your contact info to get valuable insights from CashPedal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="input-label">First Name *</label>
                  <input className="input-field" value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John" maxLength={100} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="input-label">Last Name *</label>
                  <input className="input-field" value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe" maxLength={100} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="input-label">Email Address *</label>
                <input className="input-field" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john.doe@example.com" maxLength={255} />
              </div>

              {errors.length > 0 && (
                <div className="flex flex-col gap-1">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400">{err}</p>
                  ))}
                </div>
              )}

              <p className="text-center text-[var(--text-muted)] text-xs">
                Your information is secure and will never be sold to third parties.
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] transition-colors">
                  Skip
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary disabled:opacity-40">
                  {saving ? 'Saving…' : 'Submit & Continue'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Vehicle categories (used when no specific make/model is selected) ─────
// Each entry provides a SVG silhouette type, maintenance segment, and default MPG
const VEHICLE_CATEGORIES = [
  { value: 'sedan',    label: 'Sedan',                svgType: 'sedan',     segment: 'sedan',   mpg: 30,  mpge: null, isEV: false },
  { value: 'compact',  label: 'Compact / Crossover',  svgType: 'sedan',     segment: 'compact', mpg: 32,  mpge: null, isEV: false },
  { value: 'suv',      label: 'SUV',                  svgType: 'suv',       segment: 'suv',     mpg: 25,  mpge: null, isEV: false },
  { value: 'suv_large',label: 'Large SUV',            svgType: 'suv_large', segment: 'suv',     mpg: 18,  mpge: null, isEV: false },
  { value: 'truck',    label: 'Truck / Pickup',       svgType: 'truck',     segment: 'truck',   mpg: 20,  mpge: null, isEV: false },
  { value: 'minivan',  label: 'Minivan',              svgType: 'minivan',   segment: 'sedan',   mpg: 22,  mpge: null, isEV: false },
  { value: 'sports',   label: 'Sports Car',           svgType: 'sports',    segment: 'sports',  mpg: 25,  mpge: null, isEV: false },
  { value: 'luxury',   label: 'Luxury',               svgType: 'sedan',     segment: 'luxury',  mpg: 22,  mpge: null, isEV: false },
  { value: 'economy',  label: 'Economy / Subcompact', svgType: 'sedan',     segment: 'economy', mpg: 36,  mpge: null, isEV: false },
  { value: 'electric', label: 'Electric (EV)',        svgType: 'sedan',     segment: 'electric',mpg: null,mpge: 100,  isEV: true  },
]

const loanTermOptions = [
  { value: 24, label: '24 months (2 years)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 48, label: '48 months (4 years)' },
  { value: 60, label: '60 months (5 years)' },
  { value: 72, label: '72 months (6 years)' },
  { value: 84, label: '84 months (7 years)' },
]

const ownershipOptions = [
  { value: 1,  label: '1 year'   },
  { value: 2,  label: '2 years'  },
  { value: 3,  label: '3 years'  },
  { value: 4,  label: '4 years'  },
  { value: 5,  label: '5 years'  },
  { value: 7,  label: '7 years'  },
  { value: 10, label: '10 years' },
]

const leaseTermOptions = [
  { value: 24, label: '24 months (2 years)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 39, label: '39 months' },
  { value: 48, label: '48 months (4 years)' },
]

// ── Main page ─────────────────────────────────────────
export default function TCOCalculator() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSubscribed } = useSubscription()

  // ── Terms acceptance ──
  const [termsAccepted, setTermsAccepted] = useState(() =>
    localStorage.getItem(LS_TERMS_ACCEPTED) === 'true' &&
    localStorage.getItem(LS_TERMS_VERSION) === TERMS_VERSION
  )

  // ── User data collection ──
  const [calcCount, setCalcCount] = useState(() =>
    parseInt(localStorage.getItem(LS_CALC_COUNT) || '0', 10)
  )
  const [userDataSubmitted] = useState(() =>
    localStorage.getItem(LS_USER_SUBMITTED) === 'true'
  )
  const [showUserDataModal, setShowUserDataModal] = useState(false)
  const countIncrementedRef = useRef(false)

  // ── Detailed-calc paywall ──
  const [detailedCalcCount, setDetailedCalcCount] = useState(() =>
    parseInt(localStorage.getItem(LS_DETAILED_COUNT) || '0', 10)
  )
  const [showPaywall,  setShowPaywall]  = useState(false)

  // Returns true if the action is allowed; false if blocked (paywall shown).
  // Each call counts as one calculation — callers must guard against duplicate invocations.
  const checkDetailedLimit = useCallback(() => {
    if (isSubscribed) return true
    const next = detailedCalcCount + 1
    if (next > FREE_DETAILED_LIMIT) {
      setShowPaywall(true)
      return false
    }
    setDetailedCalcCount(next)
    localStorage.setItem(LS_DETAILED_COUNT, String(next))
    return true
  }, [isSubscribed, detailedCalcCount])

  // Increment visit count once per page load (after terms accepted)
  useEffect(() => {
    if (!termsAccepted || countIncrementedRef.current) return
    countIncrementedRef.current = true
    const newCount = calcCount + 1
    setCalcCount(newCount)
    localStorage.setItem(LS_CALC_COUNT, String(newCount))
    if (newCount >= CALC_TRIGGER && !userDataSubmitted) {
      setShowUserDataModal(true)
    }
  }, [termsAccepted]) // eslint-disable-line react-hooks/exhaustive-deps

  const [price, setPrice]           = useState(30000)
  const [downPayment, setDownPayment] = useState(5000)
  const [loanTerm, setLoanTerm]     = useState(60)
  const [rate, setRate]             = useState(6.5)
  const [ownershipYears, setOwnershipYears] = useState(5)

  // Annual operating costs (pre-filled with national averages)
  const [annualInsurance,    setAnnualInsurance]    = useState(2000)
  const [annualFuel,         setAnnualFuel]         = useState(2000)
  const [annualMaintenance,  setAnnualMaintenance]  = useState(1200)
  const [annualRegistration, setAnnualRegistration] = useState(300)

  const [selMake,  setSelMake]  = useState('')
  const [selModel, setSelModel] = useState('')
  const [selYear,  setSelYear]  = useState('')
  const [selTrim,  setSelTrim]  = useState('')

  // Location
  const [locationInput,  setLocationInput]  = useState('')
  const [resolvedState,  setResolvedState]  = useState(null)   // 2-letter state code
  const [locationLabel,  setLocationLabel]  = useState('')
  const [locationError,  setLocationError]  = useState('')
  // Operating costs mode
  const [customCosts,    setCustomCosts]    = useState(false)
  // Detailed estimates mode
  const [detailedMode,   setDetailedMode]   = useState(false)
  const [annualMileage,  setAnnualMileage]  = useState(12000)
  const [vehicleCategory,setVehicleCategory]= useState('')      // used when no make/model selected
  const [chargingStyle,  setChargingStyle]  = useState('home')  // 'home' | 'mixed' | 'public'
  const [customFuelPrice,setCustomFuelPrice]= useState('')      // empty = use state avg
  const [multiCarPolicy, setMultiCarPolicy] = useState(false)
  // Track original MSRP separately from price (which may be depreciation-adjusted)
  const [origMsrp,       setOrigMsrp]       = useState(null)

  // Finance mode: 'buy' | 'lease'
  const [financeMode,      setFinanceMode]      = useState('buy')
  // Lease-specific inputs
  const [leaseTerm,        setLeaseTerm]        = useState(36)
  const [leaseApr,         setLeaseApr]         = useState(3.0)
  const [residualPct,      setResidualPct]      = useState(55)
  const [capCostReduction, setCapCostReduction] = useState(0)
  const [acquisitionFee,   setAcquisitionFee]   = useState(795)

  // Restore last session when landing via ?resume=1
  useEffect(() => {
    if (searchParams.get('resume') !== '1') return
    try {
      const saved = JSON.parse(localStorage.getItem(LS_LAST_CALC) || 'null')
      if (!saved?.inputs) return
      const i = saved.inputs
      if (i.price        != null) setPrice(i.price)
      if (i.downPayment  != null) setDownPayment(i.downPayment)
      if (i.loanTerm     != null) setLoanTerm(i.loanTerm)
      if (i.rate         != null) setRate(i.rate)
      if (i.ownershipYears != null) setOwnershipYears(i.ownershipYears)
      if (i.selMake)  setSelMake(i.selMake)
      if (i.selModel) setSelModel(i.selModel)
      if (i.selYear)  setSelYear(i.selYear)
      if (i.selTrim)  setSelTrim(i.selTrim)
      if (i.financeMode) setFinanceMode(i.financeMode)
    } catch { /* ignore corrupt data */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived model data (type, specs, mpg, isEV)
  const modelData = useMemo(() => getModelData(selMake, selModel), [selMake, selModel])

  useEffect(() => {
    if (customCosts) return
    setAnnualInsurance(estimateInsurance(price, selMake||null, selModel||null, selYear||null, resolvedState||null, detailedMode && multiCarPolicy))
    const customOverride = detailedMode && customFuelPrice !== '' ? parseFloat(customFuelPrice) : null
    if (modelData) {
      // For EVs: use charging-style blended rate unless user has manually overridden it
      const fuelOverride = (modelData.is_ev && customOverride === null)
        ? getEffectiveElecRate(resolvedState, chargingStyle)
        : customOverride
      setAnnualFuel(computeAnnualFuel(modelData.is_ev, modelData.mpg?.combined, modelData.mpg?.mpge_combined, resolvedState, annualMileage, fuelOverride))
      if (detailedMode) {
        const seg = classifySegment(selMake||'', selModel||'')
        const services = generateMaintenanceServices(modelData.is_ev, annualMileage, seg, selMake)
        setAnnualMaintenance(services.reduce((s, x) => s + x.annual, 0))
      } else {
        setAnnualMaintenance(modelData.is_ev ? 700 : 1200)
      }
    } else {
      const catInfo = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
      const catIsEV = catInfo?.isEV ?? false
      const catMpg  = catInfo?.mpg  ?? 28
      const catMpge = catInfo?.mpge ?? null
      const fuelOverride = (catIsEV && customOverride === null)
        ? getEffectiveElecRate(resolvedState, chargingStyle)
        : customOverride
      setAnnualFuel(computeAnnualFuel(catIsEV, catMpg, catMpge, resolvedState, annualMileage, fuelOverride))
      if (detailedMode) {
        const catSeg = catInfo?.segment ?? 'sedan'
        const services = generateMaintenanceServices(catIsEV, annualMileage, catSeg, '')
        setAnnualMaintenance(services.reduce((s, x) => s + x.annual, 0))
      } else {
        setAnnualMaintenance(catIsEV ? 700 : 1200)
      }
    }
    const currentVal = (selYear && (selMake || selModel))
      ? estimateCurrentValue(price, selMake||null, selModel||null, Math.max(0, new Date().getFullYear() - parseInt(selYear)))
      : price
    setAnnualRegistration(computeAnnualRegistration(resolvedState, currentVal))
  }, [price, selMake, selModel, selYear, resolvedState, modelData, customCosts, detailedMode, multiCarPolicy, annualMileage, customFuelPrice, vehicleCategory, chargingStyle]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocationInput = useCallback((val) => {
    setLocationInput(val)
    setLocationError('')
    const resolved = resolveLocation(val)
    if (resolved) {
      setResolvedState(resolved.state)
      setLocationLabel(resolved.label)
    } else {
      setResolvedState(null)
      setLocationLabel('')
      if (val.trim().length >= 2 && !resolved) {
        setLocationError('Enter a 5-digit ZIP code or 2-letter state (e.g., 90210 or CA)')
      }
    }
  }, [])

  // Applies a trim selection — shared by explicit picks and auto-defaults
  const applyTrim = useCallback((make, model, year, trimName) => {
    const t = getTrims(make, model, year)
    if (!t[trimName]) return
    setSelTrim(trimName)
    const msrp = t[trimName]
    setOrigMsrp(msrp)
    const ageYrs = Math.max(0, new Date().getFullYear() - parseInt(year))
    const estimated = ageYrs > 0 ? estimateCurrentValue(msrp, make, model, ageYrs) : msrp
    setPrice(Math.round(estimated / 500) * 500)
  }, [])

  // Auto-selects the cheapest trim for a given make/model/year
  const autoSelectCheapestTrim = useCallback((make, model, year) => {
    const t = getTrims(make, model, year)
    const entries = Object.entries(t)
    if (entries.length === 0) return
    if (!checkDetailedLimit()) return
    const [cheapestName] = entries.reduce((a, b) => b[1] < a[1] ? b : a)
    applyTrim(make, model, year, cheapestName)
  }, [checkDetailedLimit, applyTrim])

  const handlePickerChange = useCallback((level, value) => {
    if (level === 'make') {
      setSelMake(value); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null); setVehicleCategory('')
    }
    if (level === 'model') {
      setSelModel(value); setSelYear(''); setSelTrim(''); setOrigMsrp(null)
      // Lease: auto-select the pinned year and cheapest trim
      if (financeMode === 'lease' && value) {
        setSelYear(LEASE_YEAR)
        autoSelectCheapestTrim(selMake, value, LEASE_YEAR)
      }
    }
    if (level === 'year') {
      setSelYear(value); setSelTrim(''); setOrigMsrp(null)
      // Auto-default to cheapest trim when year is chosen
      if (value) autoSelectCheapestTrim(selMake, selModel, value)
    }
    if (level === 'trim') {
      if (value !== selTrim && !checkDetailedLimit()) return
      applyTrim(selMake, selModel, selYear, value)
    }
  }, [financeMode, selMake, selModel, selYear, selTrim, checkDetailedLimit, applyTrim, autoSelectCheapestTrim])

  const handleClear = useCallback(() => {
    setSelMake(''); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null)
  }, [])

  const results = useMemo(() => calculateLoan({
    price, downPayment: Math.min(downPayment, price),
    loanTermMonths: loanTerm, annualRatePercent: rate, ownershipYears,
  }), [price, downPayment, loanTerm, rate, ownershipYears])

  const leaseResults = useMemo(() => calculateLease({
    msrp: price,
    capCostReduction: Math.min(capCostReduction, price),
    acquisitionFee,
    leaseTermMonths: leaseTerm,
    aprPercent: leaseApr,
    residualPct,
  }), [price, capCostReduction, acquisitionFee, leaseTerm, leaseApr, residualPct])

  const annualOperatingCost = annualInsurance + annualFuel + annualMaintenance + annualRegistration
  const totalAnnualCost = (financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost) + annualOperatingCost

  // For the insurance note: estimated current market value after depreciation
  const carAge            = selYear ? Math.max(0, new Date().getFullYear() - parseInt(selYear)) : 0
  const estimatedCarValue = selYear
    ? estimateCurrentValue(price, selMake || null, selModel || null, carAge)
    : price

  const safeDown = Math.min(downPayment, price)
  const usingMSRP = !!(selMake && selModel && selYear && selTrim)

  // Derived EV flag and charging rate — used across the render
  const catInfoForRender = !selMake ? VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory) : null
  const effIsEV = modelData ? modelData.is_ev : (catInfoForRender?.isEV ?? false)

  // Whether the detailed results are currently blocked by the paywall
  const isDetailBlocked = !isSubscribed && detailedCalcCount > FREE_DETAILED_LIMIT

  // Persist a snapshot for returning-user insights on the landing page.
  // Only save when the user has changed at least one input from defaults.
  useEffect(() => {
    const isDefault = price === 30000 && downPayment === 5000 && !selMake
    if (isDefault) return
    const snapshot = {
      vehicle: selMake && selModel
        ? [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ')
        : null,
      price,
      financeMode,
      monthlyPayment: financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment,
      totalAnnualCost,
      savedAt: new Date().toISOString(),
      inputs: { price, downPayment, loanTerm, rate, ownershipYears, selMake, selModel, selYear, selTrim, financeMode },
    }
    localStorage.setItem(LS_LAST_CALC, JSON.stringify(snapshot))
  }, [price, downPayment, loanTerm, rate, ownershipYears, selMake, selModel, selYear, selTrim, financeMode, results, leaseResults, totalAnnualCost]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save this TCO result to localStorage so the comparison page can import it
  function handleAddToComparison() {
    const futureAgeYrs = carAge + ownershipYears
    const futureValue  = origMsrp
      ? estimateCurrentValue(origMsrp, selMake || null, selModel || null, futureAgeYrs)
      : null
    const retentionPct = origMsrp && futureValue != null
      ? Math.round((futureValue / origMsrp) * 100)
      : null

    const leasePeriodYears = leaseTerm / 12
    const totalOwnership = financeMode === 'lease'
      ? leaseResults.totalLeaseCost + annualOperatingCost * leasePeriodYears
      : totalAnnualCost * ownershipYears

    const entry = {
      id:                crypto.randomUUID(),
      name:              selMake && selModel
        ? [selYear, selMake, selModel, selTrim].filter(Boolean).join(' ')
        : 'Custom Vehicle',
      addedAt:           new Date().toISOString(),
      // Finance mode
      isLease:           financeMode === 'lease',
      // Loan inputs (used when isLease === false)
      price,
      downPayment:       safeDown,
      loanTerm,
      rate,
      ownershipYears:    financeMode === 'lease' ? leasePeriodYears : ownershipYears,
      // Lease inputs (used when isLease === true)
      leaseMonthlyPayment: financeMode === 'lease' ? leaseResults.monthlyPayment : null,
      leaseTerm:           financeMode === 'lease' ? leaseTerm : null,
      // Finance results
      monthlyPayment:    financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment,
      totalInterest:     financeMode === 'lease' ? null : results.totalInterestPaid,
      totalCostOfLoan:   financeMode === 'lease' ? leaseResults.totalLeaseCost : results.totalCostOfLoan,
      trueAnnualCost:    financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost,
      // Operating costs
      annualInsurance,
      annualFuel,
      annualMaintenance,
      annualRegistration,
      totalAnnualCost,
      totalOwnershipCost: totalOwnership,
      // Vehicle identity
      make: selMake, model: selModel, year: selYear, trim: selTrim,
      // Specs (may be null for category-only or no-picker entries)
      mpgCombined:    modelData?.mpg?.combined ?? null,
      cargoSqFt:      modelData?.specs?.cargo_cu_ft ?? null,
      seats:          modelData?.specs?.seats ?? null,
      isEV:           effIsEV,
      // Value retention (not applicable for leases but keep for reference)
      futureValue,
      valueRetentionPct: financeMode === 'lease' ? null : retentionPct,
    }

    const existing = JSON.parse(localStorage.getItem('cashpedal_tco_for_comparison') || '[]')
    // Keep at most 5 entries (max comparison slots)
    const updated = [...existing.filter(e => e.id !== entry.id), entry].slice(-5)
    localStorage.setItem('cashpedal_tco_for_comparison', JSON.stringify(updated))
    navigate('/compare')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {!termsAccepted && <TermsGate onAccepted={() => setTermsAccepted(true)} />}
      {showUserDataModal && (
        <UserDataModal
          calcCount={calcCount}
          onClose={() => setShowUserDataModal(false)}
        />
      )}
      {showPaywall && (
        <PaywallModal
          feature="tco"
          usedCount={FREE_DETAILED_LIMIT}
          cancelPath="/tco"
          onUnlocked={() => setShowPaywall(false)}
        />
      )}
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Vehicle TCO Calculator
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1">
            Total Cost of Ownership
          </h1>
          <p className="anim-2 text-[var(--text-muted)] mt-2 text-base max-w-lg">
            Pick any vehicle from our database of 35 makes &amp; 266 models — or enter your own numbers.
          </p>
        </div>

        {/* Layout */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

            {/* ── Inputs ── */}
            <div className="card anim-3 flex flex-col gap-7">

              {/* Free vs Limited feature tier summary */}
              {!isSubscribed && (
                <div className="rounded-xl overflow-hidden text-xs border"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'var(--bg)' }}>
                  <div className="px-4 py-3 flex items-center gap-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ color: '#4ade80', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                      Free
                    </span>
                    <span className="text-[var(--text-muted)]">
                      Loan calculator · Operating cost estimates · Make / Model / Year lookup
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-3">
                    {detailedCalcCount >= FREE_DETAILED_LIMIT
                      ? <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
                          🔒 Locked
                        </span>
                      : <span className="shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ color: '#FFB800', background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)' }}>
                          {FREE_DETAILED_LIMIT - detailedCalcCount} of {FREE_DETAILED_LIMIT} free
                        </span>
                    }
                    <span className="text-[var(--text-muted)]">
                      Trim-specific MSRP &amp; depreciation · Detailed itemized cost breakdown
                      {detailedCalcCount >= FREE_DETAILED_LIMIT && (
                        <> — <a href="/subscribe" className="text-[var(--accent)] hover:underline font-semibold">Subscribe for unlimited</a></>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Your Location</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--accent)', border:'1px solid rgba(255,184,0,0.3)' }}>
                    Required
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-4">
                  Used for state-specific insurance rates, fuel prices, and registration fees.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field pr-24"
                      placeholder="ZIP code or state (e.g., 90210 or CA)"
                      value={locationInput}
                      onChange={e => handleLocationInput(e.target.value)}
                      maxLength={5}
                    />
                    {resolvedState && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ color:'var(--accent)', background:'rgba(255,184,0,0.1)', border:'1px solid rgba(255,184,0,0.25)' }}>
                        {locationLabel}
                      </span>
                    )}
                  </div>
                  {locationError && <p className="text-xs text-amber-400">{locationError}</p>}
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Buy / Lease toggle */}
              <div className="flex gap-1 p-1 rounded-lg"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {[
                  { value: 'buy',   label: 'Buy / Finance' },
                  { value: 'lease', label: 'Lease' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => {
                      setFinanceMode(opt.value)
                      // When switching to lease, enforce latest year if a model is already selected
                      if (opt.value === 'lease' && selMake && selModel) {
                        if (selYear !== LEASE_YEAR) {
                          setSelYear(LEASE_YEAR)
                          setSelTrim('')
                          setOrigMsrp(null)
                          autoSelectCheapestTrim(selMake, selModel, LEASE_YEAR)
                        }
                      }
                    }}
                    className="flex-1 py-1.5 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: financeMode === opt.value ? 'var(--accent)' : 'transparent',
                      color:      financeMode === opt.value ? '#000' : 'var(--text-muted)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Vehicle selector */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Select Your Vehicle</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                    Optional
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-5">
                  35 makes · 266 models · trims by year with MSRP, MPG &amp; specs.
                </p>
                <VehiclePicker
                  make={selMake} model={selModel} year={selYear} trim={selTrim}
                  onChange={handlePickerChange} onClear={handleClear}
                  freeLeft={Math.max(0, FREE_DETAILED_LIMIT - detailedCalcCount)}
                  isSubscribed={isSubscribed}
                  isLease={financeMode === 'lease'}
                />

                {/* Category picker — shown only when no make is selected */}
                {!selMake && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-2">
                    <label className="input-label">
                      No specific vehicle? Pick a category for default estimates
                    </label>
                    <select
                      className="input-field"
                      value={vehicleCategory}
                      onChange={e => setVehicleCategory(e.target.value)}
                    >
                      <option value="">Select category…</option>
                      {VEHICLE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {vehicleCategory && (() => {
                      const cat = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
                      return (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Using {cat.label} defaults —{' '}
                          {cat.isEV ? '100 MPGe (EV avg)' : `${cat.mpg} MPG avg`}
                        </p>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Financing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-white text-lg">Purchase &amp; Financing</h2>
                  {usingMSRP && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ color:'#FFB800', background:'rgba(255,184,0,0.08)', border:'1px solid rgba(255,184,0,0.2)' }}>
                      {origMsrp && carAge > 0 ? 'Est. Current Value' : 'Using MSRP'}
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-sm">
                  {financeMode === 'lease'
                    ? 'Lease inputs: MSRP, cap cost reduction, term, APR & residual.'
                    : 'Adjust any value — results update live.'}
                </p>
              </div>

              <SliderInput label={financeMode === 'lease' ? 'Vehicle MSRP' : 'Vehicle Purchase Price'} value={price} onChange={setPrice}
                min={5000} max={150000} step={500} prefix="$" />

              {origMsrp && carAge > 0 && financeMode === 'buy' && (
                <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                  Auto-set to estimated {carAge}-year depreciated value — original MSRP was{' '}
                  <span className="text-white">{formatCurrency(origMsrp)}</span>
                </p>
              )}

              {financeMode === 'buy' ? (
                <>
                  <SliderInput label="Down Payment" value={safeDown}
                    onChange={v => setDownPayment(Math.min(v, price))}
                    min={0} max={Math.min(price, 50000)} step={500} prefix="$" />

                  <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-muted)]">Loan amount</span>
                    <span className="font-display font-bold text-white text-lg">{formatCurrency(results.loanAmount)}</span>
                  </div>

                  <SelectInput label="Loan Term" value={loanTerm} onChange={setLoanTerm} options={loanTermOptions} />

                  <SliderInput label="Annual Interest Rate" value={rate} onChange={setRate}
                    min={0} max={25} step={0.1} suffix="%" inputMin={0} inputMax={25} />

                  <SelectInput label="Ownership Duration" value={ownershipYears}
                    onChange={setOwnershipYears} options={ownershipOptions} />
                </>
              ) : (
                <>
                  <SliderInput label="Cap Cost Reduction (upfront payment)"
                    value={Math.min(capCostReduction, price)}
                    onChange={v => setCapCostReduction(Math.min(v, price))}
                    min={0} max={Math.min(price, 20000)} step={250} prefix="$" />

                  <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                    Lowers your monthly payment but is not recovered at lease end
                  </p>

                  <SliderInput label="Acquisition Fee" value={acquisitionFee} onChange={setAcquisitionFee}
                    min={0} max={2000} step={25} prefix="$" />

                  <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                    Dealer/lender fee added to cap cost — typically $595–$995
                  </p>

                  <SelectInput label="Lease Term" value={leaseTerm} onChange={setLeaseTerm} options={leaseTermOptions} />

                  <SliderInput label="Money Factor (APR equivalent)" value={leaseApr} onChange={setLeaseApr}
                    min={0} max={15} step={0.1} suffix="%" inputMin={0} inputMax={15} />

                  <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                    Money factor = {(leaseApr / 2400).toFixed(5)} · Typical lease APR is 2–5%
                  </p>

                  <SliderInput label="Residual Value" value={residualPct} onChange={setResidualPct}
                    min={20} max={80} step={1} suffix="%" />

                  <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-muted)]">Residual amount</span>
                    <span className="font-display font-bold text-white text-lg">
                      {formatCurrency(price * residualPct / 100)}
                    </span>
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                    Vehicle value at lease end — typically 45–65% for 36-month leases
                  </p>

                  <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-sm text-[var(--text-muted)]">Capitalized cost</span>
                    <span className="font-display font-bold text-white text-lg">
                      {formatCurrency(leaseResults.capCost)}
                    </span>
                  </div>
                </>
              )}

              <div className="h-px bg-[var(--border)]" />

              {/* Annual Operating Costs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Annual Operating Costs</h2>
                  {resolvedState && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!detailedMode && !checkDetailedLimit()) return
                          setDetailedMode(d => !d)
                        }}
                        className="text-xs px-3 py-1 rounded-lg border transition-colors flex items-center gap-1.5"
                        style={{
                          borderColor: detailedMode ? 'rgba(255,184,0,0.5)' : 'var(--border)',
                          color: detailedMode ? 'var(--accent)' : 'var(--text-muted)',
                          background: detailedMode ? 'rgba(255,184,0,0.05)' : 'transparent',
                        }}>
                        {detailedMode ? 'Detailed ✓' : 'Detailed'}
                        {!isSubscribed && !detailedMode && (
                          detailedCalcCount >= FREE_DETAILED_LIMIT
                            ? <span style={{ color: '#f87171' }}>🔒</span>
                            : <span className="font-bold text-[10px]"
                                style={{ color: '#FFB800' }}>
                                {FREE_DETAILED_LIMIT - detailedCalcCount} free
                              </span>
                        )}
                      </button>
                      <button
                        onClick={() => setCustomCosts(c => !c)}
                        className="text-xs px-3 py-1 rounded-lg border transition-colors"
                        style={{
                          borderColor: customCosts ? 'var(--accent)' : 'var(--border)',
                          color: customCosts ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                        {customCosts ? 'Use estimates' : 'Customize'}
                      </button>
                    </div>
                  )}
                </div>
                {!resolvedState ? (
                  <p className="text-sm text-amber-400/80">
                    Enter your location above to see state-specific cost estimates.
                  </p>
                ) : (
                  <p className="text-[var(--text-muted)] text-sm">
                    {customCosts
                      ? 'Adjust any cost to match your situation.'
                      : (() => {
                          const catInfo = !selMake ? VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory) : null
                          const effIsEV = modelData ? modelData.is_ev : (catInfo?.isEV ?? false)
                          const effMpg  = modelData ? (modelData.mpg?.combined ?? 28) : (catInfo?.mpg ?? 28)
                          const mpgNote = effIsEV ? ' · EV' : ` · ${effMpg} MPG${catInfo && !modelData ? ' avg' : ''}`
                          return `${detailedMode ? 'Detailed estimates' : 'Estimated'} for ${resolvedState} · ${annualMileage.toLocaleString()} mi/yr${mpgNote}.`
                        })()}
                  </p>
                )}
              </div>

              {/* Annual miles slider — always visible when location is set */}
              {resolvedState && !customCosts && (
                <SliderInput
                  label="Annual Miles Driven"
                  value={annualMileage}
                  onChange={setAnnualMileage}
                  min={3000} max={30000} step={500} suffix=" mi"
                />
              )}

              {/* EV Charging Setup — shown whenever an EV or electric category is active */}
              {resolvedState && !customCosts && effIsEV && (
                <div className="rounded-xl border p-4 flex flex-col gap-4"
                  style={{ borderColor: 'rgba(96,200,255,0.25)', background: 'rgba(96,200,255,0.03)' }}>

                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#60c8ff' }}>⚡ EV Charging Setup</span>
                  </div>

                  {/* Rate display — home vs public */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Home rate · {resolvedState}</p>
                      <p className="text-white font-bold text-sm mt-0.5">
                        ${(STATE_ELEC_RATES[resolvedState] ?? 0.16).toFixed(2)}<span className="text-[var(--text-muted)] font-normal text-xs">/kWh</span>
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Residential avg</p>
                    </div>
                    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Public DCFC · {resolvedState}</p>
                      <p className="text-white font-bold text-sm mt-0.5">
                        ${getPublicChargingRate(resolvedState).toFixed(2)}<span className="text-[var(--text-muted)] font-normal text-xs">/kWh</span>
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">DC fast-charge est.</p>
                    </div>
                  </div>

                  {/* Charging style selector */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">Where do you primarily charge?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'home',   label: '100% Home',     sub: 'Garage / driveway' },
                        { value: 'mixed',  label: 'Home + Public', sub: '~80% home / 20% DCFC' },
                        { value: 'public', label: 'All Public',    sub: 'No home charger' },
                      ].map(opt => (
                        <button key={opt.value}
                          onClick={() => setChargingStyle(opt.value)}
                          className="rounded-lg border px-2 py-2.5 text-center transition-all"
                          style={{
                            borderColor: chargingStyle === opt.value ? 'rgba(96,200,255,0.6)' : 'var(--border)',
                            background:  chargingStyle === opt.value ? 'rgba(96,200,255,0.12)' : 'transparent',
                          }}>
                          <p className="text-xs font-semibold"
                            style={{ color: chargingStyle === opt.value ? '#60c8ff' : 'white' }}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Effective blended rate */}
                  <div className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: 'rgba(96,200,255,0.07)' }}>
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Effective charging rate</span>
                      {chargingStyle === 'mixed' && (
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                          (${(STATE_ELEC_RATES[resolvedState] ?? 0.16).toFixed(2)} × 80% + ${getPublicChargingRate(resolvedState).toFixed(2)} × 20%)
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#60c8ff' }}>
                      ${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)}/kWh
                    </span>
                  </div>
                </div>
              )}

              {/* Detailed inputs panel */}
              {resolvedState && detailedMode && !customCosts && (
                <div className="rounded-xl border p-4 flex flex-col gap-5"
                  style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.02)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                    Detailed Parameters
                  </p>

                  {/* Custom fuel/electricity price */}
                  <div className="flex flex-col gap-2">
                    <label className="input-label">
                      {effIsEV ? 'Override Electricity Rate ($/kWh)' : 'Fuel Price ($/gallon)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none select-none">$</span>
                        <input
                          type="number"
                          className="input-field pl-7"
                          placeholder={effIsEV
                            ? `${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)} (${{ home: 'home', mixed: 'blended', public: 'public DCFC' }[chargingStyle]})`
                            : `${STATE_FUEL_PRICES[resolvedState] ?? 3.50} (${resolvedState} avg)`}
                          value={customFuelPrice}
                          onChange={e => setCustomFuelPrice(e.target.value)}
                          step={effIsEV ? 0.001 : 0.05}
                          min={0}
                        />
                      </div>
                      {customFuelPrice && (
                        <button onClick={() => setCustomFuelPrice('')}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0">
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {effIsEV
                        ? `Leave blank to use charging-style rate ($${getEffectiveElecRate(resolvedState, chargingStyle).toFixed(3)}/kWh)`
                        : `Leave blank to use ${resolvedState} average ($${STATE_FUEL_PRICES[resolvedState] ?? 3.50}/gal)`}
                    </p>
                  </div>

                  {/* Multi-car policy toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Multi-Car Policy</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        ~15% discount · insuring 2+ vehicles on same policy
                      </p>
                    </div>
                    <button
                      onClick={() => setMultiCarPolicy(m => !m)}
                      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                      style={{ background: multiCarPolicy ? 'var(--accent)' : 'var(--border)' }}>
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                        style={{ left: multiCarPolicy ? '22px' : '2px', background: multiCarPolicy ? '#000' : '#555' }}
                      />
                    </button>
                  </div>
                </div>
              )}

              {resolvedState && !customCosts && (() => {
                const activeElecRate = (customFuelPrice && detailedMode)
                  ? parseFloat(customFuelPrice)
                  : getEffectiveElecRate(resolvedState, chargingStyle)
                const chargingStyleLabel = { home: 'home', mixed: 'home+public', public: 'public DCFC' }[chargingStyle]
                const fuelNote = effIsEV
                  ? `$${activeElecRate.toFixed(3)}/kWh · ${(customFuelPrice && detailedMode) ? 'custom' : chargingStyleLabel}`
                  : `${(customFuelPrice && detailedMode) ? `$${customFuelPrice}` : `$${STATE_FUEL_PRICES[resolvedState] ?? 3.50}`}/gal`
                const insNote = `${resolvedState} · ${selMake || 'avg'}${detailedMode && multiCarPolicy ? ' · multi-car' : ''}`
                const maintNote = detailedMode
                  ? (effIsEV ? 'EV · itemized' : 'gas · itemized')
                  : (effIsEV ? 'EV avg' : 'gas avg')
                const maintenanceSegment = selMake
                  ? classifySegment(selMake, selModel||'')
                  : (catInfoForRender?.segment ?? 'sedan')

                return (
                  <div className="rounded-xl border divide-y"
                    style={{ borderColor:'var(--border)', background:'var(--surface)' }}>
                    {[
                      { key: 'ins',  label: 'Insurance',                                   value: annualInsurance,    note: insNote },
                      { key: 'fuel', label: effIsEV ? 'Charging' : 'Fuel',                  value: annualFuel,         note: fuelNote },
                      { key: 'maint',label: 'Maintenance & Repairs',                        value: annualMaintenance,  note: maintNote },
                      { key: 'reg',  label: 'Registration & Fees',                          value: annualRegistration, note: `${resolvedState} DMV` },
                    ].map(({ key, label, value, note }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <span className="text-sm text-white">{label}</span>
                            <span className="ml-2 text-[10px] text-[var(--text-muted)]">{note}</span>
                          </div>
                          <span className="font-display font-semibold text-white text-sm">{formatCurrency(value)}/yr</span>
                        </div>
                        {key === 'maint' && detailedMode && (
                          <MaintenanceBreakdown
                            isEV={effIsEV}
                            annualMileage={annualMileage}
                            segment={maintenanceSegment}
                            make={selMake}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {resolvedState && customCosts && (
                <>
                  <div className="flex flex-col gap-1">
                    <SliderInput label="Insurance" value={annualInsurance} onChange={setAnnualInsurance}
                      min={500} max={6000} step={100} prefix="$" suffix="/yr" />
                    <p className="text-[10px] text-[var(--text-muted)] pl-1">
                      {selYear
                        ? <>Est. current value <span className="text-white">{formatCurrency(estimatedCarValue)}</span>
                            {' '}({carAge === 0 ? 'new' : `${carAge}yr depreciation`} · {classifySegment(selMake||'', selModel||'')} segment)
                          </>
                        : `${resolvedState} base rate · adjust for your coverage level`
                      }
                    </p>
                  </div>
                  <SliderInput label={modelData?.is_ev ? 'Charging (electricity)' : 'Fuel'} value={annualFuel} onChange={setAnnualFuel}
                    min={0} max={6000} step={50} prefix="$" suffix="/yr" />
                  <div>
                    <SliderInput label="Maintenance &amp; Repairs" value={annualMaintenance} onChange={setAnnualMaintenance}
                      min={0} max={5000} step={50} prefix="$" suffix="/yr" />
                    {detailedMode && (
                      <div className="mt-3 rounded-xl border overflow-hidden"
                        style={{ borderColor: 'var(--border)' }}>
                        <MaintenanceBreakdown
                          isEV={modelData?.is_ev ?? false}
                          annualMileage={annualMileage}
                          segment={classifySegment(selMake||'', selModel||'')}
                          make={selMake}
                        />
                      </div>
                    )}
                  </div>
                  <SliderInput label="Registration &amp; Fees" value={annualRegistration} onChange={setAnnualRegistration}
                    min={0} max={2000} step={25} prefix="$" suffix="/yr" />
                </>
              )}
            </div>

            {/* ── Results ── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">

              {/* Car visual + specs */}
              {selModel && modelData ? (
                <div className="anim-3 flex flex-col gap-4">
                  <CarVisual
                    make={selMake} model={selModel}
                    carType={modelData.type} isEV={modelData.is_ev}
                  />
                  <SpecsPanel specs={modelData.specs} mpg={modelData.mpg} isEV={modelData.is_ev} />
                </div>
              ) : vehicleCategory && (() => {
                const cat = VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)
                return (
                  <div className="anim-3">
                    <CarVisual
                      make="" model={cat.label}
                      carType={cat.svgType} isEV={cat.isEV}
                    />
                  </div>
                )
              })()}

              <div className="anim-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  Your results
                </p>
                <ResultCard
                  label={financeMode === 'lease' ? 'Monthly Lease Payment' : 'Monthly Payment'}
                  value={financeMode === 'lease' ? leaseResults.monthlyPayment : results.monthlyPayment}
                  highlight delay={0} />
              </div>

              <div className="grid grid-cols-1 gap-4 anim-5">
                {financeMode === 'lease' ? (
                  <>
                    <ResultCard label="Total Lease Cost"     value={leaseResults.totalLeaseCost}   delay={60}  />
                    <ResultCard label="Residual Value"       value={leaseResults.residualValue}     delay={120} />
                    <ResultCard label="Lease Cost Per Year"  value={leaseResults.annualLeaseCost}  delay={180} />
                  </>
                ) : (
                  <>
                    <ResultCard label="Total Interest Paid"  value={results.totalInterestPaid}  delay={60}  />
                    <ResultCard label="Total Cost of Loan"   value={results.totalCostOfLoan}    delay={120} />
                    <ResultCard label="Loan Cost Per Year"   value={results.trueAnnualCost}     delay={180} />
                  </>
                )}
              </div>

              {/* Annual cost breakdown */}
              <div className="rounded-xl border p-4 flex flex-col gap-3"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Annual Cost Breakdown
                </p>
                <div className="flex flex-col gap-2 text-sm">
                  {[
                    { label: financeMode === 'lease' ? 'Lease payments' : 'Loan payments', value: financeMode === 'lease' ? leaseResults.annualLeaseCost : results.trueAnnualCost },
                    { label: 'Insurance',              value: annualInsurance },
                    { label: (modelData?.is_ev || VEHICLE_CATEGORIES.find(c => c.value === vehicleCategory)?.isEV) ? 'Charging' : 'Fuel', value: annualFuel },
                    { label: 'Maintenance & repairs',  value: annualMaintenance },
                    { label: 'Registration & fees',    value: annualRegistration },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">{label}</span>
                      <span className="text-white font-medium">{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-[var(--border)] my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Total per year</span>
                    <span className="font-display font-bold text-lg" style={{ color: 'var(--accent)' }}>
                      {formatCurrency(totalAnnualCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-muted)]">
                      Total over {financeMode === 'lease' ? `${leaseTerm} mo lease` : `${ownershipYears} yr${ownershipYears !== 1 ? 's' : ''}`}
                    </span>
                    <span className="text-[var(--text-muted)] font-medium">
                      {formatCurrency(financeMode === 'lease'
                        ? leaseResults.totalLeaseCost + annualOperatingCost * (leaseTerm / 12)
                        : totalAnnualCost * ownershipYears)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                style={{ background:'rgba(255,184,0,0.04)', borderColor:'rgba(255,184,0,0.15)', color:'var(--text-muted)' }}>
                <span className="text-[var(--accent)] font-semibold">The real picture: </span>
                {financeMode === 'lease' ? (
                  <>
                    Over your {leaseTerm}-month lease, payments total{' '}
                    <span className="text-white font-semibold">
                      {formatCurrency(leaseResults.monthlyPayment * leaseTerm)}
                    </span>{' '}
                    — you don&apos;t own the vehicle at the end. Add insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in annual cost is {formatCurrency(totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(leaseResults.totalLeaseCost + annualOperatingCost * (leaseTerm / 12))} over the full lease.
                  </>
                ) : (
                  <>
                    Over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}, loan payments total{' '}
                    <span className="text-white font-semibold">
                      {formatCurrency(results.monthlyPayment * Math.min(ownershipYears * 12, loanTerm))}
                    </span>{' '}
                    ({formatCurrency(results.totalInterestPaid)} in interest). Add insurance, fuel, maintenance, and fees and your{' '}
                    <span className="text-white font-semibold">all-in annual cost is {formatCurrency(totalAnnualCost)}</span>{' '}
                    — or {formatCurrency(totalAnnualCost * ownershipYears)} over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}.
                  </>
                )}
              </div>

              {/* Add to Comparison */}
              <button
                onClick={handleAddToComparison}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                <span>＋</span> Add to Multi-Vehicle Comparison
              </button>
              {!isSubscribed && detailedCalcCount >= FREE_DETAILED_LIMIT && (
                <div className="rounded-xl border px-4 py-3 text-center text-xs"
                  style={{ borderColor: 'rgba(255,184,0,0.2)', background: 'rgba(255,184,0,0.04)' }}>
                  <span className="text-[var(--text-muted)]">You've used all {FREE_DETAILED_LIMIT} free detailed analyses. </span>
                  <a href="/subscribe" className="text-[var(--accent)] hover:underline font-semibold">
                    Subscribe for unlimited access →
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
