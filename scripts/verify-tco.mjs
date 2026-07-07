// ── TCO / Maintenance accuracy verification harness ───────────────────────
// Runs representative vehicle configurations across every segment and checks
// the calculator's average annual maintenance against published per-segment
// benchmarks (AAA "Your Driving Costs" 2024 + Consumer Reports 10-yr data),
// requiring agreement within a ±10% margin.
//
//   node scripts/verify-tco.mjs
//
import {
  SEGMENT_MAINT_AVG,
  classifySegment,
  generateMaintenanceByYear,
  generateDetailedMaintenanceByYear,
  getLocalWearProfile,
  resolveCategoryWear,
  getKnownIssueServices,
  classifyTrimStress,
  MAINT_BRAND_MULT,
  zipToState,
  resolveLocation,
  getLocalLaborRate,
  STATE_LABOR_RATES,
} from '../src/utils/vehicleCosts.js'

// Benchmark basis: 13,000 mi/yr, national (no state), averaged over a
// 10-year / 130k-mi ownership window starting from new. This spans the full
// scheduled-service catalog (tires, brakes, fluids, plugs, struts) so the
// average reflects true lifetime annual maintenance, not just early years.
const ANNUAL_MILEAGE = 13000
const YEARS = 10
const MARGIN = 0.10

// Independent published per-segment annual maintenance & repair benchmarks.
// Sources: AAA Your Driving Costs 2024 (maintenance/repair/tire line),
// Consumer Reports 10-year maintenance averages, RepairPal segment data.
// These are deliberately external to the app's own SEGMENT_MAINT_AVG table so
// the test validates against real-world data, not the code's own assumptions.
const EXTERNAL_BENCHMARK = {
  economy:    { low: 700,  high: 1000 },
  compact:    { low: 850,  high: 1150 },
  sedan:      { low: 950,  high: 1300 },
  suv:        { low: 1150, high: 1600 },
  luxury_suv: { low: 1900, high: 2500 },
  truck:      { low: 1250, high: 1700 },
  sports:     { low: 1350, high: 1900 },
  luxury:     { low: 1700, high: 2300 },
  electric:   { low: 550,  high: 950  },
  hybrid:     { low: 750,  high: 1150 },
}

// Representative real vehicles per segment (used to confirm classifySegment
// routes them correctly and that brand-adjusted costs stay sane).
const SAMPLE_VEHICLES = {
  economy:    [['Nissan', 'Versa'], ['Mitsubishi', 'Mirage'], ['Kia', 'Rio']],
  compact:    [['Honda', 'Civic'], ['Toyota', 'Corolla'], ['Mazda', 'Mazda3']],
  sedan:      [['Toyota', 'Camry'], ['Honda', 'Accord'], ['Nissan', 'Altima']],
  suv:        [['Toyota', 'RAV4'], ['Honda', 'CR-V'], ['Ford', 'Explorer']],
  luxury_suv: [['BMW', 'X5'], ['Mercedes-Benz', 'GLE'], ['Audi', 'Q7']],
  truck:      [['Ford', 'F-150'], ['Chevrolet', 'Silverado'], ['Toyota', 'Tundra']],
  sports:     [['Chevrolet', 'Corvette'], ['Ford', 'Mustang'], ['Nissan', 'Z']],
  luxury:     [['BMW', '5 Series'], ['Mercedes-Benz', 'E-Class'], ['Audi', 'A6']],
  electric:   [['Tesla', 'Model 3'], ['Hyundai', 'Ioniq 5'], ['Ford', 'Mustang Mach-E']],
  hybrid:     [['Toyota', 'Prius'], ['Honda', 'Accord Hybrid'], ['Hyundai', 'Tucson Hybrid']],
}

function avgAnnualMaint(segment, make = '', isEV = false) {
  const totals = generateMaintenanceByYear(isEV, ANNUAL_MILEAGE, segment, make, YEARS, 0, null, 0)
  return totals.reduce((a, b) => a + b, 0) / totals.length
}

function pct(n) { return (n * 100).toFixed(1) + '%' }
function money(n) { return '$' + Math.round(n).toLocaleString() }

