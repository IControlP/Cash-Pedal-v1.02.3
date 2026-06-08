// ── Shared vehicle cost estimation utilities ──────────────
// Ported from enhanced_depreciation.py, advanced_insurance.py,
// maintenance_utils.py, zip_code_utils.py, taxes_fees_utils.py
// Used by TCOCalculator and SalaryCalculator (Pro mode).

// ── Depreciation ─────────────────────────────────────────

export const BRAND_DEPRECIATION_MULT = {
  Toyota: 0.75, Lexus: 0.78, Porsche: 0.79, Honda: 0.80, Subaru: 0.82,
  Jeep: 0.84, Mazda: 0.86, Acura: 0.87,
  Hyundai: 0.88, Kia: 0.90, GMC: 0.96, Ford: 0.98, Buick: 1.02,
  Chevrolet: 1.00, Ram: 1.02, Nissan: 1.02, Genesis: 0.96, Volvo: 1.05, Infiniti: 1.05,
  Cadillac: 1.08, Volkswagen: 1.08, Audi: 1.05, Mini: 1.10, BMW: 1.05, Lincoln: 1.05,
  'Mercedes-Benz': 1.06, 'Land Rover': 1.10, Dodge: 1.15, Jaguar: 1.12,
  Chrysler: 1.12, 'Alfa Romeo': 1.18, Fiat: 1.20, Mitsubishi: 1.10,
  Tesla: 0.90, Rivian: 0.95, Lucid: 1.22, Polestar: 1.15,
  Maserati: 1.38,
}

export const SEGMENT_CURVES = {
  truck:      {1:.09,2:.16,3:.23,4:.30,5:.36,6:.41,7:.44,8:.48,9:.50,10:.53,11:.55,12:.57,13:.59,14:.59,15:.61},
  sports:     {1:.13,2:.23,3:.32,4:.40,5:.47,6:.52,7:.57,8:.60,9:.63,10:.66,11:.68,12:.69,13:.70,14:.71,15:.72},
  suv:        {1:.12,2:.21,3:.29,4:.35,5:.41,6:.46,7:.50,8:.53,9:.56,10:.59,11:.60,12:.62,13:.63,14:.64,15:.65},
  luxury_suv: {1:.13,2:.21,3:.29,4:.36,5:.42,6:.46,7:.50,8:.54,9:.57,10:.60,11:.62,12:.64,13:.65,14:.66,15:.67},
  hybrid:     {1:.12,2:.21,3:.29,4:.36,5:.43,6:.48,7:.51,8:.55,9:.58,10:.60,11:.62,12:.64,13:.65,14:.66,15:.67},
  compact:    {1:.14,2:.23,3:.32,4:.40,5:.47,6:.51,7:.55,8:.59,9:.61,10:.64,11:.66,12:.68,13:.68,14:.69,15:.70},
  sedan:      {1:.14,2:.25,3:.34,4:.41,5:.49,6:.51,7:.56,8:.60,9:.63,10:.66,11:.68,12:.69,13:.70,14:.71,15:.72},
  luxury:     {1:.16,2:.26,3:.34,4:.41,5:.47,6:.51,7:.54,8:.57,9:.59,10:.62,11:.64,12:.65,13:.66,14:.67,15:.68},
  economy:    {1:.17,2:.28,3:.38,4:.45,5:.51,6:.55,7:.59,8:.63,9:.65,10:.67,11:.69,12:.71,13:.72,14:.73,15:.74},
  electric:   {1:.20,2:.34,3:.45,4:.52,5:.59,6:.63,7:.67,8:.69,9:.71,10:.73,11:.75,12:.76,13:.77,14:.77,15:.78},
}

export const SEGMENT_MAX_DEPR = {
  truck:.61, suv:.65, hybrid:.67, luxury_suv:.68, compact:.70,
  sports:.72, sedan:.72, luxury:.72, economy:.74, electric:.78,
}

