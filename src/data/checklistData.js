export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'D.C.' },
]

const SNOW_STATES = new Set(['AK','CO','CT','DC','ID','IL','IN','IA','KS','KY','ME','MD','MA','MI','MN','MO','MT','NE','NH','NJ','NY','ND','OH','PA','RI','SD','UT','VT','VA','WA','WV','WI','WY'])
const COASTAL_STATES = new Set(['AK','AL','CA','CT','DE','FL','GA','HI','LA','MA','MD','ME','MS','NC','NH','NJ','NY','OR','RI','SC','TX','VA','WA'])
const HOT_STATES = new Set(['AL','AZ','CA','FL','GA','LA','MS','NM','NV','OK','SC','TX'])

export function getClimateFlags(stateCode) {
  const flags = []
  if (SNOW_STATES.has(stateCode)) flags.push('snow')
  if (COASTAL_STATES.has(stateCode)) flags.push('coastal')
  if (HOT_STATES.has(stateCode)) flags.push('hot')
  return flags
}

export function getContextualQuestions(vehicleType, isEV, climateFlags) {
  const sections = []
  const isTruck = vehicleType === 'truck'
  const isSUV = vehicleType === 'suv' || vehicleType === 'suv_large'
  const isSports = vehicleType === 'sports'
  const isConvertible = vehicleType === 'convertible'
  const isMinivan = vehicleType === 'minivan'

  if (isTruck) {
    sections.push({
      category: 'Truck-Specific',
      importance: 'high',
      questions: [
        { q: 'Has it been used for towing or hauling heavy loads?', why: 'Heavy towing stresses the engine, transmission, brakes, and suspension — especially without proper equipment or maintenance.' },
        { q: "What's the most it's ever towed or hauled?", why: 'Exceeding the rated tow/payload capacity can cause irreversible drivetrain and frame damage.' },
        { q: 'Has the 4WD system been tested recently — does it engage in all modes?', why: '4WD components that sit unused can seize. Test 2WD, 4H, and 4L yourself before buying.' },
        { q: 'Has it been used as a work truck or for commercial purposes?', why: 'Commercial use often means more stress than the odometer shows — heavy loads, hard acceleration, minimal downtime.' },
        { q: 'What is the condition of the bed? Any rust, damage, or missing liner?', why: 'Bare bed floors rust fast. Check under any drop-in mat for moisture damage. Spray-in liners are preferable.' },
      ],
    })
  }

  if (isSUV) {
    sections.push({
      category: 'SUV-Specific',
      importance: 'high',
      questions: [
        { q: 'Has it been driven off-road?', why: 'Off-road use accelerates wear on suspension, undercarriage, and differentials in ways that may not appear on a Carfax report.' },
        { q: 'Is the AWD/4WD system fully operational in all modes?', why: 'SUV drivetrain repairs are expensive — verify every drive mode engages and disengages properly.' },
        { q: 'Has it ever towed a trailer or carried heavy roof cargo?', why: 'Many SUV owners exceed tow ratings. Check for a hitch and ask about transmission maintenance.' },
        ...(vehicleType === 'suv_large' ? [
          { q: 'Has the third-row seating been used regularly?', why: 'High third-row use accelerates wear on interior trim, latches, and the cargo area behind the seat.' },
        ] : []),
      ],
    })
  }

  if (isSports) {
    sections.push({
      category: 'Sports Car Inspection',
      importance: 'high',
      questions: [
        { q: 'Has it ever been driven on a track or autocross event?', why: 'Track use causes extreme wear on brakes, tires, and the clutch — often not reflected in mileage.' },
        { q: 'Has the clutch been replaced? (manual)', why: 'Sports car clutches wear out faster with aggressive driving. Replacement costs $800–$2,000+.' },
        { q: 'Have the suspension components been upgraded or modified?', why: 'Lowering springs or aftermarket sway bars change handling but can accelerate bushing and tire wear.' },
        { q: 'Any engine modifications (tune, intake, exhaust)?', why: 'Performance mods can void warranties and may require premium fuel or specialized maintenance.' },
      ],
    })
  }

  if (isConvertible) {
    sections.push({
      category: 'Convertible Top',
      importance: 'high',
      questions: [
        { q: 'Does the convertible top operate smoothly in both directions?', why: 'Top motors, hydraulics, and fabric are expensive to repair. Test it yourself — fully down and fully up.' },
        { q: 'Are there any leaks around the top or window seals?', why: 'Water intrusion damages electronics, flooring, and causes mold. Common on aging soft tops.' },
        { q: 'Has the top ever been replaced or professionally repaired?', why: 'A new top ($1,000–$3,000+) can be a positive if recently done; old cracked vinyl will need replacement soon.' },
      ],
    })
  }

  if (isMinivan) {
    sections.push({
      category: 'Minivan-Specific',
      importance: 'high',
      questions: [
        { q: 'Do both sliding doors open, close, and latch properly?', why: 'Power sliding door mechanisms fail frequently and cost $500–$1,500 to repair.' },
        { q: 'Have the middle and rear seats been removed and reinstalled frequently?', why: 'Repeated removal stresses seat anchors and track hardware. Inspect mounting points for wear.' },
        { q: 'Has it been used to transport children regularly?', why: 'Heavy family use means spilled liquids, stained upholstery, and possible odors. Inspect carpet and seat condition closely.' },
      ],
    })
  }

  if (isEV) {
    sections.push({
      category: 'EV Battery & Charging',
      importance: 'critical',
      questions: [
        { q: 'What is the current battery health percentage?', why: 'Many EVs display battery health in their settings menu. Ask to see it — degraded packs dramatically reduce range.' },
        { q: 'Has the battery ever been replaced or received warranty service?', why: 'Early replacement may mean the pack failed prematurely. Late replacement could mean you\'re getting a fresher battery.' },
        { q: 'What is the real-world range today on a full charge?', why: 'Manufacturer range figures are ideal. Ask the owner for a real-world demonstration at 100% charge.' },
        { q: 'Has it regularly used DC fast charging?', why: 'Frequent DC fast charging accelerates battery degradation more than Level 1/2 home charging.' },
        { q: 'Does it come with the original charging equipment (Level 1 and Level 2 adapters)?', why: 'Replacement charging cables and adapters can cost $200–$500+.' },
      ],
    })
  }

  if (climateFlags.includes('snow')) {
    sections.push({
      category: 'Winter Climate — Rust & Cold Weather',
      importance: 'critical',
      questions: [
        { q: 'Has the undercarriage been inspected for rust? (frame rails, brake lines, exhaust)', why: 'Road salt accelerates rust rapidly. Rust on frame rails or brake lines is structurally dangerous and expensive to fix.' },
        { q: 'Are there any bubbling paint or rust spots on body panels, especially wheel arches?', why: 'Surface rust spreads. Wheel arch rust often hides structural rot behind the panel.' },
        { q: 'Have the brake lines been inspected or replaced for corrosion?', why: 'Salt-corroded brake lines can fail without warning. This is a safety-critical item in northern states.' },
        { q: 'Does the AWD/4WD engage and disengage correctly?', why: 'In snow-prone regions, AWD/4WD sees heavy use. Verify all modes work or factor in drivetrain service costs.' },
        { q: 'Are winter tires included, and what condition are they in?', why: 'A quality set of winter tires costs $600–$1,200. If included, factor that into your offer.' },
      ],
    })
  } else if (climateFlags.includes('coastal')) {
    sections.push({
      category: 'Coastal Climate — Salt Air Corrosion',
      importance: 'high',
      questions: [
        { q: 'Has the undercarriage been inspected for salt-air corrosion?', why: 'Ocean air corrodes metal even without snow or salt roads. Check exhaust, suspension arms, and brake components.' },
        { q: 'Are there any rust spots or bubbling paint on the body?', why: 'Coastal surface rust spreads faster than inland. Minor bubbling today can mean panel replacement in 2 years.' },
        { q: 'Have the electrical connectors been inspected for corrosion?', why: 'Coastal humidity causes connector oxidation that leads to intermittent electrical faults — common on older coastal cars.' },
      ],
    })
  }

  if (climateFlags.includes('hot')) {
    sections.push({
      category: 'Hot Climate — Heat & UV Damage',
      importance: 'high',
      questions: [
        { q: 'Does the AC blow cold at maximum settings and highway speed?', why: 'AC systems work hardest in hot climates. A failing compressor or refrigerant leak is a $500–$2,000 repair.' },
        { q: 'Has the cooling system (coolant, radiator, hoses) been serviced recently?', why: 'Overheating is a leading cause of catastrophic engine failure. In desert heat, cooling system health is critical.' },
        { q: 'Has the battery been replaced in the last 2–3 years?', why: 'Heat kills batteries faster than cold. Desert batteries often fail in 2–3 years vs. 4–5 years in cooler climates.' },
        { q: 'Is there UV damage to the dashboard, seats, or trim?', why: 'Sun-cracked dashboards and faded leather cannot be cheaply repaired. Inspect the dash top and seats carefully.' },
      ],
    })
  }

  return sections
}

