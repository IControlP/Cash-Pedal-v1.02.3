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
  MAINT_BRAND_MULT,
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

console.log('\n' + '═'.repeat(78))
console.log(`  RESULT: Part1 segment-accuracy fails: ${failSegment}/${segLines.length}`)
console.log(`          Part2 table-sanity fails:     ${failTable}/${segLines.length}`)
console.log(`          Part3 classification fails:   ${failClass}`)
console.log('═'.repeat(78))

process.exit(failSegment > 0 ? 1 : 0)
