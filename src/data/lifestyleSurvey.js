// Survey for the lifestyle calculator. Questions are concrete choices priced in the
// visitor's own city (via housingMenu() in src/utils/lifestyle.js), not abstract
// sliders. Each answer maps onto a `prefs` key that computeLifestyle() consumes.

const usd = n => '$' + Math.round(n).toLocaleString('en-US')

export const SURVEY_SECTIONS = {
  home: { label: 'Your home', emoji: '🏡' },
  moving: { label: 'Getting around', emoji: '🚗' },
  daily: { label: 'Day to day', emoji: '🍽️' },
  fun: { label: 'Travel & fun', emoji: '✈️' },
  goals: { label: 'Money goals', emoji: '🎯' },
}

// ctx = { menu: housingMenu(profile), profile: { children, married, roommates }, answers: prefs so far }
// options(ctx) → [{ value, label, sub?, detail?, tag? }]
export const SURVEY_QUESTIONS = [
  {
    key: 'tenure', section: 'home', type: 'cards',
    text: 'Over the next few years, what do you want your housing to look like?',
    options: ({ menu }) => [
      { value: 'rent', label: 'Rent', sub: 'Flexible, no maintenance, lower upfront cash' },
      { value: 'buy-soon', label: 'Buy within about 2 years', sub: `A typical down payment plus closing here is about ${usd(menu.downPaymentTypical)}` },
      { value: 'buy-later', label: 'Buy in 3–5 years', sub: 'Build savings first, then buy' },
      { value: 'either', label: 'Not sure yet', sub: "We'll show both paths" },
    ],
  },
  {
    key: 'area', section: 'home', type: 'cards',
    text: 'Where do you picture yourself living?',
    help: ({ menu }) => `Typical prices in ${menu.label ?? 'your area'} for a ${menu.bedroomsNeeded === 0 ? 'studio' : `${menu.bedroomsNeeded}-bedroom`}${menu.roommates ? ' (your share, with roommates)' : ''}.`,
    options: ({ menu }) => menu.areas.map(a => ({
      value: a.type, label: a.label, sub: a.blurb,
      detail: `Rent about ${usd(a.rent)}/mo${menu.roommates ? ' each' : ''} · typical home ${usd(a.price)}`,
    })),
  },
  {
    key: 'bedrooms', section: 'home', type: 'cards',
    when: ({ menu }) => !menu.roommates,
    text: 'How much space do you want?',
    help: ({ answers }) => `Prices shown for the ${answers.area ? answers.area.replace('-', ' ') : 'inner suburb'} you picked.`,
    options: ({ menu, answers }) => menu.sizes[answers.area ?? 'inner-suburb'].map(z => ({
      value: z.bedrooms, label: z.label, tag: z.recommended ? 'Fits your household' : undefined,
      detail: `Rent about ${usd(z.rent)}/mo · typical home ${usd(z.price)}`,
    })),
  },
  {
    key: 'commute', section: 'moving', type: 'cards',
    text: 'How will you get to work?',
    options: () => [
      { value: 'remote', label: 'Work from home', sub: 'About 6,000 miles a year of other driving' },
      { value: 'hybrid', label: 'Hybrid', sub: 'In the office 2–3 days a week' },
      { value: 'onsite-short', label: 'On-site, under 20 minutes' },
      { value: 'onsite-medium', label: 'On-site, 20–40 minutes' },
      { value: 'onsite-long', label: 'On-site, 40+ minutes', sub: 'Long commutes add fuel, upkeep and time' },
    ],
  },
  {
    key: 'cars', section: 'moving', type: 'cards',
    text: 'How many cars should your household have?',
    options: ({ menu }) => [
      { value: 0, label: 'No car', sub: `Transit, rideshare and car-share, about ${usd(menu.transitMonthly)}/mo` },
      { value: 1, label: '1 car' },
      { value: 2, label: '2 cars' },
      { value: 3, label: '3 cars' },
    ],
  },
  {
    key: 'carStyle', section: 'moving', type: 'scale',
    when: ({ answers }) => answers.cars !== 0,
    text: 'What kind of car do you want to drive?',
    low: 'Reliable and simple', high: 'Nicer and newer',
  },
  {
    key: 'schools', section: 'home', type: 'scale',
    when: ({ profile }) => profile.children > 0,
    text: 'How much do schools and a family-friendly area matter?',
    low: 'Not a factor', high: 'Top of the list',
  },
  {
    key: 'mealsPerWeek', section: 'daily', type: 'cards',
    text: 'How often do you eat out or order in?',
    help: ({ menu }) => `Based on about ${usd(menu.mealCost)} a casual meal in ${menu.label ?? 'your area'}.`,
    options: ({ menu }) => {
      const labels = ['About once a week or less', '2–3 times a week', '4–6 times a week', 'Daily or more']
      return menu.dining.map((d, i) => ({ value: d.value, label: labels[i], sub: `About ${usd(d.monthly)}/mo for your household` }))
    },
  },
  {
    key: 'groceryStyle', section: 'daily', type: 'cards',
    text: 'How do you shop for groceries?',
    options: ({ menu }) => [
      { value: 'budget', label: 'Budget-minded', sub: `About ${usd(menu.groceries.budget)}/mo` },
      { value: 'standard', label: 'Typical', sub: `About ${usd(menu.groceries.standard)}/mo` },
      { value: 'premium', label: 'Premium and organic', sub: `About ${usd(menu.groceries.premium)}/mo` },
    ],
  },
  {
    key: 'fitness', section: 'daily', type: 'cards',
    text: 'Gym, classes or sports memberships?',
    options: ({ menu }) => [
      { value: 'none', label: 'None', sub: 'Free workouts, outdoors' },
      { value: 'basic', label: 'A basic gym', sub: `About ${usd(menu.fitness.basic)}/mo` },
      { value: 'boutique', label: 'Boutique studios or classes', sub: `About ${usd(menu.fitness.boutique)}/mo` },
    ],
  },
  {
    key: 'hobbies', section: 'daily', type: 'cards',
    text: 'How much do hobbies and entertainment matter?',
    help: () => 'Shows, concerts, sports, games, streaming, books, gear.',
    options: ({ menu }) => [
      { value: 'low', label: 'Keep it simple', sub: `About ${usd(menu.hobbies.low)}/mo` },
      { value: 'medium', label: 'A healthy amount', sub: `About ${usd(menu.hobbies.medium)}/mo` },
      { value: 'high', label: 'A big part of my life', sub: `About ${usd(menu.hobbies.high)}/mo` },
    ],
  },
  {
    key: 'pets', section: 'daily', type: 'cards',
    text: 'Any pets?',
    options: ({ menu }) => [
      { value: 0, label: 'No pets' },
      { value: 1, label: 'One pet', sub: `About ${usd(menu.pets[1].monthly)}/mo for food, vet and supplies` },
      { value: 2, label: 'Two or more', sub: `About ${usd(menu.pets[2].monthly)}/mo` },
    ],
  },
  {
    key: 'trips', section: 'fun', type: 'cards',
    text: 'How many trips or getaways do you want each year?',
    options: () => [
      { value: 0.5, label: 'One or none' },
      { value: 2.5, label: '2–3 getaways' },
      { value: 4.5, label: '4–5 getaways' },
      { value: 7, label: '6 or more' },
    ],
  },
  {
    key: 'tripStyle', section: 'fun', type: 'cards',
    text: 'What do your trips usually look like?',
    options: ({ menu }) => [
      { value: 'road', label: 'Road trips and budget stays', sub: `About ${usd(menu.tripCost.road)} per trip for your household` },
      { value: 'flight', label: 'Flights and hotels', sub: `About ${usd(menu.tripCost.flight)} per trip` },
      { value: 'international', label: 'International or premium', sub: `About ${usd(menu.tripCost.international)} per trip` },
    ],
  },
  {
    key: 'goal', section: 'goals', type: 'cards',
    text: 'What is your top money goal right now?',
    options: () => [
      { value: 'emergency', label: 'Build a safety net' },
      { value: 'debt', label: 'Pay down debt faster' },
      { value: 'home', label: 'Save for a home' },
      { value: 'retire', label: 'Invest for the long term' },
      { value: 'balanced', label: 'A bit of everything' },
      { value: 'enjoy', label: 'Enjoy life now' },
    ],
  },
  {
    key: 'emergencyMonths', section: 'goals', type: 'cards',
    text: 'How many months of expenses do you have saved today?',
    options: () => [
      { value: 0, label: 'None yet' },
      { value: 0.5, label: 'Under a month' },
      { value: 2, label: '1–3 months' },
      { value: 4.5, label: '3–6 months' },
      { value: 7, label: '6 months or more' },
    ],
  },
  {
    key: 'stability', section: 'goals', type: 'cards',
    text: 'How predictable is your income?',
    options: () => [
      { value: 'steady', label: 'Steady paycheck', sub: 'Aim for a 3-month safety net' },
      { value: 'variable', label: 'Varies month to month', sub: 'Aim for 6 months' },
      { value: 'uncertain', label: 'Uncertain or changing', sub: 'Aim for 9 months' },
    ],
  },
]

