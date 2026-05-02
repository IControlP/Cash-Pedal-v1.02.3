import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
import crypto from 'crypto'
import Stripe from 'stripe'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

const PORT        = process.env.PORT || 3000
const APP_URL     = (process.env.APP_URL || 'https://cashpedal.io').replace(/\/$/, '')
const PRICE_ID    = process.env.STRIPE_PRICE_ID || ''
const WEBHOOK_SEC = process.env.STRIPE_WEBHOOK_SECRET || ''

const MAX_DEVICES        = 2
const DEVICE_EXPIRY_DAYS = 30
// Emails that bypass all subscription and device checks
const PRO_USERS_SERVER   = new Set(['pro@cashpedal.io', 'noah@cashpedal.io'])

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

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
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break
        const email = (session.customer_details?.email || '').toLowerCase()
        if (!email || !pool) break
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        await pool.query(
          `INSERT INTO subscribers
             (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end)
           VALUES ($1,$2,$3,'active',to_timestamp($4))
           ON CONFLICT (email) DO UPDATE SET
             stripe_customer_id     = EXCLUDED.stripe_customer_id,
             stripe_subscription_id = EXCLUDED.stripe_subscription_id,
             subscription_status    = 'active',
             current_period_end     = to_timestamp($4),
             updated_at             = NOW()`,
          [email, session.customer, session.subscription, sub.current_period_end]
        )
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

// ── JSON body for all other routes ────────────────────
app.use(express.json())

// ── PostgreSQL ────────────────────────────────────────
const dbUrl = (process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL || '').trim()