// Elite-demand models: strong supply/demand retention (×0.72 on brand mult)
export const ELITE_RETENTION = {
  Toyota:    ['RAV4', 'Highlander', 'Sienna', 'Tundra'],
  Honda:     ['Accord', 'Civic'],
  Ford:      ['Mustang', 'Maverick'],
  Jeep:      ['Gladiator'],
  Mazda:     ['MX-5', 'Miata'],
  BMW:       ['M2', 'M3', 'M4', 'M5', 'M8', 'X3 M', 'X5 M', 'X6 M'],
  Audi:      ['RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'R8', 'S4', 'S5', 'S6'],
  'Mercedes-Benz': ['AMG GT', 'AMG C63', 'AMG E63', 'AMG GLC63', 'AMG GLE63', 'AMG G63'],
  Rivian:    ['R1T', 'R1S'],
  Chevrolet: ['Tahoe', 'Suburban'],
  GMC:       ['Yukon', 'Yukon XL'],
  Cadillac:  ['Escalade'],
  Dodge:     ['Charger', 'Challenger'],
  Kia:       ['EV9'],
}

// Legendary value-retention models — empirically lose only 8–20% over 7 years.
// Substantially lower multiplier (×0.45) to reproduce real market data.
export const ULTRA_RETENTION = {
  Toyota:  ['4Runner', 'Tacoma', 'Land Cruiser', 'RAV4 Hybrid'],
  Jeep:    ['Wrangler'],
  Kia:     ['Telluride'],
  Ford:    ['Bronco'],
}

// Near-zero depreciation models — often sell at or above MSRP used.
// Requires ×0.28 multiplier. Porsche 911, C8 Corvette.
export const LEGENDARY_RETENTION = {
  Porsche:   ['911'],
  Chevrolet: ['Corvette'],
}

export const HIGH_RETENTION = {
  Toyota:    ['Sequoia','RAV4','Highlander','Sienna','Camry','Corolla','Venza','GR86','GR Corolla','GR Supra'],
  Honda:     ['Pilot','Ridgeline','Odyssey','CR-V','HR-V','Passport','Accord','Civic'],
  Subaru:    ['Outback','Forester','Crosstrek','Ascent','WRX','Solterra'],
  Ford:      ['F-150','F-250','F-350','Bronco Sport'],
  Chevrolet: ['Silverado','Colorado','TrailBlazer','Camaro'],
  GMC:       ['Sierra','Canyon'],
  Ram:       ['1500','2500','3500'],
  Lexus:     ['GX','LX','RX','NX','TX','ES','IS'],
  Porsche:   ['Cayenne','Macan','Boxster','Cayman','Panamera'],
  Cadillac:  ['XT5','XT6'],
  Lincoln:   ['Navigator','Aviator'],
  Mazda:     ['CX-3','CX-5','CX-30','CX-50','CX-70','CX-90','CX-9','Mazda3','MX-5','Miata'],
  Hyundai:   ['Palisade','Santa Fe','Tucson','Ioniq 5','Ioniq 6','Ioniq 9'],
  Volkswagen: ['ID.4', 'ID.3', 'ID.6'],
  Kia:       ['Telluride','Sorento','Sportage','EV6'],
  Acura:     ['MDX','RDX','Integra'],
  Genesis:   ['GV80','GV70','GV60'],
  Tesla:     ['Model Y','Model 3','Cybertruck','Model S','Model X'],
}

export const POOR_RETENTION = {
  BMW:              ['7 Series','X7','i3','8 Series','iX','i7'],
  'Mercedes-Benz':  ['S-Class','E-Class','CLS','AMG GT','EQS','EQE','EQB','EQC'],
  Audi:             ['A8','A7','A6','Q8','e-tron','e-tron GT','Q8 e-tron'],
  Cadillac:         ['CT4','CT6'],
  Nissan:           ['Maxima','Sentra'],
  Jaguar:           ['XJ','XF','F-Type','I-PACE','F-PACE','E-PACE'],
  Dodge:            ['Durango','Journey'],
  Volkswagen:       ['Passat','Arteon'],
  Maserati:         ['Ghibli','Quattroporte','Levante','Grecale'],
  Mitsubishi:       ['Mirage','Eclipse Cross','Outlander Sport'],
  Fiat:             ['500','500X','500L','500e'],
  Lincoln:          ['Nautilus','Corsair'],
  Volvo:            ['S90','V90','XC90'],
}

export function classifySegment(make, model) {
  const m = (model ?? '').toLowerCase()
  const mk = (make ?? '').toLowerCase()
  if (mk === 'tesla' || ['rivian','lucid','polestar','fisker'].includes(mk)) return 'electric'
  const evKw = ['leaf','ariya','bolt ev','bolt euv','equinox ev','blazer ev','lyriq','ioniq 5','ioniq 6','ioniq electric','kona electric','niro ev','ev6','ev9','gv60','i3','i4','i5','i7','ix','e-tron','taycan','id.4','id.3','mach-e','lightning','eqb','eqc','eqe','eqs','bz4x','rz','solterra','mx-30','i-pace','prologue','zdx']
  if (evKw.some(k => m.includes(k))) return 'electric'
  if (['prius','insight','sienna'].some(k => m.includes(k))) return 'hybrid'
  if (m.includes('hybrid') || m.includes('phev') || m.includes('4xe') || m.includes('plug-in')) return 'hybrid'
  const sportsKw = ['corvette','mustang','camaro','challenger','charger','911','cayman','boxster','z4','supra','miata','mx-5','gt-r','370z','400z','brz','gr86','nsx']
  if (sportsKw.some(k => m.includes(k))) return 'sports'
  const luxBrands = ['bmw','mercedes-benz','audi','lexus','acura','infiniti','cadillac','lincoln','jaguar','land rover','porsche','maserati','alfa romeo','genesis','volvo']
  if (luxBrands.includes(mk)) {
    const luxSuvKw = ['escalade','xt4','xt5','xt6','x1','x2','x3','x4','x5','x6','x7','gla','glb','glc','gle','gls','g-class','q3','q4','q5','q7','q8','ux','nx','rx','gx','lx','rdx','mdx','qx50','qx55','qx60','qx80','navigator','nautilus','aviator','corsair','cayenne','macan','e-pace','f-pace','range rover','discovery','defender','evoque','gv60','gv70','gv80','levante','grecale','xc40','xc60','xc90','v90 cross country']
    return luxSuvKw.some(k => m.includes(k)) ? 'luxury_suv' : 'luxury'
  }
  const truckKw = ['f-150','f-250','f-350','silverado','sierra','ram 1500','ram 2500','tundra','tacoma','frontier','ridgeline','gladiator','ranger','colorado','canyon','titan','maverick','santa cruz']
  if (truckKw.some(k => m.includes(k))) return 'truck'
  const suvKw = ['suburban','tahoe','yukon','pilot','highlander','rav4','cr-v','hr-v','explorer','expedition','escape','equinox','traverse','pathfinder','armada','palisade','telluride','sorento','santa fe','tucson','cx-5','cx-9','outback','forester','ascent','wrangler','grand cherokee','durango','atlas','tiguan','4runner','sequoia','land cruiser','bronco','blazer','trailblazer','compass','renegade','edge','bronco sport','passport','envoy','pacifica','odyssey','caravan','voyager','carnival','sedona','murano','rogue','kicks','kona','venue','sportage','cx-3','cx-30','cx-50','cx-70','cx-90','enclave','encore','envision','acadia','cherokee','taos','trax','ev9']
  if (suvKw.some(k => m.includes(k))) return 'suv'
  if (['civic','corolla','elantra','sentra','forte','jetta','golf','mazda3','impreza','crosstrek'].some(k => m.includes(k))) return 'compact'
  if (['spark','mirage','rio','versa','accent','yaris','fit'].some(k => m.includes(k))) return 'economy'
  return 'sedan'
}

export function applyModelAdjustments(make, model, brandMult) {
  const ml = (model ?? '').toLowerCase()
  // Mach-E is an EV and must not inherit the Mustang retention bonus
  if (ml.includes('mach-e')) return brandMult
  // Check tightest tier first
  if (LEGENDARY_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.28
  if (ULTRA_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.45
  if (ELITE_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.72
  if (HIGH_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.90
  if (POOR_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 1.10
  return brandMult
}

export function estimateCurrentValue(originalPrice, make, model, ageYears, currentMileage = null) {
  // A brand-new or current-model-year car retains full value
  if (ageYears <= 0) return originalPrice
  const segment  = (make && model) ? classifySegment(make, model) : 'sedan'
  const rawBrand = BRAND_DEPRECIATION_MULT[make] ?? 1.0
  const adjBrand = (make && model) ? applyModelAdjustments(make, model, rawBrand) : rawBrand
  const curve    = SEGMENT_CURVES[segment] ?? SEGMENT_CURVES.sedan

  // Linear interpolation so fractional years (e.g. 3.25 for 39-month lease) work correctly
  let baseRate
  if (ageYears > 15) {
    baseRate = Math.min(0.96, curve[15] + (ageYears - 15) * 0.005)
  } else {
    const lo = Math.floor(ageYears)
    const hi = Math.min(Math.ceil(ageYears), 15)
    if (lo === hi) {
      baseRate = curve[lo] ?? 0
    } else {
      const frac   = ageYears - lo
      const rateLo = lo === 0 ? 0 : (curve[lo] ?? curve[15])
      const rateHi = curve[hi] ?? curve[15]
      baseRate = rateLo + (rateHi - rateLo) * frac
    }
  }

  const cap = SEGMENT_MAX_DEPR[segment] ?? 0.80

  // Mileage adjustment: compare actual miles vs. FHWA 2024 average of 13,500 mi/yr.
  // Each 10 % deviation from average shifts depreciation by ~2.5 %.
  // Capped at +10 % extra depreciation (very high mileage) / -8 % (very low).
  let mileageFactor = 1.0
  if (currentMileage != null && ageYears > 0) {
    const expectedMiles = ageYears * 13500
    const mileageRatio  = currentMileage / expectedMiles
    mileageFactor = Math.max(0.92, Math.min(1.10, 1 + (mileageRatio - 1) * 0.25))
  }

  const finalRate = Math.min(baseRate * adjBrand * mileageFactor, cap)
  return Math.max(originalPrice * (1 - finalRate), originalPrice * 0.10)
}

// ── Insurance ────────────────────────────────────────────
// Calibrated to Bankrate / Quadrant Information Services, Nov 2025.
// Benchmark profile: 40-year-old driver, good credit, no at-fault accidents,
// 2023 Toyota Camry, 100/300/100 liability + comprehensive + collision.
// STATE_INS_BASE = (Bankrate state avg) / Toyota_brand_mult (0.92), so that
// Toyota Camry in any state reproduces the published Bankrate dollar figure exactly.
// Other makes and segments adjust multiplicatively from that anchor.

// National fallback (no state provided) — calibrated the same way.
// Lowered from 2870 to 2300 to match Bankrate/Insurify 2025 national avg for a
// 40-year-old good-driver profile (~$2,050 for a Toyota Camry nationally).
export const INSURANCE_BASE_RATE = 2300

// Vehicle current-value brackets — comp/collision exposure scales with value,
// but only modestly: a $60k car is ~18% more expensive to insure than a $30k car
// for a given driver profile. Range narrowed from prior model to avoid over-stacking.
export const INSURANCE_VALUE_BRACKETS = [
  [0, 15000, 0.84], [15000, 25000, 0.93], [25000, 40000, 1.00],
  [40000, 60000, 1.08], [60000, Infinity, 1.18],
]

// Make-specific multipliers relative to Toyota (anchor = 1.00 at 0.92 effective).
// Recalibrated against Insurify/Bankrate 2025-2026 model-level data. Luxury brand
// inflation compressed (value brackets do the heavy lifting for price tier). Tesla
// set to 0.82 — calibrated to Tesla Model 3 national avg $2,818 (Insurify 2025);
// Tesla Insurance program and mature repair network push rates below typical EV levels.
export const INSURANCE_BRAND_MULT = {
  Toyota: 0.92, Honda: 0.93, Mazda: 0.94, Subaru: 0.97, Hyundai: 0.91,
  Kia: 0.91, Chevrolet: 0.98, Ford: 0.95, GMC: 1.00, Ram: 0.88,
  Buick: 1.00, Nissan: 1.02, Mitsubishi: 1.02, Chrysler: 1.02,
  Jeep: 1.05, Dodge: 1.05, Fiat: 1.05,
  Acura: 1.00, Lexus: 1.00, Infiniti: 1.04, Genesis: 1.04,
  Cadillac: 1.08, Lincoln: 1.06, Volvo: 1.06, Volkswagen: 1.06,
  Mini: 1.10, 'Alfa Romeo': 1.10, Audi: 1.10,
  Jaguar: 1.12, BMW: 1.15, Porsche: 1.15,
  'Land Rover': 1.18, 'Mercedes-Benz': 1.18, Maserati: 1.20, Lucid: 1.20,
  Tesla: 0.82, Rivian: 1.15, Polestar: 1.10,
}

// Segment-specific risk multipliers verified against Insurify / Bankrate 2025-2026 data.
// EV multiplier reflects price-controlled comparison (vehicle value already captured by
// brackets above): non-Tesla EVs run ~10-15% higher for repair complexity, battery costs,
// and limited independent shop availability. Sports cars 25-34% above average (risk
// profile, theft). Trucks 10-20% below average (rural use, lower theft/accident rates).
// NOTE: Tesla brand mult (0.82) is set below 1.0 to reflect Tesla Insurance program and
// better-than-average repair outcomes — calibrated to Tesla Model 3 national avg $2,818.
export const INSURANCE_SEGMENT_MULT = {
  electric:   1.10,
  sports:     1.15,  // pony/sports cars; exotics covered by value brackets
  truck:      0.90,
  luxury_suv: 1.04,
  suv:        0.97,
  luxury:     1.04,
  hybrid:     1.04,
  compact:    0.97,
  sedan:      1.00,
  economy:    0.95,
}

// State base premiums — Bankrate / Quadrant, Nov 2025 (all states).
// Each value = published Bankrate state average ÷ 0.92 (Toyota brand mult),
// so Toyota Camry output = Bankrate published figure for that state.
export const STATE_INS_BASE = {
  AL:2350,AK:2575,AZ:2875,AR:2650,CA:3400,CO:3425,CT:2925,
  DC:3075,DE:3150,FL:4525,GA:3150,HI:1825,ID:1600,IL:2575,
  IN:1850,IA:2075,KS:2625,KY:2825,LA:4325,ME:1825,MD:3300,
  MA:2225,MI:3400,MN:2800,MS:1950,MO:2800,MT:2600,NE:2600,
  NV:3875,NH:1850,NJ:3550,NM:2350,NY:4250,NC:2000,ND:1950,
  OH:2000,OK:3050,OR:2300,PA:2675,RI:3250,SC:2200,SD:2425,
  TN:2125,TX:2925,UT:2225,VT:1750,VA:2250,WA:2075,WV:2350,
  WI:2075,WY:1925,
}

// state=null → national average fallback
export function estimateInsurance(purchasePrice, make, model, modelYear, state, multiCarDiscount = false) {
  const ageYears   = modelYear ? Math.max(0, new Date().getFullYear() - parseInt(modelYear)) : 0
  const currentVal = estimateCurrentValue(purchasePrice, make || null, model || null, ageYears)
  const [,,valueMult] = INSURANCE_VALUE_BRACKETS.find(([mn, mx]) => currentVal >= mn && currentVal < mx) ?? [0,0,1.0]
  const brandMult  = INSURANCE_BRAND_MULT[make] ?? 1.0
  const stateBase  = STATE_INS_BASE[state] ?? INSURANCE_BASE_RATE
  const multiCarMult = multiCarDiscount ? 0.85 : 1.0
  // Segment captures risk factors not fully reflected in vehicle value alone
  // (theft profile, accident frequency, powertrain repair complexity).
  const segment  = (make && model) ? classifySegment(make, model) : null
  const segMult  = segment ? (INSURANCE_SEGMENT_MULT[segment] ?? 1.0) : 1.0
  // Value brackets capture comp/collision reduction as the car depreciates.
  // ageMult captures the additional liability/frequency discount on older vehicles:
  // ~1.5%/yr reduction, floored at 0.85 for vehicles 10+ years old.
  const ageMult  = ageYears > 0 ? Math.max(0.85, 1 - ageYears * 0.015) : 1.0
  return Math.round((stateBase * valueMult * brandMult * segMult * ageMult * multiCarMult) / 50) * 50
}

// ── Maintenance ──────────────────────────────────────────
// Ported from maintenance_utils.py — EnhancedMaintenanceCalculator

export const MAINT_BRAND_MULT = {
  Toyota: 0.85, Honda: 0.90, Lexus: 1.05, Mazda: 0.92, Subaru: 0.95,
  Nissan: 0.95, Infiniti: 1.10, Acura: 1.08,
  BMW: 1.50, 'Mercedes-Benz': 1.55, Audi: 1.45, Porsche: 1.80, Volkswagen: 1.15,
  Ford: 1.00, Chevrolet: 0.98, GMC: 1.02, Ram: 1.05, Jeep: 1.10, Cadillac: 1.35,
  Hyundai: 0.88, Kia: 0.88, Genesis: 1.15,
  Tesla: 0.70, Rivian: 0.75, Lucid: 0.75,
}

// Segment-level maintenance averages (national, 13k mi/yr, standard brand).
// Based on AAA/Consumer Reports benchmarks. Apply MAINT_BRAND_MULT on top for make-specific estimates.
export const SEGMENT_MAINT_AVG = {
  economy:    800,
  compact:    950,
  sedan:      1100,
  suv:        1350,
  luxury_suv: 2200,
  truck:      1450,
  sports:     1600,
  luxury:     2000,
  electric:   700,
  hybrid:     900,
}

export const MAINT_LUXURY_MAKES = new Set(['BMW','Mercedes-Benz','Audi','Porsche','Lexus','Land Rover',
  'Jaguar','Maserati','Alfa Romeo','Genesis','Lucid','Rivian'])
export const MAINT_PREMIUM_MAKES = new Set(['Acura','Infiniti','Volvo','Lincoln','Cadillac','Tesla','Buick','Mini','Polestar'])
export const MAINT_ECONOMY_MAKES = new Set(['Kia','Hyundai','Nissan','Mitsubishi','Fiat','Chrysler'])

export function determineMaintTier(make) {
  if (MAINT_LUXURY_MAKES.has(make))  return 'luxury'
  if (MAINT_PREMIUM_MAKES.has(make)) return 'premium'
  if (MAINT_ECONOMY_MAKES.has(make)) return 'economy'
  return 'standard'
}

// oil_type: the fluid the vehicle requires (shown in service line item names).
// shock_cost: per-axle OEM shock/strut parts cost.
// tire_cost: full set of 4 tires typical for segment.
// fuel_injector_cost: cleaning service parts cost.
export const MAINT_TIER_COSTS = {
  luxury:   { oil_type:'Full Synthetic',    oil_change_cost:175, oil_interval:10000, filter_cost:150, tire_rotation_cost:40, brake_inspection_cost:75,  brake_fluid_flush_cost:200, trans_fluid_cost:400, coolant_flush_cost:250, spark_plug_cost:400, wiper_cost:80,  alignment_cost:200, shock_cost:600, tire_cost:1000, fuel_injector_cost:140, parts_mult:1.5, labor_mult:1.4 },
  premium:  { oil_type:'Full Synthetic',    oil_change_cost:120, oil_interval:7500,  filter_cost:100, tire_rotation_cost:35, brake_inspection_cost:60,  brake_fluid_flush_cost:150, trans_fluid_cost:300, coolant_flush_cost:180, spark_plug_cost:280, wiper_cost:60,  alignment_cost:150, shock_cost:420, tire_cost:780,  fuel_injector_cost:110, parts_mult:1.2, labor_mult:1.2 },
  standard: { oil_type:'Synthetic Blend',   oil_change_cost:85,  oil_interval:7500,  filter_cost:70,  tire_rotation_cost:25, brake_inspection_cost:50,  brake_fluid_flush_cost:120, trans_fluid_cost:200, coolant_flush_cost:150, spark_plug_cost:200, wiper_cost:45,  alignment_cost:120, shock_cost:350, tire_cost:600,  fuel_injector_cost:80,  parts_mult:1.0, labor_mult:1.0 },
  economy:  { oil_type:'Conventional',      oil_change_cost:65,  oil_interval:5000,  filter_cost:50,  tire_rotation_cost:20, brake_inspection_cost:40,  brake_fluid_flush_cost:100, trans_fluid_cost:180, coolant_flush_cost:120, spark_plug_cost:150, wiper_cost:35,  alignment_cost:100, shock_cost:270, tire_cost:450,  fuel_injector_cost:60,  parts_mult:0.85,labor_mult:0.9 },
}

// National average shop rate ($/hr) — used as fallback when no state is provided.
export const LABOR_RATE = 110

// State-level independent shop labor rates ($/hr), sourced from BLS / RepairPal 2025.
// Coastal metros run 40–60% above rural south/midwest.
export const STATE_LABOR_RATES = {
  AL: 93,  AK: 132, AZ: 118, AR: 88,  CA: 160, CO: 135, CT: 142,
  DC: 152, DE: 120, FL: 118, GA: 110, HI: 150, ID: 98,  IL: 128,
  IN: 105, IA: 92,  KS: 95,  KY: 98,  LA: 95,  ME: 105, MD: 135,
  MA: 150, MI: 108, MN: 118, MS: 88,  MO: 100, MT: 95,  NE: 95,
  NV: 118, NH: 118, NJ: 148, NM: 95,  NY: 155, NC: 108, ND: 92,
  OH: 108, OK: 92,  OR: 132, PA: 112, RI: 122, SC: 100, SD: 90,
  TN: 102, TX: 112, UT: 115, VT: 110, VA: 128, WA: 150, WV: 90,
  WI: 108, WY: 95,
}

// ZIP-code-level labor rate zones for intra-state metro variation.
// Each entry: [zipLo, zipHi, laborRate ($/hr)].
// getLocalLaborRate() checks these before falling back to STATE_LABOR_RATES.
// Ranges are non-overlapping within each state; sorted loosely by state.
export const ZIP_LABOR_RATE_ZONES = [
  // ── California (largest spread: $112 rural → $198 SF core) ──
  [94102, 94188, 198], // San Francisco proper
  [94501, 94578, 190], // Oakland / Alameda
  [94601, 94699, 188], // East Oakland
  [94701, 94710, 195], // Berkeley
  [94901, 94960, 192], // Marin County
  [94002, 94066, 188], // Peninsula (Burlingame, San Mateo)
  [95002, 95099, 192], // San Jose / Silicon Valley south
  [95100, 95199, 192], // San Jose core
  [95300, 95399, 172], // Hayward / Fremont
  [90210, 90299, 178], // Beverly Hills / West LA
  [90401, 90499, 172], // Santa Monica
  [90001, 90209, 168], // South / Central LA
  [90500, 90899, 168], // LA Basin east
  [91001, 91199, 162], // Pasadena / Arcadia
  [91200, 91599, 160], // San Fernando Valley west
  [91600, 91999, 158], // Burbank / Glendale
  [92001, 92120, 162], // San Diego core
  [92121, 92173, 158], // San Diego (La Jolla, Mission Valley)
  [92174, 92299, 148], // San Diego east / Chula Vista
  [92600, 92699, 162], // Orange County (Irvine, Newport Beach)
  [92700, 92899, 155], // Orange County (Anaheim, Fullerton)
  [92300, 92599, 138], // Inland Empire (Riverside, San Bernardino)
  [93001, 93099, 128], // Ventura County
  [93100, 93199, 125], // Santa Barbara
  [93200, 93599, 118], // Central Valley (Fresno, Bakersfield south)
  [93600, 93999, 115], // Bakersfield / Southern Central Valley
  [95400, 95699, 142], // Sacramento core
  [95700, 95999, 135], // Sacramento suburbs / Placer County
  [96001, 96199, 112], // Far Northern CA (Redding, Chico)

  // ── New York ──────────────────────────────────────────────
  [10001, 10119, 192], // Manhattan core
  [10120, 10299, 185], // Midtown / Upper Manhattan
  [10301, 10399, 175], // Staten Island
  [10400, 10499, 168], // Bronx
  [10500, 10599, 165], // Westchester (Yonkers, White Plains)
  [10600, 10999, 160], // Outer Westchester
  [11001, 11099, 170], // Nassau County west
  [11100, 11299, 168], // Nassau County
  [11300, 11799, 162], // Nassau / Suffolk west
  [11800, 11999, 155], // Eastern Suffolk (Hamptons area)
  [11201, 11239, 178], // Brooklyn (brownstone)
  [11370, 11415, 172], // Queens (Flushing, Astoria)
  [12001, 12999, 130], // Hudson Valley / Albany metro
  [13001, 13999, 125], // Central NY (Syracuse, Utica)
  [14001, 14999, 122], // Western NY (Buffalo, Rochester)

  // ── Texas ─────────────────────────────────────────────────
  [78701, 78749, 135], // Austin core (downtown)
  [78750, 78799, 130], // Austin (Round Rock, Cedar Park)
  [78600, 78699, 125], // Austin suburbs
  [75201, 75299, 128], // Dallas core
  [75001, 75200, 122], // Dallas suburbs
  [75400, 75599, 112], // East TX / DFW outer
  [76001, 76199, 120], // Fort Worth
  [76200, 76299, 115], // Fort Worth suburbs
  [77001, 77099, 125], // Houston core
  [77100, 77299, 120], // Houston suburbs (Sugar Land, Katy)
  [77300, 77599, 115], // Houston outer suburbs
  [78201, 78299, 112], // San Antonio
  [79901, 79999, 105], // El Paso
  [75600, 75999, 100], // Rural / East TX
  [78800, 78999, 100], // South TX / Rio Grande Valley

  // ── Florida ───────────────────────────────────────────────
  [33101, 33189, 140], // Miami city
  [33190, 33299, 135], // Miami-Dade suburbs
  [33300, 33499, 132], // Fort Lauderdale / Broward
  [33500, 33599, 125], // Tampa core
  [33600, 33699, 122], // St. Pete / Clearwater
  [32700, 32799, 120], // Orlando core
  [32800, 32899, 118], // Orlando suburbs (Kissimmee)
  [32001, 32099, 115], // Jacksonville core
  [32100, 32299, 112], // Jacksonville suburbs
  [34201, 34299, 120], // Sarasota / Bradenton
  [32900, 33099, 112], // Melbourne / Space Coast
  [32400, 32599, 108], // Tallahassee
  [32600, 32699, 105], // Gainesville / Panhandle

  // ── Washington ────────────────────────────────────────────
  [98101, 98119, 175], // Seattle core (Cap Hill, Belltown)
  [98001, 98100, 162], // South King County / SeaTac
  [98200, 98299, 170], // Bellevue / Eastside (Redmond, Kirkland)
  [98300, 98399, 148], // Tacoma / Pierce County north
  [98400, 98499, 142], // Tacoma south
  [98500, 98599, 135], // Olympia / Thurston County
  [98600, 98699, 130], // SW Washington (Vancouver)
  [98700, 98799, 145], // Snohomish County (Everett)
  [98800, 98899, 122], // Wenatchee / Central WA
  [99201, 99299, 118], // Spokane

  // ── Illinois ──────────────────────────────────────────────
  [60601, 60699, 158], // Chicago downtown / Loop
  [60700, 60799, 152], // Chicago north / Evanston
  [60001, 60600, 148], // Chicago metro / close suburbs
  [60800, 61099, 138], // Chicago outer suburbs (Naperville, Aurora)
  [61100, 62999, 112], // Downstate IL (Peoria, Springfield, Champaign)

  // ── Massachusetts ─────────────────────────────────────────
  [2100, 2139, 182], // Boston / Back Bay / South End
  [2140, 2199, 178], // Cambridge / Somerville
  [2200, 2299, 168], // South Boston / Quincy
  [2300, 2399, 158], // South Shore
  [1700, 1799, 155], // MetroWest (Framingham, Natick)
  [1800, 1999, 150], // North Shore / Lowell
  [1001, 1699, 140], // Worcester / Western MA
  [2600, 2799, 148], // Cape Cod

  // ── New Jersey ────────────────────────────────────────────
  [7600, 7699, 172], // Bergen County (Hackensack — NYC commuter)
  [7000, 7099, 165], // Essex / Hudson (Newark, Jersey City)
  [7100, 7299, 160], // Passaic / Union
  [7300, 7499, 155], // Morris County
  [7500, 7799, 150], // Somerset / Middlesex
  [8001, 8099, 140], // Camden / Burlington
  [8100, 8399, 138], // South Jersey shore / Cherry Hill
  [8400, 8999, 135], // Atlantic City region

  // ── Colorado ──────────────────────────────────────────────
  [80301, 80309, 162], // Boulder
  [80201, 80299, 152], // Denver core
  [80001, 80200, 148], // Denver suburbs (Aurora, Lakewood)
  [80400, 80499, 155], // Jefferson County (Golden, Evergreen)
  [80501, 80599, 148], // Fort Collins / Loveland
  [80901, 80999, 128], // Colorado Springs
  [81001, 81699, 115], // Pueblo / Western CO / Grand Junction

  // ── Virginia ──────────────────────────────────────────────
  [22001, 22099, 158], // Loudoun County (Tysons, Reston)
  [22100, 22299, 155], // Fairfax County
  [22300, 22399, 155], // Arlington / Alexandria
  [20100, 20199, 158], // Loudoun / Prince William
  [23200, 23299, 125], // Richmond
  [23600, 23699, 122], // Norfolk / Virginia Beach
  [24001, 24299, 112], // Roanoke
  [24300, 24699, 105], // Southwest VA (rural)

  // ── Maryland ──────────────────────────────────────────────
  [20600, 20799, 158], // Bethesda / Silver Spring / Montgomery Co.
  [20800, 20999, 152], // Prince George's County
  [21201, 21299, 142], // Baltimore city
  [21100, 21200, 138], // Baltimore suburbs (Towson, Columbia)
  [21001, 21099, 135], // Baltimore outer (Harford, Carroll)
  [21500, 21999, 118], // Western / Eastern Shore MD

  // ── Oregon ────────────────────────────────────────────────
  [97201, 97299, 155], // Portland core (NW, Pearl District)
  [97100, 97200, 148], // Portland inner eastside / suburbs
  [97001, 97099, 142], // Portland metro outer (Beaverton, Hillsboro)
  [97300, 97399, 132], // Salem
  [97400, 97499, 130], // Eugene / Corvallis
  [97500, 97999, 112], // Southern / Eastern OR

  // ── Arizona ───────────────────────────────────────────────
  [85250, 85266, 142], // Scottsdale
  [85200, 85249, 132], // Tempe / Mesa
  [85001, 85099, 128], // Phoenix core
  [85100, 85199, 125], // Phoenix west / Glendale
  [85400, 85699, 118], // Chandler / Gilbert / East Valley
  [85700, 85799, 112], // Tucson core
  [85800, 85899, 108], // Tucson suburbs
  [86001, 86599, 100], // Flagstaff / Northern AZ

  // ── Georgia ───────────────────────────────────────────────
  [30301, 30399, 130], // Atlanta core (Buckhead, Midtown)
  [30200, 30300, 125], // Atlanta metro (Smyrna, Marietta)
  [30001, 30199, 120], // Atlanta suburbs (Alpharetta, Roswell)
  [30400, 30999, 102], // North/Central GA
  [31001, 31599, 98],  // South GA
  [31600, 31999, 95],  // Deep South GA
  [39800, 39999, 100], // Southeast GA / Savannah area

  // ── Michigan ──────────────────────────────────────────────
  [48201, 48299, 125], // Detroit proper
  [48100, 48200, 120], // Detroit inner suburbs (Dearborn, Warren)
  [48001, 48099, 118], // Metro Detroit outer (Troy, Sterling Heights)
  [48300, 48499, 110], // Ann Arbor / Flint
  [48500, 48999, 105], // SE Michigan rural / Lansing
  [49001, 49499, 105], // Grand Rapids / West MI
  [49500, 49999, 98],  // Northern / Rural MI

  // ── Pennsylvania ──────────────────────────────────────────
  [19101, 19199, 140], // Philadelphia core
  [19000, 19100, 135], // Philadelphia suburbs (Main Line)
  [15200, 15299, 128], // Pittsburgh core
  [15001, 15199, 122], // Pittsburgh suburbs
  [17001, 17099, 112], // Harrisburg
  [18001, 18999, 110], // Lehigh Valley / Scranton / Pocono
  [16001, 16999, 108], // Western PA (rural)

  // ── Ohio ──────────────────────────────────────────────────
  [43201, 43299, 122], // Columbus core (Short North, German Village)
  [43001, 43200, 118], // Columbus suburbs
  [44101, 44199, 120], // Cleveland core
  [44001, 44100, 112], // Cleveland suburbs (Akron, Parma)
  [45201, 45299, 122], // Cincinnati core (OTR, Hyde Park)
  [45001, 45200, 115], // Cincinnati suburbs
  [44200, 45899, 105], // Dayton / other OH metros
  [45900, 45999, 98],  // Rural OH

  // ── Minnesota ─────────────────────────────────────────────
  [55401, 55415, 140], // Minneapolis core (downtown, Uptown)
  [55001, 55400, 132], // Minneapolis / Saint Paul metro
  [55416, 55499, 135], // Minneapolis suburbs (Bloomington, Eden Prairie)
  [55500, 55899, 118], // Rochester / Duluth area
  [55900, 56799, 108], // Greater MN

  // ── Nevada ────────────────────────────────────────────────
  [89101, 89139, 132], // Las Vegas Strip / downtown
  [89140, 89199, 128], // Las Vegas suburbs (Henderson, Summerlin)
  [89001, 89100, 125], // Outer Clark County
  [89401, 89599, 120], // Reno core
  [89600, 89799, 112], // Reno suburbs / Carson City
  [89700, 89999, 105], // Rural NV

  // ── Tennessee ─────────────────────────────────────────────
  [37201, 37249, 122], // Nashville core (Gulch, East Nashville)
  [37001, 37200, 115], // Nashville suburbs (Franklin, Brentwood)
  [38101, 38199, 112], // Memphis core
  [38200, 38399, 105], // Memphis suburbs
  [37300, 37599, 100], // Knoxville / Chattanooga
  [37600, 37999, 98],  // East TN rural
  [38400, 38599, 95],  // West TN rural

  // ── North Carolina ────────────────────────────────────────
  [27601, 27613, 122], // Raleigh core
  [27700, 27799, 120], // Durham / Chapel Hill
  [27001, 27600, 115], // Triangle metro suburbs / Cary
  [28201, 28262, 118], // Charlotte core
  [28001, 28200, 112], // Charlotte suburbs (Huntersville, Matthews)
  [28263, 28999, 102], // Outer NC / Asheville area
  [27614, 27699, 110], // Raleigh outer

  // ── Connecticut ───────────────────────────────────────────
  [6600, 6699, 162], // Stamford / Greenwich (NYC financial suburb)
  [6800, 6899, 158], // Fairfield County east (Norwalk, Westport)
  [6101, 6199, 148], // Hartford metro
  [6200, 6599, 140], // New Haven / Waterbury
  [6001, 6099, 138], // Litchfield / Northeast CT

  // ── South Carolina ────────────────────────────────────────
  [29401, 29499, 110], // Charleston
  [29200, 29299, 108], // Columbia
  [29601, 29699, 105], // Greenville
  [29700, 29999, 100], // Other SC
  [29001, 29199, 98],  // Rural SC

  // ── Wisconsin ─────────────────────────────────────────────
  [53201, 53299, 118], // Milwaukee core
  [53001, 53200, 112], // Milwaukee suburbs / Waukesha
  [53700, 53799, 118], // Madison
  [53400, 53699, 108], // Racine / Kenosha / Sheboygan
  [54000, 54999, 102], // Green Bay / Fox Valley / Rural WI

  // ── Missouri ──────────────────────────────────────────────
  [63101, 63199, 110], // St. Louis core
  [63001, 63100, 108], // St. Louis suburbs (Clayton, Chesterfield)
  [64101, 64199, 108], // Kansas City core
  [64000, 64100, 105], // KC suburbs (Overland Park side)
  [63200, 64999, 98],  // Springfield / outstate MO
  [65001, 65899, 95],  // Rural MO

  // ── Indiana ───────────────────────────────────────────────
  [46201, 46299, 115], // Indianapolis core (Broad Ripple, Fountain Sq)
  [46001, 46200, 110], // Indianapolis suburbs (Carmel, Fishers)
  [46300, 46399, 108], // Gary / NW Indiana (Chicago influence)
  [46400, 47999, 100], // Other IN

  // ── Utah ──────────────────────────────────────────────────
  [84101, 84149, 125], // Salt Lake City core
  [84001, 84100, 120], // SLC suburbs (Sandy, Murray, Provo)
  [84150, 84199, 118], // West Valley / Taylorsville
  [84200, 84799, 108], // Provo / Orem / Other UT

  // ── Oregon ── (already above, catching any gaps)

  // ── Louisiana ─────────────────────────────────────────────
  [70101, 70199, 102], // New Orleans core
  [70000, 70100, 98],  // New Orleans suburbs (Metairie)
  [70800, 70899, 98],  // Baton Rouge
  [70300, 70799, 95],  // Lafayette / Lake Charles
  [71001, 71499, 92],  // Shreveport / North LA

  // ── Alabama ───────────────────────────────────────────────
  [35201, 35299, 100], // Birmingham core
  [35001, 35200, 98],  // Birmingham suburbs (Hoover, Vestavia)
  [36101, 36199, 95],  // Montgomery
  [35300, 35999, 93],  // Huntsville / Tuscaloosa
  [36200, 36999, 90],  // Mobile / Rural AL

  // ── Kentucky ──────────────────────────────────────────────
  [40201, 40299, 108], // Louisville core
  [40001, 40200, 105], // Louisville suburbs (Jeffersontown, St. Matthews)
  [40500, 40599, 105], // Lexington
  [40300, 42799, 95],  // Other KY / Rural

  // ── Iowa ──────────────────────────────────────────────────
  [50301, 50399, 100], // Des Moines core
  [50001, 50300, 95],  // Des Moines suburbs / Cedar Rapids
  [51001, 52999, 90],  // Other IA (Iowa City, Davenport, Sioux City)

  // ── Kansas ────────────────────────────────────────────────
  [66101, 66219, 102], // Kansas City metro KS side (Overland Park, Lenexa)
  [67201, 67299, 98],  // Wichita
  [66220, 67999, 92],  // Other KS

  // ── Nebraska ──────────────────────────────────────────────
  [68101, 68199, 102], // Omaha core
  [68001, 68100, 98],  // Omaha suburbs / Lincoln
  [68500, 68599, 98],  // Lincoln
  [68200, 68499, 92],  // Other NE

  // ── New Mexico ────────────────────────────────────────────
  [87101, 87199, 102], // Albuquerque
  [87500, 87599, 102], // Santa Fe
  [87000, 88499, 92],  // Other NM

  // ── Idaho ─────────────────────────────────────────────────
  [83701, 83799, 108], // Boise core
  [83200, 83700, 98],  // Other ID

  // ── Mississippi ───────────────────────────────────────────
  [39201, 39299, 92],  // Jackson
  [38600, 39999, 88],  // Other MS

  // ── Arkansas ──────────────────────────────────────────────
  [72201, 72299, 95],  // Little Rock / Fayetteville
  [71600, 72999, 88],  // Other AR

  // ── West Virginia ─────────────────────────────────────────
  [25301, 25399, 95],  // Charleston WV
  [24700, 26999, 88],  // Other WV

  // ── Hawaii ────────────────────────────────────────────────
  [96801, 96813, 168], // Honolulu core
  [96814, 96849, 160], // Honolulu suburbs / other Oahu
  [96700, 96800, 145], // Neighbor islands (Maui, Big Island, Kauai)

  // ── Alaska ────────────────────────────────────────────────
  [99501, 99524, 148], // Anchorage core
  [99525, 99599, 138], // Anchorage suburbs
  [99600, 99999, 128], // Fairbanks / rural AK
]

// Returns the most specific labor rate available: ZIP zone → state avg → national fallback.
export function getLocalLaborRate(zip, state) {
  if (zip && /^\d{5}$/.test(String(zip))) {
    const z = parseInt(zip)
    for (const [lo, hi, rate] of ZIP_LABOR_RATE_ZONES) {
      if (z >= lo && z <= hi) return rate
    }
  }
  return STATE_LABOR_RATES[state] ?? LABOR_RATE
}

// Road harshness multiplier — >1.0 means parts wear faster (shorter effective service
// intervals) due to freeze-thaw, road salt, potholes, hills, or extreme heat.
// Applied to: tires, brakes, shocks/struts, wheel alignment, brake fluid.
// Sources: TRIP road quality data 2024, FHWA pavement condition reports, IIHS region data.
export const STATE_ROAD_WEAR_FACTOR = {
  // Salt belt + severe freeze-thaw + pothole-heavy roads
  MI: 1.22, OH: 1.20, NY: 1.18, PA: 1.18, MA: 1.16, CT: 1.14,
  RI: 1.14, NH: 1.12, VT: 1.12, ME: 1.10, MN: 1.18, WI: 1.15,
  IL: 1.14, IN: 1.12, MO: 1.10, WV: 1.12, NJ: 1.12, MD: 1.10,
  // Mountain winters + salt
  AK: 1.22, CO: 1.12, WY: 1.10, MT: 1.10, ND: 1.12, SD: 1.08,
  IA: 1.08, KS: 1.05, NE: 1.05,
  // Mid-Atlantic / Appalachian hills
  VA: 1.08, DE: 1.06, KY: 1.08, DC: 1.10,
  // Pacific Northwest (wet roads, surface degradation)
  WA: 1.06, OR: 1.05,
  // Southern humidity + heat (rubber, seals; moderate roads)
  NC: 1.00, TN: 1.02, AL: 1.00, MS: 1.00, LA: 1.02, AR: 1.02, SC: 0.98,
  GA: 0.98, FL: 0.96, TX: 0.97, OK: 1.00,
  // Dry high-desert heat (tire dry-rot, rubber degradation)
  AZ: 0.95, NM: 0.97, NV: 0.96, UT: 0.97,
  // Mild, dry, well-maintained roads
  CA: 0.92, HI: 0.88, ID: 0.98,
}

export function generateMaintenanceServices(isEV, annualMileage, segment, make = '', state = null, vehicleAgeYears = 0, laborRateOverride = null) {
  const tier      = determineMaintTier(make)
  const c         = MAINT_TIER_COSTS[tier]
  const brand     = MAINT_BRAND_MULT[make] ?? 1.0
  const laborRate = laborRateOverride ?? STATE_LABOR_RATES[state] ?? LABOR_RATE
  const wearFactor = STATE_ROAD_WEAR_FACTOR[state] ?? 1.0
  const isTruck   = segment === 'truck'
  const isSports  = segment === 'sports'
  const isSUV     = segment === 'suv' || segment === 'luxury_suv'

  const svc = []
  const amortize = (partsCost, laborHrs, intervalMiles) =>
    Math.round((annualMileage / intervalMiles) * (partsCost * c.parts_mult * brand + laborHrs * laborRate * c.labor_mult))

  // Oil changes — oil type shown in the label
  if (!isEV) {
    const oilQty = Math.max(1, Math.round(annualMileage / c.oil_interval))
    svc.push({ name: `Oil changes (${c.oil_type})`, detail: `every ${c.oil_interval.toLocaleString()} mi`, annual: Math.round(oilQty * c.oil_change_cost * brand) })
  }

  const filterInterval = tier === 'luxury' ? annualMileage : 15000
  svc.push({ name: 'Air & cabin filters', detail: tier === 'luxury' ? 'annual' : 'every ~15,000 mi', annual: Math.round((annualMileage / filterInterval) * c.filter_cost * brand) })

  // Tire rotations — EVs every 5k (torque accelerates wear), gas every 6k
  const rotationInterval = Math.round((isEV ? 5000 : 6000) / wearFactor)
  const rotations = Math.max(2, Math.floor(annualMileage / rotationInterval))
  svc.push({ name: 'Tire rotations', detail: `every ${rotationInterval.toLocaleString()} mi`, annual: Math.round(rotations * c.tire_rotation_cost * brand) })

  svc.push({ name: 'Brake inspection', detail: 'annual', annual: Math.round(c.brake_inspection_cost * brand) })
  svc.push({ name: 'Wiper blades', detail: 'annual', annual: Math.round(c.wiper_cost * brand) })

  const bfInterval = Math.round(((tier === 'luxury' || tier === 'premium') ? 24000 : 30000) / wearFactor)
  svc.push({ name: 'Brake fluid flush', detail: `every ${bfInterval.toLocaleString()} mi`, annual: amortize(c.brake_fluid_flush_cost, 0, bfInterval) })

  if (!isEV) {
    const transInterval = tier === 'luxury' ? 60000 : 80000
    svc.push({ name: 'Transmission fluid', detail: `every ${transInterval.toLocaleString()} mi`, annual: amortize(c.trans_fluid_cost, 0, transInterval) })

    const coolantInterval = tier === 'luxury' ? 60000 : 80000
    svc.push({ name: 'Coolant flush', detail: `every ${coolantInterval.toLocaleString()} mi`, annual: amortize(c.coolant_flush_cost, 0, coolantInterval) })

    const sparkInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 90000
    svc.push({ name: 'Spark plugs', detail: `every ${sparkInterval.toLocaleString()} mi`, annual: amortize(c.spark_plug_cost, 0, sparkInterval) })

    const beltInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 80000
    svc.push({ name: 'Serpentine belt', detail: `every ${beltInterval.toLocaleString()} mi`, annual: amortize(60, 0.5, beltInterval) })

    svc.push({ name: 'PCV valve', detail: 'every 60,000 mi', annual: amortize(30, 0.3, 60000) })

    const injectorInterval = (tier === 'luxury' || tier === 'premium') ? 45000 : 60000
    svc.push({ name: 'Fuel injector service', detail: `every ${injectorInterval.toLocaleString()} mi`, annual: amortize(c.fuel_injector_cost, 0.5, injectorInterval) })

    svc.push({ name: 'Oxygen sensor(s)', detail: 'every 100,000 mi', annual: amortize(220, 1.0, 100000) })
  }

  // AC service applies to all vehicles (refrigerant check + inspection)
  const acInterval = Math.round(50000 / wearFactor)
  svc.push({ name: 'AC system service', detail: `every ${acInterval.toLocaleString()} mi`, annual: amortize(80, 0.5, acInterval) })

  // EV battery cooling loop service
  if (isEV) {
    svc.push({ name: 'Battery coolant service', detail: 'every 50,000 mi', annual: amortize(100, 0.5, 50000) })
  }

  const alignInterval = Math.round(2 * annualMileage / wearFactor)
  svc.push({ name: 'Wheel alignment', detail: 'every 2 years', annual: Math.round(c.alignment_cost * brand / 2) })

  const baseTireInterval = isEV ? 40000 : isSports ? 30000 : isTruck ? 45000 : (tier === 'luxury' || tier === 'premium') ? 40000 : 60000
  const tireInterval = Math.round(baseTireInterval / wearFactor)
  svc.push({ name: 'Tire replacement (set)', detail: `every ${tireInterval.toLocaleString()} mi`, annual: amortize(c.tire_cost, 2.0, tireInterval) })

  const brakeMult = isEV ? 1.8 : 1.0
  const brakeAnnual =
    amortize(150, 1.0, Math.round(60000 * brakeMult / wearFactor)) +
    amortize(130, 1.0, Math.round(70000 * brakeMult / wearFactor)) +
    amortize(300, 1.5, Math.round(80000 * brakeMult / wearFactor)) +
    amortize(250, 1.5, Math.round(90000 * brakeMult / wearFactor))
  svc.push({ name: 'Brake pads & rotors (amortized)', detail: isEV ? 'extended — regen braking' : '~60k–90k mi', annual: Math.round(brakeAnnual) })

  const shockInterval = Math.round((isTruck ? 80000 : 90000) / wearFactor)
  const strutInterval = Math.round((isTruck ? 80000 : 100000) / wearFactor)
  const shockAnnual = amortize(c.shock_cost, 1.5, shockInterval) + amortize(c.shock_cost * 0.8, 1.5, strutInterval)
  svc.push({ name: 'Shocks & struts (amortized)', detail: `every ${shockInterval.toLocaleString()}–${strutInterval.toLocaleString()} mi`, annual: Math.round(shockAnnual) })

  svc.push({ name: '12V battery', detail: 'every ~5 years', annual: amortize(180, 0.3, 65000) })

  // Differential fluid — trucks and AWD-likely SUVs
  if (isTruck || isSUV) {
    const diffInterval = isTruck ? 30000 : 45000
    svc.push({ name: 'Differential fluid', detail: `every ${diffInterval.toLocaleString()} mi`, annual: amortize(80, 0.5, diffInterval) })
  }

  // Transfer case fluid — primarily trucks (majority are 4WD)
  if (isTruck) {
    svc.push({ name: 'Transfer case fluid', detail: 'every 45,000 mi', annual: amortize(80, 0.5, 45000) })
  }

  // Unscheduled repair reserve — age-weighted budget for non-scheduled failures.
  // Scales with vehicle age, brand reliability (via brand mult), and powertrain complexity.
  const ageForReserve = Math.max(0, vehicleAgeYears)
  const unscheduledBase = isEV
    ? Math.max(0, (ageForReserve - 1) * 110)
    : Math.max(0, (ageForReserve - 2) * 170)
  const unscheduledCap = isEV ? 900 : tier === 'luxury' ? 2600 : tier === 'premium' ? 2000 : 1500
  const unscheduled = Math.round(Math.min(unscheduledCap, unscheduledBase * brand) / 50) * 50
  if (unscheduled > 0) {
    svc.push({ name: 'Unscheduled repair reserve', detail: 'age-based estimate', annual: unscheduled })
  }

  return svc
}

// Returns per-year, per-service maintenance detail. Each entry is:
//   { year, total, services: [{ name, occurrences, costPerOcc, total }] }
// Only services with ≥1 occurrence in that year are included in the services array.
// startMileage offsets the odometer so year 1 begins at the vehicle's current mileage.
// state adjusts labor rates and road-condition wear factors.
// vehicleAgeAtStart is the vehicle's age (in years) when ownership begins.
export function generateDetailedMaintenanceByYear(isEV, annualMileage, segment, make = '', years = 5, startMileage = 0, state = null, vehicleAgeAtStart = 0, laborRateOverride = null) {
  const tier      = determineMaintTier(make)
  const c         = MAINT_TIER_COSTS[tier]
  const brand     = MAINT_BRAND_MULT[make] ?? 1.0
  const laborRate = laborRateOverride ?? STATE_LABOR_RATES[state] ?? LABOR_RATE
  const wearFactor = STATE_ROAD_WEAR_FACTOR[state] ?? 1.0
  const isTruck   = segment === 'truck'
  const isSports  = segment === 'sports'
  const isSUV     = segment === 'suv' || segment === 'luxury_suv'

  const occCost = (partsCost, laborHrs) =>
    Math.round(partsCost * c.parts_mult * brand + laborHrs * laborRate * c.labor_mult)

  const occsInYear = (yr, intervalMiles) => {
    if (!intervalMiles || intervalMiles <= 0) return 0
    const start = startMileage + (yr - 1) * annualMileage
    const end   = startMileage + yr * annualMileage
    return Math.floor(end / intervalMiles) - Math.floor(start / intervalMiles)
  }

  const defs = []

  // Oil changes — oil type in label
  if (!isEV) {
    defs.push({ name: `Oil changes (${c.oil_type})`, costPerOcc: Math.round(c.oil_change_cost * brand), intervalMiles: c.oil_interval })
  }

  // Filters
  const filterInterval = tier === 'luxury' ? annualMileage : 15000
  defs.push({ name: 'Air & cabin filters', costPerOcc: Math.round(c.filter_cost * brand), intervalMiles: filterInterval })

  // Tire rotations — EVs every 5k (high torque = faster wear), road-wear adjusted
  const rotationInterval = Math.round((isEV ? 5000 : 6000) / wearFactor)
  defs.push({ name: 'Tire rotations', costPerOcc: Math.round(c.tire_rotation_cost * brand), intervalMiles: rotationInterval })

  // Annual services
  defs.push({ name: 'Brake inspection', costPerOcc: Math.round(c.brake_inspection_cost * brand), intervalMiles: annualMileage })
  defs.push({ name: 'Wiper blades', costPerOcc: Math.round(c.wiper_cost * brand), intervalMiles: annualMileage })

  // Brake fluid — road-wear adjusted (salt/moisture contaminate fluid faster)
  const bfInterval = Math.round(((tier === 'luxury' || tier === 'premium') ? 24000 : 30000) / wearFactor)
  defs.push({ name: 'Brake fluid flush', costPerOcc: occCost(c.brake_fluid_flush_cost, 0), intervalMiles: bfInterval })

  if (!isEV) {
    const transInterval = tier === 'luxury' ? 60000 : 80000
    defs.push({ name: 'Transmission fluid', costPerOcc: occCost(c.trans_fluid_cost, 0), intervalMiles: transInterval })

    const coolantInterval = tier === 'luxury' ? 60000 : 80000
    defs.push({ name: 'Coolant flush', costPerOcc: occCost(c.coolant_flush_cost, 0), intervalMiles: coolantInterval })

    const sparkInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 90000
    defs.push({ name: 'Spark plugs', costPerOcc: occCost(c.spark_plug_cost, 0), intervalMiles: sparkInterval })

    const beltInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 80000
    defs.push({ name: 'Serpentine belt', costPerOcc: occCost(60, 0.5), intervalMiles: beltInterval })

    defs.push({ name: 'PCV valve', costPerOcc: occCost(30, 0.3), intervalMiles: 60000 })

    const injectorInterval = (tier === 'luxury' || tier === 'premium') ? 45000 : 60000
    defs.push({ name: 'Fuel injector service', costPerOcc: occCost(c.fuel_injector_cost, 0.5), intervalMiles: injectorInterval })

    defs.push({ name: 'Oxygen sensor(s)', costPerOcc: occCost(220, 1.0), intervalMiles: 100000 })
  }

  // AC service — all vehicles; heat/humidity shorten refrigerant life
  const acInterval = Math.round(50000 / wearFactor)
  defs.push({ name: 'AC system service', costPerOcc: occCost(80, 0.5), intervalMiles: acInterval })

  // EV battery cooling loop (separate from HVAC refrigerant)
  if (isEV) {
    defs.push({ name: 'Battery coolant service', costPerOcc: occCost(100, 0.5), intervalMiles: 50000 })
  }

  // Wheel alignment — road-wear adjusted (potholes, salt-eroded curbs)
  const alignInterval = Math.round(2 * annualMileage / wearFactor)
  defs.push({ name: 'Wheel alignment', costPerOcc: Math.round(c.alignment_cost * brand), intervalMiles: alignInterval })

  // Tires — segment-differentiated cost and road-wear adjusted interval
  const baseTireInterval = isEV ? 40000 : isSports ? 30000 : isTruck ? 45000 : (tier === 'luxury' || tier === 'premium') ? 40000 : 60000
  const tireInterval = Math.round(baseTireInterval / wearFactor)
  defs.push({ name: 'Tire replacement (set)', costPerOcc: occCost(c.tire_cost, 2.0), intervalMiles: tireInterval })

  // Brake pads & rotors — road-wear adjusted (hills, salt corrosion)
  const brakeMult = isEV ? 1.8 : 1.0
  defs.push({ name: 'Front brake pads', costPerOcc: occCost(150, 1.0), intervalMiles: Math.round(60000 * brakeMult / wearFactor) })
  defs.push({ name: 'Rear brake pads',  costPerOcc: occCost(130, 1.0), intervalMiles: Math.round(70000 * brakeMult / wearFactor) })
  defs.push({ name: 'Front rotors',     costPerOcc: occCost(300, 1.5), intervalMiles: Math.round(80000 * brakeMult / wearFactor) })
  defs.push({ name: 'Rear rotors',      costPerOcc: occCost(250, 1.5), intervalMiles: Math.round(90000 * brakeMult / wearFactor) })

  // Shocks & struts — road-wear adjusted (potholes, rough surfaces)
  const shockInterval = Math.round((isTruck ? 80000 : 90000) / wearFactor)
  const strutInterval = Math.round((isTruck ? 80000 : 100000) / wearFactor)
  defs.push({ name: 'Front shocks/struts', costPerOcc: occCost(c.shock_cost, 1.5), intervalMiles: shockInterval })
  defs.push({ name: 'Rear shocks/struts',  costPerOcc: occCost(Math.round(c.shock_cost * 0.8), 1.5), intervalMiles: strutInterval })

  // 12V battery
  defs.push({ name: '12V battery', costPerOcc: occCost(180, 0.3), intervalMiles: 65000 })

  // Differential fluid — trucks always, AWD-likely SUVs included
  if (isTruck || isSUV) {
    const diffInterval = isTruck ? 30000 : 45000
    defs.push({ name: 'Differential fluid', costPerOcc: occCost(80, 0.5), intervalMiles: diffInterval })
  }

  // Transfer case fluid — trucks (majority are 4WD)
  if (isTruck) {
    defs.push({ name: 'Transfer case fluid', costPerOcc: occCost(80, 0.5), intervalMiles: 45000 })
  }

  return Array.from({ length: years }, (_, i) => {
    const yr = i + 1

    // Scheduled services
    const services = defs
      .map(({ name, costPerOcc, intervalMiles }) => {
        const occurrences = occsInYear(yr, intervalMiles)
        return { name, occurrences, costPerOcc, total: occurrences * costPerOcc }
      })
      .filter(s => s.occurrences > 0)

    // Unscheduled repair reserve — grows with vehicle age, weighted by brand reliability.
    // Added as a separate budget line so it's visible in the forecast breakdown.
    const vehicleAgeThisYear = vehicleAgeAtStart + yr
    const unscheduledBase = isEV
      ? Math.max(0, (vehicleAgeThisYear - 1) * 110)
      : Math.max(0, (vehicleAgeThisYear - 2) * 170)
    const unscheduledCap = isEV ? 900 : tier === 'luxury' ? 2600 : tier === 'premium' ? 2000 : 1500
    const unscheduled = Math.round(Math.min(unscheduledCap, unscheduledBase * brand) / 50) * 50
    if (unscheduled > 0) {
      services.push({ name: 'Unscheduled repair reserve', occurrences: 1, costPerOcc: unscheduled, total: unscheduled })
    }

    const total = services.reduce((sum, s) => sum + s.total, 0)
    return { year: yr, total, services }
  })
}

// Convenience wrapper — returns just the per-year totals array.
export function generateMaintenanceByYear(isEV, annualMileage, segment, make = '', years = 5, startMileage = 0, state = null, vehicleAgeAtStart = 0, laborRateOverride = null) {
  return generateDetailedMaintenanceByYear(isEV, annualMileage, segment, make, years, startMileage, state, vehicleAgeAtStart, laborRateOverride).map(yr => yr.total)
}

// ── Fuel ─────────────────────────────────────────────────

// Premium unleaded is ~$0.70/gal above regular (national avg, per EIA 2025)
export const PREMIUM_PRICE_DELTA = 0.70

// Brands where every ICE model requires premium
export const PREMIUM_FUEL_MAKES = new Set([
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Infiniti', 'Genesis',
  'Maserati', 'Alfa Romeo', 'Jaguar', 'Land Rover', 'Ferrari',
  'Cadillac', 'Lincoln', 'Volvo', 'Acura',
])

// Specific models from non-premium brands that require/strongly recommend premium
export const PREMIUM_FUEL_MODELS = {
  Lexus:     ['IS 350','IS 500','RC','LC','LS','GS','LX','GX'],
  Toyota:    ['GR Supra','GR86','GR Corolla','Crown'],
  Honda:     ['Civic Type R'],
  Subaru:    ['WRX'],
  Chevrolet: ['Corvette','Camaro'],
  Ford:      ['Mustang Shelby','Mustang Mach 1','GT'],
  Dodge:     ['Challenger SRT','Charger SRT','Durango SRT','Viper'],
  Kia:       ['Stinger'],
  Hyundai:   ['Elantra N','Sonata N Line'],
  Nissan:    ['GT-R','370Z','400Z'],
}

export function requiresPremiumFuel(make, model) {
  if (!make) return false
  if (PREMIUM_FUEL_MAKES.has(make)) return true
  const ml = (model ?? '').toLowerCase()
  return (PREMIUM_FUEL_MODELS[make] ?? []).some(m => ml.includes(m.toLowerCase()))
}

// Regular unleaded state averages — updated to 2025 levels (EIA/GasBuddy data)
export const STATE_FUEL_PRICES = {
  AL:3.05,AK:3.95,AZ:3.70,AR:2.95,CA:4.80,CO:3.30,CT:3.55,
  DE:3.20,FL:3.25,GA:3.05,HI:4.90,ID:3.50,IL:3.55,IN:3.25,
  IA:3.10,KS:2.95,KY:3.05,LA:2.90,ME:3.45,MD:3.35,MA:3.60,
  MI:3.40,MN:3.30,MS:2.90,MO:2.95,MT:3.40,NE:3.10,NV:3.90,
  NH:3.35,NJ:3.45,NM:3.10,NY:3.75,NC:3.10,ND:3.05,OH:3.15,
  OK:2.95,OR:3.95,PA:3.55,RI:3.50,SC:3.05,SD:3.15,TN:3.05,
  TX:3.00,UT:3.55,VT:3.50,VA:3.20,WA:4.10,WV:3.25,WI:3.30,
  WY:3.25,DC:3.75,
}

// Residential electricity rates $/kWh — updated to 2025 levels (EIA data)
export const STATE_ELEC_RATES = {
  AL:0.14,AK:0.25,AZ:0.15,AR:0.11,CA:0.38,CO:0.15,CT:0.33,
  DE:0.15,FL:0.15,GA:0.14,HI:0.44,ID:0.11,IL:0.17,IN:0.15,
  IA:0.13,KS:0.14,KY:0.12,LA:0.11,ME:0.18,MD:0.19,MA:0.30,
  MI:0.19,MN:0.15,MS:0.12,MO:0.13,MT:0.12,NE:0.12,NV:0.14,
  NH:0.26,NJ:0.22,NM:0.14,NY:0.22,NC:0.13,ND:0.11,OH:0.15,
  OK:0.12,OR:0.12,PA:0.18,RI:0.30,SC:0.14,SD:0.12,TN:0.12,
  TX:0.14,UT:0.12,VT:0.19,VA:0.14,WA:0.11,WV:0.13,WI:0.16,
  WY:0.12,DC:0.17,
}

// Public DC fast-charging rate ≈ 2.2× home residential (floor $0.29, cap $0.65)
// Cap raised from $0.55 — HI/CA public DCFC stations routinely exceed $0.60/kWh
export function getPublicChargingRate(state) {
  const home = STATE_ELEC_RATES[state] ?? 0.16
  return Math.round(Math.max(0.29, Math.min(0.65, home * 2.2)) * 100) / 100
}

// 'home' = 100% residential, 'mixed' = 80/20 home/DCFC, 'public' = 100% DCFC
export function getEffectiveElecRate(state, style) {
  const home = STATE_ELEC_RATES[state] ?? 0.16
  const pub  = getPublicChargingRate(state)
  if (style === 'public') return pub
  if (style === 'mixed')  return Math.round((home * 0.80 + pub * 0.20) * 1000) / 1000
  return home
}

// state=null → national average defaults ($3.50/gal gas, $0.16/kWh electricity)
// isPremium: adds PREMIUM_PRICE_DELTA to the state average when no override is set
export function computeAnnualFuel(isEV, mpgCombined, mpgeCombined, state, miles = 15000, fuelPriceOverride = null, isPremium = false) {
  const KWH_PER_GAL = 33.7
  if (isEV) {
    const mpge = mpgeCombined ?? 100
    const annualKwh = miles / (mpge / KWH_PER_GAL)
    const rate = fuelPriceOverride !== null ? fuelPriceOverride : (STATE_ELEC_RATES[state] ?? 0.16)
    return Math.round(annualKwh * rate / 50) * 50
  }
  const mpg = mpgCombined ?? 28
  const base = STATE_FUEL_PRICES[state] ?? 3.50
  const price = fuelPriceOverride !== null
    ? fuelPriceOverride
    : base + (isPremium ? PREMIUM_PRICE_DELTA : 0)
  return Math.round((miles / mpg) * price / 50) * 50
}

// ── Registration ─────────────────────────────────────────

export const STATE_REG_FEE = {
  AL:50,AK:50,AZ:32,AR:25,CA:65,CO:75,CT:60,DE:40,DC:72,FL:56,
  GA:20,HI:50,ID:68,IL:151,IN:45,IA:50,KS:42,KY:21,LA:30,ME:35,
  MD:135,MA:60,MI:50,MN:53,MS:14,MO:33,MT:140,NE:37,NV:41,NH:48,
  NJ:50,NM:40,NY:75,NC:60,ND:49,OH:31,OK:50,OR:268,PA:42,RI:73,
  SC:40,SD:36,TN:28,TX:51,UT:51,VT:76,VA:36,WA:87,WV:52,WI:89,WY:30,
}

export const STATE_VLF = {
  CA:[0.0065,51],VA:[0.0401,0],CT:[0.007,0],KS:[0.01,0],KY:[0.006,0],
  MN:[0.0125,0],MS:[0.005,0],MO:[0.0033,0],MT:[0,40],NC:[0.006,0],
  SC:[0.005,0],WV:[0.006,0],WY:[0.003,0],AZ:[0.005,0],CO:[0.003,15],
  IA:[0.01,0],MA:[0.025,0],NV:[0.008,0],WA:[0.003,0],
}

// state=null → $50 base, no VLF
export function computeAnnualRegistration(state, vehicleValue) {
  const base = STATE_REG_FEE[state] ?? 50
  const [rate, flat] = STATE_VLF[state] ?? [0, 0]
  return Math.round((base + vehicleValue * rate + flat) / 25) * 25
}

// ── Sales Tax ────────────────────────────────────────────
// State-level vehicle sales tax rates. Local taxes may add 0–4% on top.
// Notable exceptions: NC/SC have statutory caps; MT/NH/OR/DE have no sales tax.
export const STATE_VEHICLE_SALES_TAX = {
  AL:0.0200, AK:0.0000, AZ:0.0560, AR:0.0650, CA:0.0725, CO:0.0290,
  CT:0.0635, DE:0.0000, FL:0.0600, GA:0.0700, HI:0.0400, ID:0.0600,
  IL:0.0625, IN:0.0700, IA:0.0500, KS:0.0650, KY:0.0600, LA:0.0445,
  ME:0.0550, MD:0.0600, MA:0.0625, MI:0.0600, MN:0.0650, MS:0.0500,
  MO:0.0423, MT:0.0000, NE:0.0550, NV:0.0685, NH:0.0000, NJ:0.0663,
  NM:0.0488, NY:0.0400, NC:0.0300, ND:0.0500, OH:0.0575, OK:0.0325,
  OR:0.0000, PA:0.0600, RI:0.0700, SC:0.0500, SD:0.0400, TN:0.0700,
  TX:0.0625, UT:0.0485, VT:0.0600, VA:0.0430, WA:0.0650, WV:0.0600,
  WI:0.0500, WY:0.0400, DC:0.0600,
}

// States with a statutory dollar cap on vehicle sales tax
export const STATE_VEHICLE_TAX_CAP = { NC: 2000, SC: 500 }

export function computeSalesTax(state, vehiclePrice) {
  const rate = STATE_VEHICLE_SALES_TAX[state] ?? 0.0625
  const raw  = vehiclePrice * rate
  const cap  = STATE_VEHICLE_TAX_CAP[state]
  return Math.round((cap != null ? Math.min(raw, cap) : raw) / 25) * 25
}

// ── Dealer Doc Fees ───────────────────────────────────────
// Typical dealer documentation fee by state. CA/TX/NY/MN/OR are capped by law.
export const STATE_DOC_FEE_AVG = {
  AL:485, AK:400, AZ:410, AR:129, CA:85,  CO:490, CT:349, DE:299,
  FL:699, GA:545, HI:499, ID:299, IL:169, IN:199, IA:145, KS:399,
  KY:485, LA:299, ME:299, MD:399, MA:395, MI:230, MN:75,  MS:399,
  MO:449, MT:299, NE:299, NV:499, NH:399, NJ:399, NM:319, NY:75,
  NC:599, ND:249, OH:250, OK:399, OR:115, PA:389, RI:399, SC:225,
  SD:299, TN:499, TX:125, UT:399, VT:299, VA:699, WA:150, WV:299,
  WI:199, WY:249, DC:299,
}

// ── Regional Used-Car Demand ──────────────────────────────
// Static premium/discount vs. national average used-car asking prices.
// Based on regional supply/demand patterns; updated periodically.
export const STATE_USED_CAR_DEMAND = {
  HI: 0.08, AK: 0.06, CA: 0.06, WA: 0.05, OR: 0.04, MA: 0.04,
  NY: 0.04, CO: 0.04, CT: 0.03, NJ: 0.03, VA: 0.03, MD: 0.03,
  AZ: 0.03, FL: 0.02, UT: 0.02, NV: 0.02, TX: 0.01, GA: 0.01,
  IA:-0.03, KS:-0.03, NE:-0.03, ND:-0.04, SD:-0.04, WY:-0.03,
  MT:-0.02, ID:-0.02, AR:-0.03, MS:-0.03, WV:-0.03, OK:-0.02,
  AL:-0.02, LA:-0.02,
}

export function getRegionalDemandPremium(state) {
  return STATE_USED_CAR_DEMAND[state] ?? 0.0
}

// ── Location ─────────────────────────────────────────────

export const ZIP_RANGES = [
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

export function zipToState(zip) {
  if (!/^\d{5}$/.test(zip)) return null
  const z = parseInt(zip)
  for (const [state, ranges] of ZIP_RANGES) {
    for (const [lo, hi] of ranges) {
      if (z >= lo && z <= hi) return state
    }
  }
  return null
}

export function resolveLocation(input) {
  const t = input.trim().toUpperCase()
  if (/^\d{5}$/.test(t)) {
    const state = zipToState(t)
    if (!state) return null
    const laborRate = getLocalLaborRate(t, state)
    return { state, label: `${t} (${state})`, zip: t, laborRate }
  }
  if (/^[A-Z]{2}$/.test(t) && STATE_FUEL_PRICES[t]) {
    return { state: t, label: t, zip: null, laborRate: STATE_LABOR_RATES[t] ?? LABOR_RATE }
  }
  return null
}
