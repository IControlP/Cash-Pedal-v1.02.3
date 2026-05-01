// ── Shared vehicle cost estimation utilities ──────────────
// Ported from enhanced_depreciation.py, advanced_insurance.py,
// maintenance_utils.py, zip_code_utils.py, taxes_fees_utils.py
// Used by TCOCalculator and SalaryCalculator (Pro mode).

// ── Depreciation ─────────────────────────────────────────

export const BRAND_DEPRECIATION_MULT = {
  Toyota: 0.75, Lexus: 0.78, Porsche: 0.79, Honda: 0.80, Subaru: 0.82,
  Jeep: 0.84, Mazda: 0.86, Acura: 0.87,
  Hyundai: 0.88, Kia: 0.90, GMC: 0.96, Ford: 0.98, Buick: 1.02,
  Chevrolet: 1.00, Ram: 1.02, Nissan: 1.05, Genesis: 0.96, Volvo: 1.05, Infiniti: 1.05,
  Cadillac: 1.08, Volkswagen: 1.08, Audi: 1.05, Mini: 1.10, BMW: 1.05, Lincoln: 1.05,
  'Mercedes-Benz': 1.06, 'Land Rover': 1.10, Dodge: 1.22, Jaguar: 1.12,
  Chrysler: 1.28, 'Alfa Romeo': 1.30, Fiat: 1.35, Mitsubishi: 1.25,
  Tesla: 0.90, Rivian: 1.15, Lucid: 1.22, Polestar: 1.15,
  Maserati: 1.38,
}

export const SEGMENT_CURVES = {
  truck:      {1:.09,2:.16,3:.23,4:.30,5:.36,6:.41,7:.44,8:.48,9:.50,10:.53,11:.55,12:.57,13:.59,14:.59,15:.61},
  sports:     {1:.13,2:.23,3:.32,4:.40,5:.47,6:.52,7:.57,8:.60,9:.63,10:.66,11:.68,12:.69,13:.70,14:.71,15:.72},
  suv:        {1:.12,2:.21,3:.29,4:.35,5:.41,6:.46,7:.50,8:.53,9:.56,10:.59,11:.60,12:.62,13:.63,14:.64,15:.65},
  luxury_suv: {1:.14,2:.23,3:.32,4:.40,5:.47,6:.51,7:.55,8:.59,9:.61,10:.64,11:.66,12:.68,13:.68,14:.69,15:.70},
  hybrid:     {1:.12,2:.21,3:.29,4:.36,5:.43,6:.48,7:.51,8:.55,9:.58,10:.60,11:.62,12:.64,13:.65,14:.66,15:.67},
  compact:    {1:.14,2:.23,3:.32,4:.40,5:.47,6:.51,7:.55,8:.59,9:.61,10:.64,11:.66,12:.68,13:.68,14:.69,15:.70},
  sedan:      {1:.14,2:.25,3:.34,4:.41,5:.49,6:.53,7:.57,8:.60,9:.63,10:.66,11:.68,12:.69,13:.70,14:.71,15:.72},
  luxury:     {1:.18,2:.31,3:.41,4:.49,5:.56,6:.60,7:.64,8:.67,9:.69,10:.71,11:.73,12:.74,13:.75,14:.76,15:.77},
  economy:    {1:.18,2:.31,3:.41,4:.49,5:.56,6:.60,7:.64,8:.68,9:.70,10:.72,11:.74,12:.76,13:.77,14:.77,15:.78},
  electric:   {1:.20,2:.34,3:.45,4:.52,5:.59,6:.63,7:.67,8:.69,9:.71,10:.73,11:.75,12:.76,13:.77,14:.77,15:.78},
}

export const SEGMENT_MAX_DEPR = {
  truck:.61, suv:.65, hybrid:.67, luxury_suv:.70, compact:.70,
  sports:.72, sedan:.72, luxury:.77, economy:.78, electric:.78,
}

// Elite-demand models: exceptional supply/demand retention (×0.82 on brand mult)
export const ELITE_RETENTION = {
  Toyota:    ['4Runner','Tacoma','Land Cruiser'],
  Jeep:      ['Wrangler','Gladiator'],
  Ford:      ['Bronco'],
  Chevrolet: ['Corvette'],
  Porsche:   ['911'],
}

