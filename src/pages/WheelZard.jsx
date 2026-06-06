import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSubscription } from '../hooks/useSubscription'

const GPT_URL = 'https://chatgpt.com/g/g-698e3ceaa11c81919b86766878324f99-wheel-zard'

const capabilities = [
  { emoji: '🚗', title: 'Vehicle Recommendations', desc: 'Get personalized picks based on your lifestyle, budget, and needs.' },
  { emoji: '💰', title: 'Cost Analysis', desc: 'Understand total cost of ownership beyond the sticker price.' },
  { emoji: '⛽', title: 'Gas vs Electric', desc: 'Compare fuel costs, EV incentives, and long-term savings.' },
  { emoji: '🔧', title: 'Maintenance Insights', desc: 'Know what to expect in repairs and service for any vehicle.' },
  { emoji: '🤝', title: 'Negotiation Tips', desc: 'Walk into the dealership knowing exactly what to say.' },
  { emoji: '🎯', title: 'Buying Strategy', desc: 'New vs used, lease vs buy, CPO — Wheel-Zard breaks it all down.' },
]

// ─── Guided wizard ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  {
    id: 'use_case',
    question: "Let's find your ideal car. What's your primary use case?",
    choices: ['Daily commuter', 'Family hauler', 'Weekend fun / sporty', 'Off-road / adventure', 'Work / hauling stuff'],
  },
  {
    id: 'budget',
    question: "What's your total budget? (all-in purchase price)",
    choices: ['Under $15k', '$15k–$25k', '$25k–$40k', '$40k–$60k', '$60k+'],
  },
  {
    id: 'condition',
    question: 'New, used, or open to either?',
    choices: ['New only', 'Used only', 'Open to either', 'Certified Pre-Owned (CPO)'],
  },
  {
    id: 'fuel',
    question: 'Any fuel type preference?',
    choices: ['Gas', 'Hybrid', 'Plug-in Hybrid (PHEV)', 'Electric (EV)', 'No preference'],
  },
  {
    id: 'mileage',
    question: 'How many miles do you drive per year?',
    choices: ['Under 8k', '8k–12k', '12k–18k', '18k–25k', '25k+'],
  },
]

