export const questions = [
  {
    id: 1,
    text: "How much do you actually enjoy driving — is it something you look forward to, or just a way to get somewhere?",
    lowLabel: "Just getting from A to B",
    highLabel: "I genuinely love driving",
  },
  {
    id: 2,
    text: "How many people regularly ride with you on a typical day — not your biggest trip, your normal day?",
    lowLabel: "Usually just me",
    highLabel: "Full car — 4 or more people",
  },
  {
    id: 3,
    text: "How often do you need to move large or bulky items — furniture, bikes, camping gear, sports equipment, or big grocery hauls?",
    lowLabel: "Rarely — my loads are small",
    highLabel: "Constantly",
  },
  {
    id: 4,
    text: "How important is it to keep your total car costs low — that means purchase price, insurance, fuel, and repairs all together?",
    lowLabel: "Not a priority at all",
    highLabel: "It's my top priority",
  },
  {
    id: 5,
    text: "Does the car you drive affect how you see yourself — your image, confidence, or how you come across to others?",
    lowLabel: "Not at all — a car is a car",
    highLabel: "Yes, it genuinely matters to me",
  },
  {
    id: 6,
    text: "How much does performance matter to you — things like acceleration, engine power, and how responsive the car feels to drive?",
    lowLabel: "Just reliable is fine",
    highLabel: "Performance matters a lot to me",
  },
  {
    id: 7,
    text: "How much do you want to reduce your fuel costs and environmental impact with your next car?",
    lowLabel: "Not really a priority",
    highLabel: "It's a real priority for me",
  },
  {
    id: 8,
    text: "How often do you deal with tight parking situations — parallel parking on city streets, cramped garages, or narrow lots?",
    lowLabel: "Almost never",
    highLabel: "Every single day",
  },
  {
    id: 9,
    text: "How often do you take drives or trips over an hour — long commutes, road trips, or regular highway runs?",
    lowLabel: "Almost never",
    highLabel: "Several times a month",
  },
  {
    id: 10,
    text: "How important are modern tech features to you — large touchscreens, wireless CarPlay, advanced driver assist, or automatic software updates?",
    lowLabel: "I barely care about that stuff",
    highLabel: "Very important to me",
  },
  {
    id: 11,
    text: "How often do you drive off paved roads, tow a trailer or boat, haul heavy loads in a truck bed, or need serious ground clearance?",
    lowLabel: "Never — I'm all pavement",
    highLabel: "Regularly",
  },
  {
    id: 12,
    text: "Do you have — or could you easily set up — a dedicated spot at home to charge an electric vehicle overnight?",
    lowLabel: "No — apartment, shared lot, or no option",
    highLabel: "Yes, absolutely no problem",
  },
  {
    id: 13,
    text: "Do you regularly drive in snow, ice, or winter conditions where all-wheel drive or better traction would genuinely help?",
    lowLabel: "No — mild or warm climate",
    highLabel: "Yes — winter driving is real for me",
  },
  {
    id: 14,
    text: "How many miles do you typically drive in a week, adding up all your trips?",
    lowLabel: "Under 50 miles",
    highLabel: "Over 300 miles",
  },
  {
    id: 15,
    text: "How busy and active is life around your car — sports practices, school runs, frequent errands, lots of people and stuff going in and out?",
    lowLabel: "Pretty calm — mostly just driving",
    highLabel: "Nonstop activity",
  },
]