export const HIGH_RETENTION = {
  Toyota:    ['Tundra','Sequoia','RAV4','Highlander','Sienna','Camry','Corolla','Venza','GR86','GR Corolla','GR Supra'],
  Honda:     ['Pilot','Ridgeline','Odyssey','CR-V','HR-V','Passport','Accord','Civic'],
  Subaru:    ['Outback','Forester','Crosstrek','Ascent','WRX','Solterra'],
  Jeep:      ['Grand Cherokee'],
  Ford:      ['F-150','F-250','F-350','Bronco Sport','Mustang','Maverick'],
  Chevrolet: ['Silverado','Tahoe','Suburban','Colorado','TrailBlazer'],
  GMC:       ['Yukon','Yukon XL','Sierra','Canyon'],
  Ram:       ['1500','2500','3500'],
  Lexus:     ['GX','LX','RX','NX','TX','ES','IS'],
  Porsche:   ['Cayenne','Macan','Boxster','Cayman','Panamera'],
  Cadillac:  ['Escalade','XT5','XT6'],
  Lincoln:   ['Navigator','Aviator'],
  Mazda:     ['CX-5','CX-50','CX-70','CX-90','CX-9','Mazda3'],
  Hyundai:   ['Palisade','Santa Fe','Tucson','Ioniq 5','Ioniq 6','Ioniq 9'],
  Kia:       ['Telluride','Sorento','Sportage','EV6','EV9'],
  Acura:     ['MDX','RDX','Integra'],
  Genesis:   ['GV80','GV70','GV60'],
  Tesla:     ['Model Y','Model 3','Cybertruck'],
}

export const POOR_RETENTION = {
  BMW:              ['7 Series','X7','i3','8 Series','iX','i7'],
  'Mercedes-Benz':  ['S-Class','E-Class','CLS','AMG GT','EQS','EQE','EQB','EQC'],
  Audi:             ['A8','A7','A6','Q8','e-tron','e-tron GT','Q8 e-tron'],
  Cadillac:         ['CT4','CT5','CT6','Lyriq'],
  Nissan:           ['Altima','Maxima','Sentra','Leaf','Kicks','Versa','Murano'],
  Jaguar:           ['XJ','XF','F-Type','I-PACE','F-PACE','E-PACE'],
  'Land Rover':     ['Range Rover','Discovery','Defender'],
  Dodge:            ['Durango','Journey','Charger','Challenger'],
  Volkswagen:       ['Passat','Arteon','ID.4','Taos'],
  Maserati:         ['Ghibli','Quattroporte','Levante','Grecale'],
  Mitsubishi:       ['Mirage','Eclipse Cross','Outlander Sport'],
  Chrysler:         ['Pacifica','Voyager'],
  Fiat:             ['500','500X','500L','500e'],
  Lincoln:          ['Nautilus','Corsair'],
  Volvo:            ['S90','V90','XC90'],
}

