export const questions = [
  {
    id: 1,
    text: "Is a car just a thing that gets you from point A to point B?",
    lowLabel: "Absolutely",
    highLabel: "Never",
  },
  {
    id: 2,
    text: "I've definitely watched a car review video at 2am... for fun.",
    lowLabel: "Never done that",
    highLabel: "That's basically me",
  },
  {
    id: 3,
    text: "My car is basically a mobile closet.",
    lowLabel: "I'm minimalist",
    highLabel: "Trunk life",
  },
  {
    id: 4,
    text: "I'd rather spend money on literally anything else besides my car.",
    lowLabel: "Cars are worth it",
    highLabel: "100% agreed",
  },
  {
    id: 5,
    text: "I secretly love the valet parking moment.",
    lowLabel: "Meh",
    highLabel: "It's the highlight",
  },
  {
    id: 6,
    text: "My backseat looks like a snack explosion happened.",
    lowLabel: "Spotless",
    highLabel: "Don't ask",
  },
  {
    id: 7,
    text: "When the light turns green, I like to be the first one gone.",
    lowLabel: "I'm patient",
    highLabel: "It's a lifestyle",
  },
  {
    id: 8,
    text: "I feel guilty every time I fill up at a gas station.",
    lowLabel: "Not at all",
    highLabel: "Every single time",
  },
  {
    id: 9,
    text: "I've tried to fit something way too big into a car that was way too small.",
    lowLabel: "Never happened",
    highLabel: "Many times",
  },
  {
    id: 10,
    text: "I can parallel park in a spot that would make others sweat.",
    lowLabel: "I avoid it",
    highLabel: "Challenge accepted",
  },
]

// Impact of each answer (1-5) on vehicle category scores
// Each entry: { category, impact } where impact is multiplied by (answer - 3)
// So answer=1 → -2x, answer=3 → 0x, answer=5 → +2x
export const questionImpacts = [
  // Q1: "Car is just transport"
  // High = minimalist → economy, sedan. Low = loves cars → sports, luxury
  [
    { category: 'economy', impact: 8 },
    { category: 'sedan', impact: 4 },
    { category: 'sports', impact: -10 },
    { category: 'luxury', impact: -6 },
    { category: 'suv', impact: -2 },
  ],
  // Q2: "Watches car reviews at 2am"
  // High = car enthusiast → sports, luxury
  [
    { category: 'sports', impact: 12 },
    { category: 'luxury', impact: 8 },
    { category: 'economy', impact: -6 },
    { category: 'sedan', impact: 2 },
  ],
  // Q3: "Car is a mobile closet" (carries lots of stuff)
  // High = needs space → suv, minivan, pickup
  [
    { category: 'suv', impact: 10 },
    { category: 'minivan', impact: 8 },
    { category: 'pickup', impact: 6 },
    { category: 'sports', impact: -10 },
    { category: 'sedan', impact: -4 },
  ],
  // Q4: "Spend as little as possible on car"
  // High = frugal → economy, hybrid
  [
    { category: 'economy', impact: 12 },
    { category: 'hybrid', impact: 6 },
    { category: 'luxury', impact: -12 },
    { category: 'sports', impact: -8 },
  ],
  // Q5: "Loves the valet moment" — prestige matters
  // High = prestige → luxury
  [
    { category: 'luxury', impact: 14 },
    { category: 'sports', impact: 6 },
    { category: 'economy', impact: -8 },
    { category: 'minivan', impact: -6 },
  ],
  // Q6: "Backseat chaos" — active life / family hauler
  // High = needs space → minivan, suv
  [
    { category: 'minivan', impact: 10 },
    { category: 'suv', impact: 8 },
    { category: 'pickup', impact: 4 },
    { category: 'sports', impact: -10 },
    { category: 'sedan', impact: -4 },
  ],
  // Q7: "First off the line" — performance-focused
  // High = performance → sports, luxury sport
  [
    { category: 'sports', impact: 14 },
    { category: 'luxury', impact: 4 },
    { category: 'economy', impact: -8 },
    { category: 'minivan', impact: -8 },
  ],
  // Q8: "Guilt at gas pump" — wants EV/eco
  // High = eco-conscious → electric, hybrid
  [
    { category: 'electric', impact: 14 },
    { category: 'hybrid', impact: 10 },
    { category: 'pickup', impact: -6 },
    { category: 'suv', impact: -2 },
  ],
  // Q9: "Tried to fit too much" — needs utility
  // High = hauler → pickup, suv, minivan
  [
    { category: 'pickup', impact: 12 },
    { category: 'suv', impact: 8 },
    { category: 'minivan', impact: 6 },
    { category: 'sports', impact: -10 },
    { category: 'sedan', impact: -4 },
  ],
  // Q10: "Pro parallel parker" — comfortable in tight spaces
  // High = skilled driver → sports, sedan (smaller car comfort)
  [
    { category: 'sports', impact: 8 },
    { category: 'sedan', impact: 6 },
    { category: 'economy', impact: 4 },
    { category: 'pickup', impact: -6 },
    { category: 'minivan', impact: -4 },
    { category: 'suv', impact: -2 },
  ],
]

