import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ResultCard from '../components/ResultCard'
import VEHICLES from '../data/vehicles.json'

// ── Enhanced Depreciation Model ───────────────────────
// Ported from enhanced_depreciation.py + advanced_insurance.py
// Sources: iSeeCars 2024, KBB 2024 Best Resale Value, Edmunds TCO, CarEdge, Black Book

// Brand multipliers — lower = better retention
const BRAND_DEPRECIATION_MULT = {
  Toyota: 0.75, Lexus: 0.78, Porsche: 0.79, Honda: 0.82, Subaru: 0.85,
  Jeep: 0.86, Mazda: 0.88, Acura: 0.89,
  Hyundai: 0.93, Kia: 0.95, GMC: 0.96, Ford: 0.98, Buick: 1.04,
  Chevrolet: 1.00, Ram: 1.02, Nissan: 1.05, Genesis: 1.06, Volvo: 1.07, Infiniti: 1.08,
  Cadillac: 1.12, Volkswagen: 1.14, Audi: 1.15, Mini: 1.16, BMW: 1.18, Lincoln: 1.18,
  'Mercedes-Benz': 1.22, 'Land Rover': 1.24, Dodge: 1.26, Jaguar: 1.28,
  Chrysler: 1.32, 'Alfa Romeo': 1.35, Fiat: 1.38,
  Tesla: 0.90, Rivian: 1.20, Lucid: 1.28, Polestar: 1.22,
  Maserati: 1.42,
}

// Cumulative depreciation from MSRP by segment and year (from segment_curves)
const SEGMENT_CURVES = {
  truck:      {1:.10,2:.18,3:.26,4:.33,5:.40,6:.45,7:.49,8:.53,9:.56,10:.59,11:.61,12:.63,13:.65,14:.66,15:.68},
  sports:     {1:.14,2:.25,3:.35,4:.44,5:.52,6:.58,7:.63,8:.67,9:.70,10:.73,11:.75,12:.77,13:.78,14:.79,15:.80},
  suv:        {1:.13,2:.23,3:.32,4:.39,5:.46,6:.51,7:.55,8:.59,9:.62,10:.65,11:.67,12:.69,13:.70,14:.71,15:.72},
  luxury_suv: {1:.15,2:.26,3:.36,4:.44,5:.52,6:.57,7:.61,8:.65,9:.68,10:.71,11:.73,12:.75,13:.76,14:.77,15:.78},
  hybrid:     {1:.13,2:.23,3:.32,4:.40,5:.48,6:.53,7:.57,8:.61,9:.64,10:.67,11:.69,12:.71,13:.72,14:.73,15:.74},
  compact:    {1:.15,2:.26,3:.36,4:.44,5:.52,6:.57,7:.61,8:.65,9:.68,10:.71,11:.73,12:.75,13:.76,14:.77,15:.78},
  sedan:      {1:.16,2:.28,3:.38,4:.46,5:.54,6:.59,7:.63,8:.67,9:.70,10:.73,11:.75,12:.77,13:.78,14:.79,15:.80},
  luxury:     {1:.20,2:.34,3:.46,4:.54,5:.62,6:.67,7:.71,8:.74,9:.77,10:.79,11:.81,12:.82,13:.83,14:.84,15:.85},
  economy:    {1:.20,2:.34,3:.45,4:.54,5:.62,6:.67,7:.71,8:.75,9:.78,10:.80,11:.82,12:.84,13:.85,14:.86,15:.87},
  electric:   {1:.22,2:.38,3:.50,4:.58,5:.65,6:.70,7:.74,8:.77,9:.79,10:.81,11:.83,12:.84,13:.85,14:.86,15:.87},
}
const SEGMENT_MAX_DEPR = {
  truck:.68, suv:.72, hybrid:.74, luxury_suv:.78, compact:.78,
  sports:.80, sedan:.80, luxury:.85, economy:.87, electric:.87,
}

// Model-specific retention boosts / penalties (×0.88 or ×1.12)
const HIGH_RETENTION = {
  Toyota: ['4Runner','Tacoma','Tundra','Land Cruiser','Sequoia','RAV4','Highlander','Sienna','Camry','Corolla'],
  Honda: ['Pilot','Ridgeline','Odyssey','CR-V','Accord','Civic'],
  Subaru: ['Outback','Forester','Crosstrek','Ascent','WRX'],
  Jeep: ['Wrangler','Gladiator'],
  Ford: ['F-150','F-250','F-350','Bronco','Bronco Sport','Mustang'],
  Chevrolet: ['Silverado','Tahoe','Suburban','Corvette','Colorado'],
  GMC: ['Yukon','Yukon XL','Sierra','Canyon'],
  Ram: ['1500','2500','3500'],
  Lexus: ['GX','LX','RX','NX','ES','IS'],
  Porsche: ['911','Cayenne','Macan','Boxster','Cayman'],
  Cadillac: ['Escalade','XT5','XT6'],
  Lincoln: ['Navigator','Aviator'],
  Mazda: ['CX-5','CX-9','CX-50','Mazda3'],
  Hyundai: ['Palisade','Santa Fe','Tucson'],
  Kia: ['Telluride','Sorento','Sportage'],
  Acura: ['MDX','RDX'],
  Tesla: ['Model Y','Model 3'],
}
const POOR_RETENTION = {
  BMW: ['7 Series','X7','i3','i4','8 Series'],
  'Mercedes-Benz': ['S-Class','E-Class','CLS','AMG GT','EQS','EQE'],
  Audi: ['A8','A7','Q8','e-tron','e-tron GT'],
  Cadillac: ['CT4','CT5','CT6','Lyriq'],
  Nissan: ['Altima','Maxima','Sentra','Leaf'],
  Jaguar: ['XJ','XF','F-Type','I-PACE'],
  'Land Rover': ['Range Rover','Discovery','Defender'],
  Dodge: ['Durango','Journey'],
  Volkswagen: ['Passat','Arteon','ID.4'],
  Maserati: ['Ghibli','Quattroporte','Levante'],
}