// Maintenance service intervals (miles) with costs and categories.
// Intervals reflect modern vehicles with synthetic oil and iridium/platinum plugs.
// Costs updated to 2025/2026 national averages (AAA, RepairPal, Consumer Reports).
export const maintenanceItems = [
  // Engine / Powertrain
  { id: 'oil_change', name: 'Oil & Filter Change', interval: 7500, category: 'Powertrain', cost: 95, critical: false },
  { id: 'air_filter', name: 'Engine Air Filter', interval: 20000, category: 'Powertrain', cost: 35, critical: false },
  { id: 'cabin_filter', name: 'Cabin Air Filter', interval: 15000, category: 'Interior', cost: 35, critical: false },
  { id: 'spark_plugs', name: 'Spark Plugs (iridium/platinum)', interval: 60000, category: 'Powertrain', cost: 240, critical: false },
  { id: 'transmission_fluid', name: 'Transmission Fluid', interval: 60000, category: 'Powertrain', cost: 200, critical: true },
  { id: 'coolant_flush', name: 'Coolant Flush', interval: 50000, category: 'Powertrain', cost: 160, critical: false },
  { id: 'timing_belt', name: 'Timing Belt / Chain Inspection', interval: 60000, category: 'Powertrain', cost: 800, critical: true },
  { id: 'serpentine_belt', name: 'Serpentine / Drive Belt', interval: 60000, category: 'Powertrain', cost: 220, critical: true },
  { id: 'fuel_filter', name: 'Fuel Filter', interval: 60000, category: 'Powertrain', cost: 90, critical: false },
  // Suspension & Steering
  { id: 'tires_rotate', name: 'Tire Rotation & Balance', interval: 7500, category: 'Tires & Suspension', cost: 55, critical: false },
  { id: 'tires_replace', name: 'Tire Replacement', interval: 50000, category: 'Tires & Suspension', cost: 800, critical: true },
  { id: 'alignment', name: 'Wheel Alignment', interval: 30000, category: 'Tires & Suspension', cost: 120, critical: false },
  { id: 'shocks_struts', name: 'Shocks / Struts', interval: 60000, category: 'Tires & Suspension', cost: 1200, critical: true },
  // Brakes
  { id: 'brake_pads', name: 'Brake Pads (all four)', interval: 40000, category: 'Brakes', cost: 320, critical: true },
  { id: 'brake_fluid', name: 'Brake Fluid Flush', interval: 30000, category: 'Brakes', cost: 120, critical: false },
  { id: 'brake_rotors', name: 'Brake Rotors', interval: 70000, category: 'Brakes', cost: 480, critical: true },
  // Electrical / Safety
  { id: 'battery', name: 'Battery Test / Replacement', interval: 50000, category: 'Electrical', cost: 220, critical: true },
  { id: 'lights', name: 'Light Bulb Inspection', interval: 15000, category: 'Electrical', cost: 30, critical: false },
  // Fluids
  { id: 'power_steering', name: 'Power Steering Fluid', interval: 50000, category: 'Fluids', cost: 70, critical: false },
  { id: 'differential', name: 'Differential Fluid', interval: 50000, category: 'Fluids', cost: 130, critical: false },
  { id: 'wiper_blades', name: 'Wiper Blades', interval: 12000, category: 'Safety', cost: 45, critical: false },
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
