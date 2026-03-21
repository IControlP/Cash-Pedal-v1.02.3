// Maintenance service intervals (miles) with costs and categories
export const maintenanceItems = [
  // Engine / Powertrain
  { id: 'oil_change', name: 'Oil & Filter Change', interval: 5000, category: 'Powertrain', cost: 80, critical: false },
  { id: 'air_filter', name: 'Engine Air Filter', interval: 15000, category: 'Powertrain', cost: 30, critical: false },
  { id: 'cabin_filter', name: 'Cabin Air Filter', interval: 15000, category: 'Interior', cost: 30, critical: false },
  { id: 'spark_plugs', name: 'Spark Plugs', interval: 30000, category: 'Powertrain', cost: 150, critical: false },
  { id: 'transmission_fluid', name: 'Transmission Fluid', interval: 30000, category: 'Powertrain', cost: 120, critical: true },
  { id: 'coolant_flush', name: 'Coolant Flush', interval: 30000, category: 'Powertrain', cost: 100, critical: false },
  { id: 'timing_belt', name: 'Timing Belt / Chain Inspection', interval: 60000, category: 'Powertrain', cost: 600, critical: true },
  { id: 'fuel_filter', name: 'Fuel Filter', interval: 30000, category: 'Powertrain', cost: 80, critical: false },
  // Suspension & Steering
  { id: 'tires_rotate', name: 'Tire Rotation & Balance', interval: 7500, category: 'Tires & Suspension', cost: 50, critical: false },
  { id: 'tires_replace', name: 'Tire Replacement', interval: 40000, category: 'Tires & Suspension', cost: 600, critical: true },
  { id: 'alignment', name: 'Wheel Alignment', interval: 30000, category: 'Tires & Suspension', cost: 100, critical: false },
  { id: 'shocks_struts', name: 'Shocks / Struts', interval: 50000, category: 'Tires & Suspension', cost: 800, critical: true },
  // Brakes
  { id: 'brake_pads', name: 'Brake Pads', interval: 25000, category: 'Brakes', cost: 200, critical: true },
  { id: 'brake_fluid', name: 'Brake Fluid Flush', interval: 30000, category: 'Brakes', cost: 80, critical: false },
  { id: 'brake_rotors', name: 'Brake Rotors', interval: 50000, category: 'Brakes', cost: 350, critical: true },
  // Electrical / Safety
  { id: 'battery', name: 'Battery Test / Replacement', interval: 40000, category: 'Electrical', cost: 180, critical: true },
  { id: 'lights', name: 'Light Bulb Inspection', interval: 15000, category: 'Electrical', cost: 30, critical: false },
  // Fluids
  { id: 'power_steering', name: 'Power Steering Fluid', interval: 30000, category: 'Fluids', cost: 60, critical: false },
  { id: 'differential', name: 'Differential Fluid', interval: 30000, category: 'Fluids', cost: 90, critical: false },
  { id: 'wiper_blades', name: 'Wiper Blades', interval: 12000, category: 'Safety', cost: 40, critical: false },
]

// Questions to ask the seller, from original app
export const sellerQuestions = [
  {
    category: 'Ownership & History',
    importance: 'critical',
    questions: [
      { q: 'How many owners has this vehicle had?', why: 'Multiple owners can indicate problems that led each owner to sell. One owner is generally better.' },
      { q: 'Do you have the vehicle title in hand?', why: 'A missing or salvage title is a major red flag. Make sure the seller can hand over the title immediately.' },
      { q: 'Has it ever been in an accident?', why: 'Even repaired accident damage can affect structural integrity and resale value.' },
      { q: 'Has it ever been declared a total loss or salvage?', why: 'Salvage vehicles often have hidden damage and are much harder to insure and sell later.' },
    ],
  },
  {
    category: 'Maintenance & Service',
    importance: 'high',
    questions: [
      { q: 'Do you have service records or receipts?', why: 'Documented maintenance history is one of the best predictors of a reliable used vehicle.' },
      { q: 'When was the last oil change?', why: 'Skipped oil changes accelerate engine wear — this reveals how the previous owner treated the car.' },
      { q: 'Have the timing belt or chain been replaced?', why: 'A failed timing belt can destroy an engine. Know where you stand before you buy.' },
      { q: 'Have the brakes been inspected or replaced recently?', why: 'Brake repairs are expensive. Knowing their condition affects your negotiating position.' },
      { q: 'Any recent major repairs or parts replacements?', why: 'Recent repairs can be a good sign (well-maintained) or a red flag (covering up a bigger issue).' },
    ],
  },
  {
    category: 'Current Condition',
    importance: 'high',
    questions: [
      { q: 'Does anything currently need repair?', why: 'Honest sellers will disclose known issues. If they say "nothing" and you find problems during inspection, walk away.' },
      { q: 'Any warning lights on the dashboard?', why: 'Active warning lights mean active problems. Get a code reader or mechanic inspection.' },
      { q: 'Does it have any leaks?', why: 'Oil, coolant, or transmission fluid leaks can indicate serious engine issues.' },
      { q: 'How does it perform in cold weather / hot weather?', why: 'Extreme weather issues are easy to hide during a test drive in mild conditions.' },
    ],
  },
  {
    category: 'Why Are You Selling?',
    importance: 'medium',
    questions: [
      { q: 'Why are you selling the vehicle?', why: 'The answer won\'t always be truthful, but it\'s still worth asking. Pressure to sell quickly can indicate problems.' },
      { q: 'How long have you owned it?', why: 'Short ownership periods can suggest the owner discovered problems shortly after buying.' },
      { q: 'Would you be willing to let a mechanic inspect it?', why: 'A seller who refuses a pre-purchase inspection is a major warning sign.' },
    ],
  },
]
