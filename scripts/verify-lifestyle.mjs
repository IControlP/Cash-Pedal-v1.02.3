// Sanity harness for the lifestyle engine (runs in CI alongside verify-tco.mjs).
import { computeLifestyle, takeHome, STATES, debtPayoffGain } from '../src/utils/lifestyle.js'

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
  if (!(s.rent1br > 400 && s.medianHome > 80000 && s.propTaxPct > 0 && s.priceIndex > 70)) check(`state data sane ${c}`, false)
}

const th = takeHome([75000], 'TX', false, 0)
check('TX single $75k take-home 4,900–5,300/mo', th.monthly > 4900 && th.monthly < 5300, `${th.monthly}`)

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

process.exit(failures ? 1 : 0)
