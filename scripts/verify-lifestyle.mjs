// Sanity harness for the lifestyle engine (runs in CI alongside verify-tco.mjs).
import { computeLifestyle, housingMenu, derivePriorities, incomeForWishList, takeHome, stateIncomeTax, childcareMonthly, cheapCarInsuranceFactor, STATES, debtPayoffGain, costCenters, compareScenarios, equivalentIncome } from '../src/utils/lifestyle.js'

let failures = 0
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`)
  if (!ok) failures++
}

const base = { incomes: [75000], age: '25-34', state: 'TX', married: false, children: 0, roommates: 0, debtMonthly: 0, savedForHome: 0 }
const profiles = {
  single75: base,
  single45roommates: { ...base, incomes: [45000], roommates: 2, state: 'CA' },
  couple160kids: { ...base, incomes: [90000, 70000], married: true, children: 2, state: 'WA', age: '35-44' },
  lowIncomeDebt: { ...base, incomes: [38000], debtMonthly: 450, state: 'NY' },
  highEarner: { ...base, incomes: [260000], state: 'CA', age: '45-54', savedForHome: 150000 },
}

check('51 jurisdictions', Object.keys(STATES).length === 51)
for (const [c, s] of Object.entries(STATES)) {
  if (!(s.rent[1] > 400 && s.rent[3] >= s.rent[1] * 0.9 && s.medianHome > 80000 && s.propTaxPct > 0.1 && s.rpp.all > 70 && s.rpp.other > 70)) check(`state data sane ${c}`, false)
}

const th = takeHome([75000], 'TX', false, 0)
check('TX single $75k take-home 4,900–5,400/mo', th.monthly > 4900 && th.monthly < 5400, `${th.monthly}`)

for (const [name, p] of Object.entries(profiles)) {
  const r = computeLifestyle(p)
  const sum = r.pillars.foundation + r.pillars.lifestyle + r.pillars.cushion
  check(`${name}: pillars sum to take-home`, Math.abs(sum - r.tax.monthly) <= 3, `${sum} vs ${r.tax.monthly}`)
  check(`${name}: percents sum to 100`, Math.abs(r.pillars.percents.foundation + r.pillars.percents.lifestyle + r.pillars.percents.cushion - 100) < 1e-6)
  check(`${name}: finite outputs`, Number.isFinite(r.car.maxPrice) && Number.isFinite(r.housing.maxPrice) && Number.isFinite(r.lifestyle.total))
  console.log('   ', JSON.stringify({ pillars: r.pillars, housing: [r.housing.verdict, r.housing.maxPrice], best: r.best, car: [r.car.tier, r.car.maxPrice], dining: r.lifestyle.mealsOutPerPersonPerWeek }))
}

// Monotonic: more salary never reduces the buyable home price or car tier.
let prevH = -1, prevC = -1, mono = true
for (let s = 40000; s <= 300000; s += 20000) {
  const r = computeLifestyle({ ...base, incomes: [s] })
  if (r.housing.maxPrice < prevH || r.car.maxPrice < prevC) mono = false
  prevH = r.housing.maxPrice; prevC = r.car.maxPrice
}
check('salary monotonic (home price, car price)', mono)

// Debt must shrink housing budget; paying it off must show a gain.
const noDebt = computeLifestyle({ ...profiles.lowIncomeDebt, debtMonthly: 0 })
const debt = computeLifestyle(profiles.lowIncomeDebt)
check('debt reduces lifestyle+cushion', debt.pillars.lifestyle + debt.pillars.cushion < noDebt.pillars.lifestyle + noDebt.pillars.cushion)
check('debt payoff frees the debt payment', Math.abs(debtPayoffGain(profiles.lowIncomeDebt).monthly - 450) <= 5, `${debtPayoffGain(profiles.lowIncomeDebt).monthly}`)

// Roommates lower the per-person rent.
const own = computeLifestyle({ ...profiles.single45roommates, roommates: 0 })
const room = computeLifestyle(profiles.single45roommates)
check('roommates lower rent', room.foundation.housing < own.foundation.housing, `${room.foundation.housing} < ${own.foundation.housing}`)

// Priorities move pillars the right way.
const foodie = computeLifestyle(base, { dining: 5, travel: 5 })
const saver = computeLifestyle(base, { cushion: 5 })
const neutral = computeLifestyle(base)
check('foodie gets more lifestyle', foodie.pillars.percents.lifestyle > neutral.pillars.percents.lifestyle)
check('saver gets more cushion', saver.pillars.percents.cushion > neutral.pillars.percents.cushion)

// Cost centers add up to the three pillars.
{
  const r = computeLifestyle(profiles.couple160kids)
  const cc = costCenters(r)
  const sum = cc.reduce((a, c) => a + c.amount, 0)
  check('cost centers sum to take-home', Math.abs(sum - r.tax.monthly) <= 12, `${sum} vs ${r.tax.monthly}`)
}

// Scenarios: a raise helps, an equivalent income in a pricier state is higher.
{
  const up = compareScenarios(base, { incomes: [100000] })
  check('raise increases discretionary money', up.discretionaryDelta > 0)
  const need = equivalentIncome({ ...base, state: 'TX' }, 'CA')
  check('CA needs more income than TX for the same life', need.income > 75000, `${need.income}`)
  const back = equivalentIncome({ ...base, state: 'CA' }, 'TX')
  check('TX needs less income than CA for the same life', back.income < 75000, `${back.income}`)
}

// State income tax against hand-checkable cases (2026 Tax Foundation table).
{
  check('TX/FL/WA have no wage tax', stateIncomeTax(100000, 'TX', false) === 0 && stateIncomeTax(100000, 'FL', false) === 0 && stateIncomeTax(100000, 'WA', false) === 0)
  check('PA flat 3.07%', Math.abs(stateIncomeTax(100000, 'PA', false) - 3070) < 1, `${stateIncomeTax(100000, 'PA', false)}`)
  check('CO flat 4.4% after std deduction', Math.abs(stateIncomeTax(100000, 'CO', false) - 0.044 * (100000 - 16100)) < 5, `${stateIncomeTax(100000, 'CO', false)}`)
  const ca = stateIncomeTax(100000, 'CA', false), ny = stateIncomeTax(100000, 'NY', false)
  check('CA $100k single in 3k–7k', ca > 3000 && ca < 7000, `${ca}`)
  check('NY $100k single in 4k–6.5k', ny > 4000 && ny < 6500, `${ny}`)
  check('state tax rises with income', ['CA', 'NY', 'OR', 'MA'].every(s => stateIncomeTax(200000, s, false) > stateIncomeTax(100000, s, false)))
  check('kids never raise state tax', stateIncomeTax(100000, 'AL', true, 0) >= stateIncomeTax(100000, 'AL', true, 2))
}

// Child care: daycare for under-6s costs far more than school-age care, and more kids cost more.
{
  const den = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/data/lifestyleCities.json', import.meta.url), 'utf8')).cities.find(c => c.id === 'CO|Denver')
  const kid = (n, u) => computeLifestyle({ ...base, incomes: [90000, 70000], married: true, state: 'CO', city: den, children: n, childrenUnder6: u }).foundation.childcare
  check('Denver 1 child in daycare ≈ $1,500–2,000/mo', kid(1, 1) > 1500 && kid(1, 1) < 2000, `${kid(1, 1)}`)
  check('daycare costs more than school-age care', kid(2, 2) > kid(2, 0) * 2)
  check('more children cost more', kid(2, 2) > kid(1, 1) && kid(3, 3) > kid(2, 2))
  check('no children, no child care', kid(0, 0) === 0)
  check('childcareMonthly(null) falls back', childcareMonthly(null, 1, 0) === null)
  check('cheap-car insurance factor ramps 0.6 → 1', cheapCarInsuranceFactor(5000) === 0.6 && cheapCarInsuranceFactor(15000) === 1 && cheapCarInsuranceFactor(11500) > 0.6)
  const den55 = computeLifestyle({ ...base, incomes: [55000], state: 'CO', city: den })
  check('Denver $55k single gets a car tier, not car-light', den55.car.maxPrice > 0, `${den55.car.tier} ${den55.car.maxPrice}`)
}

// Survey answers (prefs) must move the numbers they describe, in the right direction.
{
  const den = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/data/lifestyleCities.json', import.meta.url), 'utf8')).cities.find(c => c.id === 'CO|Denver')
  const p = { ...base, incomes: [95000], state: 'CO', city: den }
  const run = prefs => computeLifestyle({ ...p, prefs })
  const rent = prefs => run(prefs).neighborhoods.find(n => n.type === (prefs.area ?? 'inner-suburb')).rent
  check('more bedrooms cost more rent', rent({ area: 'inner-suburb', bedrooms: 3 }) > rent({ area: 'inner-suburb', bedrooms: 1 }))
  check('urban core costs more than small town', rent({ area: 'urban-core', bedrooms: 1 }) > rent({ area: 'small-town', bedrooms: 1 }))
  check('menu matches engine rent', housingMenu(p).areas[1].rent === run({}).neighborhoods[1].rent)
  check('menu sizes are non-decreasing', ['urban-core', 'inner-suburb', 'outer-suburb', 'small-town'].every(a => housingMenu(p).sizes[a].every((z, i, arr) => i === 0 || z.rent >= arr[i - 1].rent)))
  check('second car raises transport', run({ cars: 2 }).foundation.transport > run({ cars: 1 }).foundation.transport)
  check('no car → car-free tier and low transport', run({ cars: 0 }).car.tier === 'Car-free' && run({ cars: 0 }).foundation.transport < run({ cars: 1 }).foundation.transport)
  check('longer commute raises car running cost', run({ cars: 1, commute: 'onsite-long' }).car.maxPrice <= run({ cars: 1, commute: 'remote' }).car.maxPrice)
  check('pets add Foundation cost', run({ pets: 2 }).foundation.pets > 0 && run({ pets: 0 }).foundation.pets === 0)
  check('premium groceries cost more', run({ groceryStyle: 'premium' }).foundation.groceries > run({ groceryStyle: 'budget' }).foundation.groceries)
  const big = run({ mealsPerWeek: 8, travelPlan: 'wanderer', hobbies: 'high', fitness: 'boutique' })
  check('a big wish list can exceed the Lifestyle budget', big.lifestyle.coverage < 1 && big.lifestyle.flex === 0, `coverage ${big.lifestyle.coverage.toFixed(2)}`)
  const small = run({ mealsPerWeek: 0.5, travelPlan: 'homebody', hobbies: 'low' })
  check('a small wish list leaves room to grow', small.lifestyle.coverage === 1 && small.lifestyle.flex > 0, `flex ${small.lifestyle.flex}`)
  check('wish list income need is above current when unfunded', (incomeForWishList({ ...p, prefs: { mealsPerWeek: 8, travelPlan: 'wanderer', hobbies: 'high', fitness: 'boutique' } })?.income ?? 1e9) > 95000)
  const short = run({ emergencyMonths: 0, stability: 'uncertain' }), full = run({ emergencyMonths: 7, stability: 'steady' })
  check('short emergency fund directs more Cushion to it', short.cushion.emergency > full.cushion.emergency, `${short.cushion.emergency} vs ${full.cushion.emergency}`)
  check('buy-soon directs more Cushion to the home fund', run({ tenure: 'buy-soon' }).cushion.homeFund > run({ tenure: 'rent' }).cushion.homeFund)
  check('cost centers still sum to take-home with prefs', Math.abs(costCenters(big).reduce((a, c) => a + c.amount, 0) - big.tax.monthly) <= 16)
  const out = run({ area: 'urban-core', bedrooms: 4 })
  check('an out-of-reach pick is flagged with an alternative', out.housing.pick.status === 'stretch' && !!(out.housing.pick.smallerSize || out.housing.pick.alternative))
  check('derivePriorities: buy-soon raises home, urban raises city', derivePriorities({ tenure: 'buy-soon', area: 'urban-core' }).home === 5 && derivePriorities({ area: 'urban-core' }).city === 5)
}

// Travel in familiar units, priced for the visitor's region.
{
  const { tripCost, travelRegion, planCost, travelBuys, TRAVEL_PLANS } = await import('../src/utils/travel.js')
  const ctx = state => ({ state, adults: 2, children: 0, svcIdx: 1 })
  const eu = st => tripCost('week-europe', ctx(st)).total, asia = st => tripCost('week-asia', ctx(st)).total
  check('regions: CO mountain, NY northeast, CA west, HI hawaii', travelRegion('CO').id === 'mountain' && travelRegion('NY').id === 'northeast' && travelRegion('CA').id === 'west' && travelRegion('HI').id === 'hawaii')
  check('Europe is cheaper to reach from NY than from CA', eu('NY') < eu('CA'), `${eu('NY')} vs ${eu('CA')}`)
  check('Asia is cheaper to reach from CA than from NY', asia('CA') < asia('NY'), `${asia('CA')} vs ${asia('NY')}`)
  check('Hawaii pays more for mainland and Europe flights', tripCost('week-domestic', ctx('HI')).total > tripCost('week-domestic', ctx('TX')).total && eu('HI') > eu('NY'))
  const wk = tripCost('weekend-drive', ctx('CO')).total, wf = tripCost('weekend-fly', ctx('CO')).total, wd = tripCost('week-domestic', ctx('CO')).total
  check('trip costs rise with trip size: weekend < long weekend < week', wk < wf && wf < wd, `${wk} ${wf} ${wd}`)
  check('a week in Europe costs several times a weekend getaway', eu('CO') > 3 * wk)
  check('more travelers cost more', tripCost('week-europe', { ...ctx('CO'), children: 2 }).total > eu('CO'))
  check('regional price level scales home trips only', tripCost('weekend-drive', { ...ctx('CO'), svcIdx: 1.2 }).total > wk && tripCost('week-europe', { ...ctx('CO'), svcIdx: 1.2 }).total === eu('CO'))
  check('plans are ordered by cost: homebody < weekends < wanderer', planCost('homebody', ctx('CO')).annual < planCost('weekends', ctx('CO')).annual && planCost('weekends', ctx('CO')).annual < planCost('wanderer', ctx('CO')).annual)
  check('every plan has an annual cost', TRAVEL_PLANS.every(p => planCost(p.id, ctx('TX')).annual > 0))
  const lo = travelBuys(3000, ctx('CO')).find(x => x.id === 'week-europe'), hi = travelBuys(12000, ctx('CO')).find(x => x.id === 'week-europe')
  check('travelBuys: $3k buys a Europe week every couple of years', /one every/.test(lo.phrase), lo.phrase)
  check('travelBuys: $12k buys about two Europe weeks a year', /about 2/.test(hi.phrase), hi.phrase)
  check('travelBuys: a tiny budget is a stretch', /stretch/.test(travelBuys(500, ctx('CO')).find(x => x.id === 'week-europe').phrase))
}

// City data: structure, and cities move results in the right direction.
{
  const { cities } = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/data/lifestyleCities.json', import.meta.url), 'utf8'))
  check('city table has 300+ cities', cities.length >= 300, `${cities.length}`)
  check('every state has a city', Object.keys(STATES).every(c => cities.some(x => x.state === c)))
  const bad = cities.filter(c => !(c.rent[1] > 300 && c.rent[3] > 300 && c.medianHome > 40000 && c.propTaxPct > 0.05 && c.propTaxPct < 4))
  check('city rows sane', bad.length === 0, bad.map(c => c.id).join(', '))
  const city = id => cities.find(c => c.id === id)
  const sf = computeLifestyle({ ...base, state: 'CA', city: city('CA|San Francisco') })
  const fresno = computeLifestyle({ ...base, state: 'CA', city: city('CA|Fresno') })
  const stateOnly = computeLifestyle({ ...base, state: 'CA' })
  check('San Francisco rent > Fresno rent', sf.neighborhoods[1].rent > fresno.neighborhoods[1].rent, `${sf.neighborhoods[1].rent} vs ${fresno.neighborhoods[1].rent}`)
  check('San Francisco homes cost more than state average', sf.neighborhoods[1].typicalPrice > stateOnly.neighborhoods[1].typicalPrice)
  check('city of another state is ignored', computeLifestyle({ ...base, state: 'TX', city: city('CA|Fresno') }).neighborhoods[0].rent === computeLifestyle(base).neighborhoods[0].rent)
  const austin = equivalentIncome({ ...base, state: 'TX' }, 'CA', undefined, city('CA|San Francisco'))
  const fresnoNeed = equivalentIncome({ ...base, state: 'TX' }, 'CA', undefined, city('CA|Fresno'))
  check('SF needs more income than Fresno to keep the same life', austin.income > fresnoNeed.income, `${austin.income} vs ${fresnoNeed.income}`)
}

process.exit(failures ? 1 : 0)
