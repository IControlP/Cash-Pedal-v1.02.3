import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const categories = [
  {
    icon: '🏪',
    title: 'Vehicle Shopping',
    desc: 'Find and compare new and used vehicles for sale.',
    links: [
      { name: 'CarGurus', url: 'https://www.cargurus.com', desc: 'Price analysis and dealer listings' },
      { name: 'Cars.com', url: 'https://www.cars.com', desc: 'New & used vehicle marketplace' },
      { name: 'AutoTrader', url: 'https://www.autotrader.com', desc: 'Large inventory, research tools' },
      { name: 'Carvana', url: 'https://www.carvana.com', desc: 'Online used car buying, home delivery' },
      { name: 'CarMax', url: 'https://www.carmax.com', desc: 'No-haggle used vehicle sales' },
    ],
  },
  {
    icon: '💰',
    title: 'Financing',
    desc: 'Compare auto loan rates before you walk into a dealership.',
    links: [
      { name: 'LendingTree Auto', url: 'https://www.lendingtree.com/auto', desc: 'Compare multiple lender offers' },
      { name: 'Capital One Auto', url: 'https://www.capitalone.com/auto-financing', desc: 'Pre-qualify without credit impact' },
      { name: 'PenFed Credit Union', url: 'https://www.penfed.org/auto-loans', desc: 'Consistently low rates for members' },
      { name: 'Bankrate Auto Loans', url: 'https://www.bankrate.com/loans/auto-loans', desc: 'Rates overview and comparison tool' },
    ],
  },
  {
    icon: '🛡️',
    title: 'Insurance',
    desc: 'Get quotes from multiple insurers in minutes.',
    links: [
      { name: 'The Zebra', url: 'https://www.thezebra.com', desc: 'Compare 100+ insurance providers' },
      { name: 'GEICO', url: 'https://www.geico.com', desc: 'Often lowest rates for clean records' },
      { name: 'Progressive', url: 'https://www.progressive.com', desc: 'Name Your Price® tool' },
      { name: 'Policygenius', url: 'https://www.policygenius.com/auto-insurance', desc: 'Unbiased comparison and advice' },
    ],
  },
  {
    icon: '🔧',
    title: 'Maintenance & Repairs',
    desc: 'Know what repairs cost before you get the estimate.',
    links: [
      { name: 'RepairPal', url: 'https://repairpal.com', desc: 'Fair price estimates for any repair' },
      { name: 'Tire Rack', url: 'https://www.tirerack.com', desc: 'Best tire prices + installer locator' },
      { name: 'Firestone', url: 'https://www.firestonecompleteautocare.com', desc: 'National chain, consistent pricing' },
      { name: 'Midas', url: 'https://www.midas.com', desc: 'Oil changes, brakes, and more' },
    ],
  },
  {
    icon: '📊',
    title: 'Research & Valuation',
    desc: "Understand what a vehicle is actually worth before you negotiate.",
    links: [
      { name: 'Kelley Blue Book', url: 'https://www.kbb.com', desc: 'Industry standard for vehicle values' },
      { name: 'Edmunds', url: 'https://www.edmunds.com', desc: 'True Market Value pricing data' },
      { name: 'NHTSA Safety Ratings', url: 'https://www.nhtsa.gov/ratings', desc: 'Official federal safety crash test ratings' },
      { name: 'Consumer Reports', url: 'https://www.consumerreports.org/cars', desc: 'Reliability data and owner reviews' },
    ],
  },
  {
    icon: '📜',
    title: 'Vehicle History',
    desc: 'Check for accidents, title issues, and odometer fraud before you buy.',
    links: [
      { name: 'Carfax', url: 'https://www.carfax.com', desc: 'Full vehicle history report' },
      { name: 'AutoCheck', url: 'https://www.autocheck.com', desc: 'Experian-backed history reports' },
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
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-3 group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                          {link.name} ↗
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{link.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-10">
            Cash Pedal is not affiliated with any of the resources listed above.
            Links are provided for convenience only.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