export const vehicleProfiles = {
  suv: {
    name: 'SUV / Crossover',
    tagline: 'The I Need Options Mobile',
    emoji: '🚙',
    description:
      'You like being prepared for anything — road trips, Costco runs, and unexpected adventures. You want space, but you also want to not feel like you\'re driving a bus.',
    perfectFor: ['Families or soon-to-be families', 'People who like the option of AWD', 'Road-trippers and weekend warriors', 'Those who can\'t say no to cargo space'],
    considerations: ['Higher fuel costs than sedans', 'Parking can be trickier in cities', 'Higher sticker price than equivalent sedan'],
    topPicks: ['Toyota RAV4', 'Honda CR-V', 'Mazda CX-5'],
  },
  sedan: {
    name: 'Sedan',
    tagline: 'The Sensible Royalty',
    emoji: '🚗',
    description:
      'Efficient, comfortable, and dependable. You know what you need and you\'re not paying for what you don\'t. The sedan is the unsung hero of the road.',
    perfectFor: ['Daily commuters', 'People who value fuel economy', 'Anyone parking in cities regularly', 'Those who want reliability over flash'],
    considerations: ['Less cargo space than SUVs', 'Doesn\'t feel as "premium" to some', 'Back seat headroom can be tight'],
    topPicks: ['Honda Accord', 'Toyota Camry', 'Mazda3'],
  },
  pickup: {
    name: 'Pickup Truck',
    tagline: 'The Hold My Beer Vehicle',
    emoji: '🛻',
    description:
      'You need a truck. Or you really, really want one. Either way, you\'ve never regretted having a bed when half the neighborhood needed help moving.',
    perfectFor: ['People who actually tow or haul things', 'Outdoor and off-road enthusiasts', 'Contractors and tradespeople', 'Anyone who gets asked to help move furniture constantly'],
    considerations: ['High fuel costs', 'Expensive to own vs. smaller vehicles', 'Can be a pain to park', 'Overkill for pure city driving'],
    topPicks: ['Ford F-150', 'Toyota Tacoma', 'Ram 1500'],
  },
  sports: {
    name: 'Sports Car',
    tagline: "Life's Too Short Machine",
    emoji: '🏎️',
    description:
      'You\'ve already done the math and decided driving should be fun. The twisty road is the destination. Groceries can wait.',
    perfectFor: ['Solo drivers or couples without kids', 'People who genuinely enjoy driving', 'Weekend/second-car owners', 'Those willing to sacrifice practicality for a smile'],
    considerations: ['Not great for families or cargo', 'Can be expensive to insure', 'Ride quality often stiffer', 'Impractical in snow/ice'],
    topPicks: ['Mazda MX-5 Miata', 'Ford Mustang', 'Toyota GR86'],
  },
  luxury: {
    name: 'Luxury Vehicle',
    tagline: 'The Treat Yourself Chariot',
    emoji: '✨',
    description:
      'You believe the daily commute should feel like something. Heated seats, smooth ride, premium everything — because you earned it.',
    perfectFor: ['People for whom comfort and refinement matter', 'Those who spend significant time in their car', 'Business professionals', 'Anyone who\'s upgraded and can\'t go back'],
    considerations: ['Significantly higher cost of ownership', 'More expensive maintenance and repairs', 'Faster depreciation than mainstream brands', 'Flashier = higher insurance rates'],
    topPicks: ['Lexus ES', 'BMW 3 Series', 'Mercedes-Benz C-Class'],
  },
  economy: {
    name: 'Economy Car',
    tagline: 'The Money Isn\'t Everything Genius',
    emoji: '💚',
    description:
      'You\'re not cheap — you\'re smart. A car is not an identity, and you\'d rather put that money somewhere it grows. The economy car wins on total cost of ownership, every time.',
    perfectFor: ['First-time car buyers', 'City dwellers with limited parking budgets', 'People who drive < 10K miles/year', 'Those who want low insurance and maintenance costs'],
    considerations: ['Fewer features at base trim', 'Less road presence', 'Can feel underpowered on highways'],
    topPicks: ['Honda Civic', 'Toyota Corolla', 'Hyundai Elantra'],
  },
  electric: {
    name: 'Electric Vehicle',
    tagline: 'Living in 2035 Pioneer',
    emoji: '⚡',
    description:
      'You\'re done with gas stations. You want tech, torque off the line, and the knowledge that your carbon footprint just shrank. Welcome to the future.',
    perfectFor: ['People with home charging capability', 'City and suburban drivers', 'Tech-forward buyers', 'Anyone who hates gas station trips'],
    considerations: ['Range anxiety on long trips', 'Charging infrastructure still building out', 'Higher upfront cost', 'Apartment charging can be complicated'],
    topPicks: ['Tesla Model 3', 'Hyundai Ioniq 6', 'Chevrolet Equinox EV'],
  },
  hybrid: {
    name: 'Hybrid',
    tagline: 'The Best of Both Worlds Strategist',
    emoji: '🔋',
    description:
      'You want to save money on fuel without committing to a full EV. Smart, practical, and increasingly available in every class. The hybrid is a no-brainer for high-mileage drivers.',
    perfectFor: ['High-mileage commuters', 'People unsure about going full EV', 'Families who want fuel savings + practicality', 'City + highway mixed drivers'],
    considerations: ['Less exciting to drive than pure EV', 'Can be more expensive to service if battery issues arise', 'Still requires gas stations'],
    topPicks: ['Toyota Prius', 'Honda Accord Hybrid', 'Toyota RAV4 Hybrid'],
  },
  minivan: {
    name: 'Minivan',
    tagline: 'Embraced My Destiny Legend',
    emoji: '🚐',
    description:
      'You\'ve accepted the highest calling of automotive purpose: maximum people, maximum cargo, maximum sliding door satisfaction. This is not a compromise — this is a choice made by someone who knows exactly what they need.',
    perfectFor: ['Families with 3+ kids', 'Carpoolers and sports team parents', 'Anyone who values interior space above all else', 'People who need a mobile base camp'],
    considerations: ['Not exactly a head-turner', 'Higher fuel costs', 'Limited parking in tight spots', 'That sliding door sound is now your life'],
    topPicks: ['Honda Odyssey', 'Toyota Sienna', 'Kia Carnival'],
  },
}
