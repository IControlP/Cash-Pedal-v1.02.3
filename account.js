// Accounts, saved financial profiles and consent — imported by server.js.
//
// Design
//   • Passwordless sign-in: a single-use magic link (15 min) is emailed; opening it POSTs
//     the token (so mail scanners that prefetch links can't burn it) and sets an HttpOnly
//     session cookie. Only SHA-256 hashes of tokens are stored.
//   • Saved profiles hold financial details (incomes, debt, savings), so they are encrypted
//     at rest with AES-256-GCM (key from PROFILE_ENC_KEY, bound to the account id). Without
//     the key, saving is disabled rather than falling back to plaintext.
//   • Consent is an append-only ledger (purpose, granted, wording hash, time, pseudonymized
//     IP). Account creation requires accepting the Terms/Privacy wording. Sharing data with
//     partner companies is a separate, default-off, withdrawable consent and is disabled
//     entirely unless LEAD_SHARING_ENABLED=1 (nothing is shared by this module).
//   • Users can export and erase everything held for their account; retention sweeps remove
//     expired links/sessions, audit rows after 24 months and accounts idle for 24 months.

import crypto from 'crypto'

export const SESSION_COOKIE = 'cp_session'
export const SESSION_DAYS = 30
export const LINK_MINUTES = 15
export const MAX_SAVED = 20
export const INACTIVE_MONTHS = 24
export const MAX_PAYLOAD_BYTES = 20_000
const LINKS_PER_EMAIL_PER_HOUR = 5

// Wording shown to the user when they consent. If any text changes, bump `version`; the
// hash of the exact text is stored with every ledger row.
export const CONSENT_WORDING = {
  account_terms: {
    version: '1',
    text: 'I agree to the Terms of Service and the Privacy Policy.',
  },
  marketing_sharing: {
    version: '1',
    text: 'I agree that Cash Pedal may share my email address and the financial profile I save (income, location, household, debts, savings and the lifestyle answers I give) with partner companies in these categories: mortgage and home loans, insurance, banking and savings, debt help, and relocation services, so they can contact me about their products. Sharing is not required to use Cash Pedal, and I can withdraw this consent at any time in my account.',
  },
}
const wordingHash = purpose => crypto.createHash('sha256').update(CONSENT_WORDING[purpose].text).digest('hex')

// ── Pure helpers (unit-tested in scripts/verify-account.mjs) ─────────────
export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')
export const newToken = () => crypto.randomBytes(32).toString('base64url')

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function loadKeys(env = process.env) {
  const keys = []
  for (const name of ['PROFILE_ENC_KEY', 'PROFILE_ENC_KEY_PREV']) {
    const raw = (env[name] || '').trim()
    if (!raw) continue
    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32) throw new Error(`${name} must be 32 bytes, base64-encoded`)
    keys.push({ kid: sha256(buf).slice(0, 8), buf })
  }
  return keys
}