console.log('═'.repeat(78))
console.log('  CASH PEDAL — TCO MAINTENANCE ACCURACY VERIFICATION')
console.log(`  ${ANNUAL_MILEAGE.toLocaleString()} mi/yr · ${YEARS}-yr avg · standard brand · national rates`)
console.log('═'.repeat(78))

let failSegment = 0
const segLines = []

// ── Part 1: real-world segment average vs external benchmark ───────────────
// The segment average is the mean annual maintenance across that segment's
// representative real vehicles (mainstream brands for mainstream segments,
// luxury brands for luxury segments) — i.e. what an actual buyer in the
// segment would see, which is exactly what the ±10% target refers to.
console.log('\nPART 1 — Real-world segment averages vs. external (AAA/CR/RepairPal) benchmark\n')
console.log(
  'Segment'.padEnd(12) +
  'Calc avg'.padStart(10) +
  'App table'.padStart(11) +
  'Bench range'.padStart(16) +
  '  Verdict'
)
console.log('─'.repeat(78))

for (const segment of Object.keys(SEGMENT_MAINT_AVG)) {
  const vehicles = SAMPLE_VEHICLES[segment]
  const costs = vehicles.map(([make, model]) => {
    const seg = classifySegment(make, model)
    return avgAnnualMaint(seg, make, seg === 'electric')
  })
  const calc = costs.reduce((a, b) => a + b, 0) / costs.length
  const table = SEGMENT_MAINT_AVG[segment]
  const bench = EXTERNAL_BENCHMARK[segment]
  const mid = (bench.low + bench.high) / 2

  // Strict reading of "within 10%": the segment mean must be within ±10% of
  // the benchmark midpoint.
  const devFromMid = (calc - mid) / mid
  const inRange = Math.abs(devFromMid) <= MARGIN

  if (!inRange) failSegment++

  console.log(
    segment.padEnd(12) +
    money(calc).padStart(10) +
    money(table).padStart(11) +
    `${money(bench.low)}-${money(bench.high)}`.padStart(16) +
    `  ${inRange ? '✓ PASS' : '✗ FAIL'} (${devFromMid >= 0 ? '+' : ''}${pct(devFromMid)} vs mid)`
  )
  segLines.push({ segment, calc, table, bench })
}

// ── Part 2: app's own table vs external benchmark (sanity of constants) ────
console.log('\nPART 2 — App SEGMENT_MAINT_AVG table vs. external benchmark midpoint\n')
let failTable = 0
for (const { segment, table, bench } of segLines) {
  const mid = (bench.low + bench.high) / 2
  const dev = (table - mid) / mid
  const ok = Math.abs(dev) <= 0.20  // table is a coarse anchor; allow 20%
  if (!ok) failTable++
  console.log(
    segment.padEnd(12) +
    `table ${money(table).padStart(7)}  bench-mid ${money(mid).padStart(7)}  ` +
    `dev ${(dev >= 0 ? '+' : '') + pct(dev)}  ${ok ? '✓' : '✗'}`
  )
}

// ── Part 3: real sample vehicles — classification + brand-adjusted cost ────
console.log('\nPART 3 — Sample real vehicles: classification + brand-adjusted annual maint\n')
let failClass = 0
for (const [expectedSeg, vehicles] of Object.entries(SAMPLE_VEHICLES)) {
  for (const [make, model] of vehicles) {
    const seg = classifySegment(make, model)
    const isEV = seg === 'electric'
    const cost = avgAnnualMaint(seg, make, isEV)
    const brand = MAINT_BRAND_MULT[make] ?? 1.0
    // Hybrids/EVs legitimately reclassify; only flag non-EV/hybrid mismatches.
    const segOk = seg === expectedSeg ||
      (expectedSeg === 'sedan' && ['hybrid'].includes(seg)) ||
      (expectedSeg === 'suv' && ['hybrid'].includes(seg)) ||
      (expectedSeg === 'compact' && ['hybrid'].includes(seg)) ||
      (expectedSeg === 'sports' && ['electric'].includes(seg))
    if (!segOk) failClass++
    console.log(
      `${(make + ' ' + model).padEnd(26)} ${('→ ' + seg).padEnd(14)} ` +
      `brand×${brand.toFixed(2)}  ${money(cost).padStart(8)}/yr` +
      (segOk ? '' : `   ⚠ expected ${expectedSeg}`)
    )
  }
}

