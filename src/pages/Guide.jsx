import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import NotFound from './NotFound'
import {
  guideFromSlug, guideSections, relatedLinks, GUIDES_INDEX,
  SALARY_LEVELS, PRICE_LEVELS, salaryGuidePath, priceGuidePath, money,
} from '../data/guides'
import { trackUsage } from '../utils/usage'

function Eyebrow({ children }) {
  return (
    <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
      <span className="w-4 h-px bg-[var(--accent)]" />
      {children}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-2 py-2 border-b border-[var(--border)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-2 ${j === 0 ? 'text-white' : 'text-[var(--text-muted)] whitespace-nowrap'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LinkList({ links }) {
  if (!links?.length) return null
  return (
    <ul className="grid sm:grid-cols-2 gap-2 mt-3">
      {links.map(l => (
        <li key={l.href}>
          <Link to={l.href} className="block text-sm text-white hover:text-[var(--accent)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-3 py-2 transition-colors">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function GuidesIndex() {
  useEffect(() => { document.title = GUIDES_INDEX.title }, [])
  return (
    <>
      <Eyebrow>Guides</Eyebrow>
      <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-4">{GUIDES_INDEX.h1}</h1>
      <p className="text-[var(--text-muted)] leading-relaxed mb-8">{GUIDES_INDEX.intro}</p>
      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">How much car can I afford on my salary?</h2>
        <LinkList links={SALARY_LEVELS.map(s => ({ href: salaryGuidePath(s), label: `${money(s)} a year` }))} />
      </section>
      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-1">What salary do I need for this car?</h2>
        <LinkList links={PRICE_LEVELS.map(p => ({ href: priceGuidePath(p), label: `${money(p)} car` }))} />
      </section>
    </>
  )
}

function GuideArticle({ guide }) {
  useEffect(() => {
    document.title = guide.title
    trackUsage('visit_guide')
  }, [guide])
  const sections = guideSections(guide)
  return (
    <article>
      <nav className="text-xs text-[var(--text-muted)] mb-4">
        <Link to="/guides" className="hover:text-[var(--accent)]">Guides</Link>
        <span className="mx-1.5">/</span>
        <span>{guide.kind === 'salary' ? 'By salary' : 'By car price'}</span>
      </nav>
      <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mb-5">{guide.h1}</h1>

      <div className="card mb-6 border-[var(--accent)]" style={{ borderColor: 'rgba(200,255,0,0.35)' }}>
        <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">Short answer</div>
        <p className="text-white leading-relaxed">{guide.answer}</p>
        <Link to={guide.calculatorUrl} className="btn-primary inline-block mt-4 text-sm">
          {guide.kind === 'salary' ? 'Personalize for your state & car →' : 'Check it for your state & car →'}
        </Link>
      </div>

      {sections.map(s => (
        <section key={s.heading} className="card mb-6">
          <h2 className="font-display font-bold text-white text-xl mb-3">{s.heading}</h2>
          {s.paragraphs?.map(p => <p key={p} className="text-[var(--text-muted)] leading-relaxed mb-3">{p}</p>)}
          {s.table && <Table {...s.table} />}
          <LinkList links={s.links} />
          {s.note && <p className="text-xs text-[var(--text-muted)] mt-3">{s.note}</p>}
        </section>
      ))}

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-3">Frequently asked questions</h2>
        {guide.faq.map(([q, a]) => (
          <div key={q} className="mb-4 last:mb-0">
            <h3 className="text-white font-semibold mb-1">{q}</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

      <section className="card mb-6 text-center">
        <h2 className="font-display font-bold text-white text-xl mb-2">Your numbers will differ</h2>
        <p className="text-[var(--text-muted)] leading-relaxed mb-4">
          These figures use national averages. Cash Pedal's free calculators adjust for your state, ZIP, loan terms and the exact make, model and trim you're considering.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={guide.calculatorUrl} className="btn-primary text-sm">Open the calculator</Link>
          <Link to="/tco" className="text-sm text-white border border-[var(--border)] hover:border-[var(--accent)] rounded-lg px-4 py-2 transition-colors">True cost of a specific car</Link>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-display font-bold text-white text-lg mb-1">Related guides</h2>
        <LinkList links={relatedLinks(guide)} />
      </section>

      <p className="text-xs text-[var(--text-muted)]">Estimates only, not financial advice. Methodology: total monthly car cost (payment + gas + insurance + maintenance + registration) compared against 10%, 15% and 20% of gross income.</p>
    </article>
  )
}

export default function Guide() {
  const { slug } = useParams()
  const guide = slug ? guideFromSlug(slug) : null
  if (slug && !guide) return <NotFound />
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
          {guide ? <GuideArticle guide={guide} /> : <GuidesIndex />}
        </div>
      </main>
      <Footer />
    </div>
  )
}
