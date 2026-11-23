import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAccount, accountApi } from '../hooks/useAccount'
import { computeLifestyle, costCenters } from '../utils/lifestyle.js'
import { stateFromSaved } from '../utils/lifestyleSession.js'
import { safeSet } from '../utils/safeStorage'
import { trackEvent } from '../utils/analytics'

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const STORAGE_KEY = 'cp_lifestyle_profile'
// Must match CONSENT_WORDING.account_terms in account.js.
const TERMS_TEXT = 'I agree to the Terms of Service and the Privacy Policy.'
const MODE_LABEL = { current: 'Life today', dream: 'Dream lifestyle', change: 'Life change' }

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

// ── /account/verify?token=… — opening the emailed link signs you in ──
export function AccountVerify() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState('working') // working | failed
  useEffect(() => {
    const token = params.get('token')
    if (!token) { setState('failed'); return }
    // POSTed rather than GET so a mail scanner that prefetches the link can't use it up.
    accountApi('POST', '/api/auth/verify', { token }).then(r => {
      if (r.ok) { trackEvent('account_signed_in'); navigate('/account', { replace: true }) } else setState('failed')
    }).catch(() => setState('failed'))
  }, [])
  return (
    <Shell>
      <div className="card text-center">
        {state === 'working'
          ? <p className="text-white">Signing you in…</p>
          : (
            <>
              <h1 className="font-display font-bold text-white text-2xl mb-2">That link didn't work</h1>
              <p className="text-[var(--text-muted)] mb-4">Sign-in links work once and expire after 15 minutes. Request a new one.</p>
              <Link className="btn-primary" to="/account">Back to sign in</Link>
            </>
          )}
      </div>
    </Shell>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [devLink, setDevLink] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setState('sending')
    const r = await accountApi('POST', '/api/auth/request-link', { email, acceptedTerms: agreed }).catch(() => null)
    if (r?.ok) { setDevLink(r.json?.devLink ?? null); setState('sent') } else setState('error')
  }

  if (state === 'sent') {
    return (
      <div className="card">
        <h2 className="font-display font-bold text-white text-xl mb-2">Check your email</h2>
        <p className="text-[var(--text-muted)]">If that address can receive mail, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
        {devLink && <p className="text-xs mt-3 break-all text-[var(--text-muted)]">Dev link: <a className="underline" href={devLink}>{devLink}</a></p>}
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <div>
        <label className="input-label" htmlFor="acct-email">Email</label>
        <input id="acct-email" type="email" required autoComplete="email" className="input-field" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
        <input type="checkbox" className="mt-1" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
        <span>
          I agree to the <Link className="underline" to="/terms">Terms of Service</Link> and the <Link className="underline" to="/privacy">Privacy Policy</Link>.
          <span className="sr-only"> ({TERMS_TEXT})</span>
        </span>
      </label>
      <button className="btn-primary justify-center py-3.5" disabled={!agreed || !email || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {state === 'error' && <p className="text-sm text-[#f87171]">Something went wrong. Check the address and try again in a moment.</p>}
      <p className="text-xs text-[var(--text-muted)]">No password needed. We only use your email to sign you in and to run your account.</p>
    </form>
  )
}

// Compare saved profiles and scenarios side by side.
function Compare({ items, cityLookup }) {
  const rows = useMemo(() => items.map(it => {
    const st = stateFromSaved(it.payload, cityLookup)
    const r = computeLifestyle(st.active)
    const loc = st.active.city ? `${st.active.city.name}, ${st.active.city.state}` : st.active.state
    const p = r.housing.pick
    return {
      id: it.id, label: it.label,
      loc, takeHome: r.tax.monthly,
      foundation: r.pillars.foundation, lifestyle: r.pillars.lifestyle, cushion: r.pillars.cushion,
      home: p ? `${p.label}, ${p.bedrooms === 0 ? 'studio' : `${p.bedrooms} BR`} · ${usd(p.rent)}/mo (${p.status})` : `${usd(r.foundation.housing)}/mo`,
      coverage: Math.round(r.lifestyle.coverage * 100), flex: r.lifestyle.flex,
      car: r.car.cars === 0 ? 'Car-free' : `${r.car.cars} × ${r.car.tier}`,
      travel: r.lifestyle.travelPlan.label,
      top: costCenters(r).sort((a, b) => b.amount - a.amount).slice(0, 3).map(c => `${c.label} ${usd(c.amount)}`).join(', '),
    }
  }), [items, cityLookup])

  const delta = (key, i) => {
    if (i === 0) return null
    const d = rows[i][key] - rows[0][key]
    return d === 0 ? null : <span className="block text-xs text-[var(--text-muted)]">{d > 0 ? '▲' : '▼'} {usd(Math.abs(d))} vs first</span>
  }
  const line = (label, render) => (
    <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
      <th scope="row" className="py-2 pr-3 text-left text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold align-top">{label}</th>
      {rows.map((r, i) => <td key={r.id} className="py-2 pr-3 text-white align-top tabular-nums">{render(r, i)}</td>)}
    </tr>
  )
  return (
    <div className="overflow-x-auto" data-clarity-mask="True">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr><th />{rows.map(r => <th key={r.id} className="py-2 pr-3 text-left text-white font-bold">{r.label}</th>)}</tr>
        </thead>
        <tbody>
          {line('Where', r => r.loc)}
          {line('Take-home / mo', (r, i) => <>{usd(r.takeHome)}{delta('takeHome', i)}</>)}
          {line('Foundation', (r, i) => <>{usd(r.foundation)}{delta('foundation', i)}</>)}
          {line('Lifestyle', (r, i) => <>{usd(r.lifestyle)}{delta('lifestyle', i)}</>)}
          {line('Cushion', (r, i) => <>{usd(r.cushion)}{delta('cushion', i)}</>)}
          {line('Home', r => r.home)}
          {line('Wish list funded', r => `${r.coverage}%`)}
          {line('Room to grow', (r, i) => <>{usd(r.flex)}{delta('flex', i)}</>)}
          {line('Cars', r => r.car)}
          {line('Travel plan', r => r.travel)}
          {line('Biggest costs', r => r.top)}
        </tbody>
      </table>
    </div>
  )
}

function Dashboard({ acct }) {
  const navigate = useNavigate()
  const { me, profiles } = acct
  const [picked, setPicked] = useState([])
  const [cities, setCities] = useState(null)
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    import('../data/lifestyleCities.json').then(m => {
      const by = {}
      for (const c of m.default.cities) by[c.id] = c
      setCities(by)
    }).catch(() => setCities({}))
  }, [])
  const cityLookup = useMemo(() => (st, id) => (id && cities ? cities[id] ?? null : null), [cities])
  const chosen = profiles.filter(p => picked.includes(p.id))

  const toggle = id => setPicked(ids => (ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 4 ? [...ids, id] : ids))
  function open(p) {
    safeSet(STORAGE_KEY, JSON.stringify(p.payload))
    navigate('/lifestyle?resume=1')
  }
  async function exportData() {
    const r = await fetch('/api/account/export', { credentials: 'same-origin' })
    if (!r.ok) return setMsg('Could not export right now.')
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'cash-pedal-account-data.json'; a.click()
    URL.revokeObjectURL(a.href)
  }
  async function rename(p) {
    const next = window.prompt('New name', p.label)
    if (next && next.trim()) await acct.rename(p.id, next.trim())
  }
  async function del(p) { if (window.confirm(`Delete "${p.label}"? This can't be undone.`)) await acct.remove(p.id) }
  async function eraseAll() {
    const r = await acct.deleteAccount()
    if (!r.ok) setMsg('Could not delete the account right now.')
  }

  const mk = me.consents?.marketing_sharing
  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl">Your account</h1>
          <p className="text-[var(--text-muted)]">{me.email}</p>
        </div>
        <button className="btn-ghost" onClick={acct.signOut}>Sign out</button>
      </div>

      <section className="card mb-6" data-clarity-mask="True">
        <h2 className="font-display font-bold text-white text-xl mb-1">Saved profiles & scenarios</h2>
        {!me.features.storage ? (
          <p className="text-sm text-[var(--text-muted)]">Saving is temporarily unavailable. Your sign-in still works.</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Nothing saved yet. Build a picture in the <Link className="underline" to="/lifestyle">lifestyle calculator</Link>, then use "Save to my account" on the results page.
            Save one for today, another for a new city or a life change, and compare them here.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] mb-4">Tick two to four to compare them side by side. {profiles.length} of {me.limits.maxProfiles} saved.</p>
            <ul className="flex flex-col gap-2">
              {profiles.map(p => (
                <li key={p.id} className="rounded-xl border p-3 flex items-center gap-3 flex-wrap" style={{ borderColor: picked.includes(p.id) ? 'var(--accent)' : 'var(--border)' }}>
                  <input type="checkbox" aria-label={`Compare ${p.label}`} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
                  <div className="flex-1 min-w-[10rem]">
                    <p className="text-white font-semibold">{p.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{MODE_LABEL[p.payload.mode] ?? 'Profile'} · saved {new Date(p.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button className="btn-ghost text-sm" onClick={() => open(p)}>Open</button>
                  <button className="text-xs text-[var(--text-muted)] underline" onClick={() => rename(p)}>Rename</button>
                  <button className="text-xs text-[var(--text-muted)] underline" onClick={() => del(p)}>Delete</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {chosen.length >= 2 && cities && (
        <section className="card mb-6">
          <h2 className="font-display font-bold text-white text-xl mb-4">Side by side</h2>
          <Compare items={chosen} cityLookup={cityLookup} />
        </section>
      )}

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-2">Your data and choices</h2>
        <ul className="text-sm text-[var(--text-muted)] flex flex-col gap-2 mb-4">
          <li>Saved profiles are encrypted before they reach our database and are only readable when you are signed in.</li>
          <li>You can download everything we hold about your account, or delete it, at any time below.</li>
          <li>Accounts that go unused for 24 months are deleted automatically.</li>
          {me.features.leadSharing
            ? <li>Optional: you can choose to let partner companies contact you about their products (see below). Nothing is shared unless you say yes.</li>
            : <li>Cash Pedal does not share your saved profile or email with partner companies.</li>}
        </ul>

        {me.features.leadSharing && me.marketingWording && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm text-white mb-3">{me.marketingWording.text}</p>
            {mk?.granted ? (
              <>
                <p className="text-xs text-[var(--text-muted)] mb-2">You agreed on {new Date(mk.at).toLocaleDateString()}.</p>
                <button className="btn-ghost text-sm" onClick={() => acct.setConsent('marketing_sharing', false)}>Withdraw my consent</button>
              </>
            ) : (
              <button className="btn-ghost text-sm" onClick={() => acct.setConsent('marketing_sharing', true)}>Yes, I agree</button>
            )}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button className="btn-ghost" onClick={exportData}>Download my data</button>
        </div>
        {msg && <p className="text-sm text-[#f87171] mt-3">{msg}</p>}
      </section>

      <section className="card mb-6">
        <h2 className="font-display font-bold text-white text-xl mb-2">Delete my account</h2>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          This permanently deletes your saved profiles and sign-in. A record of the consents you gave is kept without your email, as evidence of what you agreed to.
          To erase other data we hold about you (for example from the tips opt-in), use the request on the <Link className="underline" to="/privacy">privacy page</Link>.
        </p>
        <div className="flex gap-3 flex-wrap items-center">
          <input className="input-field" style={{ maxWidth: '12rem' }} placeholder='Type DELETE' value={confirm} onChange={e => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" />
          <button className="btn-ghost" disabled={confirm !== 'DELETE'} onClick={eraseAll}>Delete my account</button>
        </div>
      </section>
    </>
  )
}

export default function Account() {
  const acct = useAccount()
  return (
    <Shell>
      {acct.loading ? (
        <p className="text-[var(--text-muted)]">Loading…</p>
      ) : acct.error ? (
        <div className="card"><p className="text-white">Accounts are unavailable right now. Please try again later.</p></div>
      ) : acct.me ? (
        <Dashboard acct={acct} />
      ) : (
        <>
          <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl mb-3">Save your lifestyle profile</h1>
          <p className="text-[var(--text-muted)] text-lg mb-8">
            Sign in to keep your profile and compare life events and cities over time. No password: we email you a link.
          </p>
          <SignIn />
        </>
      )}
    </Shell>
  )
}