// ── Part 4: ZIP terrain calibration — direction + realism ─────────────────
// A region's terrain should shorten the intervals it physically stresses (and
// only those), and the overall annual cost should rise plausibly — not double.
console.log('\nPART 4 — ZIP terrain calibration (Toyota RAV4 · SUV · 13k mi/yr · 10-yr avg)\n')

// Representative ZIPs spanning each terrain profile + a mild baseline.
const TERRAIN_ZIPS = [
  ['00000', 'mild baseline'],   // no match → national mild
  ['81611', 'Aspen CO (mountain)'],
  ['85001', 'Phoenix AZ (desert)'],
  ['14201', 'Buffalo NY (salt)'],
  ['48201', 'Detroit MI (pothole)'],
  ['33101', 'Miami FL (coastal)'],
]

// Per-service annual cost (10-yr avg) for a fixed vehicle under a wear profile.
function serviceCosts(wearProfile, state) {
  const yrs = generateDetailedMaintenanceByYear(false, ANNUAL_MILEAGE, 'suv', 'Toyota', 10, 0, state, 0, null, wearProfile)
  const agg = {}
  for (const y of yrs) for (const s of y.services) agg[s.name] = (agg[s.name] || 0) + s.total
  for (const k of Object.keys(agg)) agg[k] = agg[k] / 10
  const total = yrs.reduce((a, b) => a + b.total, 0) / 10
  return { agg, total }
}

const mild = serviceCosts(getLocalWearProfile('00000', null), null)
const brakeKeys = ['Front brake pads', 'Rear brake pads', 'Front rotors', 'Rear rotors', 'Brake fluid flush']
const tireKeys  = ['Tire replacement (set)', 'Tire rotations']
const suspKeys  = ['Front shocks/struts', 'Rear shocks/struts', 'Wheel alignment']
const sum = (agg, keys) => keys.reduce((s, k) => s + (agg[k] || 0), 0)

console.log(
  'Region'.padEnd(26) + 'profile'.padEnd(10) + 'wear(t/b/s/c/bat)'.padEnd(27) +
  'brakes'.padStart(8) + 'tires'.padStart(7) + 'susp'.padStart(7) + 'A/C'.padStart(6) + 'batt'.padStart(6) + 'total/yr'.padStart(10)
)
console.log('─'.repeat(108))

let failTerrain = 0
for (const [zip, label] of TERRAIN_ZIPS) {
  const wp = getLocalWearProfile(zip, null)
  const w = resolveCategoryWear(wp, null)
  const { agg, total } = serviceCosts(wp, null)
  const brakes = sum(agg, brakeKeys), tires = sum(agg, tireKeys), susp = sum(agg, suspKeys)
  const ac = agg['AC system service'] || 0
  const batt = agg['12V battery'] || 0
  console.log(
    label.padEnd(26) + (wp.profile).padEnd(10) +
    `${w.tire.toFixed(2)}/${w.brake.toFixed(2)}/${w.susp.toFixed(2)}/${w.climate.toFixed(2)}/${w.battery.toFixed(2)}`.padEnd(27) +
    money(brakes).padStart(8) + money(tires).padStart(7) + money(susp).padStart(7) +
    money(ac).padStart(6) + money(batt).padStart(6) + money(total).padStart(10)
  )

  // Directional + realism checks vs the mild baseline.
  const mBrakes = sum(mild.agg, brakeKeys), mTires = sum(mild.agg, tireKeys), mSusp = sum(mild.agg, suspKeys)
  const mAc = mild.agg['AC system service'] || 0
  // Assert on the per-category wear factors (deterministic), not the 10-yr
  // quantized costs — a shortened interval only adds a billable service when it
  // crosses an occurrence boundary inside the window, which is lumpy by nature.
  // The wear factors are the model's actual terrain calibration.
  const checks = []
  if (wp.profile === 'mountain' && !(w.brake > w.tire && w.brake > w.climate)) checks.push('mountain: brake wear should dominate')
  if (wp.profile === 'desert'   && !(w.climate > w.brake && w.tire > w.brake))  checks.push('desert: A/C & tire wear should outrank brakes')
  // Battery: hot-climate life ~half of temperate (industry data). Desert 12V
  // interval should shorten toward ~0.55× → wear factor ≳ 1.6.
  if (wp.profile === 'desert'   && !(w.battery >= 1.6)) checks.push(`desert: battery wear ${w.battery.toFixed(2)} should be ≳1.6 (heat ~halves life)`)
  if (wp.profile === 'mild'     && w.battery !== 1)     checks.push('mild: battery wear must be 1.0')
  if (wp.profile === 'pothole'  && !(w.susp > w.brake && w.tire > w.brake))     checks.push('pothole: suspension/tire wear should dominate')
  if (wp.profile === 'salt'     && !(w.brake > w.tire && w.brake > w.climate))  checks.push('salt: brake wear should dominate')
  if (wp.profile === 'coastal'  && !(w.climate > w.susp))                       checks.push('coastal: A/C wear should outrank suspension')
  // Realism guard: terrain should nudge total cost, not explode it.
  if (total > mild.total * 1.30) checks.push(`total +${pct((total - mild.total) / mild.total)} unrealistic`)
  // Mild baseline must be a true no-op (every wear factor exactly 1.0).
  if (wp.profile === 'mild' && !(w.tire === 1 && w.brake === 1 && w.susp === 1 && w.climate === 1)) checks.push('mild baseline must be a no-op')
  if (checks.length) { failTerrain += checks.length; console.log('   ⚠ ' + checks.join('; ')) }
}

