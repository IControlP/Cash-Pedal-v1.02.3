// Builds src/data/lifestyleData.json (states) and src/data/lifestyleCities.json (cities)
// from public sources. Run scripts/fetch-lifestyle-sources.sh first.
//
//   node scripts/build-lifestyle-data.mjs [cache-dir]     (default .cache/lifestyle)
//
// Sources
//   • Census ACS 2020–2024 5-year, table-based summary files (www2.census.gov):
//       B25031 median gross rent by bedrooms · B25064 median gross rent ·
//       B25077 median home value · B25103 median real estate taxes paid ·
//       B01003 population
//   • BEA Regional Price Parities 2024 (apps.bea.gov): SARPP (state) and MARPP
//       (metro) — all items, goods, housing, utilities, other services
//   • State income tax: carried over from the existing file (NOT yet sourced —
//       see _meta.stateTax in the output).

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const DIR = process.argv[2] || '.cache/lifestyle'
const OUT_STATES = 'src/data/lifestyleData.json'
const OUT_CITIES = 'src/data/lifestyleCities.json'
const ACS_YEAR = '2020–2024'
const BEA_YEAR = '2024'

const num = v => {
  const n = Number(v)
  return v === '' || v == null || !Number.isFinite(n) || n < 0 ? null : n
}

async function eachLine(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'latin1' }), crlfDelay: Infinity })
  for await (const line of rl) fn(line)
}

// ── Geography ────────────────────────────────────────────────────────────
const geo = new Map() // GEO_ID → { level, st, name }
// Column positions come from the header row, never guessed.
{
  let header = null
  await eachLine(path.join(DIR, 'Geos20245YR.txt'), line => {
    const f = line.split('|')
    if (!header) { header = Object.fromEntries(f.map((k, i) => [k, i])); return }
    const level = f[header.SUMLEVEL]
    if ((level !== '160' && level !== '040') || f[header.COMPONENT] !== '00') return
    geo.set(f[header.GEO_ID], { level, st: f[header.STUSAB], name: f[header.NAME] })
  })
}

// ── ACS tables ───────────────────────────────────────────────────────────
async function readTable(table, cols) {
  const out = new Map()
  let header = null
  await eachLine(path.join(DIR, `acsdt5y2024-${table}.dat`), line => {
    const f = line.split('|')
    if (!header) { header = Object.fromEntries(f.map((k, i) => [k, i])); return }
    if (!geo.has(f[0])) return
    out.set(f[0], Object.fromEntries(Object.entries(cols).map(([k, c]) => [k, num(f[header[c]])])))
  })
  return out
}
const pop = await readTable('b01003', { pop: 'B01003_E001' })
const rentMed = await readTable('b25064', { rent: 'B25064_E001' })
const home = await readTable('b25077', { home: 'B25077_E001' })
const tax = await readTable('b25103', { tax: 'B25103_E001' })
const rentBr = await readTable('b25031', { r0: 'B25031_E002', r1: 'B25031_E003', r2: 'B25031_E004', r3: 'B25031_E005', r4: 'B25031_E006' })

const row = id => ({
  pop: pop.get(id)?.pop ?? null,
  rentMedian: rentMed.get(id)?.rent ?? null,
  home: home.get(id)?.home ?? null,
  tax: tax.get(id)?.tax ?? null,
  br: rentBr.get(id) ?? {},
})