function buildWizardSummary(answers) {
  const { use_case, budget, condition, fuel, mileage } = answers

  const budgetNum = {
    'Under $15k': 12500,
    '$15k–$25k': 20000,
    '$25k–$40k': 32500,
    '$40k–$60k': 50000,
    '$60k+': 70000,
  }[budget] ?? 30000

  const isHighMileage = mileage === '18k–25k' || mileage === '25k+'
  const isLowMileage = mileage === 'Under 8k'
  const wantsEV = fuel === 'Electric (EV)'
  const wantsPHEV = fuel === 'Plug-in Hybrid (PHEV)'
  const wantsHybrid = fuel === 'Hybrid' || wantsPHEV
  const isNewOnly = condition === 'New only'
  const isCPO = condition === 'Certified Pre-Owned (CPO)'

  let recs = []
  let tips = []

  // Build recommendations based on use case + budget + fuel
  if (use_case === 'Daily commuter') {
    if (budgetNum <= 20000) {
      recs = ['Honda Civic (used, 2020–2022)', 'Toyota Corolla (used, 2020–2022)', 'Mazda3 (used)', 'Hyundai Elantra']
    } else if (wantsEV) {
      recs = ['Chevrolet Bolt EV', 'Tesla Model 3 (used)', 'Hyundai Ioniq 6', 'Nissan Leaf (if budget <$30k)']
    } else if (wantsHybrid) {
      recs = ['Toyota Camry Hybrid', 'Honda Accord Hybrid', 'Toyota Corolla Hybrid', 'Hyundai Elantra Hybrid']
    } else {
      recs = ['Honda Accord', 'Toyota Camry', 'Mazda6', 'Subaru Legacy']
    }
    tips.push('For daily commuting, prioritize reliability and fuel economy over features.')
    if (isHighMileage) tips.push('At your mileage, a hybrid or EV pays off faster — consider it seriously.')
  }

  if (use_case === 'Family hauler') {
    if (budgetNum <= 30000) {
      recs = ['Honda CR-V (used)', 'Toyota RAV4 (used)', 'Mazda CX-5', 'Subaru Forester']
    } else if (wantsEV || wantsPHEV) {
      recs = ['Toyota RAV4 Prime (PHEV)', 'Hyundai Tucson PHEV', 'Kia EV6', 'Ford Mustang Mach-E']
    } else {
      recs = ['Toyota RAV4', 'Honda CR-V', 'Mazda CX-5', 'Subaru Forester', 'Kia Sportage']
    }
    tips.push('Family SUVs: check 3rd-row availability if you need 7 seats (RAV4 is 5-seat only).')
  }

  if (use_case === 'Weekend fun / sporty') {
    if (budgetNum <= 25000) {
      recs = ['Mazda MX-5 Miata (used)', 'Honda Civic Si', 'Subaru WRX', 'Volkswagen GTI']
    } else {
      recs = ['Subaru BRZ / Toyota GR86', 'Ford Mustang', 'Chevrolet Camaro', 'Mazda MX-5 Miata']
    }
    tips.push('Sports cars carry higher insurance premiums — budget 20–30% more than a comparable sedan.')
  }

  if (use_case === 'Off-road / adventure') {
    recs = ['Toyota 4Runner', 'Subaru Outback', 'Ford Bronco Sport', 'Jeep Wrangler', 'Toyota Tacoma']
    tips.push('True off-road capability requires real 4WD/AWD with low range — not just marketing AWD.')
    tips.push('Toyota 4Runner and Tacoma lead reliability rankings in this segment.')
  }

  if (use_case === 'Work / hauling stuff') {
    if (budgetNum <= 30000) {
      recs = ['Ford F-150 (used)', 'Chevrolet Silverado (used)', 'Toyota Tacoma (used)', 'Honda Ridgeline']
    } else {
      recs = ['Toyota Tacoma', 'Honda Ridgeline', 'Ford Maverick Hybrid', 'Ram 1500']
    }
    tips.push('For light hauling, a mid-size truck (Tacoma, Maverick) costs 15–25% less to fuel and insure than a full-size.')
  }

  // Condition-specific advice
  if (isCPO) {
    tips.push('CPO sweet spot: look for 1–3 year old vehicles — you get manufacturer warranty extension without the new-car depreciation hit.')
  }
  if (condition === 'Used only' && budgetNum < 20000) {
    tips.push('At this budget, prioritize vehicles with 2–4 years of remaining powertrain warranty and get a pre-purchase inspection ($100–$150) before buying.')
  }
  if (isNewOnly && budgetNum < 25000) {
    tips.push('At this budget buying new, consider Honda Civic, Toyota Corolla, Hyundai Elantra, or Kia Forte — all offer solid base trims under $24k MSRP.')
  }

  // Mileage tips
  if (isLowMileage && !wantsEV) {
    tips.push("At under 8k miles/year, the EV fuel savings are smaller — a reliable gas or hybrid may be more cost-effective for you.")
  }

  const recList = recs.length
    ? `<strong class='text-white'>Top picks for you:</strong><ul class='mt-1 mb-2 space-y-0.5 pl-1'>${recs.map(r => `<li>• ${r}</li>`).join('')}</ul>`
    : ''

  const tipList = tips.length
    ? `<strong class='text-white'>Key tips for your situation:</strong><ul class='mt-1 space-y-0.5 pl-1'>${tips.map(t => `<li>• ${t}</li>`).join('')}</ul>`
    : ''

  const ctaLinks = `\n\n<div class='flex flex-col gap-1.5 mt-3 text-xs'><span class='text-[var(--text-muted)] font-semibold uppercase tracking-wider'>Run the numbers:</span><a href='/tco' class='text-[var(--accent)] hover:underline font-semibold'>→ TCO Calculator — full cost over ${condition === 'New only' ? '5' : '3–5'} years</a><a href='/salary' class='text-[var(--accent)] hover:underline font-semibold'>→ Salary Calculator — can you actually afford it?</a>${condition !== 'New only' && condition !== 'Used only' ? `<a href='/checklist' class='text-[var(--accent)] hover:underline font-semibold'>→ Used Car Checklist — before you buy</a>` : ''}</div>`

  return {
    text: `Based on your answers — <em>${use_case}, ${budget}, ${condition}, ${fuel}, ${mileage}/yr</em> — here's what I'd recommend:\n\n${recList}${tipList ? '\n' + tipList : ''}${ctaLinks}\n\nWant me to dig into any of these models, compare costs, or talk negotiation strategy?`,
    followUps: ['How do I negotiate the price?', 'What should I check on a used car?', 'How much will insurance cost?', 'Run me through total cost of ownership'],
  }
}

// ─── Knowledge base ─────────────────────────────────────────────────────────────