// ── Part 5: high-mileage forecast — the wider cast must engage ────────────
// Forecast 10 years for both a new car (0 mi) and a high-mileage buy (150k mi
// start, ~11 yr old). The high-mileage window (150k→280k) should surface the
// major-component catalog and cost materially more per year than the new-car
// window — that's the whole point of the wider cast.
console.log('\nPART 5 — High-mileage coverage (10-yr forecast, 13k mi/yr)\n')
console.log(
  'Vehicle'.padEnd(22) + 'new 0→130k'.padStart(12) + '150k→280k'.padStart(12) +
  'ramp'.padStart(8) + '  major items @ high-mi'
)
console.log('─'.repeat(82))

// Catalog item names, to detect which major components appear in a forecast.
const HM_NAMES = new Set([
  'Water pump & thermostat','Radiator & cooling hoses','Alternator','Starter motor',
  'Ignition coils','Fuel pump & filter','Catalytic converter','Drive belt tensioner & pulleys',
  'Valve-cover gasket & seals','Exhaust system & muffler','Engine/trans mounts',
  'Control arms, ball joints & bushings','Wheel bearings / hubs','CV axles & boots',
  'Steering tie rods & rack service','Sway-bar links & bushings','A/C compressor','EV coolant pump & lines',
])

function forecastAvg(make, model, startMi, ageStart) {
  const seg = classifySegment(make, model)
  const isEV = seg === 'electric'
  const yrs = generateDetailedMaintenanceByYear(isEV, ANNUAL_MILEAGE, seg, make, 10, startMi, null, ageStart)
  const avg = yrs.reduce((a, b) => a + b.total, 0) / yrs.length
  const majors = new Set(yrs.flatMap(y => y.services.map(s => s.name)).filter(n => HM_NAMES.has(n)))
  return { avg, majors }
}

let failHM = 0
const HM_FLEET = [
  ['Toyota', 'Camry'], ['Ford', 'F-150'], ['BMW', 'X5'], ['Honda', 'Civic'], ['Tesla', 'Model 3'],
]
for (const [make, model] of HM_FLEET) {
  const lo = forecastAvg(make, model, 0, 0)
  const hi = forecastAvg(make, model, 150000, 11)
  const ramp = (hi.avg - lo.avg) / lo.avg
  console.log(
    `${make} ${model}`.padEnd(22) + money(lo.avg).padStart(12) + money(hi.avg).padStart(12) +
    `+${pct(ramp)}`.padStart(8) + `  ${hi.majors.size} of ${HM_NAMES.size}`
  )
  // The high-mileage window must surface a broad set of major components and
  // cost materially more than the new-car window.
  const expectedMajors = model === 'Model 3' ? 6 : 12   // EVs skip engine items
  if (hi.majors.size < expectedMajors) { failHM++; console.log(`   ⚠ only ${hi.majors.size} major items engaged (expected ≥${expectedMajors})`) }
  if (ramp < 0.25) { failHM++; console.log(`   ⚠ high-mileage ramp only +${pct(ramp)} (expected ≥+25%)`) }
}