function classifySegment(make, model) {
  const m = (model ?? '').toLowerCase()
  const mk = (make ?? '').toLowerCase()
  if (mk === 'tesla' || ['rivian','lucid','polestar','fisker'].includes(mk)) return 'electric'
  const evKw = ['leaf','ariya','bolt ev','bolt euv','equinox ev','blazer ev','lyriq','ioniq 5','ioniq 6','ioniq electric','kona electric','niro ev','ev6','ev9','gv60','i3 ','i4','i5','i7',' ix','e-tron','taycan','id.4','id.3','mach-e','lightning','eqb','eqc','eqe','eqs','bz4x',' rz ','solterra','mx-30','i-pace','prologue','zdx']
  if (evKw.some(k => m.includes(k))) return 'electric'
  if (['prius','insight','sienna','maverick'].some(k => m.includes(k))) return 'hybrid'
  if (m.includes('hybrid') || m.includes('phev') || m.includes('4xe') || m.includes('plug-in')) return 'hybrid'
  const sportsKw = ['corvette','mustang','camaro','challenger','charger','911','cayman','boxster','z4','supra','miata','mx-5','gt-r','370z','400z','brz','gr86','nsx']
  if (sportsKw.some(k => m.includes(k))) return 'sports'
  const luxBrands = ['bmw','mercedes-benz','audi','lexus','acura','infiniti','cadillac','lincoln','jaguar','land rover','porsche','maserati','alfa romeo','genesis']
  if (luxBrands.includes(mk)) {
    const luxSuvKw = ['escalade','xt4','xt5','xt6','x1','x2','x3','x4','x5','x6','x7','gla','glb','glc','gle','gls','g-class','q3','q4','q5','q7','q8','ux','nx','rx','gx','lx','rdx','mdx','qx50','qx55','qx60','qx80','navigator','nautilus','aviator','corsair','cayenne','macan','e-pace','f-pace','range rover','discovery','defender','evoque','gv60','gv70','gv80','levante','grecale']
    return luxSuvKw.some(k => m.includes(k)) ? 'luxury_suv' : 'luxury'
  }
  const truckKw = ['f-150','f-250','f-350','silverado','sierra','ram 1500','ram 2500','tundra','tacoma','frontier','ridgeline','gladiator','ranger','colorado','canyon','titan']
  if (truckKw.some(k => m.includes(k))) return 'truck'
  const suvKw = ['suburban','tahoe','yukon','pilot','highlander','rav4','cr-v','explorer','expedition','escape','equinox','traverse','pathfinder','armada','palisade','telluride','sorento','santa fe','tucson','cx-5','cx-9','outback','forester','ascent','wrangler','grand cherokee','durango','atlas','tiguan','4runner','sequoia','land cruiser']
  if (suvKw.some(k => m.includes(k))) return 'suv'
  if (['civic','corolla','elantra','sentra','forte','jetta','golf','mazda3','impreza','crosstrek'].some(k => m.includes(k))) return 'compact'
  if (['spark','mirage','rio','versa','accent','yaris','fit'].some(k => m.includes(k))) return 'economy'
  return 'sedan'
}

