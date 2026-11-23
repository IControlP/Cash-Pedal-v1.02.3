// End-to-end checks for accounts against a real Postgres.
//   DATABASE_URL=postgres://user@127.0.0.1:5432/db node scripts/verify-account-e2e.mjs
// Starts server.js itself on a spare port with test-only settings. Not part of CI (needs a
// database); run it before changing account.js.
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import pg from 'pg'
import { sweepAccounts } from '../account.js'

const DB = process.env.DATABASE_URL
if (!DB) { console.error('Set DATABASE_URL to a throwaway database'); process.exit(2) }
const pool = new pg.Pool({ connectionString: DB })
let failures = 0
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++ }
const sleep = ms => new Promise(r => setTimeout(r, ms))

function startServer(port, extra = {}) {
  const env = {
    ...process.env, PORT: String(port), DATABASE_URL: DB, IP_HMAC_SECRET: 'test-secret', ACCOUNT_DEV_LINKS: '1',
    APP_URL: `http://localhost:${port}`, RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', ...extra,
  }
  const child = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', d => { log += d }); child.stderr.on('data', d => { log += d })
  return { child, port, log: () => log, stop: () => child.kill() }
}
async function waitUp(s) { for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://localhost:${s.port}/api/health`)).ok) return } catch { /* not yet */ } await sleep(250) } throw new Error('server did not start\n' + s.log()) }

class Client {
  static n = 1
  // Each client gets its own client IP so the per-IP rate limiter doesn't couple the checks.
  constructor(port) { this.base = `http://localhost:${port}`; this.cookie = ''; this.ip = `10.${(Client.n >> 8) & 255}.${Client.n & 255}.7`; Client.n++ }
  async call(method, path, body, { csrf = true, raw = false } = {}) {
    const headers = { 'content-type': 'application/json', 'x-forwarded-for': this.ip }
    if (csrf) headers['x-cp-request'] = '1'
    if (this.cookie) headers.cookie = this.cookie
    const r = await fetch(this.base + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const set = r.headers.get('set-cookie')
    if (set) { const c = set.split(';')[0]; this.cookie = c.endsWith('=') ? '' : c; this.lastSetCookie = set }
    const text = await r.text()
    let json = null; try { json = JSON.parse(text) } catch { /* not json */ }
    return { status: r.status, json, text, headers: r.headers }
  }
  async signIn(email) {
    const a = await this.call('POST', '/api/auth/request-link', { email, acceptedTerms: true })
    const token = new URL(a.json.devLink).searchParams.get('token')
    const v = await this.call('POST', '/api/auth/verify', { token })
    return { token, status: v.status }
  }
}

const KEY = crypto.randomBytes(32).toString('base64')
const s = startServer(4174, { PROFILE_ENC_KEY: KEY })
try {
  await waitUp(s)
  const c = new Client(4174)
  const email = `a${Date.now()}@example.com`
  const payload = { form: { income1: '85000', income2: '', state: 'CO', city: 'CO|Denver', debt: '450' }, prefs: { goal: 'home' }, mode: 'current', events: [] }

  // Request link validation
  check('request-link without the CSRF header is refused', (await c.call('POST', '/api/auth/request-link', { email, acceptedTerms: true }, { csrf: false })).status === 403)
  check('request-link needs accepted terms', (await c.call('POST', '/api/auth/request-link', { email, acceptedTerms: false })).status === 400)
  check('request-link rejects a bad email', (await c.call('POST', '/api/auth/request-link', { email: 'nope', acceptedTerms: true })).status === 400)
  check('signed out: /me is 401', (await c.call('GET', '/api/account/me')).status === 401)
  const st0 = await c.call('GET', '/api/account/status')
  check('signed out: /status is 200 with signedIn false (no console noise)', st0.status === 200 && st0.json.signedIn === false)

  // Sign in
  const first = await c.call('POST', '/api/auth/request-link', { email, acceptedTerms: true })
  if (!first.json?.devLink) { console.log('request-link said', first.status, first.text); process.exit(1) }
  const token = new URL(first.json.devLink).searchParams.get('token')
  check('link row stores a hash, not the token', (await pool.query(`SELECT 1 FROM auth_links WHERE token_hash = $1`, [crypto.createHash('sha256').update(token).digest('hex')])).rows.length === 1 && (await pool.query(`SELECT 1 FROM auth_links WHERE token_hash = $1`, [token])).rows.length === 0)
  check('wrong token fails', (await c.call('POST', '/api/auth/verify', { token: 'x'.repeat(43) })).status === 400)
  const ver = await c.call('POST', '/api/auth/verify', { token })
  check('verify signs in and sets an HttpOnly, SameSite cookie', ver.status === 200 && /HttpOnly/i.test(c.lastSetCookie) && /SameSite=Lax/i.test(c.lastSetCookie))
  check('a link works once', (await new Client(4174).call('POST', '/api/auth/verify', { token })).status === 400)
  const me = await c.call('GET', '/api/account/me')
  check('/me returns the account with terms consent recorded', me.status === 200 && me.json.email === email && me.json.consents.account_terms?.granted === true, JSON.stringify(me.json.consents))
  check('signed in: /status says so', (await c.call('GET', '/api/account/status')).json.signedIn === true)
  check('/me responses are not cacheable', /no-store/.test(me.headers.get('cache-control') || ''))
  check('lead sharing is off by default and no wording is offered', me.json.features.leadSharing === false && me.json.marketingWording === null)
  check('session token stored hashed', (await pool.query(`SELECT token_hash FROM account_sessions`)).rows.every(r => r.token_hash.length === 64))

  // Expired link
  const exp = await c.call('POST', '/api/auth/request-link', { email: `exp${Date.now()}@example.com`, acceptedTerms: true })
  const expTok = new URL(exp.json.devLink).searchParams.get('token')
  await pool.query(`UPDATE auth_links SET expires_at = NOW() - INTERVAL '1 minute' WHERE token_hash = $1`, [crypto.createHash('sha256').update(expTok).digest('hex')])
  check('expired link is refused', (await new Client(4174).call('POST', '/api/auth/verify', { token: expTok })).status === 400)

  // Per-email hourly cap
  const capEmail = `cap${Date.now()}@example.com`
  for (let i = 0; i < 7; i++) await new Client(4174).call('POST', '/api/auth/request-link', { email: capEmail, acceptedTerms: true })
  check('at most 5 links per email per hour', (await pool.query(`SELECT COUNT(*)::int n FROM auth_links WHERE email = $1`, [capEmail])).rows[0].n === 5)

  // Saved profiles
  check('saving needs the CSRF header', (await c.call('POST', '/api/account/profiles', { label: 'Today', kind: 'profile', payload }, { csrf: false })).status === 403)
  check('unexpected fields are rejected', (await c.call('POST', '/api/account/profiles', { label: 'x', kind: 'profile', payload: { form: {}, ssn: '123' } })).status === 400)
  check('a label is required', (await c.call('POST', '/api/account/profiles', { label: '  ', kind: 'profile', payload })).status === 400)
  const saved = await c.call('POST', '/api/account/profiles', { label: 'My life today', kind: 'profile', payload })
  check('save works', saved.status === 201 && !!saved.json.id)
  const raw = (await pool.query(`SELECT payload_enc FROM saved_profiles WHERE id = $1`, [saved.json.id])).rows[0].payload_enc
  const ctBytes = Buffer.from(raw.split('.')[4], 'base64url').toString('latin1')
  check('database holds ciphertext only (no income, city, state or field names)', raw.startsWith('v1.') && !raw.includes('85000') && !raw.includes('Denver') && !ctBytes.includes('85000') && !ctBytes.includes('Denver') && !ctBytes.includes('income1'))
  const list = await c.call('GET', '/api/account/profiles')
  check('list returns the decrypted payload', list.json.profiles[0]?.payload?.form?.income1 === '85000')
  const put = await c.call('PUT', `/api/account/profiles/${saved.json.id}`, { label: 'Renamed' })
  check('update works', put.status === 200 && (await c.call('GET', '/api/account/profiles')).json.profiles[0].label === 'Renamed')
  check('malformed id is a 404, not a crash', (await c.call('DELETE', '/api/account/profiles/not-a-uuid')).status === 404)
  for (let i = 0; i < 19; i++) await c.call('POST', '/api/account/profiles', { label: `s${i}`, kind: 'scenario', payload })
  const over = await c.call('POST', '/api/account/profiles', { label: 'one too many', kind: 'scenario', payload })
  check('profile limit enforced (20)', over.status === 409 && over.json.max === 20)

  // Isolation between accounts
  const other = new Client(4174)
  await other.signIn(`b${Date.now()}@example.com`)
  check('another account sees none of them', (await other.call('GET', '/api/account/profiles')).json.profiles.length === 0)
  check('another account cannot update or delete them', (await other.call('PUT', `/api/account/profiles/${saved.json.id}`, { label: 'hijack' })).status === 404 && (await other.call('DELETE', `/api/account/profiles/${saved.json.id}`)).status === 404)
  // Ciphertext copied into another account's row must not decrypt (AAD binding)
  const otherId = (await pool.query(`SELECT a.id FROM accounts a JOIN account_sessions s ON s.account_id = a.id WHERE a.email LIKE 'b%' LIMIT 1`)).rows[0].id
  await pool.query(`INSERT INTO saved_profiles (id, account_id, label, kind, payload_enc) VALUES ($1,$2,'stolen','profile',$3)`, [crypto.randomUUID(), otherId, raw])
  check('ciphertext moved to another account is not readable', (await other.call('GET', '/api/account/profiles')).json.profiles.length === 0)

  // Consent
  check('granting marketing sharing is refused while the feature is off', (await c.call('POST', '/api/account/consent', { purpose: 'marketing_sharing', granted: true })).status === 403)
  check('withdrawing is always allowed and recorded', (await c.call('POST', '/api/account/consent', { purpose: 'marketing_sharing', granted: false })).status === 200 && (await pool.query(`SELECT 1 FROM consent_ledger WHERE purpose = 'marketing_sharing' AND granted = FALSE`)).rows.length === 1)
  check('unknown consent purposes are refused', (await c.call('POST', '/api/account/consent', { purpose: 'sell_everything', granted: true })).status === 400)

  // Export
  const ex = await c.call('GET', '/api/account/export')
  check('export includes profiles, consent history and activity, as an attachment', ex.status === 200 && ex.json.savedProfiles.length === 20 && ex.json.consentHistory.length >= 2 && ex.json.activityLog.length >= 3 && /attachment/.test(ex.headers.get('content-disposition')))

  // Logout
  check('logout ends the session', (await c.call('POST', '/api/auth/logout', {})).status === 200 && (await c.call('GET', '/api/account/me')).status === 401)

  // Erase
  const d = new Client(4174); const dEmail = `d${Date.now()}@example.com`
  await d.signIn(dEmail); await d.call('POST', '/api/account/profiles', { label: 'x', kind: 'profile', payload })
  const dId = (await pool.query(`SELECT id FROM accounts WHERE email = $1`, [dEmail])).rows[0].id
  check('erase needs explicit confirmation', (await d.call('POST', '/api/account/delete', {})).status === 400)
  check('erase succeeds', (await d.call('POST', '/api/account/delete', { confirm: 'DELETE' })).status === 200)
  const after = await Promise.all([
    pool.query(`SELECT email, deleted_at FROM accounts WHERE id = $1`, [dId]),
    pool.query(`SELECT 1 FROM saved_profiles WHERE account_id = $1`, [dId]),
    pool.query(`SELECT 1 FROM account_sessions WHERE account_id = $1`, [dId]),
    pool.query(`SELECT 1 FROM auth_links WHERE email = $1`, [dEmail]),
    pool.query(`SELECT 1 FROM consent_ledger WHERE account_id = $1`, [dId]),
  ])
  check('erase removes email, profiles, sessions and links', after[0].rows[0].email === null && after[0].rows[0].deleted_at && after[1].rows.length === 0 && after[2].rows.length === 0 && after[3].rows.length === 0)
  check('erase keeps the consent ledger without any personal data', after[4].rows.length >= 1)
  check('erased session no longer works', (await d.call('GET', '/api/account/me')).status === 401)
  const again = new Client(4174); await again.signIn(dEmail)
  check('the same email can start a fresh account afterwards', (await again.call('GET', '/api/account/me')).status === 200 && (await again.call('GET', '/api/account/profiles')).json.profiles.length === 0)

  // Site-wide delete-my-data also erases the account
  const w = new Client(4174); const wEmail = `w${Date.now()}@example.com`
  await w.signIn(wEmail); await w.call('POST', '/api/account/profiles', { label: 'x', kind: 'profile', payload })
  const wr = await w.call('POST', '/api/delete-my-data', { email: wEmail })
  check('/api/delete-my-data also erases the account and its profiles', wr.status === 200 && (await pool.query(`SELECT 1 FROM accounts WHERE email = $1`, [wEmail])).rows.length === 0)

  // Retention sweep
  const oldId = crypto.randomUUID()
  await pool.query(`INSERT INTO accounts (id, email, created_at, last_login_at) VALUES ($1,'old@example.com', NOW() - INTERVAL '30 months', NOW() - INTERVAL '26 months')`, [oldId])
  await pool.query(`INSERT INTO account_audit_log (account_id, event, created_at) VALUES ($1,'login', NOW() - INTERVAL '30 months')`, [oldId])
  await sweepAccounts(pool)
  check('sweep removes accounts idle 24+ months and old audit rows', (await pool.query(`SELECT 1 FROM accounts WHERE id = $1`, [oldId])).rows.length === 0 && (await pool.query(`SELECT 1 FROM account_audit_log WHERE account_id = $1`, [oldId])).rows.length === 0)
  check('sweep keeps active accounts', (await pool.query(`SELECT 1 FROM accounts WHERE email = $1`, [email])).rows.length === 1)

  check('server log never prints a full email address', !s.log().includes(email))
} finally { s.stop() }

// Without an encryption key: sign-in works, saving refuses to store plaintext.
const s2 = startServer(4175, { PROFILE_ENC_KEY: '' })
try {
  await waitUp(s2)
  const c2 = new Client(4175); await c2.signIn(`nokey${Date.now()}@example.com`)
  check('no key: sign-in works but storage is reported unavailable', (await c2.call('GET', '/api/account/me')).json.features.storage === false)
  check('no key: saving is refused (never plaintext)', (await c2.call('POST', '/api/account/profiles', { label: 'x', kind: 'profile', payload: { form: {} } })).status === 503)
} finally { s2.stop() }

// With lead sharing switched on: a user can opt in; wording version and hash are recorded.
const s3 = startServer(4176, { PROFILE_ENC_KEY: KEY, LEAD_SHARING_ENABLED: '1' })
try {
  await waitUp(s3)
  const c3 = new Client(4176); await c3.signIn(`lead${Date.now()}@example.com`)
  const m = await c3.call('GET', '/api/account/me')
  check('feature on: the exact wording is offered', m.json.features.leadSharing === true && /partner companies/.test(m.json.marketingWording?.text || ''))
  check('feature on: opt-in is accepted and recorded with the wording hash', (await c3.call('POST', '/api/account/consent', { purpose: 'marketing_sharing', granted: true })).status === 200
    && (await pool.query(`SELECT wording_hash, wording_version FROM consent_ledger WHERE purpose = 'marketing_sharing' AND granted = TRUE`)).rows.every(r => r.wording_hash.length === 64 && r.wording_version === '1'))
  check('feature on: /me reflects the latest consent', (await c3.call('GET', '/api/account/me')).json.consents.marketing_sharing.granted === true)
  await c3.call('POST', '/api/account/consent', { purpose: 'marketing_sharing', granted: false })
  check('withdrawal supersedes the grant (append-only ledger)', (await c3.call('GET', '/api/account/me')).json.consents.marketing_sharing.granted === false)
} finally { s3.stop() }

await pool.end()
process.exit(failures ? 1 : 0)
