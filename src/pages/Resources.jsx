import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// Affiliate IDs — fill these in once you join each program.
// Leave blank ('') to send clean traffic until you're approved.
const AFFILIATE = {
  cargurus:    '',   // CarGurus affiliate program
  carscom:     '',   // Cars.com affiliate program
  autotrader:  '',   // AutoTrader affiliate program
  carvana:     '',   // Carvana affiliate program
  lendingtree: '',   // LendingTree (high CPL — prioritize this one)
  thezebra:    '',   // The Zebra insurance comparison
  policygenius:'',   // Policygenius
  tirerack:    '',   // Tire Rack
  carfax:      '',   // Carfax
}

// Append UTM params (and optional affiliate param) to any URL
function affiliateUrl(base, utmContent, affiliateParam = '') {
  const sep = base.includes('?') ? '&' : '?'
  const utm = `utm_source=cashpedal&utm_medium=resources&utm_content=${utmContent}`
  const aff = affiliateParam ? `&${affiliateParam}` : ''
  return `${base}${sep}${utm}${aff}`
}

const categories = [
  {
    icon: '🏪',
    title: 'Vehicle Shopping',
    desc: 'Find and compare new and used vehicles for sale.',
    links: [
      { name: 'CarGurus', url: affiliateUrl('https://www.cargurus.com', 'cargurus', AFFILIATE.cargurus ? `aff=${AFFILIATE.cargurus}` : ''), desc: 'Price analysis and dealer listings' },
      { name: 'Cars.com', url: affiliateUrl('https://www.cars.com', 'carscom', AFFILIATE.carscom ? `aff=${AFFILIATE.carscom}` : ''), desc: 'New & used vehicle marketplace' },
      { name: 'AutoTrader', url: affiliateUrl('https://www.autotrader.com', 'autotrader', AFFILIATE.autotrader ? `aff=${AFFILIATE.autotrader}` : ''), desc: 'Large inventory, research tools' },
      { name: 'Carvana', url: affiliateUrl('https://www.carvana.com', 'carvana', AFFILIATE.carvana ? `aff=${AFFILIATE.carvana}` : ''), desc: 'Online used car buying, home delivery' },
      { name: 'CarMax', url: affiliateUrl('https://www.carmax.com', 'carmax'), desc: 'No-haggle used vehicle sales' },
    ],
  },
  {
    icon: '💰',
    title: 'Financing',
    desc: 'Compare auto loan rates before you walk into a dealership.',
    links: [
      { name: 'LendingTree Auto', url: affiliateUrl('https://www.lendingtree.com/auto', 'lendingtree', AFFILIATE.lendingtree ? `tree=${AFFILIATE.lendingtree}` : ''), desc: 'Compare multiple lender offers', highlight: true },
      { name: 'Capital One Auto', url: affiliateUrl('https://www.capitalone.com/auto-financing', 'capitalone'), desc: 'Pre-qualify without credit impact' },
      { name: 'PenFed Credit Union', url: affiliateUrl('https://www.penfed.org/auto-loans', 'penfed'), desc: 'Consistently low rates for members' },
      { name: 'Bankrate Auto Loans', url: affiliateUrl('https://www.bankrate.com/loans/auto-loans', 'bankrate'), desc: 'Rates overview and comparison tool' },
    ],
  },
  {
    icon: '🛡️',
    title: 'Insurance',
    desc: 'Get quotes from multiple insurers in minutes.',
    links: [
      { name: 'The Zebra', url: affiliateUrl('https://www.thezebra.com', 'thezebra', AFFILIATE.thezebra ? `ref=${AFFILIATE.thezebra}` : ''), desc: 'Compare 100+ insurance providers', highlight: true },
      { name: 'GEICO', url: affiliateUrl('https://www.geico.com', 'geico'), desc: 'Often lowest rates for clean records' },
      { name: 'Progressive', url: affiliateUrl('https://www.progressive.com', 'progressive'), desc: 'Name Your Price® tool' },
      { name: 'Policygenius', url: affiliateUrl('https://www.policygenius.com/auto-insurance', 'policygenius', AFFILIATE.policygenius ? `ref=${AFFILIATE.policygenius}` : ''), desc: 'Unbiased comparison and advice' },
    ],
  },
  {
    icon: '🔧',
    title: 'Maintenance & Repairs',
    desc: 'Know what repairs cost before you get the estimate.',
    links: [
      { name: 'RepairPal', url: affiliateUrl('https://repairpal.com', 'repairpal'), desc: 'Fair price estimates for any repair' },
      { name: 'Tire Rack', url: affiliateUrl('https://www.tirerack.com', 'tirerack', AFFILIATE.tirerack ? `utm_campaign=${AFFILIATE.tirerack}` : ''), desc: 'Best tire prices + installer locator' },
      { name: 'Firestone', url: affiliateUrl('https://www.firestonecompleteautocare.com', 'firestone'), desc: 'National chain, consistent pricing' },
      { name: 'Midas', url: affiliateUrl('https://www.midas.com', 'midas'), desc: 'Oil changes, brakes, and more' },
    ],
  },
  {
    icon: '📊',
    title: 'Research & Valuation',
    desc: "Understand what a vehicle is actually worth before you negotiate.",
    links: [
      { name: 'Kelley Blue Book', url: affiliateUrl('https://www.kbb.com', 'kbb'), desc: 'Industry standard for vehicle values' },
      { name: 'Edmunds', url: affiliateUrl('https://www.edmunds.com', 'edmunds'), desc: 'True Market Value pricing data' },
      { name: 'NHTSA Safety Ratings', url: 'https://www.nhtsa.gov/ratings', desc: 'Official federal safety crash test ratings' },
      { name: 'Consumer Reports', url: affiliateUrl('https://www.consumerreports.org/cars', 'consumerreports'), desc: 'Reliability data and owner reviews' },
    ],
  },
  {
    icon: '📜',
    title: 'Vehicle History',
    desc: 'Check for accidents, title issues, and odometer fraud before you buy.',
    links: [
      { name: 'Carfax', url: affiliateUrl('https://www.carfax.com', 'carfax', AFFILIATE.carfax ? `aff=${AFFILIATE.carfax}` : ''), desc: 'Full vehicle history report', highlight: true },
      { name: 'AutoCheck', url: affiliateUrl('https://www.autocheck.com', 'autocheck'), desc: 'Experian-backed history reports' },
      { name: 'NICB VINCheck', url: 'https://www.nicb.org/vincheck', desc: 'Free stolen vehicle & salvage check' },
    ],
  },
]

export default function Resources() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Resources
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-3">
            Take it to the next gear
          </h1>
          <p className="anim-2 text-[var(--text-muted)] text-base max-w-xl">
            Trusted third-party tools for shopping, financing, insurance, maintenance, and research.
            These are the resources we'd recommend to a friend.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-5">
            {categories.map((cat, i) => (
              <div key={cat.title} className={`card hover:border-[#3a3a3e] transition-colors anim-${Math.min(i + 2, 5)}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="font-display font-bold text-white text-lg">{cat.title}</h2>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-4">{cat.desc}</p>
                <div className="flex flex-col gap-2.5">
                  {cat.links.map(link => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="flex items-start justify-between gap-3 group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-[var(--accent)] transition-colors flex items-center gap-1.5">
                          {link.name} ↗
                          {link.highlight && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: 'rgba(200,255,0,0.12)', color: 'var(--accent)' }}>
                              Top Pick
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{link.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-10 max-w-lg mx-auto leading-relaxed">
            Cash Pedal is not affiliated with any of the resources listed above.
            Links are provided for convenience only.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
