// Priorities survey for the lifestyle calculator. Each answer is 1–5 and feeds
// computeLifestyle() in src/utils/lifestyle.js (keys must match PRIORITY_KEYS).

export const priorityQuestions = [
  { key: 'home',    emoji: '🏡', text: 'How much do you want space and a place that is truly yours?',
    low: 'A small place is fine', high: 'A home with room to spread out' },
  { key: 'city',    emoji: '🌆', text: 'How much do you want to live where things are within walking distance?',
    low: 'I will happily drive', high: 'Restaurants, shops and transit on my doorstep' },
  { key: 'dining',  emoji: '🍽️', text: 'How much would you like to eat out and enjoy local spots?',
    low: 'Mostly home cooking', high: 'Dining out is a big part of my life' },
  { key: 'travel',  emoji: '✈️', text: 'How much do you want travel and getaways in your year?',
    low: 'Staying close to home is great', high: 'I want to be exploring often' },
  { key: 'car',     emoji: '🚗', text: 'How much would you like a nicer, newer car?',
    low: 'Reliable and simple', high: 'A great car is a real priority' },
  { key: 'cushion', emoji: '🛟', text: 'How much do you want a strong safety net and a head start on the future?',
    low: 'Live more in the present', high: 'Build savings quickly' },
  { key: 'family',  emoji: '🎒', text: 'How much do good schools and a family-friendly area matter?',
    low: 'Not a factor', high: 'Top of the list' },
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