// ── BEA RPP ──────────────────────────────────────────────────────────────
function csvLine(l) {
  const out = []
  let cur = ''
  let q = false
  for (const ch of l) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(x => x.trim())
}
const RPP_COMP = { 1: 'all', 2: 'goods', 3: 'housing', 4: 'utilities', 5: 'other' }
function readBea(file, keyFn) {
  const lines = fs.readFileSync(path.join(DIR, 'bea', file), 'latin1').split(/\r?\n/)
  const head = csvLine(lines[0])
  const yi = head.indexOf(BEA_YEAR)
  const out = {}
  for (const l of lines.slice(1)) {
    if (!l.trim()) continue
    const f = csvLine(l)
    if (f.length < head.length - 2 || !f[1]) continue // footnotes
    const comp = RPP_COMP[f[head.indexOf('LineCode')]]
    const val = Number(f[yi])
    const key = keyFn(f[0], f[1])
    if (!comp || !key || !Number.isFinite(val)) continue
    ;(out[key] ??= { name: f[1] })[comp] = Math.round(val * 10) / 10
  }
  return out
}
const STATE_ABBR = Object.fromEntries([...geo.values()].filter(g => g.level === '040').map(g => [g.name, g.st]))
const beaState = readBea('SARPP_STATE_2008_2024.csv', (_id, name) => STATE_ABBR[name.replace(/\*/g, '').trim()])
for (const v of Object.values(beaState)) delete v.name
const beaMetroRaw = readBea('MARPP_MSA_2008_2024.csv', id => (id === '00000' ? null : id))
const metros = Object.values(beaMetroRaw)
  .map(x => ({ ...x, name: x.name.replace(/\s*\(Metropolitan Statistical Area\)\s*/i, '').trim() }))
  .filter(x => x.all && x.goods && x.utilities && x.other)