export function classifySegment(make, model) {
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

export function applyModelAdjustments(make, model, brandMult) {
  const ml = (model ?? '').toLowerCase()
  if (ELITE_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.82
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

  // Mileage adjustment: compare actual miles vs. expected 12 k/yr average.
  // Each 10 % deviation from average shifts depreciation by ~2.5 %.
  // Capped at +10 % extra depreciation (very high mileage) / -8 % (very low).
  let mileageFactor = 1.0
  if (currentMileage != null && ageYears > 0) {
    const expectedMiles = ageYears * 12000
    const mileageRatio  = currentMileage / expectedMiles
    mileageFactor = Math.max(0.92, Math.min(1.10, 1 + (mileageRatio - 1) * 0.25))
  }

  const finalRate = Math.min(baseRate * adjBrand * mileageFactor, cap)
  return Math.max(originalPrice * (1 - finalRate), originalPrice * 0.10)
}

// ── Insurance ────────────────────────────────────────────
// Ported from advanced_insurance.py (AdvancedInsuranceCalculator)

// National average full-coverage premium — updated to 2025 levels (Bankrate/NAIC data)
export const INSURANCE_BASE_RATE = 1760

export const INSURANCE_VALUE_BRACKETS = [
  [0, 15000, .80], [15000, 30000, 1.00], [30000, 50000, 1.18],
  [50000, 80000, 1.40], [80000, Infinity, 1.65],
]

export const INSURANCE_BRAND_MULT = {
  BMW: 1.25, 'Mercedes-Benz': 1.30, Audi: 1.20, Lexus: 1.15, Acura: 1.10,
  Infiniti: 1.10, Cadillac: 1.15, Toyota: 0.88, Honda: 0.90,
  Hyundai: 0.87, Kia: 0.87, Subaru: 0.95, Mazda: 0.93,
  Chevrolet: 1.00, Ford: 1.05, Ram: 1.10, Jeep: 1.10,
  Tesla: 1.35, Rivian: 1.30, Lucid: 1.25,
}

// State base premiums updated to 2025 averages (Bankrate/NAIC)
export const STATE_INS_BASE = {
  AL:1840,AK:1380,AZ:1810,AR:1740,CA:2310,CO:2100,CT:1980,
  DE:1790,FL:3100,GA:2070,HI:1340,ID:1190,IL:1700,IN:1420,
  IA:1250,KS:1580,KY:2030,LA:3090,ME:1160,MD:1980,MA:1520,
  MI:2520,MN:1680,MS:1800,MO:1880,MT:1560,NE:1490,NV:2060,
  NH:1190,NJ:2030,NM:1700,NY:2280,NC:1440,ND:1440,OH:1270,
  OK:2100,OR:1530,PA:1720,RI:2020,SC:1660,SD:1540,TN:1680,
  TX:2310,UT:1640,VT:1160,VA:1480,WA:1620,WV:1610,WI:1330,WY:1420,
}

// state=null → national average
export function estimateInsurance(purchasePrice, make, model, modelYear, state, multiCarDiscount = false) {
  const ageYears   = modelYear ? Math.max(0, new Date().getFullYear() - parseInt(modelYear)) : 0
  const currentVal = estimateCurrentValue(purchasePrice, make || null, model || null, ageYears)
  const [,,valueMult] = INSURANCE_VALUE_BRACKETS.find(([mn, mx]) => currentVal >= mn && currentVal < mx) ?? [0,0,1.0]
  const brandMult  = INSURANCE_BRAND_MULT[make] ?? 1.0
  const stateBase  = STATE_INS_BASE[state] ?? INSURANCE_BASE_RATE
  const multiCarMult = multiCarDiscount ? 0.85 : 1.0
  // Value brackets already capture comp/collision drop from depreciation.
  // This additional factor reflects lower liability/medical claim rates on older vehicles
  // and the insurer's reduced exposure as car value falls beyond bracket thresholds.
  // ~1.5% per year, floored at 0.85 for vehicles 10+ years old.
  const ageMult = ageYears > 0 ? Math.max(0.85, 1 - ageYears * 0.015) : 1.0
  return Math.round((stateBase * valueMult * brandMult * ageMult * multiCarMult) / 50) * 50
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

export const MAINT_TIER_COSTS = {
  luxury:   { oil_change_cost:175, oil_interval:10000, filter_cost:150, tire_rotation_cost:40,  brake_inspection_cost:75,  brake_fluid_flush_cost:200, trans_fluid_cost:400, coolant_flush_cost:250, spark_plug_cost:400, wiper_cost:80,  alignment_cost:200, parts_mult:1.5, labor_mult:1.4 },
  premium:  { oil_change_cost:120, oil_interval:7500,  filter_cost:100, tire_rotation_cost:35,  brake_inspection_cost:60,  brake_fluid_flush_cost:150, trans_fluid_cost:300, coolant_flush_cost:180, spark_plug_cost:280, wiper_cost:60,  alignment_cost:150, parts_mult:1.2, labor_mult:1.2 },
  standard: { oil_change_cost:85,  oil_interval:7500,  filter_cost:70,  tire_rotation_cost:25,  brake_inspection_cost:50,  brake_fluid_flush_cost:120, trans_fluid_cost:200, coolant_flush_cost:150, spark_plug_cost:200, wiper_cost:45,  alignment_cost:120, parts_mult:1.0, labor_mult:1.0 },
  economy:  { oil_change_cost:65,  oil_interval:5000,  filter_cost:50,  tire_rotation_cost:20,  brake_inspection_cost:40,  brake_fluid_flush_cost:100, trans_fluid_cost:180, coolant_flush_cost:120, spark_plug_cost:150, wiper_cost:35,  alignment_cost:100, parts_mult:0.85,labor_mult:0.9  },
}

export const LABOR_RATE = 100

export function generateMaintenanceServices(isEV, annualMileage, segment, make = '') {
  const tier  = determineMaintTier(make)
  const c     = MAINT_TIER_COSTS[tier]
  const brand = MAINT_BRAND_MULT[make] ?? 1.0
  const isTruck  = segment === 'truck'
  const isSports = segment === 'sports'

  const svc = []
  const amortize = (partsCost, laborHrs, intervalMiles) =>
    Math.round((annualMileage / intervalMiles) * (partsCost * c.parts_mult * brand + laborHrs * LABOR_RATE * c.labor_mult))

  if (!isEV) {
    const oilQty = Math.max(1, Math.round(annualMileage / c.oil_interval))
    svc.push({ name: 'Oil changes', detail: `every ${c.oil_interval.toLocaleString()} mi`, annual: Math.round(oilQty * c.oil_change_cost * brand) })
  }

  const filterInterval = tier === 'luxury' ? annualMileage : 15000
  svc.push({ name: 'Air & cabin filters', detail: tier === 'luxury' ? 'annual' : 'every ~15,000 mi', annual: Math.round((annualMileage / filterInterval) * c.filter_cost * brand) })

  const rotations = Math.max(2, Math.floor(annualMileage / 6000))
  svc.push({ name: 'Tire rotations', detail: 'every 6,000 mi', annual: Math.round(rotations * c.tire_rotation_cost * brand) })

  svc.push({ name: 'Brake inspection', detail: 'annual', annual: Math.round(c.brake_inspection_cost * brand) })
  svc.push({ name: 'Wiper blades', detail: 'annual', annual: Math.round(c.wiper_cost * brand) })

  const bfInterval = (tier === 'luxury' || tier === 'premium') ? 24000 : 30000
  svc.push({ name: 'Brake fluid flush', detail: `every ${bfInterval.toLocaleString()} mi`, annual: amortize(c.brake_fluid_flush_cost, 0, bfInterval) })

  if (!isEV) {
    const transInterval = tier === 'luxury' ? 60000 : 80000
    svc.push({ name: 'Transmission fluid', detail: `every ${transInterval.toLocaleString()} mi`, annual: amortize(c.trans_fluid_cost, 0, transInterval) })

    const coolantInterval = tier === 'luxury' ? 60000 : 80000
    svc.push({ name: 'Coolant flush', detail: `every ${coolantInterval.toLocaleString()} mi`, annual: amortize(c.coolant_flush_cost, 0, coolantInterval) })

    const sparkInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 90000
    svc.push({ name: 'Spark plugs', detail: `every ${sparkInterval.toLocaleString()} mi`, annual: amortize(c.spark_plug_cost, 0, sparkInterval) })
  }

  svc.push({ name: 'Wheel alignment', detail: 'every 2 years', annual: Math.round(c.alignment_cost * brand / 2) })

  const tireInterval = isEV ? 40000 : isSports ? 30000 : isTruck ? 45000 : (tier === 'luxury' || tier === 'premium') ? 40000 : 60000
  svc.push({ name: 'Tire replacement (set)', detail: `every ${tireInterval.toLocaleString()} mi`, annual: amortize(600, 2.0, tireInterval) })

  const brakeMult = isEV ? 1.8 : 1.0
  const brakeAnnual =
    amortize(150, 1.0, 60000 * brakeMult) +
    amortize(130, 1.0, 70000 * brakeMult) +
    amortize(300, 1.5, 80000 * brakeMult) +
    amortize(250, 1.5, 90000 * brakeMult)
  svc.push({ name: 'Brake pads & rotors (amortized)', detail: isEV ? 'extended — regen braking' : '~60k–90k mi', annual: Math.round(brakeAnnual) })

  svc.push({ name: '12V battery (amortized)', detail: 'every ~5 years', annual: amortize(180, 0.3, 65000) })

  return svc
}

// Returns per-year, per-service maintenance detail. Each entry is:
//   { year, total, services: [{ name, occurrences, costPerOcc, total }] }
// Only services with ≥1 occurrence in that year are included in the services array.
// startMileage offsets the odometer so year 1 begins at the vehicle's current mileage.
export function generateDetailedMaintenanceByYear(isEV, annualMileage, segment, make = '', years = 5, startMileage = 0) {
  const tier  = determineMaintTier(make)
  const c     = MAINT_TIER_COSTS[tier]
  const brand = MAINT_BRAND_MULT[make] ?? 1.0
  const isTruck  = segment === 'truck'
  const isSports = segment === 'sports'

  const occCost = (partsCost, laborHrs) =>
    Math.round(partsCost * c.parts_mult * brand + laborHrs * LABOR_RATE * c.labor_mult)

  const occsInYear = (yr, intervalMiles) => {
    if (!intervalMiles || intervalMiles <= 0) return 0
    const start = startMileage + (yr - 1) * annualMileage
    const end   = startMileage + yr * annualMileage
    return Math.floor(end / intervalMiles) - Math.floor(start / intervalMiles)
  }

  const defs = []

  if (!isEV) {
    defs.push({ name: 'Oil changes', costPerOcc: Math.round(c.oil_change_cost * brand), intervalMiles: c.oil_interval })
  }

  const filterInterval = tier === 'luxury' ? annualMileage : 15000
  defs.push({ name: 'Air & cabin filters', costPerOcc: Math.round(c.filter_cost * brand), intervalMiles: filterInterval })
  defs.push({ name: 'Tire rotations', costPerOcc: Math.round(c.tire_rotation_cost * brand), intervalMiles: 6000 })
  defs.push({ name: 'Brake inspection', costPerOcc: Math.round(c.brake_inspection_cost * brand), intervalMiles: annualMileage })
  defs.push({ name: 'Wiper blades', costPerOcc: Math.round(c.wiper_cost * brand), intervalMiles: annualMileage })

  const bfInterval = (tier === 'luxury' || tier === 'premium') ? 24000 : 30000
  defs.push({ name: 'Brake fluid flush', costPerOcc: occCost(c.brake_fluid_flush_cost, 0), intervalMiles: bfInterval })

  if (!isEV) {
    const transInterval = tier === 'luxury' ? 60000 : 80000
    defs.push({ name: 'Transmission fluid', costPerOcc: occCost(c.trans_fluid_cost, 0), intervalMiles: transInterval })

    const coolantInterval = tier === 'luxury' ? 60000 : 80000
    defs.push({ name: 'Coolant flush', costPerOcc: occCost(c.coolant_flush_cost, 0), intervalMiles: coolantInterval })

    const sparkInterval = (tier === 'luxury' || tier === 'premium') ? 60000 : 90000
    defs.push({ name: 'Spark plugs', costPerOcc: occCost(c.spark_plug_cost, 0), intervalMiles: sparkInterval })
  }

  defs.push({ name: 'Wheel alignment', costPerOcc: Math.round(c.alignment_cost * brand), intervalMiles: 2 * annualMileage })

  const tireInterval = isEV ? 40000 : isSports ? 30000 : isTruck ? 45000 : (tier === 'luxury' || tier === 'premium') ? 40000 : 60000
  defs.push({ name: 'Tire replacement (set)', costPerOcc: occCost(600, 2.0), intervalMiles: tireInterval })

  const brakeMult = isEV ? 1.8 : 1.0
  defs.push({ name: 'Front brake pads', costPerOcc: occCost(150, 1.0), intervalMiles: 60000 * brakeMult })
  defs.push({ name: 'Rear brake pads',  costPerOcc: occCost(130, 1.0), intervalMiles: 70000 * brakeMult })
  defs.push({ name: 'Front rotors',     costPerOcc: occCost(300, 1.5), intervalMiles: 80000 * brakeMult })
  defs.push({ name: 'Rear rotors',      costPerOcc: occCost(250, 1.5), intervalMiles: 90000 * brakeMult })

  defs.push({ name: '12V battery', costPerOcc: occCost(180, 0.3), intervalMiles: 65000 })

  return Array.from({ length: years }, (_, i) => {
    const yr = i + 1
    const services = defs
      .map(({ name, costPerOcc, intervalMiles }) => {
        const occurrences = occsInYear(yr, intervalMiles)
        return { name, occurrences, costPerOcc, total: occurrences * costPerOcc }
      })
      .filter(s => s.occurrences > 0)
    const total = services.reduce((sum, s) => sum + s.total, 0)
    return { year: yr, total, services }
  })
}

// Convenience wrapper — returns just the per-year totals array.
export function generateMaintenanceByYear(isEV, annualMileage, segment, make = '', years = 5, startMileage = 0) {
  return generateDetailedMaintenanceByYear(isEV, annualMileage, segment, make, years, startMileage).map(yr => yr.total)
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

// AC Level-2 home chargers are ~88% efficient (energy in battery / energy drawn from grid).
// Charging losses of ~12% mean the grid cost is higher than battery consumption suggests.
const EV_CHARGING_OVERHEAD = 1.12

// state=null → national average defaults ($3.50/gal gas, $0.16/kWh electricity)
// isPremium: adds PREMIUM_PRICE_DELTA to the state average when no override is set
export function computeAnnualFuel(isEV, mpgCombined, mpgeCombined, state, miles = 15000, fuelPriceOverride = null, isPremium = false) {
  const KWH_PER_GAL = 33.7
  if (isEV) {
    const mpge = mpgeCombined ?? 100
    // annualKwh is battery consumption; multiply by overhead to get grid draw cost
    const annualKwh = (miles / (mpge / KWH_PER_GAL)) * EV_CHARGING_OVERHEAD
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
    return state ? { state, label: `${t} (${state})` } : null
  }
  if (/^[A-Z]{2}$/.test(t) && STATE_FUEL_PRICES[t]) return { state: t, label: t }
  return null
}