function getLocalResponse(msg, context) {
  const m = msg.toLowerCase()

  // Greetings
  if (/^(hi|hello|hey|sup|yo|howdy)\b/.test(m)) {
    return {
      text: "Hey! I'm Wheel-Zard 🤖 — your AI vehicle advisor. Ask me anything about cars, costs, or buying decisions. Or hit <strong class='text-white'>\"Walk me through it\"</strong> and I'll guide you step by step.",
      followUps: ['Walk me through it', 'What can you help with?', 'How do I negotiate a car price?', 'New or used?'],
    }
  }

  if (/\b(help|what can you|capabilities|what do you know)\b/.test(m)) {
    return {
      text: "I can help with: vehicle recommendations by budget and lifestyle, total cost of ownership, gas vs EV/hybrid math, negotiation tactics, new vs used vs CPO tradeoffs, financing, insurance estimates, trade-in strategy, timing the purchase, and specific model comparisons. What do you want to tackle?",
      followUps: ['How do I negotiate?', 'New vs used?', 'Should I get an EV?', 'What car fits my budget?'],
    }
  }

  if (/\b(thank|thanks|great|awesome|perfect|helpful)\b/.test(m)) {
    return {
      text: "Happy to help! Let me know if you want to go deeper on anything — or try the full Wheel-Zard GPT for complex personalized analysis.",
      followUps: ['What else can you help with?', 'How do I negotiate?', 'What should I check before buying?'],
    }
  }

  // Negotiation
  if (/\b(negotiat|haggle|bargain|talk them down|best price|dealer markup|msrp|invoice)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Negotiation playbook:</strong><ul class='mt-1 space-y-1 pl-1'><li>• Get quotes from 3+ dealers via email before stepping in — let them compete.</li><li>• Know the <strong class='text-white'>invoice price</strong> (what dealer paid), not just MSRP. Sites like Edmunds and TrueCar show this.</li><li>• Negotiate the <strong class='text-white'>out-the-door price</strong>, not the monthly payment — dealers manipulate payments by stretching the loan term.</li><li>• End-of-month and end-of-quarter are the best times to buy — sales quotas create urgency.</li><li>• Get the trade-in appraised separately at CarMax/Carvana first so you have a real number.</li><li>• \"I have a check from my credit union for $X — can you beat that?\" is powerful leverage.</li></ul>",
      followUps: ['What about financing at the dealer?', 'How do I handle trade-ins?', 'Best time of year to buy?', 'Extended warranty — worth it?'],
    }
  }

  // Financing / loans / interest rates
  if (/\b(financ|loan|interest rate|apr|monthly payment|down payment|credit score|credit union)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Financing basics:</strong><ul class='mt-1 space-y-1 pl-1'><li>• Get pre-approved at your <strong class='text-white'>credit union or bank first</strong> — dealer financing is often marked up 1–3%.</li><li>• Credit score 720+ gets you the best rates. Below 680 expect 7–12% APR at dealers.</li><li>• <strong class='text-white'>Down payment:</strong> 20% is ideal — it avoids being underwater (owing more than the car is worth).</li><li>• <strong class='text-white'>Loan term:</strong> 48–60 months max. 72- and 84-month loans have lower payments but cost thousands more in interest and increase risk of going underwater.</li><li>• 0% APR manufacturer deals sound great but often mean you can't negotiate the price — run the math both ways.</li></ul>Run your exact payment in our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a>.",
      followUps: ['How much should I put down?', 'How do I negotiate the price?', 'Lease vs buy?', 'How does my credit score affect rate?'],
    }
  }

  // Insurance
  if (/\b(insur|premium|coverage|liability|comprehensive|deductible)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Car insurance quick guide:</strong><ul class='mt-1 space-y-1 pl-1'><li>• Average US full coverage: <strong class='text-white'>$1,700–$2,400/year</strong> — but varies wildly by state, age, and vehicle.</li><li>• Sports cars, luxury cars, and EVs cost 20–40% more to insure than comparable sedans.</li><li>• Most reliable affordable-to-insure: Honda Civic, Subaru Forester, Toyota Camry.</li><li>• Most expensive to insure: high-performance vehicles, luxury SUVs, Tesla Models S/X.</li><li>• If you finance, lenders require full coverage — factor this into your monthly budget.</li><li>• Shopping tip: Get 3+ quotes before buying — rates for the same coverage vary 30–50% between insurers.</li></ul>",
      followUps: ['Which cars are cheapest to insure?', 'Is a sports car worth the insurance cost?', 'How does financing affect insurance requirements?'],
    }
  }

  // Trade-in
  if (/\b(trade.?in|trade in|trade my|sell my car|private party|carmax|carvana|vroom)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Trade-in vs private sale:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>Private party sale</strong> gets you 10–20% more than a trade-in — but takes more time and effort.</li><li>• <strong class='text-white'>CarMax / Carvana</strong> offers are instant and often beat dealer trade-in offers by $1k–$3k.</li><li>• Dealer trade-in convenience costs you money — they build their margin into the offer.</li><li>• <strong class='text-white'>Tactic:</strong> Get a written CarMax/Carvana offer first, then show it to the dealer as your floor price.</li><li>• Negotiate trade-in and new purchase price <strong class='text-white'>separately</strong> — dealers conflate them to obscure the real deal.</li><li>• If your car is worth under $5k, private sale effort may not be worth it — a CarMax quick offer is reasonable.</li></ul>",
      followUps: ['How do I negotiate the new car price?', 'When is the best time to sell my car?', 'How much is my car worth?'],
    }
  }

  // Timing / when to buy
  if (/\b(when (to buy|should i buy)|best time|timing|end of month|end of year|model year)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Best times to buy a car:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>End of month / quarter / year</strong> — salespeople are chasing quotas. December is historically the strongest month for deals.</li><li>• <strong class='text-white'>Model year changeover (Aug–Oct)</strong> — dealers discount outgoing model year inventory by 5–10%.</li><li>• <strong class='text-white'>Mondays–Thursdays</strong> — less foot traffic, salespeople have more time and motivation to deal.</li><li>• <strong class='text-white'>Avoid:</strong> tax refund season (Feb–Mar) and summer — everyone's buying, dealers don't need to discount.</li><li>• For used cars: January–February tends to have the most inventory as people trade up after the holidays.</li></ul>",
      followUps: ['How do I negotiate the price?', 'Should I buy at end of month?', 'New vs used this time of year?'],
    }
  }

  // Extended warranty
  if (/\b(extended warranty|service contract|protection plan|warranty worth)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Extended warranties — the real math:</strong><ul class='mt-1 space-y-1 pl-1'><li>• Dealers mark up extended warranties <strong class='text-white'>50–100%</strong> — most have list prices of $1,500–$4,000 but cost dealers $800–$1,500.</li><li>• <strong class='text-white'>Negotiate hard</strong> — you can often cut the price in half, and the same warranty is available to buy after you leave.</li><li>• <strong class='text-white'>Skip it for</strong>: Toyota, Honda, Mazda — reliability stats make the math unfavorable for the buyer.</li><li>• <strong class='text-white'>Worth considering for</strong>: European luxury brands (BMW, Mercedes, Audi) where out-of-warranty repairs average $1,200–$2,500/yr.</li><li>• If you keep cars 10+ years, a long-term manufacturer warranty extension (not dealer aftermarket) can make sense.</li></ul>",
      followUps: ['Which cars are most reliable?', 'How do I negotiate warranty price?', 'Should I buy new or used?'],
    }
  }

  // CPO / certified pre-owned
  if (/\b(cpo|certified pre.?owned|certified used)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>CPO is often the sweet spot:</strong><ul class='mt-1 space-y-1 pl-1'><li>• CPO vehicles are dealer-inspected, have remaining factory warranty + extension, and qualify for manufacturer financing rates.</li><li>• You avoid the steepest depreciation (year 1–2 is typically 15–25% value loss).</li><li>• <strong class='text-white'>Best CPO programs</strong>: Toyota (7yr/100k powertrain), Honda (7yr/100k), Lexus (most comprehensive luxury CPO).</li><li>• <strong class='text-white'>Weakest CPO programs</strong>: Some domestic brands — read the fine print, especially on powertrain vs comprehensive coverage.</li><li>• CPO cars typically cost $1,500–$4,000 more than comparable non-CPO used — decide if the warranty extension justifies the premium.</li><li>• Always ask for the inspection checklist and which items were repaired/replaced.</li></ul>",
      followUps: ['Toyota CPO vs buying used?', 'How do I inspect a used car?', 'How do I negotiate CPO price?'],
    }
  }

  // Pre-purchase inspection / used car check
  if (/\b(inspect|inspection|vin|carfax|vehicle history|mechanic check|pre.purchase|before (i )?buy)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Before buying any used car:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>VIN history report</strong> (Carfax or AutoCheck, ~$40): checks accidents, title issues, odometer rollback, service records.</li><li>• <strong class='text-white'>Independent mechanic inspection</strong> (~$100–$150): a local shop or mobile service (Lemon Squad, Bumper) — this is the most important step.</li><li>• Look for: rust under the car and in wheel wells, oil leaks, uneven tire wear, mismatched paint panels (signs of accident repair).</li><li>• Test drive: brake firmly to check for pulling, test A/C and heat fully, listen for transmission clunks or engine knocking.</li><li>• Check OBD codes with a $25 reader from Amazon — any active CEL codes are negotiating leverage or a red flag.</li></ul>Use our <a href='/checklist' class='text-[var(--accent)] hover:underline'>Used Car Checklist</a> for a full walk-through checklist.",
      followUps: ['What are red flags on a used car?', 'How do I negotiate after inspection?', 'Is CPO worth the premium?'],
    }
  }

  // Depreciation
  if (/\b(depreciat|resale value|hold value|residual)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Depreciation by the numbers:</strong><ul class='mt-1 space-y-1 pl-1'><li>• Average new car loses <strong class='text-white'>15–25% in year one</strong>, 40–60% over 5 years.</li><li>• <strong class='text-white'>Best resale value</strong>: Toyota Tacoma (holds ~70% at 5yr), Toyota 4Runner, Honda Civic, Jeep Wrangler.</li><li>• <strong class='text-white'>Worst resale</strong>: Domestic luxury sedans, many German brands (BMW/Mercedes lose 50–60% in 5 years).</li><li>• Buying 2–3 years used = you let someone else absorb the worst depreciation hit.</li><li>• EVs are still inconsistent on depreciation — Tesla Model 3/Y hold value reasonably; many others don't.</li></ul>",
      followUps: ['Which cars hold value best?', 'Should I buy used to avoid depreciation?', 'How do I time selling my car?'],
    }
  }

  // Budget / affordability
  if (/\b(budget|afford|cost|price|expensive|cheap|how much)\b/.test(m)) {
    const budgetContext = context?.budget ? ` You mentioned a budget around ${context.budget}.` : ''
    return {
      text: `For precise cost breakdowns, our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> and <a href='/salary' class='text-[var(--accent)] hover:underline'>Salary Calculator</a> show exactly what a vehicle costs over time — loan, insurance, fuel, and maintenance included.${budgetContext} A quick rule: total car cost (loan + insurance + fuel + maintenance) shouldn't exceed <strong class='text-white'>15–20% of take-home pay</strong>. The 20/4/10 rule: 20% down, max 4-year loan, max 10% of income on the payment.`,
      followUps: ['Run the 20/4/10 rule for me', 'What car can I afford on my salary?', 'What\'s the real total cost?', 'How do I get a lower payment?'],
    }
  }

  // Specific models — Toyota
  if (/\b(rav4|rav 4)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Toyota RAV4:</strong> The best-selling SUV in the US for a reason. Extremely reliable (Consumer Reports top pick), strong resale, and available as a hybrid (RAV4 Hybrid, ~38 MPG combined) or PHEV (RAV4 Prime, 42 mile EV range). <strong class='text-white'>Cons:</strong> Interior quality lags behind Mazda CX-5; noisy cabin on highway. Buy: <strong class='text-white'>XLE or XLE Premium trim</strong> — base LE skips heated seats and some safety features. Hybrid premium (~$3k over gas) pays back in ~4 years at average mileage.",
      followUps: ['RAV4 vs Honda CR-V?', 'RAV4 Hybrid vs RAV4 Prime?', 'What year RAV4 to buy used?', 'How much is a RAV4?'],
    }
  }

  if (/\b(tacoma)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Toyota Tacoma:</strong> The reliability gold standard for mid-size trucks — consistently tops 10-year ownership value charts. Resale is legendary (2019 Tacomas still sell for near original MSRP). <strong class='text-white'>Trade-offs:</strong> Older generations (pre-2024) have a rough ride, outdated infotainment, and a slushy 6-speed automatic. The 2024+ redesign fixed many of these. <strong class='text-white'>Best used buy:</strong> 2020–2023 SR5 or TRD Sport. If paying new prices, the 2024+ i-FORCE MAX hybrid is a significant improvement.",
      followUps: ['Tacoma vs Ford Maverick?', 'What year Tacoma is best to buy used?', 'Tacoma vs 4Runner?', 'How much should I pay for a used Tacoma?'],
    }
  }

  if (/\b(camry)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Toyota Camry:</strong> The benchmark for reliable family sedans. Low ownership costs, excellent resale, and the hybrid (40+ MPG) is one of the best value-for-money vehicles sold in the US. <strong class='text-white'>Best trim:</strong> LE Hybrid or SE Hybrid. <strong class='text-white'>Skip:</strong> V6 XSE unless you really want the sport feel — the hybrid is more fun to drive than you'd expect. <strong class='text-white'>Used sweet spot:</strong> 2020–2022 Hybrid LE, ~$26k–$30k with low miles.",
      followUps: ['Camry vs Honda Accord?', 'Camry Hybrid vs regular Camry?', 'What year Camry to buy?', 'Camry vs Mazda6?'],
    }
  }

  if (/\b(4runner)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Toyota 4Runner:</strong> The go-to for reliability + off-road capability. It runs a body-on-frame platform (rare in SUVs now) making it extremely durable — many owners run 250k+ miles with basic maintenance. <strong class='text-white'>Cons:</strong> Outdated interior (pre-2025), poor fuel economy (17–21 MPG), and pricey — even used ones hold value aggressively. <strong class='text-white'>Who should buy it:</strong> Anyone planning to keep a vehicle 10+ years, tow/off-road regularly, or prioritize long-term reliability over comfort.",
      followUps: ['4Runner vs Bronco?', '4Runner vs Tacoma?', 'What year 4Runner to buy used?', 'Is a 4Runner worth the price?'],
    }
  }

  if (/\b(civic)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Honda Civic:</strong> One of the best all-around compact cars ever made. The 11th gen (2022+) is a major upgrade — cleaner styling, excellent ride quality, strong fuel economy (32 city / 42 highway), and a genuinely good interior. <strong class='text-white'>Best trim:</strong> Sport or EX. <strong class='text-white'>Si/Type R</strong> for enthusiasts. <strong class='text-white'>Used 2022+ Civic</strong> is the sweet spot — just old enough to find one slightly under MSRP. Reliability: top tier.",
      followUps: ['Civic vs Corolla?', 'Civic vs Mazda3?', 'Civic Si vs regular Civic — worth it?', 'What year Civic to buy?'],
    }
  }

  if (/\b(corolla)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Toyota Corolla:</strong> The global reliability benchmark — over 50 million sold for a reason. The 12th gen (2019+) modernized the platform significantly. <strong class='text-white'>Hybrid (2023+)</strong> gets ~50 MPG and is only ~$3k more than gas — one of the best value propositions in the compact segment. <strong class='text-white'>Cons vs Civic:</strong> Slightly less cargo space, slightly less refined ride. <strong class='text-white'>Best for:</strong> High-mileage commuters who want lowest possible maintenance cost.",
      followUps: ['Corolla vs Honda Civic?', 'Corolla Hybrid worth it?', 'What year Corolla to buy?', 'Corolla Cross vs regular Corolla?'],
    }
  }

  if (/\b(accord)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Honda Accord:</strong> The midsize sedan gold standard. The 11th gen (2023+) is exceptionally good — available as a standard hybrid (~46 MPG) and a PHEV (Accord PHEV). Feels premium without the luxury price or maintenance cost. <strong class='text-white'>Best trim:</strong> Sport or Sport-L Hybrid. <strong class='text-white'>Skip:</strong> The base LX lacks heated seats and wireless CarPlay. If buying used, 2018–2020 Accords are excellent values — the 2.0T Touring or 1.5T Sport are the picks.",
      followUps: ['Accord vs Toyota Camry?', 'Accord Hybrid vs regular Accord?', 'Accord vs Mazda6?', 'What year Accord to buy used?'],
    }
  }

  if (/\b(cr.v|crv)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Honda CR-V:</strong> Top-tier compact SUV — consistently in the top 3 for reliability, cargo space, and fuel economy. The Hybrid (2020+) gets ~40 MPG and is worth the small premium. <strong class='text-white'>2023+ redesign</strong> added standard Honda Sensing safety suite and improved the interior. <strong class='text-white'>Best used buy:</strong> 2020–2022 EX or EX-L — these trim levels add heated seats and Honda Sensing without the Touring price. <strong class='text-white'>Compare to:</strong> RAV4 (more rugged), Mazda CX-5 (nicer interior), Subaru Forester (better AWD).",
      followUps: ['CR-V vs RAV4?', 'CR-V vs Mazda CX-5?', 'CR-V Hybrid worth it?', 'What year CR-V to buy used?'],
    }
  }

  // EV / Electric
  if (/\b(electric|ev|tesla|model 3|model y|ioniq|bolt|leaf|charging|plug.?in|phev)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>EV math at a glance:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>Home charging</strong> (L2, overnight): ~$0.04–0.06/mile — big savings vs gas.</li><li>• <strong class='text-white'>Public DC fast charging</strong>: $0.09–0.18/mile — approaches gas cost in some states.</li><li>• Maintenance savings: ~$500–900/year (no oil changes, brakes last longer).</li><li>• <strong class='text-white'>Federal tax credit (IRA)</strong>: $7,500 new / $4,000 used — income and vehicle price limits apply.</li><li>• <strong class='text-white'>Best value EVs now</strong>: Chevy Bolt EV, Tesla Model 3 RWD, Hyundai Ioniq 6 (best EPA range per dollar).</li><li>• EV makes most sense if: you have home charging, drive 12k+ miles/year, and keep it 5+ years.</li></ul>",
      followUps: ['EV vs hybrid — which makes more sense?', 'Do I qualify for the EV tax credit?', 'Tesla Model 3 vs Model Y?', 'Best EV under $40k?'],
    }
  }

  // Hybrid
  if (/\b(hybrid|mpg|fuel economy|gas mileage|fuel efficient)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Best hybrids right now:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>Toyota Camry Hybrid</strong> — ~46 MPG, absurdly reliable, best value in midsize.</li><li>• <strong class='text-white'>Toyota Corolla Hybrid</strong> — ~50 MPG, ideal for budget-conscious commuters.</li><li>• <strong class='text-white'>Honda CR-V Hybrid</strong> — ~40 MPG, best compact SUV for high-mileage drivers.</li><li>• <strong class='text-white'>Toyota RAV4 Hybrid</strong> — ~38 MPG SUV, no compromises vs the gas model.</li><li>• <strong class='text-white'>Honda Accord Hybrid</strong> — ~46 MPG midsize, surprisingly fun to drive.</li></ul>Hybrid premium payback: typically 3–5 years at 12k–15k miles/year. High mileage drivers (18k+) recover the cost faster.",
      followUps: ['Hybrid vs EV — which is better for me?', 'Toyota RAV4 Hybrid vs regular RAV4?', 'How long until a hybrid pays for itself?', 'Hybrid vs PHEV difference?'],
    }
  }

  // Lease vs buy
  if (/\b(lease|leasing)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Lease vs Buy decision tree:</strong><ul class='mt-1 space-y-1 pl-1'><li><strong class='text-white'>Lease if:</strong> you want a new car every 3 years, drive under 12k miles/year, and the monthly cost matters more than equity.</li><li><strong class='text-white'>Buy if:</strong> you keep cars 5+ years, drive 15k+ miles/year, or want to eliminate payments eventually.</li><li>• Hidden lease costs: disposition fee ($300–$500), excess mileage ($0.15–0.25/mile), wear-and-tear charges.</li><li>• Leasing a depreciating asset that you use heavily is usually more expensive over time.</li><li>• The one exception: EVs sometimes have exceptional lease deals that make leasing financially superior — check the money factor (lease APR equivalent).</li></ul>Run both scenarios in our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a>.",
      followUps: ['How do I negotiate a lease?', 'What is money factor in a lease?', 'Best cars to lease right now?', 'Lease vs buy for EVs?'],
    }
  }

  // New vs used
  if (/\b(new (car|vehicle|vs used)|used (car|vehicle|vs new)|pre.?owned|second.?hand)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>New vs Used breakdown:</strong><ul class='mt-1 space-y-1 pl-1'><li><strong class='text-white'>New</strong>: full warranty, latest features, manufacturer financing incentives — but loses 15–25% in year one. Best when manufacturer 0% APR deals are available.</li><li><strong class='text-white'>1–3 year used</strong>: someone absorbed the steepest depreciation — sweet spot for value. Still under warranty if it's a CPO or low-mileage buy.</li><li><strong class='text-white'>4–7 year used</strong>: lowest price but typically no warranty — budget $1k–$2k/year for repairs. A pre-purchase inspection is non-negotiable.</li><li>• For Japanese brands (Toyota, Honda, Mazda): buying 3–5 years used is almost always the best financial decision.</li></ul>Use our <a href='/checklist' class='text-[var(--accent)] hover:underline'>Used Car Checklist</a> before any used purchase.",
      followUps: ['What to check on a used car?', 'Is CPO worth it?', 'What\'s a good age for a used car?', 'How do I find used cars?'],
    }
  }

  // Reliability
  if (/\b(reliable|reliability|repair|breakdown|maintenance cost)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Reliability by segment (2024 rankings):</strong><ul class='mt-1 space-y-1 pl-1'><li><strong class='text-white'>Sedans</strong>: Toyota Camry, Honda Accord, Mazda6, Subaru Legacy</li><li><strong class='text-white'>Compact cars</strong>: Toyota Corolla, Honda Civic, Mazda3</li><li><strong class='text-white'>Compact SUVs</strong>: Mazda CX-5, Toyota RAV4, Honda CR-V, Subaru Forester</li><li><strong class='text-white'>Trucks</strong>: Toyota Tacoma, Honda Ridgeline, Toyota Tundra</li><li><strong class='text-white'>Avoid for reliability</strong>: Land Rover (by far worst), Jeep (above avg issues), most German luxury brands (BMW, Mercedes, Audi) — repairs average $1,200–$2,500/yr out of warranty.</li></ul>Japanese brands cost 15–30% less to maintain than European luxury. Our <a href='/tco' class='text-[var(--accent)] hover:underline'>TCO Calculator</a> includes brand-specific maintenance multipliers.",
      followUps: ['Most reliable used cars under $20k?', 'Why are European cars expensive to maintain?', 'Best car to keep for 10+ years?', 'Honda vs Toyota reliability?'],
    }
  }

  // Recommend / suggest / what car
  if (/\b(recommend|suggest|which car|best car|what car|what should i (buy|get|drive))\b/.test(m)) {
    return {
      text: "To give you a good recommendation I need to understand your situation. Hit <strong class='text-white'>\"Walk me through it\"</strong> below and I'll ask you 5 quick questions to build a tailored shortlist. Or tell me: what's your budget and what do you mainly use a car for?",
      followUps: ['Walk me through it', 'Best car under $25k?', 'Best SUV for a family?', 'Most reliable car to buy right now?'],
    }
  }

  // Down payment
  if (/\b(down payment|how much (to|should i) put down|20 percent|twenty percent)\b/.test(m)) {
    return {
      text: "<strong class='text-white'>Down payment guidance:</strong><ul class='mt-1 space-y-1 pl-1'><li>• <strong class='text-white'>20% is the ideal target</strong> — it keeps you out of negative equity as the car depreciates.</li><li>• With less than 10% down on a new car, you'll likely be \"underwater\" (owe more than it's worth) for 2–3 years.</li><li>• For used cars, 10–15% is generally sufficient since most depreciation already happened.</li><li>• If you can't swing 20%, consider: a less expensive vehicle, a longer savings runway, or a used car where depreciation risk is lower.</li><li>• GAP insurance ($20–$30/mo) covers the \"underwater\" gap if you total the car — worth considering if you put less than 10% down.</li></ul>",
      followUps: ['What is GAP insurance?', 'How do I get a better interest rate?', 'How much car can I afford?', 'Should I pay cash or finance?'],
    }
  }

  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: "Hey, I'm Wheel-Zard 🤖 — your AI vehicle advisor. Ask me anything about cars, costs, or buying decisions. Or hit \"Walk me through it\" and I'll guide you to the right car step by step.",
  followUps: ['Walk me through it', 'How do I negotiate a car price?', 'Should I buy new or used?', 'EV vs gas — which saves more?'],
}

