// ── Shared vehicle cost estimation utilities ──────────────
// Ported from enhanced_depreciation.py, advanced_insurance.py,
// maintenance_utils.py, zip_code_utils.py, taxes_fees_utils.py
// Used by TCOCalculator and SalaryCalculator (Pro mode).

// ── Depreciation ─────────────────────────────────────────

export const BRAND_DEPRECIATION_MULT = {
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

export const HIGH_RETENTION = {
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

export const POOR_RETENTION = {
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
  if (HIGH_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 0.90
  if (POOR_RETENTION[make]?.some(n => ml.includes(n.toLowerCase()))) return brandMult * 1.10
  return brandMult
}

export function estimateCurrentValue(originalPrice, make, model, ageYears) {
  // A brand-new or current-model-year car retains full value
  if (ageYears <= 0) return originalPrice
  const segment  = (make && model) ? classifySegment(make, model) : 'sedan'
  const rawBrand = BRAND_DEPRECIATION_MULT[make] ?? 1.0
  const adjBrand = (make && model) ? applyModelAdjustments(make, model, rawBrand) : rawBrand
  const curve    = SEGMENT_CURVES[segment] ?? SEGMENT_CURVES.sedan
  const baseRate = ageYears <= 15 ? (curve[ageYears] ?? curve[15]) : Math.min(0.96, curve[15] + (ageYears - 15) * 0.005)
  const cap      = SEGMENT_MAX_DEPR[segment] ?? 0.80
  const finalRate = Math.min(baseRate * adjBrand, cap)
  return Math.max(originalPrice * (1 - finalRate), originalPrice * 0.10)
}

// ── Insurance ────────────────────────────────────────────
// Ported from advanced_insurance.py (AdvancedInsuranceCalculator)

export const INSURANCE_BASE_RATE = 1300 // national average annual premium

export const INSURANCE_VALUE_BRACKETS = [
  [0, 15000, .85], [15000, 30000, 1.00], [30000, 50000, 1.15],
  [50000, 80000, 1.35], [80000, Infinity, 1.60],
]

export const INSURANCE_BRAND_MULT = {
  BMW: 1.25, 'Mercedes-Benz': 1.30, Audi: 1.20, Lexus: 1.15, Acura: 1.10,
  Infiniti: 1.10, Cadillac: 1.15, Toyota: 0.90, Honda: 0.90,
  Hyundai: 0.85, Kia: 0.85, Subaru: 0.95, Mazda: 0.95,
  Chevrolet: 1.00, Ford: 1.05, Ram: 1.10, Jeep: 1.10,
}

export const STATE_INS_BASE = {
  AL:1420,AK:1180,AZ:1290,AR:1380,CA:1760,CO:1340,CT:1510,
  DE:1440,FL:2059,GA:1450,HI:1200,ID:1050,IL:1240,IN:1080,
  IA:1050,KS:1150,KY:1350,LA:2298,ME:1020,MD:1380,MA:1175,
  MI:1980,MN:1240,MS:1350,MO:1250,MT:1220,NE:1180,NV:1368,
  NH:1050,NJ:1590,NM:1300,NY:1470,NC:1100,ND:1240,OH:1050,
  OK:1420,OR:1180,PA:1340,RI:1470,SC:1340,SD:1240,TN:1180,
  TX:1550,UT:1170,VT:1050,VA:1180,WA:1240,WV:1390,WI:1100,WY:1240,
}

// state=null → national average
export function estimateInsurance(purchasePrice, make, model, modelYear, state, multiCarDiscount = false) {
  const ageYears   = modelYear ? Math.max(0, new Date().getFullYear() - parseInt(modelYear)) : 0
  const currentVal = estimateCurrentValue(purchasePrice, make || null, model || null, ageYears)
  const [,,valueMult] = INSURANCE_VALUE_BRACKETS.find(([mn, mx]) => currentVal >= mn && currentVal < mx) ?? [0,0,1.0]
  const brandMult  = INSURANCE_BRAND_MULT[make] ?? 1.0
  const stateBase  = STATE_INS_BASE[state] ?? INSURANCE_BASE_RATE
  const multiCarMult = multiCarDiscount ? 0.85 : 1.0
  return Math.round((stateBase * valueMult * brandMult * multiCarMult) / 50) * 50
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

// ── Fuel ─────────────────────────────────────────────────

// Premium unleaded is ~$0.60/gal above regular (national avg, per EIA)
export const PREMIUM_PRICE_DELTA = 0.60

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

export const STATE_FUEL_PRICES = {
  AL:3.20,AK:4.15,AZ:3.85,AR:3.10,CA:4.65,CO:3.50,CT:3.75,
  DE:3.45,FL:3.40,GA:3.30,HI:4.95,ID:3.65,IL:3.60,IN:3.35,
  IA:3.25,KS:3.15,KY:3.30,LA:3.05,ME:3.70,MD:3.55,MA:3.80,
  MI:3.50,MN:3.45,MS:3.10,MO:3.20,MT:3.60,NE:3.30,NV:4.05,
  NH:3.65,NJ:3.70,NM:3.40,NY:3.90,NC:3.35,ND:3.25,OH:3.40,
  OK:3.15,OR:4.10,PA:3.65,RI:3.75,SC:3.25,SD:3.35,TN:3.20,
  TX:3.25,UT:3.75,VT:3.70,VA:3.45,WA:4.20,WV:3.40,WI:3.45,
  WY:3.50,DC:3.60,
}

export const STATE_ELEC_RATES = {
  AL:0.13,AK:0.24,AZ:0.14,AR:0.11,CA:0.33,CO:0.14,CT:0.30,
  DE:0.14,FL:0.14,GA:0.14,HI:0.42,ID:0.10,IL:0.16,IN:0.14,
  IA:0.12,KS:0.14,KY:0.11,LA:0.11,ME:0.16,MD:0.18,MA:0.27,
  MI:0.17,MN:0.14,MS:0.12,MO:0.13,MT:0.12,NE:0.11,NV:0.13,
  NH:0.23,NJ:0.20,NM:0.14,NY:0.20,NC:0.13,ND:0.11,OH:0.15,
  OK:0.12,OR:0.11,PA:0.17,RI:0.28,SC:0.14,SD:0.12,TN:0.12,
  TX:0.13,UT:0.11,VT:0.17,VA:0.13,WA:0.10,WV:0.12,WI:0.15,
  WY:0.12,DC:0.16,
}

// Public DC fast-charging rate ≈ 2.2× home residential (floor $0.29, cap $0.55)
export function getPublicChargingRate(state) {
  const home = STATE_ELEC_RATES[state] ?? 0.16
  return Math.round(Math.max(0.29, Math.min(0.55, home * 2.2)) * 100) / 100
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