// Impact of each answer (1-5) on vehicle category scores
// Each entry: { category, impact } where impact is multiplied by (answer - 3)
// So answer=1 → -2x, answer=3 → 0x, answer=5 → +2x
export const questionImpacts = [
  // Q1: Driving enjoyment — low = practical, high = enthusiast
  [
    { category: 'sports', impact: 12 },
    { category: 'luxury', impact: 6 },
    { category: 'economy', impact: -8 },
    { category: 'minivan', impact: -6 },
    { category: 'sedan', impact: 2 },
  ],
  // Q2: Regular passenger count — high = family hauler
  [
    { category: 'minivan', impact: 14 },
    { category: 'suv', impact: 10 },
    { category: 'pickup', impact: 4 },
    { category: 'sports', impact: -14 },
    { category: 'sedan', impact: -4 },
    { category: 'economy', impact: -4 },
  ],
  // Q3: Cargo hauling frequency — high = needs utility
  [
    { category: 'pickup', impact: 12 },
    { category: 'suv', impact: 8 },
    { category: 'minivan', impact: 8 },
    { category: 'sports', impact: -12 },
    { category: 'sedan', impact: -4 },
    { category: 'economy', impact: -4 },
  ],
  // Q4: Keep costs low — high = frugal buyer
  [
    { category: 'economy', impact: 14 },
    { category: 'hybrid', impact: 8 },
    { category: 'luxury', impact: -14 },
    { category: 'sports', impact: -8 },
    { category: 'electric', impact: -4 },
  ],
  // Q5: Image and prestige matter — high = status-conscious
  [
    { category: 'luxury', impact: 14 },
    { category: 'sports', impact: 8 },
    { category: 'economy', impact: -10 },
    { category: 'minivan', impact: -8 },
  ],
  // Q6: Performance matters — high = enthusiast driver
  [
    { category: 'sports', impact: 14 },
    { category: 'luxury', impact: 6 },
    { category: 'economy', impact: -10 },
    { category: 'minivan', impact: -8 },
    { category: 'hybrid', impact: -4 },
  ],
  // Q7: Eco/fuel savings — high = green-minded
  [
    { category: 'electric', impact: 14 },
    { category: 'hybrid', impact: 10 },
    { category: 'pickup', impact: -8 },
    { category: 'sports', impact: -4 },
    { category: 'suv', impact: -2 },
  ],
  // Q8: Tight parking frequency — high = needs a smaller car
  [
    { category: 'sedan', impact: 8 },
    { category: 'economy', impact: 8 },
    { category: 'sports', impact: 4 },
    { category: 'pickup', impact: -10 },
    { category: 'minivan', impact: -8 },
    { category: 'suv', impact: -4 },
  ],
  // Q9: Long drives / road trips — high = needs range and comfort
  [
    { category: 'suv', impact: 8 },
    { category: 'hybrid', impact: 10 },
    { category: 'sedan', impact: 6 },
    { category: 'electric', impact: -8 },
    { category: 'economy', impact: -4 },
  ],
  // Q10: Modern tech features — high = tech-forward buyer
  [
    { category: 'electric', impact: 12 },
    { category: 'luxury', impact: 10 },
    { category: 'economy', impact: -8 },
    { category: 'pickup', impact: -4 },
  ],
  // Q11: Off-road / towing — high = rugged use
  [
    { category: 'pickup', impact: 14 },
    { category: 'suv', impact: 10 },
    { category: 'economy', impact: -10 },
    { category: 'sedan', impact: -8 },
    { category: 'electric', impact: -6 },
    { category: 'sports', impact: -6 },
  ],
  // Q12: Home charging capability — yes = EV viable
  [
    { category: 'electric', impact: 16 },
    { category: 'hybrid', impact: -4 },
  ],
  // Q13: Winter / AWD needs — high = cold climate
  [
    { category: 'suv', impact: 10 },
    { category: 'pickup', impact: 6 },
    { category: 'sports', impact: -8 },
    { category: 'sedan', impact: -4 },
    { category: 'economy', impact: -4 },
  ],
  // Q14: Weekly mileage — high = high-mileage driver
  [
    { category: 'hybrid', impact: 10 },
    { category: 'suv', impact: 4 },
    { category: 'sedan', impact: 4 },
    { category: 'electric', impact: -6 },
    { category: 'economy', impact: -2 },
  ],
  // Q15: Busy/active life around the car — high = family/activity hub
  [
    { category: 'minivan', impact: 12 },
    { category: 'suv', impact: 8 },
    { category: 'pickup', impact: 4 },
    { category: 'sports', impact: -12 },
    { category: 'sedan', impact: -4 },
    { category: 'economy', impact: -4 },
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