// Principal-city lookup: "Austin-Round Rock-Georgetown, TX" → tokens + states.
const norm = s => s.toLowerCase().replace(/\./g, '').replace(/\bsaint\b/g, 'st').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const metroIndex = new Map() // `${st}|${token}` → metro
for (const m of metros) {
  const [cities, states] = m.name.split(/,\s*/)
  const toks = cities.split(/-+|\//).map(t => t.replace(/^Urban /, ''))
  // single tokens plus adjacent pairs ("Winston" + "Salem", "Nashville" + "Davidson")
  const keys = [...toks, ...toks.slice(1).map((t, i) => `${toks[i]} ${t}`), cities]
  for (const st of (states || '').split('-')) {
    for (const k of keys) metroIndex.set(`${st.trim()}|${norm(k)}`, m)
  }
}

// ── States ───────────────────────────────────────────────────────────────
const prior = JSON.parse(fs.readFileSync(OUT_STATES, 'utf8'))
const states = {}
const stateRatios = {}
for (const [id, g] of geo) {
  if (g.level !== '040') continue
  const r = row(id)
  const code = g.st
  if (!beaState[code]) continue // Puerto Rico etc.
  const b = r.br
  const med = r.rentMedian
  stateRatios[code] = [0, 1, 2, 3, 4].map(k => (b[`r${k}`] && med ? b[`r${k}`] / med : null))
  states[code] = {
    rent: { 0: b.r0, 1: b.r1, 2: b.r2, 3: b.r3, 4: b.r4 },
    rentMedian: med,
    medianHome: r.home,
    propTaxPct: r.home && r.tax ? Math.round((r.tax / r.home) * 10000) / 100 : null,
    rpp: beaState[code],
    stateTaxPct: prior.states[code]?.stateTaxPct ?? 4,
  }
}
// DC is a state-equivalent in both sources; make sure all 51 are present.
if (Object.keys(states).length !== 51) throw new Error(`expected 51 states, got ${Object.keys(states).length}`)

const out = {
  _meta: {
    generatedBy: 'scripts/build-lifestyle-data.mjs',
    acs: `ACS ${ACS_YEAR} 5-year (B25031, B25064, B25077, B25103), www2.census.gov table-based summary files`,
    bea: `BEA Regional Price Parities ${BEA_YEAR} (SARPP state, MARPP metro), apps.bea.gov`,
    rentNote: 'ACS median GROSS rent (contract rent + utilities) of existing leases; asking rents on new leases run higher. The engine converts gross to contract rent.',
    propTaxNote: 'Median real estate taxes paid ÷ median home value (ACS), so a blended effective rate.',
    stateTax: 'PLACEHOLDER — effective state income tax % of gross, not yet sourced. Replace with Tax Foundation / state schedules.',
    fields: {
      rent: 'median gross rent by bedroom count (0 = studio … 4 = 4BR), USD/month',
      rentMedian: 'median gross rent, all units, USD/month',
      medianHome: 'median value of owner-occupied homes, USD',
      propTaxPct: 'effective property tax, % of value per year',
      rpp: 'BEA regional price parities, US = 100: all, goods, housing, utilities, other (services)',
      stateTaxPct: 'effective state income tax, % of gross (placeholder)',
    },
  },
  states,
}
fs.writeFileSync(OUT_STATES, JSON.stringify(out, null, 1) + '\n')

// ── Cities ───────────────────────────────────────────────────────────────
const CITY_OK = /\b(city|town|village|municipality|borough|city \(balance\)|metropolitan government.*|metro government.*|urban county)\b/i
const cities = []
for (const [id, g] of geo) {
  if (g.level !== '160') continue
  const r = row(id)
  if (!r.pop || !r.home || !r.rentMedian) continue
  const isCity = CITY_OK.test(g.name.split(',')[0])
  if (!isCity && !(r.pop >= 100000)) continue // CDPs only when large (e.g. Urban Honolulu)
  if (!states[g.st]) continue
  // "Kansas City city" → "Kansas City"; only the trailing legal suffix is removed.
  const baseName = g.name.split(',')[0]
    .replace(/\s+\(balance\)$/i, '')
    .replace(/\s+(metropolitan|metro) government.*$/i, '')
    .replace(/\s+urban county$/i, '')
    .replace(/\s+(city|town|village|municipality|borough|CDP)$/i, '')
    .replace(/^Urban /, '')
  cities.push({ id, st: g.st, name: baseName, pop: r.pop, r })
}

// Keep every city of 100k+, and the 3 largest (25k+) in each state so every state has choices.
const byState = {}
for (const c of cities) (byState[c.st] ??= []).push(c)
const kept = []
for (const [st, list] of Object.entries(byState)) {
  list.sort((a, b) => b.pop - a.pop)
  list.forEach((c, i) => { if (c.pop >= 100000 || (i < 3 && c.pop >= 25000)) kept.push(c) })
}

const round5 = n => (n == null ? null : Math.round(n / 5) * 5)
const outCities = kept.map(c => {
  const st = states[c.st]
  const rent = {}
  let estimated = false
  for (let k = 0; k <= 4; k++) {
    let v = c.r.br[`r${k}`]
    if (v == null) {
      const ratio = stateRatios[c.st][k]
      v = ratio ? c.r.rentMedian * ratio : null
      estimated = true
    }
    rent[k] = round5(v)
  }
  const cands = [c.name, c.name.split('/')[0], c.name.split(/[-/]/)[0]].map(norm)
  const m = cands.map(k => metroIndex.get(`${c.st}|${k}`)).find(Boolean)
  return {
    id: `${c.st}|${c.name}`,
    name: c.name, state: c.st, pop: c.pop,
    rent, rentMedian: c.r.rentMedian, medianHome: c.r.home,
    propTaxPct: c.r.tax ? Math.round((c.r.tax / c.r.home) * 10000) / 100 : st.propTaxPct,
    rpp: m ? { all: m.all, goods: m.goods, utilities: m.utilities, other: m.other } : null,
    metro: m?.name ?? null,
    ...(estimated ? { rentEstimated: true } : {}),
  }
}).sort((a, b) => a.state.localeCompare(b.state) || b.pop - a.pop)

// Disambiguate duplicate names inside a state (e.g. two "Columbia")
const seen = new Map()
for (const c of outCities) seen.set(c.id, (seen.get(c.id) ?? 0) + 1)
for (const c of outCities) if (seen.get(c.id) > 1) c.id = `${c.id}#${c.pop}`

fs.writeFileSync(OUT_CITIES, JSON.stringify({
  _meta: { ...out._meta, fields: { ...out._meta.fields, rpp: 'metro BEA RPP for the principal city’s metro area (null when not matched → state RPP is used)' }, count: outCities.length },
  cities: outCities,
}) + '\n')

console.log(`states: ${Object.keys(states).length}  cities: ${outCities.length}  with metro RPP: ${outCities.filter(c => c.rpp).length}  rent-estimated: ${outCities.filter(c => c.rentEstimated).length}`)
