import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
import crypto from 'crypto'
import Stripe from 'stripe'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// Trust Railway's single load-balancer hop so req.ip reflects the real client IP
// rather than the proxy's IP. This also prevents X-Forwarded-For spoofing at the
// left-most position since Railway appends (not prepends) the real client IP.
app.set('trust proxy', 1)

const PORT             = process.env.PORT || 3000
const APP_URL          = (process.env.APP_URL || 'https://cashpedal.io').replace(/\/$/, '')
const PRICE_ID         = process.env.STRIPE_PRICE_ID || ''
const ONE_TIME_PRICE_ID = process.env.STRIPE_ONE_TIME_PRICE_ID || ''
const WEBHOOK_SEC      = process.env.STRIPE_WEBHOOK_SECRET || ''

const MAX_DEVICES        = 2
const DEVICE_EXPIRY_DAYS = 30
const ACCESS_DAYS        = 60
// Emails that bypass all subscription and device checks — configure via env var
// PRO_USER_EMAILS=pro@cashpedal.io,owner@example.com
const PRO_USERS_SERVER = new Set(
  (process.env.PRO_USER_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
)

// ── Stripe ────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

// ── Stripe webhook must receive the raw body ──────────
// Register BEFORE express.json() so the body isn't pre-parsed
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).send('Payments not configured')

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SEC)
  } catch (err) {
    console.error('[webhook] sig fail:', err.message)
    return res.status(400).send('Webhook signature verification failed')
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const email = (session.customer_details?.email || '').toLowerCase()
        if (!email || !pool) break

        if (session.mode === 'subscription') {
          const sub = await stripe.subscriptions.retrieve(session.subscription)
          await pool.query(
            `INSERT INTO subscribers
               (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, purchase_type)
             VALUES ($1,$2,$3,'active',to_timestamp($4),'subscription')
             ON CONFLICT (email) DO UPDATE SET
               stripe_customer_id     = EXCLUDED.stripe_customer_id,
               stripe_subscription_id = EXCLUDED.stripe_subscription_id,
               subscription_status    = 'active',
               current_period_end     = to_timestamp($4),
               purchase_type          = 'subscription',
               updated_at             = NOW()`,
            [email, session.customer, session.subscription, sub.current_period_end]
          )
        } else if (session.mode === 'payment') {
          const accessUntil = new Date(Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000)
          await pool.query(
            `INSERT INTO subscribers
               (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, purchase_type)
             VALUES ($1,$2,NULL,'active',$3,'one_time')
             ON CONFLICT (email) DO UPDATE SET
               stripe_customer_id     = EXCLUDED.stripe_customer_id,
               stripe_subscription_id = NULL,
               subscription_status    = 'active',
               current_period_end     = $3,
               purchase_type          = 'one_time',
               updated_at             = NOW()`,
            [email, session.customer, accessUntil]
          )
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'canceled' ? 'inactive'
          : sub.status
        if (!pool) break
        await pool.query(
          `UPDATE subscribers
           SET subscription_status = $1,
               current_period_end  = to_timestamp($2),
               updated_at          = NOW()
           WHERE stripe_subscription_id = $3`,
          [status, sub.current_period_end, sub.id]
        )
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (!pool || !invoice.subscription) break
        await pool.query(
          `UPDATE subscribers SET subscription_status = 'past_due', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [invoice.subscription]
        )
        break
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('[webhook] processing error:', err.message)
    res.status(500).send('Webhook processing error')
  }
})

// ── Security headers ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", "'unsafe-inline'"],
      imgSrc:                  ["'self'", "data:"],
      fontSrc:                 ["'self'"],
      connectSrc:              ["'self'"],
      frameSrc:                ["'none'"],
      objectSrc:               ["'none'"],
      baseUri:                 ["'self'"],
      formAction:              ["'self'", "https://checkout.stripe.com"],
      frameAncestors:          ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // COEP is intentionally relaxed — the SPA loads no cross-origin subresources
  // that require explicit CORP headers, so strict COEP would break nothing but
  // is unnecessary overhead here.
  crossOriginEmbedderPolicy: false,
}))

// ── Rate limiting ─────────────────────────────────────
// General cap for all API routes (webhook is already handled above and won't reach this)
const apiLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many requests — please try again later.' },
  handler(req, res, next, options) {
    console.warn(`[rate-limit] ${req.method} ${req.path} blocked — IP: ${req.ip}`)
    res.status(options.statusCode).json(options.message)
  },
})

// Tighter cap for endpoints that mutate subscription / device state
const sensitiveLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            15,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many requests — please try again later.' },
  handler(req, res, next, options) {
    console.warn(`[rate-limit:sensitive] ${req.method} ${req.path} blocked — IP: ${req.ip}`)
    res.status(options.statusCode).json(options.message)
  },
})

// Very strict cap for subscription cancellation — destructive, irreversible
const cancelLimiter = rateLimit({
  windowMs:       60 * 60 * 1000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many cancellation attempts — please try again later.' },
  handler(req, res, next, options) {
    console.warn(`[rate-limit:cancel] cancellation blocked — IP: ${req.ip}, email: ${redactEmail(req.body?.email || '')}`)
    res.status(options.statusCode).json(options.message)
  },
})

app.use('/api/', apiLimiter)

// ── PII helpers ───────────────────────────────────────
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/

function isValidUUID(v)  { return typeof v === 'string' && UUID_RE.test(v) }
function isValidEmail(v) { return typeof v === 'string' && v.length <= 255 && EMAIL_RE.test(v) }
function clamp(str, max) { return typeof str === 'string' ? str.slice(0, max) : str }

// Canonical email form — lowercase, trimmed. Used everywhere email is stored or queried.
function normalizeEmail(raw) {
  return (typeof raw === 'string' ? raw : '').trim().toLowerCase()
}

// Strip HTML tags, ASCII control characters, and collapse whitespace in name fields.
// Keeps Unicode letters/punctuation so international names work correctly.
function sanitizeName(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')  // ASCII control chars
    .replace(/<[^>]*>/g, '')                  // HTML tags
    .replace(/\s+/g, ' ')                     // collapse whitespace
    .trim()
    .slice(0, 100)
}

// Anonymize IP before storing: mask the last IPv4 octet or last 64 IPv6 bits.
function anonymizeIp(ip) {
  if (!ip || ip === 'unknown') return 'unknown'
  if (ip.includes('.'))  return ip.replace(/\.\d+$/, '.0')        // 192.168.1.x → .0
  if (ip.includes(':'))  return ip.split(':').slice(0, 4).join(':') + '::/64'  // /64 prefix
  return 'unknown'
}

// Pseudonymize IP for device-tracking storage using a keyed HMAC so the value
// is unlinkable without the secret but still uniquely matchable per-IP.
// Requires IP_HMAC_SECRET env var; without it device tracking is bypassed (returns 'unknown').
function pseudonymizeIp(ip) {
  const secret = process.env.IP_HMAC_SECRET
  if (!secret || !ip || ip === 'unknown') return 'unknown'
  return crypto.createHmac('sha256', secret).update(ip).digest('hex')
}

// Redact email middle for audit logs — keeps domain and first char for debugging
// without writing full PII to log output.
function redactEmail(email) {
  if (!email || !email.includes('@')) return '[invalid]'
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}

// ── JSON body for all other routes ────────────────────
app.use(express.json())

// ── PostgreSQL ────────────────────────────────────────
const dbUrl = (process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL || '').trim()

const isInternalDb = dbUrl.includes('.railway.internal') || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl: isInternalDb
        ? false
        : { rejectUnauthorized: true },
    })
  : null

async function initTables() {
  if (!pool) return
  const client = await pool.connect()
  try {
    // ── Existing tables ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id                       SERIAL PRIMARY KEY,
        record_id                VARCHAR(36) UNIQUE NOT NULL,
        session_id               VARCHAR(36) NOT NULL,
        timestamp_utc            TIMESTAMP WITH TIME ZONE NOT NULL,
        terms_version            VARCHAR(20) NOT NULL,
        ip_address               VARCHAR(45),
        user_agent               TEXT,
        disclaimers_acknowledged BOOLEAN DEFAULT FALSE,
        liability_acknowledged   BOOLEAN DEFAULT FALSE,
        final_consent_given      BOOLEAN DEFAULT FALSE,
        consent_method           VARCHAR(50),
        terms_text_hash          VARCHAR(64),
        integrity_hash           VARCHAR(64),
        created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_timestamp
        ON consent_records(timestamp_utc)
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_data_collection (
        id                SERIAL PRIMARY KEY,
        record_id         VARCHAR(36) UNIQUE NOT NULL,
        session_id        VARCHAR(36) NOT NULL,
        timestamp_utc     TIMESTAMP WITH TIME ZONE NOT NULL,
        first_name        VARCHAR(100) NOT NULL,
        last_name         VARCHAR(100) NOT NULL,
        email             VARCHAR(255) NOT NULL,
        calculation_count INTEGER NOT NULL,
        ip_address        VARCHAR(45),
        user_agent        TEXT,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_data_timestamp
        ON user_data_collection(timestamp_utc)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_data_email
        ON user_data_collection(email)
    `)

    // ── Subscribers table (Stripe) ────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id                      SERIAL PRIMARY KEY,
        email                   VARCHAR(255) UNIQUE NOT NULL,
        stripe_customer_id      VARCHAR(100),
        stripe_subscription_id  VARCHAR(100),
        subscription_status     VARCHAR(50) DEFAULT 'active',
        current_period_end      TIMESTAMP WITH TIME ZONE,
        created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(20) DEFAULT 'subscription'`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_sub ON subscribers(stripe_subscription_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_customer ON subscribers(stripe_customer_id)`)

    // ── Device-session tracking ───────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriber_devices (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL,
        ip_address  VARCHAR(45)  NOT NULL,
        first_seen  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_seen   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (email, ip_address)
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sub_devices_email
        ON subscriber_devices(email)
    `)
    // Widen column for 64-char HMAC hashes (no-op if already wide enough)
    await client.query(`
      ALTER TABLE subscriber_devices
        ALTER COLUMN ip_address TYPE VARCHAR(64)
    `)
    // One-time migration: wipe any legacy rows that contain raw IP addresses.
    // HMAC hashes are always exactly 64 lowercase hex chars; raw IPs are shorter.
    // Affected subscribers re-register their device on next subscription check.
    await client.query(`
      DELETE FROM subscriber_devices
      WHERE ip_address != 'unknown'
        AND NOT ip_address ~ '^[0-9a-f]{64}$'
    `)

    // ── Data-retention enforcement ────────────────────
    // user_data_collection is marketing/analytics data — 365-day retention.
    // Consent records are legal evidence of agreement and are intentionally exempt
    // from automatic purging per GDPR Art. 17(3)(b).
    await client.query(`
      DELETE FROM user_data_collection
      WHERE created_at < NOW() - INTERVAL '365 days'
    `)
    // Stale device slots (no login in 30 days) are cleaned per-request already,
    // but also sweep on startup to catch orphaned rows from inactive subscribers.
    await client.query(`
      DELETE FROM subscriber_devices
      WHERE last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'
    `)
  } finally {
    client.release()
  }
}

// ── API: Save consent record ──────────────────────────
app.post('/api/consent', async (req, res) => {
  const {
    record_id, session_id, terms_version,
    disclaimers_acknowledged, liability_acknowledged, final_consent_given,
  } = req.body

  if (!isValidUUID(record_id) || !isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid record_id or session_id format' })
  }
  if (!terms_version || typeof terms_version !== 'string' || terms_version.length > 20) {
    return res.status(400).json({ success: false, error: 'Invalid terms_version' })
  }

  const rawIp        = req.ip || 'unknown'
  const storedIp     = anonymizeIp(rawIp)              // last octet masked for GDPR storage
  const user_agent   = clamp(req.headers['user-agent'] || 'unknown', 512)
  const timestamp_utc = new Date().toISOString()
  // Integrity hash uses the raw IP so the fingerprint stays unique per client,
  // even though we only store the anonymized form.
  const integrity_hash = crypto
    .createHash('sha256')
    .update(`${session_id}|${timestamp_utc}|${terms_version}|${rawIp}`)
    .digest('hex')

  if (!pool) {
    console.log('[consent] No DB configured — skipping save')
    return res.json({ success: true, record_id, storage: 'none' })
  }

  try {
    await pool.query(
      `INSERT INTO consent_records
         (record_id, session_id, timestamp_utc, terms_version, ip_address, user_agent,
          disclaimers_acknowledged, liability_acknowledged, final_consent_given,
          consent_method, integrity_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (record_id) DO NOTHING`,
      [
        record_id, session_id, timestamp_utc, terms_version, storedIp, user_agent,
        !!disclaimers_acknowledged, !!liability_acknowledged, !!final_consent_given,
        'explicit_checkbox_and_button', integrity_hash,
      ]
    )
    res.json({ success: true, record_id })
  } catch (err) {
    console.error('[consent] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Save user data ───────────────────────────────
app.post('/api/user-data', async (req, res) => {
  const { record_id, session_id, first_name, last_name, email, calculation_count } = req.body

  if (!isValidUUID(record_id) || !isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid record_id or session_id format' })
  }
  if (!first_name || !last_name || typeof first_name !== 'string' || typeof last_name !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' })
  }
  const count = parseInt(calculation_count, 10)
  if (isNaN(count) || count < 0 || count > 99999) {
    return res.status(400).json({ success: false, error: 'Invalid calculation_count' })
  }

  const storedIp      = anonymizeIp(req.ip || 'unknown')
  const user_agent    = clamp(req.headers['user-agent'] || 'unknown', 512)
  const timestamp_utc = new Date().toISOString()

  if (!pool) {
    console.log('[user-data] No DB configured — skipping save')
    return res.json({ success: true, record_id, storage: 'none' })
  }

  try {
    await pool.query(
      `INSERT INTO user_data_collection
         (record_id, session_id, timestamp_utc, first_name, last_name,
          email, calculation_count, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (record_id) DO NOTHING`,
      [
        record_id, session_id, timestamp_utc,
        sanitizeName(first_name), sanitizeName(last_name),
        normalizeEmail(email),
        count,
        storedIp, user_agent,
      ]
    )
    res.json({ success: true, record_id })
  } catch (err) {
    console.error('[user-data] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Create Stripe checkout session ───────────────
app.post('/api/create-checkout-session', sensitiveLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' })

  const { email, passType = 'one_time' } = req.body
  // Only allow relative paths that start with / to prevent URL manipulation
  const rawCancel = typeof req.body.cancelPath === 'string' ? req.body.cancelPath : ''
  const cancelPath = /^\/[^/]/.test(rawCancel) ? rawCancel : '/tco'

  const isSubscription = passType === 'subscription'
  const priceId = isSubscription ? PRICE_ID : ONE_TIME_PRICE_ID

  if (!priceId) return res.status(503).json({ error: 'Stripe price not configured' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer_email: email ? email.trim().toLowerCase() : undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}${cancelPath}`,
      metadata: { source: 'cashpedal' },
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Verify Stripe checkout session ───────────────
// Called on the success page to confirm payment and get email
app.get('/api/verify-session', async (req, res) => {
  if (!stripe) return res.json({ valid: false, reason: 'payments_not_configured' })

  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'session_id required' })

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    })
    if (session.payment_status !== 'paid') {
      return res.json({ valid: false, reason: 'not_paid' })
    }

    const email = (session.customer_details?.email || '').toLowerCase()

    if (session.mode === 'payment') {
      const accessUntil = new Date(Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000)
      if (email && pool) {
        await pool.query(
          `INSERT INTO subscribers
             (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, purchase_type)
           VALUES ($1,$2,NULL,'active',$3,'one_time')
           ON CONFLICT (email) DO UPDATE SET
             stripe_customer_id     = EXCLUDED.stripe_customer_id,
             stripe_subscription_id = NULL,
             subscription_status    = 'active',
             current_period_end     = $3,
             purchase_type          = 'one_time',
             updated_at             = NOW()`,
          [email, session.customer, accessUntil]
        )
      }
      return res.json({ valid: true, email, expires: accessUntil.toISOString(), purchaseType: 'one_time' })
    }

    const sub = session.subscription

    if (email && pool && sub) {
      const periodEnd = typeof sub === 'object' ? sub.current_period_end : null
      await pool.query(
        `INSERT INTO subscribers
           (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, purchase_type)
         VALUES ($1,$2,$3,'active', ${periodEnd ? 'to_timestamp($4)' : 'NULL'},'subscription')
         ON CONFLICT (email) DO UPDATE SET
           stripe_customer_id     = EXCLUDED.stripe_customer_id,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           subscription_status    = 'active',
           current_period_end     = ${periodEnd ? 'to_timestamp($4)' : 'NULL'},
           purchase_type          = 'subscription',
           updated_at             = NOW()`,
        periodEnd
          ? [email, session.customer, typeof sub === 'object' ? sub.id : sub, periodEnd]
          : [email, session.customer, typeof sub === 'object' ? sub.id : sub]
      )
    }

    const expiresAt = (typeof sub === 'object' && sub.current_period_end)
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    res.json({ valid: true, email, expires: expiresAt, purchaseType: 'subscription' })
  } catch (err) {
    console.error('[verify-session] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Check subscription status by email ───────────
// POST (not GET) so the email address never appears in server access logs,
// browser history, CDN logs, or Referer headers.
app.post('/api/subscription-status', async (req, res) => {
  const email = normalizeEmail((req.body && req.body.email) || '')
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' })
  if (!pool)  return res.json({ active: false, reason: 'db_not_configured' })

  // Pro users bypass all checks
  if (PRO_USERS_SERVER.has(email)) {
    return res.json({ active: true, status: 'active', expires: null })
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, current_period_end, purchase_type
       FROM subscribers WHERE email = $1`,
      [email]
    )
    if (result.rows.length === 0) return res.json({ active: false })

    const { subscription_status, current_period_end, purchase_type } = result.rows[0]
    const active = (subscription_status === 'active' || subscription_status === 'canceling') &&
      (!current_period_end || new Date(current_period_end) > new Date())

    if (!active) {
      // Return the same shape as "email not found" — callers must not be able
      // to distinguish "unknown email" from "email exists but inactive".
      return res.json({ active: false })
    }

    // ── Device-limit enforcement ──────────────────────
    // Raw IP is used only in-process for HMAC computation and never persisted.
    const pseudoIp = pseudonymizeIp(req.ip || 'unknown')

    // Expire stale devices (not seen in DEVICE_EXPIRY_DAYS days)
    await pool.query(
      `DELETE FROM subscriber_devices
       WHERE email = $1
         AND last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'`,
      [email]
    )

    if (pseudoIp === 'unknown') {
      // IP_HMAC_SECRET not configured — skip device enforcement, allow access
    } else {
      // Check if this IP is already registered for this subscriber
      const existing = await pool.query(
        `SELECT id FROM subscriber_devices WHERE email = $1 AND ip_address = $2`,
        [email, pseudoIp]
      )

      if (existing.rows.length > 0) {
        // Known device — refresh last_seen and allow
        await pool.query(
          `UPDATE subscriber_devices SET last_seen = NOW()
           WHERE email = $1 AND ip_address = $2`,
          [email, pseudoIp]
        )
      } else {
        // New device — count how many active devices exist
        const countResult = await pool.query(
          `SELECT COUNT(*) AS cnt FROM subscriber_devices WHERE email = $1`,
          [email]
        )
        const deviceCount = parseInt(countResult.rows[0].cnt, 10)

        if (deviceCount >= MAX_DEVICES) {
          console.log(`[device-limit] ${redactEmail(email)} blocked — ${deviceCount} devices registered`)
          return res.json({
            active:  false,
            reason:  'device_limit',
            limit:   MAX_DEVICES,
            current: deviceCount,
          })
        }

        // Slot available — register new device
        await pool.query(
          `INSERT INTO subscriber_devices (email, ip_address)
           VALUES ($1, $2)
           ON CONFLICT (email, ip_address) DO UPDATE SET last_seen = NOW()`,
          [email, pseudoIp]
        )
      }
    }

    res.json({ active: true, status: subscription_status, expires: current_period_end, purchaseType: purchase_type })
  } catch (err) {
    console.error('[subscription-status] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Reset all registered devices for an email ────
app.post('/api/reset-devices', sensitiveLimiter, async (req, res) => {
  const email = normalizeEmail((req.body && req.body.email) || '')
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' })
  if (!pool)  return res.status(503).json({ error: 'DB not configured' })
  console.log(`[reset-devices] attempt — email: ${redactEmail(email)}, IP: ${req.ip}`)

  // Only allow reset for confirmed active subscribers
  try {
    const result = await pool.query(
      `SELECT subscription_status, current_period_end
       FROM subscribers WHERE email = $1`,
      [email]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found for this email' })
    }
    const { subscription_status, current_period_end } = result.rows[0]
    const active = (subscription_status === 'active' || subscription_status === 'canceling') &&
      (!current_period_end || new Date(current_period_end) > new Date())
    if (!active) {
      return res.status(403).json({ error: 'No active subscription found for this email' })
    }

    await pool.query(`DELETE FROM subscriber_devices WHERE email = $1`, [email])
    console.log(`[reset-devices] cleared devices for ${redactEmail(email)}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[reset-devices] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Cancel subscription ──────────────────────────
// Uses the stricter cancelLimiter (5/hr) on top of the general apiLimiter (100/15min)
app.post('/api/cancel-subscription', cancelLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' })

  const { email } = req.body
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' })
  if (!pool)  return res.status(503).json({ error: 'DB not configured' })

  const normalizedEmail = normalizeEmail(email)
  console.log(`[cancel-subscription] attempt — email: ${redactEmail(normalizedEmail)}, IP: ${req.ip}`)

  try {
    const result = await pool.query(
      `SELECT stripe_subscription_id, purchase_type FROM subscribers
       WHERE email = $1 AND subscription_status = 'active'`,
      [normalizedEmail]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found for this email' })
    }

    const { stripe_subscription_id, purchase_type } = result.rows[0]

    if (purchase_type === 'one_time') {
      return res.status(400).json({ error: 'One-time passes cannot be canceled — access expires automatically.' })
    }
    await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    })
    await pool.query(
      `UPDATE subscribers SET subscription_status = 'canceling', updated_at = NOW()
       WHERE email = $1`,
      [normalizedEmail]
    )

    // Get the period end so we can tell the user when access ends
    const sub = await stripe.subscriptions.retrieve(stripe_subscription_id)
    const endsAt = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    res.json({
      success: true,
      message: 'Your subscription will cancel at the end of the billing period.',
      access_until: endsAt,
    })
  } catch (err) {
    console.error('[cancel-subscription] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: GDPR / CCPA right-to-erasure ────────────────
// Deletes all user-submitted profile data (name, email, calculation count).
// Consent records are retained — they are legal proof of agreement and are
// exempt from erasure under GDPR Art. 17(3)(b). Stripe payment records are
// also retained for financial dispute resolution; erasure requests for those
// must be submitted directly to Stripe.
app.post('/api/delete-my-data', sensitiveLimiter, async (req, res) => {
  const { email } = req.body
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' })
  if (!pool) return res.status(503).json({ error: 'DB not configured' })

  const normalizedEmail = normalizeEmail(email)

  try {
    const subResult = await pool.query(
      `SELECT subscription_status FROM subscribers WHERE email = $1`,
      [normalizedEmail]
    )
    const isActive = subResult.rows.length > 0 &&
      ['active', 'canceling'].includes(subResult.rows[0].subscription_status)

    if (isActive) {
      return res.status(409).json({
        error: 'Cannot erase data while a subscription is active. Please cancel your subscription first.',
      })
    }

    // Remove user-provided profile data
    await pool.query(`DELETE FROM user_data_collection WHERE email = $1`, [normalizedEmail])
    // Remove device registrations — no longer needed once subscription is gone
    await pool.query(`DELETE FROM subscriber_devices WHERE email = $1`, [normalizedEmail])
    // Soft-delete the subscriber row so Stripe audit trail is preserved
    // but the email is no longer queryable for access checks.
    await pool.query(
      `UPDATE subscribers SET
         subscription_status = 'erased',
         email               = $2,
         updated_at          = NOW()
       WHERE email = $1`,
      [normalizedEmail, crypto.createHash('sha256').update(normalizedEmail).digest('hex')]
    )

    console.log(`[delete-my-data] erasure completed — email: ${redactEmail(normalizedEmail)}, IP: ${req.ip}`)
    // Return the same shape whether or not the email existed to prevent enumeration.
    res.json({ success: true, message: 'Your data has been erased.' })
  } catch (err) {
    console.error('[delete-my-data] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Serve Vite build ──────────────────────────────────
app.use(express.static(join(__dirname, 'dist')))
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// ── Daily data-retention sweep ────────────────────────
// initTables() handles the startup sweep; this catches long-running Railway
// instances that haven't restarted in days or weeks.
async function runRetentionSweep() {
  if (!pool) return
  try {
    await pool.query(`DELETE FROM user_data_collection WHERE created_at < NOW() - INTERVAL '365 days'`)
    await pool.query(`DELETE FROM subscriber_devices WHERE last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'`)
  } catch (err) {
    console.error('[retention] daily sweep error:', err.message)
  }
}

// ── Start ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Cash Pedal server running on port ${PORT}`)
  if (pool) {
    try {
      await initTables()
      console.log('Database tables ready')
    } catch (err) {
      console.error('Database init error:', err.message)
    }
  } else {
    console.log('No DATABASE_URL configured — running without DB')
  }
  if (!stripe) console.log('No STRIPE_SECRET_KEY configured — payments disabled')
  if (!process.env.IP_HMAC_SECRET) console.warn('[privacy] IP_HMAC_SECRET not set — device tracking disabled; set this env var on Railway')
})

setInterval(runRetentionSweep, 24 * 60 * 60 * 1000)