export const STATE_LIST = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],
  ['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],
  ['DC','Washington D.C.'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],
  ['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
  ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],
  ['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],
  ['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
  ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],
  ['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
  ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

// Life stages: what the visitor is trying to do right now. `preset` seeds the
// survey answers; `scenario` adds extra fields and a comparison panel.
export const LIFE_STAGES = [
  { id: 'moving-out', emoji: '📦', label: "Moving out of my parents' home",
    blurb: 'See what a first place costs and what you can still enjoy.',
    prefs: { tenure: 'rent', cars: 1, carStyle: 2, goal: 'emergency', emergencyMonths: 0 }, roommates: 1 },
  { id: 'improve', emoji: '📈', label: 'Improving my finances',
    blurb: 'Find where your money goes and how fast you can build a cushion.',
    prefs: { mealsPerWeek: 0.5, trips: 0.5, hobbies: 'low', fitness: 'none', carStyle: 2, goal: 'emergency' } },
  { id: 'intention', emoji: '🧭', label: 'Living with intention',
    blurb: 'Direct your money toward what you care about most.',
    prefs: {} },
  { id: 'city', emoji: '🚚', label: 'Moving to a new city',
    blurb: 'Compare your life here with a new state, and the pay to keep it.',
    prefs: {}, scenario: 'city' },
  { id: 'job', emoji: '💼', label: 'Taking a new job',
    blurb: 'See what a new salary (or location) changes about your life.',
    prefs: {}, scenario: 'job' },
]

// Pillar colors, validated for the site's dark surface (dataviz palette slots 1/4/3).
export const PILLAR_COLORS = { foundation: '#3987e5', lifestyle: '#c98500', cushion: '#199e70' }