function applyModelAdjustments(make, model, brandMult) {
  const ml = (model ?? '').toLowerCase()
  if (HIGH_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.88
  if (POOR_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 1.12
  return brandMult
}

function estimateCurrentValue(originalPrice, make, model, ageYears) {
  const segment  = (make && model) ? classifySegment(make, model) : 'sedan'
  const rawBrand = BRAND_DEPRECIATION_MULT[make] ?? 1.0
  const adjBrand = (make && model) ? applyModelAdjustments(make, model, rawBrand) : rawBrand
  const curve    = SEGMENT_CURVES[segment] ?? SEGMENT_CURVES.sedan
  const baseRate = ageYears <= 15 ? (curve[ageYears] ?? curve[15]) : Math.min(0.96, curve[15] + (ageYears - 15) * 0.005)
  const cap      = SEGMENT_MAX_DEPR[segment] ?? 0.80
  const finalRate = Math.min(baseRate * adjBrand, cap)
  return Math.max(originalPrice * (1 - finalRate), originalPrice * 0.10)
}

// Insurance estimate — ported from advanced_insurance.py (AdvancedInsuranceCalculator)
// Uses national avg base rate × vehicle-value bracket × brand-specific multiplier
const INSURANCE_BASE_RATE = 1300 // national average annual premium
const INSURANCE_VALUE_BRACKETS = [[0,15000,.85],[15000,30000,1.00],[30000,50000,1.15],[50000,80000,1.35],[80000,Infinity,1.60]]
const INSURANCE_BRAND_MULT = {
  BMW: 1.25, 'Mercedes-Benz': 1.30, Audi: 1.20, Lexus: 1.15, Acura: 1.10,
  Infiniti: 1.10, Cadillac: 1.15, Toyota: 0.90, Honda: 0.90,
  Hyundai: 0.85, Kia: 0.85, Subaru: 0.95, Mazda: 0.95,
  Chevrolet: 1.00, Ford: 1.05, Ram: 1.10, Jeep: 1.10,
}

function estimateInsurance(purchasePrice, make, model, modelYear, state) {
  const ageYears   = modelYear ? Math.max(0, new Date().getFullYear() - parseInt(modelYear)) : 0
  const currentVal = estimateCurrentValue(purchasePrice, make || null, model || null, ageYears)
  const [,,valueMult] = INSURANCE_VALUE_BRACKETS.find(([mn, mx]) => currentVal >= mn && currentVal < mx) ?? [0,0,1.0]
  const brandMult  = INSURANCE_BRAND_MULT[make] ?? 1.0
  const stateBase  = STATE_INS_BASE[state] ?? INSURANCE_BASE_RATE
  return Math.round((stateBase * valueMult * brandMult) / 50) * 50
}

// ── Location data (from zip_code_utils.py, advanced_insurance.py, taxes_fees_utils.py) ─
const STATE_FUEL_PRICES = {
  AL:3.20,AK:4.15,AZ:3.85,AR:3.10,CA:4.65,CO:3.50,CT:3.75,
  DE:3.45,FL:3.40,GA:3.30,HI:4.95,ID:3.65,IL:3.60,IN:3.35,
  IA:3.25,KS:3.15,KY:3.30,LA:3.05,ME:3.70,MD:3.55,MA:3.80,
  MI:3.50,MN:3.45,MS:3.10,MO:3.20,MT:3.60,NE:3.30,NV:4.05,
  NH:3.65,NJ:3.70,NM:3.40,NY:3.90,NC:3.35,ND:3.25,OH:3.40,
  OK:3.15,OR:4.10,PA:3.65,RI:3.75,SC:3.25,SD:3.35,TN:3.20,
  TX:3.25,UT:3.75,VT:3.70,VA:3.45,WA:4.20,WV:3.40,WI:3.45,
  WY:3.50,DC:3.60,
}
const STATE_ELEC_RATES = {
  AL:0.13,AK:0.24,AZ:0.14,AR:0.11,CA:0.33,CO:0.14,CT:0.30,
  DE:0.14,FL:0.14,GA:0.14,HI:0.42,ID:0.10,IL:0.16,IN:0.14,
  IA:0.12,KS:0.14,KY:0.11,LA:0.11,ME:0.16,MD:0.18,MA:0.27,
  MI:0.17,MN:0.14,MS:0.12,MO:0.13,MT:0.12,NE:0.11,NV:0.13,
  NH:0.23,NJ:0.20,NM:0.14,NY:0.20,NC:0.13,ND:0.11,OH:0.15,
  OK:0.12,OR:0.11,PA:0.17,RI:0.28,SC:0.14,SD:0.12,TN:0.12,
  TX:0.13,UT:0.11,VT:0.17,VA:0.13,WA:0.10,WV:0.12,WI:0.15,
  WY:0.12,DC:0.16,
}
// State insurance base annual premiums (from advanced_insurance.py state_base_rates)
const STATE_INS_BASE = {
  AL:1420,AK:1180,AZ:1290,AR:1380,CA:1760,CO:1340,CT:1510,
  DE:1440,FL:2059,GA:1450,HI:1200,ID:1050,IL:1240,IN:1080,
  IA:1050,KS:1150,KY:1350,LA:2298,ME:1020,MD:1380,MA:1175,
  MI:1980,MN:1240,MS:1350,MO:1250,MT:1220,NE:1180,NV:1368,
  NH:1050,NJ:1590,NM:1300,NY:1470,NC:1100,ND:1240,OH:1050,
  OK:1420,OR:1180,PA:1340,RI:1470,SC:1340,SD:1240,TN:1180,
  TX:1550,UT:1170,VT:1050,VA:1180,WA:1240,WV:1390,WI:1100,WY:1240,
}
// Annual registration base fees (from taxes_fees_utils.py STATE_REGISTRATION_FEES base amounts)
const STATE_REG_FEE = {
  AL:50,AK:50,AZ:32,AR:25,CA:65,CO:75,CT:60,DE:40,DC:72,FL:56,
  GA:20,HI:50,ID:68,IL:151,IN:45,IA:50,KS:42,KY:21,LA:30,ME:35,
  MD:135,MA:60,MI:50,MN:53,MS:14,MO:33,MT:140,NE:37,NV:41,NH:48,
  NJ:50,NM:40,NY:75,NC:60,ND:49,OH:31,OK:50,OR:268,PA:42,RI:73,
  SC:40,SD:36,TN:28,TX:51,UT:51,VT:76,VA:36,WA:87,WV:52,WI:89,WY:30,
}
// States with value-based annual VLF/ad-valorem fees: [rate, flat] (from STATE_ANNUAL_VLF_RATES)
const STATE_VLF = {
  CA:[0.0065,51],VA:[0.0401,0],CT:[0.007,0],KS:[0.01,0],KY:[0.006,0],
  MN:[0.0125,0],MS:[0.005,0],MO:[0.0033,0],MT:[0,40],NC:[0.006,0],
  SC:[0.005,0],WV:[0.006,0],WY:[0.003,0],AZ:[0.005,0],CO:[0.003,15],
  IA:[0.01,0],MA:[0.025,0],NV:[0.008,0],WA:[0.003,0],
}
// ZIP→state ranges (from ZIP_CODE_RANGES in zip_code_utils.py)
const ZIP_RANGES = [
  ['AL',[[35000,36999]]],['AK',[[99500,99999]]],['AZ',[[85000,86599]]],
  ['AR',[[71600,72999]]],['CA',[[90000,96199]]],['CO',[[80000,81699]]],
  ['CT',[[6000,6999]]],['DE',[[19700,19999]]],['DC',[[20000,20599]]],
  ['FL',[[32000,34999]]],['GA',[[30000,31999],[39800,39999]]],
  ['HI',[[96700,96899]]],['ID',[[83200,83999]]],['IL',[[60000,62999]]],
  ['IN',[[46000,47999]]],['IA',[[50000,52999]]],['KS',[[66000,67999]]],
  ['KY',[[40000,42799]]],['LA',[[70000,71499]]],['ME',[[3900,4999]]],
  ['MD',[[20600,21999]]],['MA',[[1000,2799]]],['MI',[[48000,49999]]],
  ['MN',[[55000,56799]]],['MS',[[38600,39999]]],['MO',[[63000,65899]]],
  ['MT',[[59000,59999]]],['NE',[[68000,69999]]],['NV',[[88900,89999]]],
  ['NH',[[3000,3899]]],['NJ',[[7000,8999]]],['NM',[[87000,88499]]],
  ['NY',[[10000,14999]]],['NC',[[27000,28999]]],['ND',[[58000,58999]]],
  ['OH',[[43000,45999]]],['OK',[[73000,74999]]],['OR',[[97000,97999]]],
  ['PA',[[15000,19699]]],['RI',[[2800,2999]]],['SC',[[29000,29999]]],
  ['SD',[[57000,57999]]],['TN',[[37000,38599]]],
  ['TX',[[73301,73301],[75000,79999],[88500,88599]]],
  ['UT',[[84000,84799]]],['VT',[[5000,5999]]],
  ['VA',[[20100,20199],[22000,24699]]],['WA',[[98000,99499]]],
  ['WV',[[24700,26999]]],['WI',[[53000,54999]]],['WY',[[82000,83199]]],
]

function zipToState(zip) {
  if (!/^\d{5}$/.test(zip)) return null
  const z = parseInt(zip)
  for (const [state, ranges] of ZIP_RANGES) {
    for (const [lo, hi] of ranges) {
      if (z >= lo && z <= hi) return state
    }
  }
  return null
}

// Returns { state, label } or null
function resolveLocation(input) {
  const t = input.trim().toUpperCase()
  if (/^\d{5}$/.test(t)) {
    const state = zipToState(t)
    return state ? { state, label: `${t} (${state})` } : null
  }
  if (/^[A-Z]{2}$/.test(t) && STATE_FUEL_PRICES[t]) return { state: t, label: t }
  return null
}

function computeAnnualFuel(isEV, mpgCombined, mpgeCombined, state) {
  const MILES = 15000
  const KWH_PER_GAL = 33.7
  if (isEV) {
    const mpge = mpgeCombined ?? 100
    const annualKwh = MILES / (mpge / KWH_PER_GAL)
    return Math.round(annualKwh * (STATE_ELEC_RATES[state] ?? 0.16) / 50) * 50
  }
  const mpg = mpgCombined ?? 28
  return Math.round((MILES / mpg) * (STATE_FUEL_PRICES[state] ?? 3.50) / 50) * 50
}

function computeAnnualRegistration(state, vehicleValue) {
  const base = STATE_REG_FEE[state] ?? 50
  const [rate, flat] = STATE_VLF[state] ?? [0, 0]
  return Math.round((base + vehicleValue * rate + flat) / 25) * 25
}

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

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

// ── Vehicle data helpers ──────────────────────────────
const MAKES = Object.keys(VEHICLES).sort()

function getModels(make)          { return make ? Object.keys(VEHICLES[make] ?? {}).sort() : [] }
function getModelData(make, model){ return VEHICLES[make]?.[model] ?? null }

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
const C = {
  body:        '#191921',
  bodyStroke:  '#2a2a3a',
  glass:       'rgba(100,180,255,0.10)',
  glassStroke: 'rgba(120,190,255,0.28)',
  wheelOuter:  '#0e0e16',
  wheelRim:    '#22223a',
  wheelHub:    '#2e2e50',
  wheelSpoke:  '#1a1a30',
  accent:      '#C8FF00',
  tail:        '#ff3333',
  shadow:      'rgba(0,0,0,0.45)',
}

function Wheel({ cx, cy, r = 26 }) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return (
      <line key={i}
        x1={cx} y1={cy}
        x2={cx + (r - 6) * Math.cos(a)}
        y2={cy + (r - 6) * Math.sin(a)}
        stroke={C.wheelSpoke} strokeWidth="2"
      />
    )
  })
  return (
    <g>
      <circle cx={cx} cy={cy} r={r}     fill={C.wheelOuter} stroke={C.bodyStroke} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 6} fill={C.wheelRim} />
      {spokes}
      <circle cx={cx} cy={cy} r={6}     fill={C.wheelHub} />
      <circle cx={cx} cy={cy} r={3}     fill={C.bodyStroke} />
    </g>
  )
}