export default function WheelZard() {
  const { isSubscribed } = useSubscription()
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [wizardStep, setWizardStep] = useState(null) // null = no wizard, 0..4 = step index
  const [wizardAnswers, setWizardAnswers] = useState({})
  const [context, setContext] = useState({})
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function extractContext(msg) {
    const m = msg.toLowerCase()
    const updates = {}
    const budgetMatch = m.match(/\$(\d[\d,k]+)/i)
    if (budgetMatch) updates.budget = budgetMatch[0]
    if (/\b(suv|truck|sedan|coupe|van|minivan|hatchback)\b/.test(m)) {
      updates.vehicleType = m.match(/\b(suv|truck|sedan|coupe|van|minivan|hatchback)\b/)[0]
    }
    if (Object.keys(updates).length) setContext(c => ({ ...c, ...updates }))
  }

  function deliver(responseObj) {
    setIsTyping(false)
    setMessages(m => [...m, { role: 'assistant', ...responseObj }])
  }

  function handleSend(text) {
    const msg = (text ?? input).trim()
    if (!msg || isTyping) return

    if (msg === 'Walk me through it') {
      setMessages(m => [...m, { role: 'user', text: msg }])
      setInput('')
      setWizardStep(0)
      setWizardAnswers({})
      setIsTyping(true)
      setTimeout(() => {
        deliver({
          text: WIZARD_STEPS[0].question,
          wizardChoices: WIZARD_STEPS[0].choices,
          stepIndex: 0,
        })
      }, 500)
      return
    }

    extractContext(msg)
    setMessages(m => [...m, { role: 'user', text: msg }])
    setInput('')
    setIsTyping(true)

    const localReply = getLocalResponse(msg, context)
    setTimeout(() => {
      if (localReply) {
        deliver(localReply)
      } else {
        deliver({
          text: "That's a great question — for a detailed, personalized answer the full Wheel-Zard GPT is best. It can ask follow-up questions and dig into specific vehicle data. Or tell me more context and I'll do my best here.",
          cta: true,
          followUps: ['Walk me through it', 'What can you help with?', 'How do I negotiate a car price?'],
        })
      }
    }, 650)
  }

  function handleWizardChoice(choice, stepIndex) {
    const step = WIZARD_STEPS[stepIndex]
    const newAnswers = { ...wizardAnswers, [step.id]: choice }
    setWizardAnswers(newAnswers)
    setMessages(m => [...m, { role: 'user', text: choice }])
    setIsTyping(true)

    const nextIndex = stepIndex + 1

    setTimeout(() => {
      if (nextIndex < WIZARD_STEPS.length) {
        setWizardStep(nextIndex)
        deliver({
          text: WIZARD_STEPS[nextIndex].question,
          wizardChoices: WIZARD_STEPS[nextIndex].choices,
          stepIndex: nextIndex,
        })
      } else {
        // All steps done — build summary
        setWizardStep(null)
        const summary = buildWizardSummary(newAnswers)
        deliver({ ...summary, html: true })
      }
    }, 500)
  }

  function handleClearChat() {
    setMessages([INITIAL_MESSAGE])
    setInput('')
    setWizardStep(null)
    setWizardAnswers({})
    setContext({})
    setIsTyping(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* Chat panel */}
            <div className="flex flex-col">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                    <span className="w-4 h-px bg-[var(--accent)]" />
                    AI Vehicle Advisor
                  </div>
                  <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight">
                    Wheel-Zard 🤖
                  </h1>
                  <p className="anim-2 text-[var(--text-muted)] mt-1 text-base">
                    Ask anything about cars, costs, or buying decisions.
                  </p>
                </div>
                {messages.length > 1 && (
                  <button
                    onClick={handleClearChat}
                    className="text-xs text-[var(--text-muted)] hover:text-white border border-[var(--border)] rounded-lg px-3 py-1.5 transition-colors shrink-0 mb-1"
                  >
                    Clear chat
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="card flex flex-col gap-4 mb-4 anim-3" style={{ minHeight: '380px', maxHeight: '520px', overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-sm shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div className="flex flex-col gap-2 max-w-[88%]">
                      <div
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-tr-sm'
                            : 'bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-tl-sm'
                        }`}
                      >
                        {msg.html
                          ? <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }} />
                          : msg.text
                        }
                        {msg.cta && (
                          <a
                            href={GPT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs py-2 px-4 mt-3 inline-flex"
                          >
                            Open Wheel-Zard GPT →
                          </a>
                        )}
                      </div>

                      {/* Wizard choices */}
                      {msg.wizardChoices && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.wizardChoices.map(choice => (
                            <button
                              key={choice}
                              onClick={() => handleWizardChoice(choice, msg.stepIndex)}
                              disabled={isTyping || wizardStep !== msg.stepIndex}
                              className="px-3 py-1.5 rounded-full border border-[var(--accent)]/40 text-xs text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {msg.followUps && i === messages.length - 1 && !isTyping && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.followUps.map(fu => (
                            <button
                              key={fu}
                              onClick={() => handleSend(fu)}
                              className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-white hover:border-[#3a3a3e] transition-colors"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-sm shrink-0">
                      🤖
                    </div>
                    <div className="rounded-xl rounded-tl-sm px-4 py-3 bg-[var(--surface-hover)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex gap-3 anim-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={wizardStep !== null ? 'Or type your own answer…' : 'Ask Wheel-Zard anything…'}
                  className="input-field flex-1"
                  disabled={isTyping}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>

              {/* Full GPT link */}
              <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] anim-5">
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  For deep personalized advice — complex comparisons, full cost breakdowns, and follow-up questions — try the full Wheel-Zard GPT:
                </p>
                <a
                  href={GPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm py-2.5"
                >
                  Open Full Wheel-Zard GPT ↗
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4 anim-4">
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">What I can help with</p>
                <div className="flex flex-col gap-3">
                  {capabilities.map(({ emoji, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">Quick tools</p>
                <div className="flex flex-col gap-2">
                  {[
                    { to: '/tco', label: '🧮 TCO Calculator' },
                    { to: '/compare', label: '⚖️ Compare Vehicles' },
                    { to: '/survey', label: '🎯 Car Survey' },
                    { to: '/salary', label: '💵 Salary Check' },
                    { to: '/checklist', label: '🔍 Buying Checklist' },
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors py-1"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              {!isSubscribed && (
                <div className="rounded-xl border p-4"
                  style={{ borderColor: 'rgba(255,184,0,0.3)', background: 'rgba(255,184,0,0.04)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--accent)' }}>
                    Cash Pedal Pro
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                    Unlock unlimited detailed TCO analyses with make/model/trim-level breakdowns, unlimited used-car
                    checklists, and multi-vehicle comparisons.
                  </p>
                  <ul className="text-xs text-[var(--text-muted)] space-y-1 mb-4">
                    {['Unlimited detailed TCO analyses', 'Unlimited checklists', 'Multi-vehicle comparison export'].map(f => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span style={{ color: 'var(--accent)' }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/subscribe" className="btn-primary text-xs py-2 block text-center">
                    Try Pro — $10/month →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