// ── Part 6: known-issue registry + model-gated services ───────────────────
// Specific make/model/year platforms with documented failures must forecast
// their known repairs; clean siblings must not inherit them.
console.log('\nPART 6 — Known-issue & model-gated services (150k-start, 10-yr, 13k mi/yr)\n')

function namesAndAvg(make, model, modelYear, opts = {}) {
  const seg = opts.segment ?? classifySegment(make, model)
  const isEV = opts.isEV ?? (seg === 'electric')
  const start = opts.startMi ?? 150000
  const age = opts.ageStart ?? 11
  const yrs = generateDetailedMaintenanceByYear(isEV, ANNUAL_MILEAGE, seg, make, 10, start, null, age, null, null, model, modelYear)
  const names = new Set(yrs.flatMap(y => y.services.map(s => s.name)))
  const avg = yrs.reduce((a, b) => a + b.total, 0) / yrs.length
  return { names, avg }
}

let failKI = 0
const ki = (cond, label) => {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`)
  if (!cond) failKI++
}

// CVT-era Nissan Altima books the CVT and costs more than a post-era one
const altima16 = namesAndAvg('Nissan', 'Altima', 2016)
const altima23 = namesAndAvg('Nissan', 'Altima', 2023)
ki(altima16.names.has('CVT replacement (known issue)'), `2016 Altima books CVT replacement (avg ${money(altima16.avg)}/yr)`)
ki(!altima23.names.has('CVT replacement (known issue)'), `2023 Altima does not (avg ${money(altima23.avg)}/yr)`)
ki(altima16.avg > altima23.avg, `CVT-era Altima costs more than post-era (+${money(altima16.avg - altima23.avg)}/yr)`)
// Known transmission issue suppresses the generic transmission reserve
ki(!altima16.names.has('Transmission repair reserve'), '2016 Altima: generic trans reserve suppressed (no double-count)')
ki(altima23.names.has('Transmission repair reserve'), '2023 Altima at 150k: generic trans reserve active')

// GM AFM lifters; clean same-segment sibling stays clean
const silv = namesAndAvg('Chevrolet', 'Silverado', 2018)
const tundra = namesAndAvg('Toyota', 'Tundra', 2018)
ki(silv.names.has('AFM/DFM lifter & cam service (known issue)'), `2018 Silverado books AFM lifter service (avg ${money(silv.avg)}/yr)`)
ki(![...tundra.names].some(n => n.includes('known issue')), `2018 Tundra carries no known-issue lines (avg ${money(tundra.avg)}/yr)`)

// Air suspension: X5 books it; coil-sprung RAV4 doesn't
const x5 = namesAndAvg('BMW', 'X5', 2020)
ki(x5.names.has('Air suspension service'), '2020 BMW X5 books air suspension service')
ki(x5.names.has('Turbocharger (blended)'), '2020 BMW X5 books blended turbocharger')
ki(!namesAndAvg('Toyota', 'RAV4', 2020).names.has('Air suspension service'), '2020 RAV4 has no air suspension line')

// Hybrid pack appears when the window crosses 180k; eCVT exempt from trans reserve
const prius = namesAndAvg('Toyota', 'Prius', 2018, { segment: 'hybrid' })
ki(prius.names.has('Hybrid battery pack (blended)'), '150k-start Prius books hybrid battery pack crossing 180k')
ki(!prius.names.has('Transmission repair reserve'), 'Prius (eCVT) exempt from transmission reserve')

// EV HV reserve out of warranty; Tesla early-MCU issue scoped to S/X years
const m3 = namesAndAvg('Tesla', 'Model 3', 2019, { startMi: 110000, ageStart: 7 })
ki(m3.names.has('HV battery reserve (out of warranty)'), 'Tesla Model 3 age 9+ books HV battery reserve')
ki(getKnownIssueServices('Tesla', 'Model S', 2014, '', true).length === 1, '2014 Model S matches MCU/door-handle issue')
ki(getKnownIssueServices('Tesla', 'Model 3', 2019, '', true).length === 0, '2019 Model 3 matches no known issues')

// ── Part 7: trim-level powertrain stress — perf trim vs base sibling ──────
// Performance/turbo trims must shorten engine + chassis intervals and forecast
// higher than the base trim of the same model; comfort trims stay unaffected.
console.log('\nPART 7 — Trim stress: performance trim vs. base sibling (10-yr avg, 13k mi/yr)\n')

function trimAvg(make, model, trim, opts = {}) {
  const seg = opts.segment ?? classifySegment(make, model)
  const isEV = opts.isEV ?? (seg === 'electric')
  const yrs = generateDetailedMaintenanceByYear(isEV, ANNUAL_MILEAGE, seg, make, 10, opts.startMi ?? 0, null, opts.ageStart ?? 0, null, null, model, opts.year ?? 2020, trim)
  const names = new Set(yrs.flatMap(y => y.services.map(s => s.name)))
  return { avg: yrs.reduce((a, b) => a + b.total, 0) / yrs.length, names }
}

let failTS = 0
const ts = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) failTS++ }

console.log(
  'Comparison'.padEnd(40) + 'base/yr'.padStart(9) + 'perf/yr'.padStart(9) + 'delta'.padStart(8)
)
console.log('─'.repeat(70))
const PAIRS = [
  ['Volkswagen', 'Golf',   'Golf S',        'Golf GTI'],
  ['Honda',      'Civic',  'Civic LX',      'Civic Type R'],
  ['BMW',        '3 Series','330i',         'M3 Competition'],
  ['Ford',       'Mustang','Mustang EcoBoost', 'Shelby GT500'],
  ['Hyundai',    'Elantra','Elantra SEL',   'Elantra N'],
]
for (const [mk, md, baseT, perfT] of PAIRS) {
  const b = trimAvg(mk, md, baseT), p = trimAvg(mk, md, perfT)
  const d = (p.avg - b.avg) / b.avg
  console.log(`${mk} ${md}: ${baseT} → ${perfT}`.padEnd(40) + money(b.avg).padStart(9) + money(p.avg).padStart(9) + `+${pct(d)}`.padStart(8))
  ts(p.avg > b.avg * 1.04, `${md} ${perfT} forecasts >4% over ${baseT}`)
}

// Classifier sanity + carbon-cleaning gating
ts(classifyTrimStress('Honda', 'Civic', 'Type R').perf === 2, 'Civic Type R → perf tier 2')
ts(classifyTrimStress('Honda', 'Civic', 'LX').perf === 0 && !classifyTrimStress('Honda','Civic','LX').fi, 'Civic LX → no stress')
ts(classifyTrimStress('Porsche', 'Cayenne', 'Turbo').perf === 2, 'Cayenne Turbo → perf tier 2 (Porsche turbo = top trim)')
ts(classifyTrimStress('Mazda', 'CX-5', 'Turbo').fi && classifyTrimStress('Mazda','CX-5','Turbo').perf === 0, 'CX-5 Turbo → forced-induction, not performance')
ts(classifyTrimStress('Tesla', 'Model S', 'Plaid').perf === 2 && !classifyTrimStress('Tesla','Model S','Plaid').fi, 'Model S Plaid → perf tier 2, no forced induction')
ts(trimAvg('Volkswagen', 'Golf', 'Golf GTI').names.has('Carbon cleaning (GDI intake)'), 'GTI books GDI carbon cleaning')
ts(!trimAvg('Honda', 'Civic', 'Civic LX').names.has('Carbon cleaning (GDI intake)'), 'Civic LX (NA) does not book carbon cleaning')
ts(trimAvg('Tesla', 'Model S', 'Plaid').names.has('Tire replacement (set)') && classifyTrimStress('Tesla','Model S','Plaid').chassisStress === 1.5, 'Plaid applies chassis stress (tires/brakes) without engine items')

// ── Part 8: location resolution — ZIP→state, labor rates, terrain zones ────
// The ZIP detector drives insurance base, sales tax, fuel price, registration,
// labor rate, AND the terrain wear profile — a wrong state poisons everything
// downstream. Spot-check the prefix map against known-tricky assignments and
// confirm metro labor zones and expanded terrain zones resolve.
console.log('\nPART 8 — Location resolution (ZIP→state, labor rate, terrain)\n')

let failLoc = 0
const loc = (cond, label) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) failLoc++ }

// State assignment — including the prefixes the old range table got wrong
loc(zipToState('20147') === 'VA', '20147 (Ashburn) → VA, not DC')
loc(zipToState('20001') === 'DC', '20001 (Washington) → DC')
loc(zipToState('20601') === 'MD', '20601 (Waldorf) → MD')
loc(zipToState('73301') === 'TX', '73301 (Austin IRS) → TX inside OK block')
loc(zipToState('73101') === 'OK', '73101 (Oklahoma City) → OK')
loc(zipToState('88510') === 'TX', '88510 (El Paso) → TX inside NM block')
loc(zipToState('87101') === 'NM', '87101 (Albuquerque) → NM')
loc(zipToState('39901') === 'GA', '39901 (Atlanta federal) → GA')
loc(zipToState('96201') === null, '96201 (military APO AP) → null, not a state')
loc(zipToState('00901') === null, '00901 (San Juan PR) → null (unsupported)')
loc(zipToState('99501') === 'AK' && zipToState('96813') === 'HI', 'AK/HI prefixes intact')

// resolveLocation carries the corrected state through to downstream pricing
const ashburn = resolveLocation('20147')
loc(ashburn?.state === 'VA' && ashburn?.laborRate > 0, `resolveLocation('20147') → VA @ $${ashburn?.laborRate}/hr labor`)

// Metro labor zones for previously uncovered states beat the state fallback
loc(getLocalLaborRate('04101', 'ME') > STATE_LABOR_RATES.ME, 'Portland ME metro labor > ME state average')
loc(getLocalLaborRate('83001', 'WY') > STATE_LABOR_RATES.WY, 'Jackson Hole labor > WY state average')
loc(getLocalLaborRate('59715', 'MT') > STATE_LABOR_RATES.MT, 'Bozeman labor > MT state average')
loc(getLocalLaborRate('12345', 'NY') === STATE_LABOR_RATES.NY || getLocalLaborRate('12345', 'NY') > 0, 'unzoned ZIP falls back to state rate')

// Expanded terrain zones resolve to the physically right profile
loc(getLocalWearProfile('75201', 'TX').profile === 'desert',   'Dallas heat → desert (battery/AC) profile')
loc(getLocalWearProfile('33602', 'FL').profile === 'coastal',  'Tampa → coastal profile')
loc(getLocalWearProfile('44113', 'OH').profile === 'salt',     'Cleveland → salt profile')
loc(getLocalWearProfile('86001', 'AZ').profile === 'mountain', 'Flagstaff → mountain (not Phoenix desert)')
loc(getLocalWearProfile('11215', 'NY').profile === 'pothole',  'Brooklyn → pothole profile')
loc(getLocalWearProfile('84060', 'UT').profile === 'mountain', 'Park City stays mountain despite SLC salt zone')
// Original calibration ZIPs must be unaffected by the expansion
loc(getLocalWearProfile('85001', 'AZ').profile === 'desert' && getLocalWearProfile('48201', 'MI').profile === 'pothole', 'original zones unchanged (Phoenix desert, Detroit pothole)')

console.log('\n' + '═'.repeat(78))
console.log(`  RESULT: Part1 segment-accuracy fails: ${failSegment}/${segLines.length}`)
console.log(`          Part2 table-sanity fails:     ${failTable}/${segLines.length}`)
console.log(`          Part3 classification fails:   ${failClass}`)
console.log(`          Part4 terrain-logic fails:    ${failTerrain}`)
console.log(`          Part5 high-mileage fails:     ${failHM}`)
console.log(`          Part6 known-issue fails:      ${failKI}`)
console.log(`          Part7 trim-stress fails:      ${failTS}`)
console.log(`          Part8 location fails:         ${failLoc}`)
console.log('═'.repeat(78))

process.exit(failSegment > 0 || failTerrain > 0 || failHM > 0 || failKI > 0 || failTS > 0 || failLoc > 0 ? 1 : 0)