function EVBadge({ x, y }) {
  return (
    <>
      <rect x={x} y={y} width="30" height="14" rx="4"
        fill="rgba(200,255,0,0.20)" stroke="rgba(200,255,0,0.4)" strokeWidth="1" />
      <text x={x + 15} y={y + 10} textAnchor="middle" fontSize="7"
        fontWeight="bold" fill="#C8FF00" fontFamily="monospace">EV</text>
    </>
  )
}

function SedanSVG({ isEV }) {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="198" ry="8" fill={C.shadow} />
      <path d="M54 142 C54 127 65 113 82 105 C99 97 120 94 144 93 C163 93 176 79 190 67 C202 56 220 50 242 50 L272 50 C294 50 313 57 331 70 C349 83 367 93 396 99 C417 104 433 115 437 130 L438 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M194 68 C206 56 223 51 244 51 L271 51 C292 51 311 58 329 71 C345 83 361 92 390 99 C370 100 345 100 328 100 L197 100 C195 86 194 76 194 68 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <rect x="55" y="118" width="13" height="7" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="55" y="128" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="432" y="116" width="11" height="9" rx="3" fill={C.tail} opacity="0.85" />
      <line x1="258" y1="100" x2="255" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={362} cy={154} />
      {isEV && <EVBadge x={186} y={126} />}
    </svg>
  )
}

