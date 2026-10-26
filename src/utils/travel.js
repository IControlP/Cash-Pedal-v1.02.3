// Travel in terms people recognise — a weekend getaway, a week in Europe — priced for
// where the visitor lives. Pure and Node-importable.
//
// Every dollar figure here is a round-number ASSUMPTION (typical economy round-trip
// fares and mid-range lodging/meals), not a cited dataset. Origin region changes the
// airfare (the West Coast is closer to Asia, the Northeast to Europe, Hawaii and Alaska
// pay more to reach the mainland) and the examples shown. Real prices vary a lot by
// season and booking date. To make this sourced, replace BASE_FARE / REGION_FARE with
// BTS domestic itinerary fares and an international fare source, and keep the shapes.

export const TRAVEL_REGIONS = {
  northeast: {
    label: 'the Northeast', states: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC', 'MD', 'DE'],
    fare: { domestic: 0.95, caribbean: 0.9, europe: 0.85, asia: 1.25 },
    weekend: 'Cape Cod, the Catskills, Vermont or Acadia', domesticWeek: 'Florida, the Outer Banks or the national parks',
  },
  southeast: {
    label: 'the Southeast', states: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
    fare: { domestic: 0.95, caribbean: 0.8, europe: 0.95, asia: 1.25 },
    weekend: 'the Smokies, the Gulf coast, Charleston or Savannah', domesticWeek: 'Colorado, the Southwest parks or New England',
  },
  midwest: {
    label: 'the Midwest', states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    fare: { domestic: 1.0, caribbean: 1.0, europe: 0.95, asia: 1.15 },
    weekend: 'Door County, the north woods, Chicago or the Great Lakes', domesticWeek: 'Florida, the Rockies or the Pacific Northwest',
  },
  southwest: {
    label: 'the Southwest', states: ['AZ', 'NM', 'OK', 'TX'],
    fare: { domestic: 0.95, caribbean: 1.0, europe: 1.0, asia: 1.1 },
    weekend: 'the Hill Country, Sedona, Santa Fe or the Gulf coast', domesticWeek: 'California, Colorado or Florida',
  },
  mountain: {
    label: 'the Mountain West', states: ['CO', 'ID', 'MT', 'NV', 'UT', 'WY'],
    fare: { domestic: 1.0, caribbean: 1.15, europe: 1.05, asia: 1.1 },
    weekend: 'a ski town, Moab, a national park or Jackson', domesticWeek: 'Hawaii, Florida or the Pacific coast',
  },
  west: {
    label: 'the West Coast', states: ['CA', 'OR', 'WA'],
    fare: { domestic: 1.0, caribbean: 1.2, europe: 1.1, asia: 0.85 },
    weekend: 'wine country, Big Sur, Tahoe or the Oregon coast', domesticWeek: 'Hawaii, Colorado or the East Coast',
  },
  hawaii: {
    label: 'Hawaii', states: ['HI'],
    fare: { domestic: 1.9, caribbean: 1.8, europe: 1.4, asia: 0.8 },
    weekend: 'another island', domesticWeek: 'the West Coast or Las Vegas',
  },
  alaska: {
    label: 'Alaska', states: ['AK'],
    fare: { domestic: 1.7, caribbean: 1.6, europe: 1.3, asia: 0.95 },
    weekend: 'Seward, Talkeetna or Homer', domesticWeek: 'the Lower 48 or Hawaii',
  },
}

export function travelRegion(state) {
  const id = Object.keys(TRAVEL_REGIONS).find(k => TRAVEL_REGIONS[k].states.includes(state)) ?? 'midwest'
  return { id, ...TRAVEL_REGIONS[id] }
}

// Typical economy round-trip airfare per person from a mid-market US origin (assumption).
const BASE_FARE = { domestic: 380, caribbean: 480, europe: 1000, asia: 1300 }
const INTER_ISLAND_FARE = 180

// air: fare class; lodging = per room-night, food = per person-day (food and activities).
// `home` costs scale with the visitor's regional price level; abroad costs do not.
export const TRIP_TYPES = [
  { id: 'weekend-drive', label: 'Weekend getaway', short: 'weekend getaway', nights: 2, days: 3, air: null, driveMiles: 350, lodging: 150, food: 80, home: true },
  { id: 'weekend-fly', label: 'Long weekend by air', short: 'long weekend by air', nights: 3, days: 4, air: 'domestic', lodging: 160, food: 85, home: true },
  { id: 'week-domestic', label: 'Week-long U.S. vacation', short: 'week-long U.S. vacation', nights: 6, days: 7, air: 'domestic', lodging: 160, food: 85, home: true },
  { id: 'week-caribbean', label: 'Week in the Caribbean or Mexico', short: 'week in the Caribbean or Mexico', nights: 6, days: 7, air: 'caribbean', lodging: 230, food: 80, home: false },
  { id: 'week-europe', label: 'Week in Europe', short: 'week in Europe', nights: 7, days: 8, air: 'europe', lodging: 190, food: 115, home: false },
  { id: 'week-asia', label: 'Week in Asia (Japan, Thailand, Vietnam…)', short: 'week in Asia', nights: 7, days: 8, air: 'asia', lodging: 110, food: 65, home: false },
]