// v1.<kid>.<iv>.<tag>.<ciphertext>; the account id is authenticated as additional data so a
// ciphertext copied to another account fails to decrypt.
export function encryptPayload(obj, accountId, env = process.env) {
  const [key] = loadKeys(env)
  if (!key) throw new Error('storage_unavailable')
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key.buf, iv)
  c.setAAD(Buffer.from(accountId))
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return ['v1', key.kid, iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function decryptPayload(blob, accountId, env = process.env) {
  const [v, kid, iv, tag, ct] = String(blob).split('.')
  if (v !== 'v1') throw new Error('bad_payload')
  const key = loadKeys(env).find(k => k.kid === kid)
  if (!key) throw new Error('unknown_key')
  const d = crypto.createDecipheriv('aes-256-gcm', key.buf, Buffer.from(iv, 'base64url'))
  d.setAAD(Buffer.from(accountId))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'))
}

// Only the calculator's own fields may be stored — no free-form data.
const PAYLOAD_KEYS = new Set(['form', 'prefs', 'mode', 'events'])
const MODES = new Set(['current', 'dream', 'change'])
export function validatePayload(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'payload must be an object'
  for (const k of Object.keys(p)) if (!PAYLOAD_KEYS.has(k)) return `unexpected field: ${k}`
  if (p.mode != null && !MODES.has(p.mode)) return 'bad mode'
  if (p.events != null && (!Array.isArray(p.events) || p.events.length > 10 || p.events.some(e => typeof e !== 'string' || e.length > 20))) return 'bad events'
  for (const k of ['form', 'prefs']) if (p[k] != null && (typeof p[k] !== 'object' || Array.isArray(p[k]))) return `bad ${k}`
  if (Buffer.byteLength(JSON.stringify(p)) > MAX_PAYLOAD_BYTES) return 'payload too large'
  return null
}

// State-changing requests must come from our own origin and carry the custom header,
// which a cross-site form or fetch cannot send without a CORS preflight we never grant.
export function sameOriginOk(req, appUrl) {
  if (req.get('x-cp-request') !== '1') return false
  const origin = req.get('origin')
  if (!origin) return true
  try {
    const o = new URL(origin)
    const a = new URL(appUrl)
    return o.host === a.host || o.hostname === 'localhost' || o.hostname === '127.0.0.1'
  } catch { return false }
}

// ── Tables ───────────────────────────────────────────────────────────────
export async function initAccountTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id            UUID PRIMARY KEY,
      email         TEXT UNIQUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ,
      deleted_at    TIMESTAMPTZ
    )`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_links (
      token_hash     CHAR(64) PRIMARY KEY,
      email          TEXT NOT NULL,
      accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
      ip_hash        TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at     TIMESTAMPTZ NOT NULL,
      used_at        TIMESTAMPTZ
    )`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_links_email ON auth_links(email, created_at)`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS account_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS saved_profiles (
      id             UUID PRIMARY KEY,
      account_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      label          TEXT NOT NULL,
      kind           TEXT NOT NULL,
      payload_enc    TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_profiles_account ON saved_profiles(account_id)`)
  // Append-only. No foreign key on purpose: the ledger is kept (without PII) after an
  // account is erased, as evidence of what the person agreed to and when.
  await client.query(`
    CREATE TABLE IF NOT EXISTS consent_ledger (
      id              BIGSERIAL PRIMARY KEY,
      account_id      UUID NOT NULL,
      purpose         TEXT NOT NULL,
      granted         BOOLEAN NOT NULL,
      wording_version TEXT NOT NULL,
      wording_hash    CHAR(64) NOT NULL,
      ip_hash         TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_consent_ledger_account ON consent_ledger(account_id, purpose, id)`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS account_audit_log (
      id         BIGSERIAL PRIMARY KEY,
      account_id UUID,
      event      TEXT NOT NULL,
      ip_hash    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
}

export async function sweepAccounts(pool) {
  await pool.query(`DELETE FROM auth_links WHERE expires_at < NOW() - INTERVAL '1 day'`)
  await pool.query(`DELETE FROM account_sessions WHERE expires_at < NOW()`)
  await pool.query(`DELETE FROM account_audit_log WHERE created_at < NOW() - INTERVAL '${INACTIVE_MONTHS} months'`)
  // Idle accounts: profiles and sessions go with them (ON DELETE CASCADE); the consent
  // ledger rows stay, with no personal data attached.
  await pool.query(
    `DELETE FROM accounts WHERE COALESCE(last_login_at, created_at) < NOW() - INTERVAL '${INACTIVE_MONTHS} months'`)
}

// Erase everything held for an email. Also used by the site-wide delete-my-data flow.
export async function eraseAccountByEmail(pool, email) {
  const { rows } = await pool.query(`SELECT id FROM accounts WHERE email = $1`, [email])
  if (!rows.length) return false
  const id = rows[0].id
  await pool.query(`DELETE FROM saved_profiles WHERE account_id = $1`, [id])
  await pool.query(`DELETE FROM account_sessions WHERE account_id = $1`, [id])
  await pool.query(`DELETE FROM auth_links WHERE email = $1`, [email])
  await pool.query(`UPDATE accounts SET email = NULL, deleted_at = NOW() WHERE id = $1`, [id])
  await pool.query(`INSERT INTO account_audit_log (account_id, event) VALUES ($1, 'account_erased')`, [id])
  return true
}

// ── Routes ───────────────────────────────────────────────────────────────
export function registerAccountRoutes(app, deps) {
  const { pool, appUrl, deliverEmail, emailLayout, emailEnabled, anonymizeIp, pseudonymizeIp, redactEmail,
    isValidEmail, normalizeEmail, limiter, env = process.env } = deps
  const leadSharing = env.LEAD_SHARING_ENABLED === '1'
  const secure = appUrl.startsWith('https://')
  let storageReady = false
  try { storageReady = loadKeys(env).length > 0 } catch (err) { console.error('[account]', err.message) }

  const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() }
  const csrf = (req, res, next) => (sameOriginOk(req, appUrl) ? next() : res.status(403).json({ error: 'forbidden' }))
  const needDb = (_req, res, next) => (pool ? next() : res.status(503).json({ error: 'accounts_unavailable' }))
  const ipHash = req => pseudonymizeIp(req.ip || 'unknown')
  const audit = (accountId, event, req) =>
    pool.query(`INSERT INTO account_audit_log (account_id, event, ip_hash) VALUES ($1,$2,$3)`, [accountId, event, req ? ipHash(req) : null]).catch(() => {})
  const ledger = (accountId, purpose, granted, req) =>
    pool.query(
      `INSERT INTO consent_ledger (account_id, purpose, granted, wording_version, wording_hash, ip_hash) VALUES ($1,$2,$3,$4,$5,$6)`,
      [accountId, purpose, granted, CONSENT_WORDING[purpose].version, wordingHash(purpose), ipHash(req)])

  const setCookie = (res, value, maxAgeSec) =>
    res.append('Set-Cookie', `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`)

  async function requireAuth(req, res, next) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (!token) return res.status(401).json({ error: 'signed_out' })
    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.email, a.created_at, s.token_hash
           FROM account_sessions s JOIN accounts a ON a.id = s.account_id
          WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.deleted_at IS NULL`, [sha256(token)])
      if (!rows.length) { setCookie(res, '', 0); return res.status(401).json({ error: 'signed_out' }) }
      req.account = rows[0]
      pool.query(`UPDATE account_sessions SET last_seen = NOW() WHERE token_hash = $1 AND last_seen < NOW() - INTERVAL '1 hour'`, [rows[0].token_hash]).catch(() => {})
      next()
    } catch (err) {
      console.error('[account] auth error:', err.message)
      res.status(500).json({ error: 'server_error' })
    }
  }

  // ── Sign in ──
  app.post('/api/auth/request-link', noStore, needDb, csrf, limiter, async (req, res) => {
    const { email, acceptedTerms } = req.body || {}
    if (!isValidEmail(email)) return res.status(400).json({ error: 'valid_email_required' })
    if (acceptedTerms !== true) return res.status(400).json({ error: 'terms_required' })
    const to = normalizeEmail(email)
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM auth_links WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`, [to])
      if (rows[0].n < LINKS_PER_EMAIL_PER_HOUR) {
        const token = newToken()
        await pool.query(
          `INSERT INTO auth_links (token_hash, email, accepted_terms, ip_hash, expires_at) VALUES ($1,$2,TRUE,$3, NOW() + INTERVAL '${LINK_MINUTES} minutes')`,
          [sha256(token), to, ipHash(req)])
        const link = `${appUrl}/account/verify?token=${token}`
        if (emailEnabled) {
          deliverEmail(to, {
            subject: 'Your Cash Pedal sign-in link',
            text: `Use this link to sign in to Cash Pedal. It works once and expires in ${LINK_MINUTES} minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
            html: emailLayout(`
              <p style="margin:0 0 16px;">Use this button to sign in to <strong>Cash Pedal</strong>. It works once and expires in ${LINK_MINUTES} minutes.</p>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background-color:rgb(200,255,0);">
                <a href="${link}" style="display:inline-block;padding:12px 24px;color:#111111;font-weight:700;text-decoration:none;">Sign in</a>
              </td></tr></table>
              <p style="margin:20px 0 0;color:#71717a;font-size:13px;">If you didn't ask for this, you can ignore this email.</p>`),
          }).catch(err => console.error('[account] sign-in email failed:', err.message))
        } else if (env.ACCOUNT_DEV_LINKS === '1') {
          // Local testing only: never set ACCOUNT_DEV_LINKS in production.
          return res.json({ ok: true, devLink: link })
        } else {
          console.log(`[account] RESEND_API_KEY not set — sign-in link not sent for ${redactEmail(to)}`)
        }
      }
      // Same answer whether or not the email exists or the hourly cap was hit.
      res.json({ ok: true })
    } catch (err) {
      console.error('[account] request-link error:', err.message)
      res.status(500).json({ error: 'server_error' })
    }
  })

  app.post('/api/auth/verify', noStore, needDb, csrf, limiter, async (req, res) => {
    const token = String(req.body?.token || '')
    if (token.length < 20 || token.length > 100) return res.status(400).json({ error: 'invalid_link' })
    try {
      const used = await pool.query(
        `UPDATE auth_links SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING email, accepted_terms`,
        [sha256(token)])
      if (!used.rows.length) return res.status(400).json({ error: 'invalid_link' })
      const { email, accepted_terms } = used.rows[0]
      let acct = (await pool.query(`SELECT id FROM accounts WHERE email = $1 AND deleted_at IS NULL`, [email])).rows[0]
      if (!acct) {
        acct = { id: crypto.randomUUID() }
        await pool.query(`INSERT INTO accounts (id, email, last_login_at) VALUES ($1,$2,NOW())`, [acct.id, email])
        await audit(acct.id, 'account_created', req)
      } else {
        await pool.query(`UPDATE accounts SET last_login_at = NOW() WHERE id = $1`, [acct.id])
      }
      if (accepted_terms) {
        const last = (await pool.query(`SELECT wording_hash, granted FROM consent_ledger WHERE account_id = $1 AND purpose = 'account_terms' ORDER BY id DESC LIMIT 1`, [acct.id])).rows[0]
        if (!last || last.wording_hash !== wordingHash('account_terms') || !last.granted) await ledger(acct.id, 'account_terms', true, req)
      }
      const session = newToken()
      await pool.query(`INSERT INTO account_sessions (token_hash, account_id, expires_at) VALUES ($1,$2, NOW() + INTERVAL '${SESSION_DAYS} days')`, [sha256(session), acct.id])
      setCookie(res, session, SESSION_DAYS * 86400)
      await audit(acct.id, 'login', req)
      res.json({ ok: true })
    } catch (err) {
      console.error('[account] verify error:', err.message)
      res.status(500).json({ error: 'server_error' })
    }
  })

  app.post('/api/auth/logout', noStore, needDb, csrf, async (req, res) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (token) await pool.query(`DELETE FROM account_sessions WHERE token_hash = $1`, [sha256(token)]).catch(() => {})
    setCookie(res, '', 0)
    res.json({ ok: true })
  })

  // Cheap, never an error for signed-out visitors (so the browser console stays clean on
  // pages that merely check whether you are signed in).
  app.get('/api/account/status', noStore, async (req, res) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
    if (!token || !pool) return res.json({ signedIn: false })
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM account_sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.deleted_at IS NULL`, [sha256(token)])
      res.json({ signedIn: rows.length > 0 })
    } catch { res.json({ signedIn: false }) }
  })

  // ── Account ──
  app.get('/api/account/me', noStore, needDb, requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (purpose) purpose, granted, wording_version, created_at FROM consent_ledger WHERE account_id = $1 ORDER BY purpose, id DESC`, [req.account.id])
      const consents = Object.fromEntries(rows.map(r => [r.purpose, { granted: r.granted, version: r.wording_version, at: r.created_at }]))
      res.json({
        email: req.account.email, createdAt: req.account.created_at, consents,
        features: { storage: storageReady, leadSharing },
        marketingWording: leadSharing ? CONSENT_WORDING.marketing_sharing : null,
        limits: { maxProfiles: MAX_SAVED },
      })
    } catch (err) { console.error('[account] me error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })

  const needStorage = (_req, res, next) => (storageReady ? next() : res.status(503).json({ error: 'storage_unavailable' }))
  const shape = r => ({ id: r.id, label: r.label, kind: r.kind, createdAt: r.created_at, updatedAt: r.updated_at })

  app.get('/api/account/profiles', noStore, needDb, requireAuth, needStorage, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM saved_profiles WHERE account_id = $1 ORDER BY updated_at DESC`, [req.account.id])
      const out = []
      for (const r of rows) {
        try { out.push({ ...shape(r), payload: decryptPayload(r.payload_enc, req.account.id, env) }) }
        catch (err) { console.error('[account] decrypt failed for a saved profile:', err.message) }
      }
      res.json({ profiles: out })
    } catch (err) { console.error('[account] list error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })

  const cleanLabel = l => String(l ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  const KINDS = new Set(['profile', 'scenario'])

  app.post('/api/account/profiles', noStore, needDb, csrf, requireAuth, needStorage, async (req, res) => {
    const { label, kind, payload } = req.body || {}
    const l = cleanLabel(label)
    if (!l) return res.status(400).json({ error: 'label_required' })
    if (!KINDS.has(kind)) return res.status(400).json({ error: 'bad_kind' })
    const bad = validatePayload(payload)
    if (bad) return res.status(400).json({ error: 'bad_payload', detail: bad })
    try {
      const n = (await pool.query(`SELECT COUNT(*)::int AS n FROM saved_profiles WHERE account_id = $1`, [req.account.id])).rows[0].n
      if (n >= MAX_SAVED) return res.status(409).json({ error: 'limit_reached', max: MAX_SAVED })
      const id = crypto.randomUUID()
      await pool.query(`INSERT INTO saved_profiles (id, account_id, label, kind, payload_enc) VALUES ($1,$2,$3,$4,$5)`,
        [id, req.account.id, l, kind, encryptPayload(payload, req.account.id, env)])
      await audit(req.account.id, 'profile_saved', req)
      res.status(201).json({ id })
    } catch (err) { console.error('[account] save error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })

  app.put('/api/account/profiles/:id', noStore, needDb, csrf, requireAuth, needStorage, async (req, res) => {
    const { label, payload } = req.body || {}
    const sets = []
    const vals = []
    if (label != null) { const l = cleanLabel(label); if (!l) return res.status(400).json({ error: 'label_required' }); vals.push(l); sets.push(`label = $${vals.length}`) }
    if (payload != null) {
      const bad = validatePayload(payload)
      if (bad) return res.status(400).json({ error: 'bad_payload', detail: bad })
      vals.push(encryptPayload(payload, req.account.id, env)); sets.push(`payload_enc = $${vals.length}`)
    }
    if (!sets.length) return res.status(400).json({ error: 'nothing_to_update' })
    try {
      vals.push(req.params.id, req.account.id)
      const r = await pool.query(`UPDATE saved_profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length - 1} AND account_id = $${vals.length} RETURNING id`, vals)
      if (!r.rows.length) return res.status(404).json({ error: 'not_found' })
      await audit(req.account.id, 'profile_updated', req)
      res.json({ ok: true })
    } catch (err) {
      if (err.code === '22P02') return res.status(404).json({ error: 'not_found' }) // malformed uuid
      console.error('[account] update error:', err.message); res.status(500).json({ error: 'server_error' })
    }
  })

  app.delete('/api/account/profiles/:id', noStore, needDb, csrf, requireAuth, async (req, res) => {
    try {
      const r = await pool.query(`DELETE FROM saved_profiles WHERE id = $1 AND account_id = $2 RETURNING id`, [req.params.id, req.account.id])
      if (!r.rows.length) return res.status(404).json({ error: 'not_found' })
      await audit(req.account.id, 'profile_deleted', req)
      res.json({ ok: true })
    } catch (err) {
      if (err.code === '22P02') return res.status(404).json({ error: 'not_found' })
      console.error('[account] delete-profile error:', err.message); res.status(500).json({ error: 'server_error' })
    }
  })

  // ── Consent ──
  app.post('/api/account/consent', noStore, needDb, csrf, requireAuth, async (req, res) => {
    const { purpose, granted } = req.body || {}
    if (purpose !== 'marketing_sharing' || typeof granted !== 'boolean') return res.status(400).json({ error: 'bad_request' })
    // Granting needs the feature switched on (so the wording the user sees is live and
    // matches the published policy); withdrawing is always allowed.
    if (granted && !leadSharing) return res.status(403).json({ error: 'not_available' })
    try {
      await ledger(req.account.id, purpose, granted, req)
      await audit(req.account.id, granted ? 'consent_granted' : 'consent_withdrawn', req)
      res.json({ ok: true, purpose, granted })
    } catch (err) { console.error('[account] consent error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })

  // ── Export and erase ──
  app.get('/api/account/export', noStore, needDb, requireAuth, async (req, res) => {
    try {
      const a = req.account
      const profiles = storageReady
        ? (await pool.query(`SELECT * FROM saved_profiles WHERE account_id = $1 ORDER BY created_at`, [a.id])).rows
            .map(r => { try { return { ...shape(r), payload: decryptPayload(r.payload_enc, a.id, env) } } catch { return { ...shape(r), payload: null } } })
        : []
      const consents = (await pool.query(`SELECT purpose, granted, wording_version, wording_hash, created_at FROM consent_ledger WHERE account_id = $1 ORDER BY id`, [a.id])).rows
      const log = (await pool.query(`SELECT event, created_at FROM account_audit_log WHERE account_id = $1 ORDER BY id`, [a.id])).rows
      await audit(a.id, 'export', req)
      res.set('Content-Disposition', 'attachment; filename="cash-pedal-account-data.json"')
      res.json({ exportedAt: new Date().toISOString(), account: { email: a.email, createdAt: a.created_at }, savedProfiles: profiles, consentHistory: consents, activityLog: log })
    } catch (err) { console.error('[account] export error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })

  app.post('/api/account/delete', noStore, needDb, csrf, requireAuth, async (req, res) => {
    if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'confirmation_required' })
    try {
      await eraseAccountByEmail(pool, req.account.email)
      setCookie(res, '', 0)
      res.json({ ok: true })
    } catch (err) { console.error('[account] erase error:', err.message); res.status(500).json({ error: 'server_error' }) }
  })
}