function SUVSVG({ isEV, isLarge }) {
  const roofY = isLarge ? 36 : 41
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="200" ry="8" fill={C.shadow} />
      <path
        d={`M50 142 C50 126 62 112 79 104 C96 96 120 92 152 91 C166 91 175 ${roofY+33} 183 ${roofY+21} C191 ${roofY+11} 207 ${roofY} 229 ${roofY} L279 ${roofY} C301 ${roofY} 320 ${roofY+9} 336 ${roofY+22} C350 ${roofY+34} 368 90 400 96 C422 100 440 112 443 128 L443 142 Z`}
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5"
      />
      <path
        d={`M187 ${roofY+22} C195 ${roofY+11} 210 ${roofY+1} 231 ${roofY+1} L278 ${roofY+1} C298 ${roofY+1} 316 ${roofY+10} 332 ${roofY+23} C346 ${roofY+35} 362 89 392 96 C374 97 348 97 325 97 L188 97 C187 83 187 73 187 ${roofY+22} Z`}
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1"
      />
      <rect x="51" y="116" width="14" height="8" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="51" y="127" width="10" height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="437" y="113" width="12" height="11" rx="3" fill={C.tail} opacity="0.85" />
      {isLarge && (
        <rect x="192" y={roofY - 4} width="148" height="3" rx="1.5"
          fill={C.bodyStroke} opacity="0.8" />
      )}
      <line x1="258" y1="97" x2="256" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={368} cy={154} />
      {isEV && <EVBadge x={183} y={120} />}
    </svg>
  )
}

function TruckSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="202" ry="8" fill={C.shadow} />
      <path d="M52 142 C52 126 63 112 80 104 C97 96 120 92 155 92 L155 62 C155 50 167 41 187 41 L248 41 C268 41 279 52 279 65 L282 82 L435 80 L438 88 C441 99 442 118 441 133 L441 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M158 63 C158 52 168 42 187 42 L248 42 C267 42 275 52 275 65 L275 92 L158 92 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      {[302, 330, 358, 386].map(x => (
        <rect key={x} x={x} y="81" width="6" height="8" rx="1" fill={C.bodyStroke} opacity="0.8" />
      ))}
      <line x1="432" y1="81" x2="432" y2="142" stroke={C.bodyStroke} strokeWidth="2" opacity="0.7" />
      <rect x="53" y="116" width="13" height="8" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="53" y="127" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="436" y="108" width="10" height="12" rx="3" fill={C.tail} opacity="0.85" />
      <Wheel cx={115} cy={154} r={28} />
      <Wheel cx={378} cy={154} r={28} />
    </svg>
  )
}

function SportsSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="210" ry="7" fill={C.shadow} />
      <path d="M42 146 C42 134 54 122 70 114 C86 106 112 102 148 101 C168 101 183 91 198 79 C212 68 232 62 258 60 L295 60 C321 60 342 68 360 82 C377 95 406 104 432 110 C444 113 450 125 449 138 L449 146 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M202 80 C216 69 235 62 259 61 L294 61 C318 61 338 69 356 82 C372 94 398 104 426 110 C408 111 381 111 360 111 L202 111 C202 97 202 87 202 80 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <line x1="135" y1="102" x2="148" y2="116" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.6" />
      <line x1="125" y1="105" x2="138" y2="119" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.4" />
      <rect x="90" y="138" width="290" height="4" rx="2" fill={C.bodyStroke} opacity="0.6" />
      <rect x="43" y="122" width="16" height="6" rx="2" fill={C.accent} opacity="0.95" />
      <rect x="43" y="131" width="20" height="3" rx="1.5" fill={C.accent} opacity="0.3" />
      <rect x="433" y="116" width="18" height="6" rx="2" fill={C.tail} opacity="0.9" />
      <rect x="435" y="124" width="14" height="3" rx="1.5" fill={C.tail} opacity="0.4" />
      <Wheel cx={122} cy={154} r={28} />
      <Wheel cx={372} cy={154} r={28} />
    </svg>
  )
}

function MinivanSVG() {
  return (
    <svg viewBox="0 0 480 190" fill="none" className="w-full">
      <ellipse cx="240" cy="182" rx="196" ry="8" fill={C.shadow} />
      <path d="M48 142 C48 126 60 112 78 104 C95 96 120 92 155 92 L160 50 C161 40 170 32 190 32 L312 32 C332 32 343 40 344 50 L348 92 C370 92 398 98 420 107 C434 112 445 124 446 135 L446 142 Z"
        fill={C.body} stroke={C.bodyStroke} strokeWidth="1.5" />
      <path d="M163 51 C164 41 172 33 190 33 L312 33 C330 33 340 41 341 51 L340 92 L164 92 Z"
        fill={C.glass} stroke={C.glassStroke} strokeWidth="1" />
      <line x1="264" y1="92" x2="262" y2="142" stroke={C.bodyStroke} strokeWidth="2" opacity="0.65" />
      <line x1="198" y1="92" x2="196" y2="142" stroke={C.bodyStroke} strokeWidth="1.5" opacity="0.5" />
      <rect x="272" y="118" width="14" height="4" rx="2" fill={C.bodyStroke} opacity="0.9" />
      <rect x="49" y="114" width="13" height="9" rx="3" fill={C.accent} opacity="0.9" />
      <rect x="49" y="125" width="9"  height="4" rx="2" fill={C.accent} opacity="0.4" />
      <rect x="440" y="110" width="11" height="13" rx="3" fill={C.tail} opacity="0.85" />
      <Wheel cx={118} cy={154} />
      <Wheel cx={364} cy={154} />
    </svg>
  )
}

