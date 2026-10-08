// ── Per-route SEO / AI-search metadata ──────────────────────────────────────
//
// Single source of truth for page titles, descriptions, and the plain-HTML
// summary that server.js renders into each page before React loads. AI
// crawlers (GPTBot, ClaudeBot, PerplexityBot, …) and many search bots do not
// run JavaScript, so without this every route looked like an empty <div>.
//
// Used by:
//   • server.js   — injects <title>, meta, canonical, JSON-LD and the summary
//                   into dist/index.html per request; builds /sitemap.xml
//   • RouteMeta   — keeps document.title / description in sync on client-side
//                   navigation
//
// Keep this file free of browser-only APIs and Vite-only imports so Node can
// import it directly.

export const SITE_URL = 'https://cashpedal.io'
export const SITE_NAME = 'Cash Pedal'
export const DEFAULT_DESCRIPTION =
  'Free car affordability and total-cost-of-ownership calculators. Find out how much car you can afford on your salary, the salary you need for a specific car, and the true 5-year cost of any vehicle.'

// `indexable: false` keeps a route out of the sitemap and adds noindex.
export const ROUTE_META = {
  '/': {
    title: 'Cash Pedal — How Much Car Can I Afford? Free Car Cost Calculators',
    description: DEFAULT_DESCRIPTION,
    h1: 'Know the true cost of owning any vehicle before you sign',
    intro: [
      'Cash Pedal is a free vehicle financial toolkit. It answers the questions car buyers actually ask: how much car can I afford on my salary, what salary do I need for a specific car, and what will a car really cost to own once fuel, insurance, maintenance, registration and depreciation are added in.',
      'Estimates are state-aware (insurance, fuel prices and registration fees vary by state) and cover more than 50 brands and thousands of make/model/year/trim combinations.',
    ],
    priority: '1.0',
  },
  '/affordability': {
    title: 'How Much Car Can I Afford? Car Affordability Calculator by Salary | Cash Pedal',
    description:
      'Enter your annual salary to see the car price you can afford — conservative, comfortable and stretch budgets that include the loan or lease payment plus fuel, insurance, maintenance and registration — and matching vehicles.',
    h1: 'How much car can I afford?',
    intro: [
      'Enter your gross annual salary and Cash Pedal works backwards to the vehicle price you can afford. Unlike calculators that only look at the loan payment, the budget includes the full monthly cost of ownership: payment, fuel, insurance, maintenance and registration for your state.',
      'Three budgets are shown. Conservative keeps total car costs at 10% of gross income, comfortable at 15%, and stretch (aggressive) at 20%. Default assumptions are 20% down, a 48-month loan at 6.5% APR and 13,500 miles a year; all are adjustable, and a lease mode is available.',
      'Tip: you can link straight to a result, e.g. /affordability?salary=75000 (add &mode=lease for leasing).',
    ],
    faq: [
      ['How much of my income should go to a car?',
        'A widely used guideline is to keep total transportation costs — payment, insurance, fuel and upkeep — between 10% and 15% of gross income. Cash Pedal shows budgets at 10% (conservative), 15% (comfortable) and 20% (stretch).'],
      ['What is the 20/4/10 rule for buying a car?',
        'Put at least 20% down, finance for no more than 4 years (48 months), and keep total monthly vehicle costs under 10% of gross income. Cash Pedal\'s conservative budget follows this rule by default.'],
      ['Does the affordability estimate include insurance and gas?',
        'Yes. The budget subtracts estimated monthly fuel, insurance, maintenance and registration (state-specific when you choose a state) before solving for the price you can finance.'],
    ],
    priority: '0.9',
    calculator: true,
  },
  '/salary': {
    title: 'Car Salary Calculator — What Salary Do I Need for This Car? | Cash Pedal',
    description:
      'Enter a vehicle price (or pick a make, model and year) to see the minimum annual salary needed to afford it, based on the full monthly cost of ownership and the 20/4/10 rule. Buy and lease modes.',
    h1: 'What salary do I need to afford this car?',
    intro: [
      'Enter a vehicle price and Cash Pedal calculates the monthly payment plus fuel, insurance, maintenance and registration, then shows the gross annual salary needed to keep that total at 10% (conservative), 15% (comfortable) or 20% (stretch) of income.',
      'Pick a specific make, model, year and trim for vehicle-specific fuel economy, insurance and maintenance estimates. Link straight to a result with /salary?price=35000.',
    ],
    faq: [
      ['What salary do I need for a $40,000 car?',
        'With 20% down, a 48-month loan at 6.5% APR and typical operating costs, a $40,000 car costs roughly $1,275 a month all-in. Keeping that under 15% of gross income takes a salary of about $102,000; under 10% (the 20/4/10 rule) about $153,000. Use the calculator for your state and terms.'],
      ['Is it better to lease or buy?',
        'Leasing lowers the monthly payment but you never build equity; buying costs more per month during the loan but is usually cheaper over 5+ years. The salary calculator has a lease mode so you can compare both.'],
    ],
    priority: '0.9',
    calculator: true,
  },
  '/tco': {
    title: 'True Cost of Car Ownership Calculator (TCO) | Cash Pedal',
    description:
      'Estimate the true total cost of owning any car — depreciation, financing, fuel, insurance, maintenance, repairs and registration — for your state, in a quick guided flow.',
    h1: 'True cost of ownership calculator',
    intro: [
      'Pick a make, model and year and get a guided total-cost-of-ownership (TCO) estimate covering depreciation, financing, fuel or charging, insurance, scheduled maintenance, known model issues and state registration fees.',
      'Depreciation is regionally adjusted (truck country, sun/snow belt, EV-friendly states) and maintenance is benchmarked against AAA and Consumer Reports data.',
    ],
    priority: '0.9',
    calculator: true,
  },
  '/tco-full': {
    title: 'Full Car Cost & Loan Calculator — Year-by-Year TCO | Cash Pedal',
    description:
      'Detailed vehicle total-cost-of-ownership and auto loan calculator with year-by-year depreciation, maintenance, insurance, fuel, interest and resale value for new and used cars.',
    h1: 'Full TCO and auto loan calculator',
    intro: [
      'The full calculator breaks down every cost of owning a specific vehicle year by year: purchase and financing, interest, depreciation and resale value, fuel or electricity, insurance, maintenance and repairs, and registration.',
    ],
    priority: '0.8',
    calculator: true,
  },
  '/compare': {
    title: 'Compare Car Ownership Costs Side by Side | Cash Pedal',
    description:
      'Compare up to five vehicles side by side on total cost of ownership, monthly cost, depreciation, fuel, insurance and maintenance.',
    h1: 'Compare vehicles side by side',
    intro: [
      'Add up to five vehicles and compare their total cost of ownership, monthly cost and each cost category side by side to see which car is really cheaper to own.',
    ],
    priority: '0.8',
    calculator: true,
  },
  '/survey': {
    title: 'What Car Should I Buy? Vehicle Type Quiz | Cash Pedal',
    description: 'Answer a short quiz about your lifestyle, budget and driving habits to find the vehicle type that fits you best.',
    h1: 'What type of car fits you?',
    intro: ['A short quiz that matches your lifestyle, budget and driving habits to a vehicle type, then links you to cars in that category you can afford.'],
    priority: '0.6',
  },
  '/checklist': {
    title: 'Used Car Buying & Maintenance Checklist by Mileage | Cash Pedal',
    description: 'A used-car maintenance audit: what service should already have been done at the car\'s mileage, and what is coming due soon.',
    h1: 'Used car buying checklist',
    intro: ['Enter a used car\'s mileage to see which maintenance items should already be done and which are coming due, so you can negotiate or walk away before you buy.'],
    priority: '0.7',
  },
  '/market': {
    title: 'Most-Searched Cars by State — Car Shopping Trends | Cash Pedal',
    description: 'The vehicles car shoppers are researching most, nationally and in each US state, based on Cash Pedal searches over the last 90 days.',
    h1: 'Most-searched vehicles',
    intro: ['Rankings of the makes and models shoppers research most on Cash Pedal, nationally and by state, counted by distinct visitors over a rolling 90-day window.'],
    priority: '0.6',
  },
  '/wheelzard': {
    title: 'Wheel-Zard — AI Car Buying Assistant | Cash Pedal',
    description: 'Ask Wheel-Zard, Cash Pedal\'s AI car-buying assistant, about financing, negotiating, leasing and choosing a vehicle.',
    h1: 'Wheel-Zard AI car advisor',
    intro: ['An AI chat assistant for car-buying questions: financing, negotiation, leasing versus buying, and choosing the right vehicle.'],
    priority: '0.5',
  },
  '/resources': {
    title: 'Car Buying Resources | Cash Pedal',
    description: 'Hand-picked resources for car buyers: financing, insurance, vehicle history and pricing tools.',
    h1: 'Car buying resources',
    intro: ['Hand-picked tools and services for financing, insuring and researching a vehicle.'],
    priority: '0.4',
  },
  '/blog': {
    title: 'Car Money Blog | Cash Pedal',
    description: 'Articles on car budgeting, the real cost of vehicle ownership and smarter car buying.',
    h1: 'Cash Pedal blog',
    intro: ['Articles on budgeting for a car, the hidden costs of ownership and buying smarter.'],
    priority: '0.6',
  },
  '/about': {
    title: 'About Cash Pedal',
    description: 'Cash Pedal helps car buyers understand the true cost of vehicle ownership before they sign.',
    h1: 'About Cash Pedal',
    intro: ['Cash Pedal was built to help car buyers see the full cost of a vehicle — not just the monthly payment — before they commit.'],
    priority: '0.5',
  },
  '/subscribe': {
    title: 'Cash Pedal Pro',
    description: 'Unlock Pro features: vehicle-specific cost breakdowns, local market values and multi-year projections.',
    h1: 'Cash Pedal Pro',
    intro: ['Pro unlocks vehicle-specific maintenance, local market values and detailed multi-year projections across the calculators.'],
    priority: '0.5',
  },
  '/privacy': {
    title: 'Privacy Policy | Cash Pedal',
    description: 'How Cash Pedal collects, uses and protects your data.',
    h1: 'Privacy policy',
    intro: [],
    priority: '0.2',
  },
  '/terms': {
    title: 'Terms of Service | Cash Pedal',
    description: 'Terms of service for using Cash Pedal.',
    h1: 'Terms of service',
    intro: [],
    priority: '0.2',
  },
}

// Featured links rendered in every pre-rendered page so crawlers can discover
// the main tools from anywhere.
export const PRIMARY_TOOLS = [
  ['/affordability', 'How much car can I afford?'],
  ['/salary', 'What salary do I need for a car?'],
  ['/tco', 'True cost of ownership calculator'],
  ['/compare', 'Compare vehicles'],
  ['/checklist', 'Used car checklist'],
  ['/blog', 'Blog'],
]

export function getRouteMeta(pathname, posts = []) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (ROUTE_META[path]) return { path, ...ROUTE_META[path] }
  const m = path.match(/^\/blog\/([a-z0-9-]+)$/i)
  if (m) {
    const post = posts.find(p => p.slug === m[1])
    if (post) {
      return {
        path,
        title: `${post.title} | Cash Pedal`,
        description: post.excerpt,
        h1: post.title,
        intro: [post.excerpt],
        post,
        priority: '0.6',
      }
    }
  }
  return null
}