const round50 = n => Math.round(n / 50) * 50

// Household cost of one trip. ctx = { state, adults, children, svcIdx }
export function tripCost(typeId, { state, adults = 1, children = 0, svcIdx = 1 }) {
  const t = TRIP_TYPES.find(x => x.id === typeId)
  const region = travelRegion(state)
  const pax = adults + children
  const travelers = adults + 0.7 * children
  const rooms = Math.max(1, Math.ceil(adults / 2) + (children > 2 ? 1 : 0))
  const scale = t.home ? svcIdx : 1
  let air = 0
  if (t.air) air = pax * BASE_FARE[t.air] * region.fare[t.air]
  // Hawaii has no drive-able weekend: the "weekend getaway" is an inter-island flight.
  if (t.id === 'weekend-drive' && region.id === 'hawaii') air = pax * INTER_ISLAND_FARE
  const drive = t.driveMiles && region.id !== 'hawaii' ? t.driveMiles * 0.25 : 0
  const lodging = rooms * t.nights * t.lodging * scale
  const food = travelers * t.days * t.food * scale
  const total = round50(air + drive + lodging + food)
  const example = t.id === 'weekend-drive' ? region.weekend : t.id === 'week-domestic' ? region.domesticWeek : null
  return { id: t.id, label: t.label, short: t.short, total, parts: { air: round50(air), drive: round50(drive), lodging: round50(lodging), food: round50(food) }, example }
}

// A "plan" is a typical year of travel, built from the trips above.
function bigTrip(region) { return region.id === 'west' || region.id === 'hawaii' ? 'week-asia' : 'week-europe' }

export const TRAVEL_PLANS = [
  { id: 'homebody', label: 'Mostly close to home', items: () => [['weekend-drive', 1]] },
  { id: 'weekends', label: 'A weekend getaway every quarter', items: () => [['weekend-drive', 4]] },
  { id: 'us-week', label: 'A week-long U.S. vacation, plus weekends', items: () => [['weekend-drive', 2], ['week-domestic', 1]] },
  { id: 'beach', label: 'A beach week in the Caribbean or Mexico', items: () => [['weekend-drive', 2], ['week-caribbean', 1]] },
  { id: 'europe', label: 'A week in Europe each year', items: () => [['weekend-drive', 2], ['week-europe', 1]] },
  { id: 'asia', label: 'A week in Asia each year', items: () => [['weekend-drive', 2], ['week-asia', 1]] },
  { id: 'wanderer', label: 'Travel is a priority', items: region => [['weekend-drive', 4], ['week-domestic', 1], [bigTrip(region), 1]] },
]

// Priority score (1–5) a plan implies, used to shape the pillar split.
export const PLAN_PRIORITY = { homebody: 1, weekends: 2, 'us-week': 3, beach: 3, europe: 4, asia: 4, wanderer: 5 }

export function planCost(planId, ctx) {
  const plan = TRAVEL_PLANS.find(p => p.id === planId) ?? TRAVEL_PLANS[1]
  const region = travelRegion(ctx.state)
  const items = plan.items(region).map(([id, count]) => {
    const c = tripCost(id, ctx)
    return { ...c, count, subtotal: c.total * count }
  })
  const annual = items.reduce((a, i) => a + i.subtotal, 0)
  const summary = items.map(i => `${i.count} ${i.count > 1 && i.id === 'weekend-drive' ? 'weekend getaways' : i.short}`).join(' + ')
  return { id: plan.id, label: plan.label, summary, annual, monthly: annual / 12, items, region: region.label }
}

// What an annual travel budget buys, one trip type at a time.
export function travelBuys(annualBudget, ctx) {
  return TRIP_TYPES.map(t => {
    const c = tripCost(t.id, ctx)
    const perYear = c.total > 0 ? annualBudget / c.total : 0
    let phrase
    if (perYear >= 1.25) phrase = `about ${Math.floor(perYear * 2) / 2} a year`
    else if (perYear >= 0.85) phrase = 'about one a year'
    else if (perYear >= 0.3) phrase = `one every ${Math.max(1.5, Math.round((1 / perYear) * 2) / 2)} years`
    else phrase = 'a stretch for now'
    return { ...c, perYear, phrase }
  })
}