function CarVisual({ make, model, carType, isEV }) {
  const isLarge = carType === 'suv_large' || carType === 'suv_luxury'
  const visual = (() => {
    switch (carType) {
      case 'suv': case 'suv_large': case 'suv_luxury': case 'ev_suv':
        return <SUVSVG isEV={isEV} isLarge={isLarge} />
      case 'truck':   return <TruckSVG />
      case 'sports':  return <SportsSVG />
      case 'minivan': return <MinivanSVG />
      default:        return <SedanSVG isEV={isEV} />
    }
  })()

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0f0f18 0%,#080809 100%)' }}>
      <div className="px-6 pt-5 pb-2">{visual}</div>
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{make} {model}</p>
          <p className="text-[var(--text-muted)] text-xs mt-0.5 capitalize">
            {carType?.replace(/_/g, ' ')}
          </p>
        </div>
        {isEV && (
          <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded"
            style={{ color:'#C8FF00', background:'rgba(200,255,0,0.1)', border:'1px solid rgba(200,255,0,0.25)' }}>
            ELECTRIC
          </span>
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
function VehiclePicker({ make, model, year, trim, onChange, onClear }) {
  const models   = getModels(make)
  const years    = getAvailableYears(make, model)
  const trimsMap = getTrims(make, model, year)
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
          <label className="input-label">Trim</label>
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
                borderColor: checked ? 'rgba(200,255,0,0.4)' : 'var(--border)',
                background: checked ? 'rgba(200,255,0,0.04)' : 'var(--surface)',
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

// ── Main page ─────────────────────────────────────────
export default function TCOCalculator() {
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
  // Track original MSRP separately from price (which may be depreciation-adjusted)
  const [origMsrp,       setOrigMsrp]       = useState(null)

  // Derived model data (type, specs, mpg, isEV)
  const modelData = useMemo(() => getModelData(selMake, selModel), [selMake, selModel])

  useEffect(() => {
    if (customCosts) return
    setAnnualInsurance(estimateInsurance(price, selMake||null, selModel||null, selYear||null, resolvedState||null))
    if (modelData) {
      setAnnualFuel(computeAnnualFuel(modelData.is_ev, modelData.mpg?.combined, modelData.mpg?.mpge_combined, resolvedState))
      setAnnualMaintenance(modelData.is_ev ? 700 : 1200)
    } else {
      setAnnualFuel(computeAnnualFuel(false, 28, null, resolvedState))
    }
    const currentVal = (selYear && (selMake || selModel))
      ? estimateCurrentValue(price, selMake||null, selModel||null, Math.max(0, new Date().getFullYear() - parseInt(selYear)))
      : price
    setAnnualRegistration(computeAnnualRegistration(resolvedState, currentVal))
  }, [price, selMake, selModel, selYear, resolvedState, modelData, customCosts]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handlePickerChange = useCallback((level, value) => {
    if (level === 'make')  { setSelMake(value); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null) }
    if (level === 'model') { setSelModel(value); setSelYear(''); setSelTrim(''); setOrigMsrp(null) }
    if (level === 'year')  { setSelYear(value); setSelTrim(''); setOrigMsrp(null) }
    if (level === 'trim') {
      setSelTrim(value)
      if (selMake && selModel && selYear) {
        const t = getTrims(selMake, selModel, selYear)
        if (t[value]) {
          const msrp = t[value]
          setOrigMsrp(msrp)
          const ageYrs = Math.max(0, new Date().getFullYear() - parseInt(selYear))
          const estimated = ageYrs > 0 ? estimateCurrentValue(msrp, selMake, selModel, ageYrs) : msrp
          setPrice(Math.round(estimated / 500) * 500)
        }
      }
    }
  }, [selMake, selModel, selYear])

  const handleClear = useCallback(() => {
    setSelMake(''); setSelModel(''); setSelYear(''); setSelTrim(''); setOrigMsrp(null)
  }, [])

  const results = useMemo(() => calculateLoan({
    price, downPayment: Math.min(downPayment, price),
    loanTermMonths: loanTerm, annualRatePercent: rate, ownershipYears,
  }), [price, downPayment, loanTerm, rate, ownershipYears])

  const annualOperatingCost = annualInsurance + annualFuel + annualMaintenance + annualRegistration
  const totalAnnualCost     = results.trueAnnualCost + annualOperatingCost

  // For the insurance note: estimated current market value after depreciation
  const carAge            = selYear ? Math.max(0, new Date().getFullYear() - parseInt(selYear)) : 0
  const estimatedCarValue = selYear
    ? estimateCurrentValue(price, selMake || null, selModel || null, carAge)
    : price

  const safeDown = Math.min(downPayment, price)
  const usingMSRP = !!(selMake && selModel && selYear && selTrim)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {!termsAccepted && <TermsGate onAccepted={() => setTermsAccepted(true)} />}
      {showUserDataModal && (
        <UserDataModal
          calcCount={calcCount}
          onClose={() => setShowUserDataModal(false)}
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

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Your Location</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ color:'var(--accent)', border:'1px solid rgba(200,255,0,0.3)' }}>
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
                        style={{ color:'var(--accent)', background:'rgba(200,255,0,0.1)', border:'1px solid rgba(200,255,0,0.25)' }}>
                        {locationLabel}
                      </span>
                    )}
                  </div>
                  {locationError && <p className="text-xs text-amber-400">{locationError}</p>}
                </div>
              </div>

              <div className="h-px bg-[var(--border)]" />

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
                />
              </div>

              <div className="h-px bg-[var(--border)]" />

              {/* Financing */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Purchase &amp; Financing</h2>
                  {usingMSRP && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{ color:'#C8FF00', background:'rgba(200,255,0,0.08)', border:'1px solid rgba(200,255,0,0.2)' }}>
                      {origMsrp && carAge > 0 ? 'Est. Current Value' : 'Using MSRP'}
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-5">
                  Adjust any value — results update live.
                </p>
              </div>

              <SliderInput label="Vehicle Purchase Price" value={price} onChange={setPrice}
                min={5000} max={150000} step={500} prefix="$" />

              {origMsrp && carAge > 0 && (
                <p className="text-[10px] text-[var(--text-muted)] -mt-4 pl-1">
                  Auto-set to estimated {carAge}-year depreciated value — original MSRP was{' '}
                  <span className="text-white">{formatCurrency(origMsrp)}</span>
                </p>
              )}

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

              <div className="h-px bg-[var(--border)]" />

              {/* Annual Operating Costs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display font-bold text-white text-lg">Annual Operating Costs</h2>
                  {resolvedState && (
                    <button
                      onClick={() => setCustomCosts(c => !c)}
                      className="text-xs px-3 py-1 rounded-lg border transition-colors"
                      style={{
                        borderColor: customCosts ? 'var(--accent)' : 'var(--border)',
                        color: customCosts ? 'var(--accent)' : 'var(--text-muted)',
                      }}>
                      {customCosts ? 'Use estimates' : 'Customize'}
                    </button>
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
                      : `Estimated for ${resolvedState}${modelData ? (modelData.is_ev ? ' · EV rates' : ` · ${modelData.mpg?.combined ?? 28} MPG`) : ''}.`}
                  </p>
                )}
              </div>

              {resolvedState && !customCosts && (
                <div className="rounded-xl border divide-y"
                  style={{ borderColor:'var(--border)', background:'var(--surface)' }}>
                  {[
                    { label: 'Insurance',              value: annualInsurance,    note: `${resolvedState} rate · ${selMake || 'avg'} brand` },
                    { label: modelData?.is_ev ? 'Charging' : 'Fuel', value: annualFuel, note: modelData?.is_ev ? `$${STATE_ELEC_RATES[resolvedState] ?? 0.16}/kWh` : `$${STATE_FUEL_PRICES[resolvedState] ?? 3.50}/gal` },
                    { label: 'Maintenance & Repairs',  value: annualMaintenance,  note: modelData?.is_ev ? 'EV avg' : 'gas avg' },
                    { label: 'Registration & Fees',    value: annualRegistration, note: `${resolvedState} DMV` },
                  ].map(({ label, value, note }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="text-sm text-white">{label}</span>
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">{note}</span>
                      </div>
                      <span className="font-display font-semibold text-white text-sm">{formatCurrency(value)}/yr</span>
                    </div>
                  ))}
                </div>
              )}

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
                  <SliderInput label="Maintenance &amp; Repairs" value={annualMaintenance} onChange={setAnnualMaintenance}
                    min={0} max={5000} step={50} prefix="$" suffix="/yr" />
                  <SliderInput label="Registration &amp; Fees" value={annualRegistration} onChange={setAnnualRegistration}
                    min={0} max={2000} step={25} prefix="$" suffix="/yr" />
                </>
              )}
            </div>

            {/* ── Results ── */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-20">

              {/* Car visual + specs */}
              {selModel && modelData && (
                <div className="anim-3 flex flex-col gap-4">
                  <CarVisual
                    make={selMake} model={selModel}
                    carType={modelData.type} isEV={modelData.is_ev}
                  />
                  <SpecsPanel specs={modelData.specs} mpg={modelData.mpg} isEV={modelData.is_ev} />
                </div>
              )}

              <div className="anim-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  Your results
                </p>
                <ResultCard label="Monthly Payment" value={results.monthlyPayment} highlight delay={0} />
              </div>

              <div className="grid grid-cols-1 gap-4 anim-5">
                <ResultCard label="Total Interest Paid"  value={results.totalInterestPaid}  delay={60}  />
                <ResultCard label="Total Cost of Loan"   value={results.totalCostOfLoan}    delay={120} />
                <ResultCard label="Loan Cost Per Year"   value={results.trueAnnualCost}     delay={180} />
              </div>

              {/* Annual cost breakdown */}
              <div className="rounded-xl border p-4 flex flex-col gap-3"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Annual Cost Breakdown
                </p>
                <div className="flex flex-col gap-2 text-sm">
                  {[
                    { label: 'Loan payments',          value: results.trueAnnualCost },
                    { label: 'Insurance',              value: annualInsurance },
                    { label: modelData?.is_ev ? 'Charging' : 'Fuel', value: annualFuel },
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
                    <span className="text-[var(--text-muted)]">Total over {ownershipYears} yr{ownershipYears !== 1 ? 's' : ''}</span>
                    <span className="text-[var(--text-muted)] font-medium">{formatCurrency(totalAnnualCost * ownershipYears)}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 border text-sm leading-relaxed"
                style={{ background:'rgba(200,255,0,0.04)', borderColor:'rgba(200,255,0,0.15)', color:'var(--text-muted)' }}>
                <span className="text-[var(--accent)] font-semibold">The real picture: </span>
                Over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}, loan payments total{' '}
                <span className="text-white font-semibold">
                  {formatCurrency(results.monthlyPayment * Math.min(ownershipYears * 12, loanTerm))}
                </span>{' '}
                ({formatCurrency(results.totalInterestPaid)} in interest). Add insurance, fuel, maintenance, and fees and your{' '}
                <span className="text-white font-semibold">all-in annual cost is {formatCurrency(totalAnnualCost)}</span>{' '}
                — or {formatCurrency(totalAnnualCost * ownershipYears)} over {ownershipYears} year{ownershipYears !== 1 ? 's' : ''}.
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