const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('.railway.internal') || dbUrl.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
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

    // ── Blog posts ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id         SERIAL PRIMARY KEY,
        slug       TEXT UNIQUE NOT NULL,
        title      TEXT NOT NULL,
        date       TEXT NOT NULL,
        excerpt    TEXT NOT NULL,
        tags       TEXT[] DEFAULT '{}',
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts(date DESC)
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

  if (!record_id || !session_id || !terms_version) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const ip = getClientIp(req)
  const user_agent     = req.headers['user-agent'] || 'unknown'
  const timestamp_utc  = new Date().toISOString()
  const integrity_hash = crypto
    .createHash('sha256')
    .update(`${session_id}|${timestamp_utc}|${terms_version}|${ip}`)
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
        record_id, session_id, timestamp_utc, terms_version, ip, user_agent,
        !!disclaimers_acknowledged, !!liability_acknowledged, !!final_consent_given,
        'explicit_checkbox_and_button', integrity_hash,
      ]
    )
    res.json({ success: true, record_id })
  } catch (err) {
    console.error('[consent] DB error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── API: Save user data ───────────────────────────────
app.post('/api/user-data', async (req, res) => {
  const { record_id, session_id, first_name, last_name, email, calculation_count } = req.body

  if (!record_id || !session_id || !first_name || !last_name || !email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const ip = getClientIp(req)
  const user_agent    = req.headers['user-agent'] || 'unknown'
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
        first_name.trim(), last_name.trim(),
        email.trim().toLowerCase(),
        Number(calculation_count) || 0,
        ip, user_agent,
      ]
    )
    res.json({ success: true, record_id })
  } catch (err) {
    console.error('[user-data] DB error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── API: Create Stripe checkout session ───────────────
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' })
  if (!PRICE_ID) return res.status(503).json({ error: 'Stripe price not configured' })

  const { email, cancelPath = '/tco' } = req.body

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email ? email.trim().toLowerCase() : undefined,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}${cancelPath}`,
      metadata: { source: 'cashpedal' },
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] error:', err.message)
    res.status(500).json({ error: err.message })
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
    const sub   = session.subscription

    // Upsert subscriber in case webhook hasn't fired yet
    if (email && pool && sub) {
      const periodEnd = typeof sub === 'object' ? sub.current_period_end : null
      await pool.query(
        `INSERT INTO subscribers
           (email, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end)
         VALUES ($1,$2,$3,'active', ${periodEnd ? 'to_timestamp($4)' : 'NULL'})
         ON CONFLICT (email) DO UPDATE SET
           stripe_customer_id     = EXCLUDED.stripe_customer_id,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           subscription_status    = 'active',
           current_period_end     = ${periodEnd ? 'to_timestamp($4)' : 'NULL'},
           updated_at             = NOW()`,
        periodEnd
          ? [email, session.customer, typeof sub === 'object' ? sub.id : sub, periodEnd]
          : [email, session.customer, typeof sub === 'object' ? sub.id : sub]
      )
    }

    const expiresAt = (typeof sub === 'object' && sub.current_period_end)
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    res.json({ valid: true, email, expires: expiresAt })
  } catch (err) {
    console.error('[verify-session] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Check subscription status by email ───────────
app.get('/api/subscription-status', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email required' })
  if (!pool)  return res.json({ active: false, reason: 'db_not_configured' })

  // Pro users bypass all checks
  if (PRO_USERS_SERVER.has(email)) {
    return res.json({ active: true, status: 'active', expires: null })
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, current_period_end
       FROM subscribers WHERE email = $1`,
      [email]
    )
    if (result.rows.length === 0) return res.json({ active: false })

    const { subscription_status, current_period_end } = result.rows[0]
    const active = (subscription_status === 'active' || subscription_status === 'canceling') &&
      (!current_period_end || new Date(current_period_end) > new Date())

    if (!active) {
      return res.json({ active: false, status: subscription_status, expires: current_period_end })
    }

    // ── Device-limit enforcement ──────────────────────
    const ip = getClientIp(req)

    // Expire stale devices (not seen in DEVICE_EXPIRY_DAYS days)
    await pool.query(
      `DELETE FROM subscriber_devices
       WHERE email = $1
         AND last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'`,
      [email]
    )

    // Check if this IP is already registered for this subscriber
    const existing = await pool.query(
      `SELECT id FROM subscriber_devices WHERE email = $1 AND ip_address = $2`,
      [email, ip]
    )

    if (existing.rows.length > 0) {
      // Known device — refresh last_seen and allow
      await pool.query(
        `UPDATE subscriber_devices SET last_seen = NOW()
         WHERE email = $1 AND ip_address = $2`,
        [email, ip]
      )
    } else {
      // New device — count how many active devices exist
      const countResult = await pool.query(
        `SELECT COUNT(*) AS cnt FROM subscriber_devices WHERE email = $1`,
        [email]
      )
      const deviceCount = parseInt(countResult.rows[0].cnt, 10)

      if (deviceCount >= MAX_DEVICES) {
        console.log(`[device-limit] ${email} blocked — ${deviceCount} devices registered`)
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
        [email, ip]
      )
    }

    res.json({ active: true, status: subscription_status, expires: current_period_end })
  } catch (err) {
    console.error('[subscription-status] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Reset all registered devices for an email ────
app.post('/api/reset-devices', async (req, res) => {
  const email = ((req.body && req.body.email) || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email required' })
  if (!pool)  return res.status(503).json({ error: 'DB not configured' })

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
    console.log(`[reset-devices] cleared devices for ${email}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[reset-devices] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Cancel subscription ──────────────────────────
app.post('/api/cancel-subscription', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' })

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  if (!pool)  return res.status(503).json({ error: 'DB not configured' })

  try {
    const result = await pool.query(
      `SELECT stripe_subscription_id FROM subscribers
       WHERE email = $1 AND subscription_status = 'active'`,
      [email.trim().toLowerCase()]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found for this email' })
    }

    const { stripe_subscription_id } = result.rows[0]
    await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    })
    await pool.query(
      `UPDATE subscribers SET subscription_status = 'canceling', updated_at = NOW()
       WHERE email = $1`,
      [email.trim().toLowerCase()]
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
    res.status(500).json({ error: err.message })
  }
})

// ── Admin auth middleware ─────────────────────────────
function requireAdmin(req, res, next) {
  const adminPw = process.env.ADMIN_PASSWORD
  if (!adminPw) return res.status(503).json({ error: 'ADMIN_PASSWORD not configured' })
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${adminPw}`) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// ── API: Admin login ──────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const adminPw = process.env.ADMIN_PASSWORD
  if (!adminPw) return res.status(503).json({ error: 'ADMIN_PASSWORD not configured' })
  const { password } = req.body
  if (password === adminPw) {
    res.json({ ok: true, token: adminPw })
  } else {
    res.status(401).json({ error: 'Wrong password' })
  }
})

// ── API: Public — list posts ──────────────────────────
app.get('/api/posts', async (req, res) => {
  if (!pool) return res.json([])
  try {
    const result = await pool.query(
      `SELECT slug, title, date, excerpt, tags
       FROM blog_posts
       ORDER BY date DESC, created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[posts] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Public — single post ─────────────────────────
app.get('/api/posts/:slug', async (req, res) => {
  if (!pool) return res.status(404).json({ error: 'Not found' })
  try {
    const result = await pool.query(
      `SELECT slug, title, date, excerpt, tags, content FROM blog_posts WHERE slug = $1`,
      [req.params.slug]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('[post] error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Admin — create post ──────────────────────────
app.post('/api/admin/posts', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' })
  const { slug, title, date, excerpt, tags, content } = req.body
  if (!slug || !title || !date || !excerpt || !content) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO blog_posts (slug, title, date, excerpt, tags, content)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [slug.trim(), title.trim(), date, excerpt.trim(), tags || [], content]
    )
    res.json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' })
    console.error('[admin/posts] create error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Admin — update post ──────────────────────────
app.put('/api/admin/posts/:slug', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' })
  const { slug: newSlug, title, date, excerpt, tags, content } = req.body
  try {
    const result = await pool.query(
      `UPDATE blog_posts
       SET slug=$1, title=$2, date=$3, excerpt=$4, tags=$5, content=$6, updated_at=NOW()
       WHERE slug=$7
       RETURNING *`,
      [newSlug || req.params.slug, title, date, excerpt, tags || [], content, req.params.slug]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('[admin/posts] update error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── API: Admin — delete post ──────────────────────────
app.delete('/api/admin/posts/:slug', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB not configured' })
  try {
    await pool.query(`DELETE FROM blog_posts WHERE slug = $1`, [req.params.slug])
    res.json({ ok: true })
  } catch (err) {
    console.error('[admin/posts] delete error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Serve Vite build ──────────────────────────────────
app.use(express.static(join(__dirname, 'dist')))
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

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
})
