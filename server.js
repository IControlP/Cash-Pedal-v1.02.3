import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pg from 'pg'
import crypto from 'crypto'
import Stripe from 'stripe'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// Vehicle database — loaded once at boot. Used to validate search-tracking input
// so the market-analytics tables only ever store real make/model combinations.
let VEHICLES = {}
try {
  VEHICLES = JSON.parse(readFileSync(join(__dirname, 'src', 'data', 'vehicles.json'), 'utf8'))
} catch (err) {
  console.warn('[market] could not load vehicles.json — search validation will reject all input:', err.message)
}

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

// Email-funnel bonus credits — granted once per email in exchange for name + email
const BONUS_CREDITS = 5

// Allowlists for the first-party usage tracker
const USAGE_FEATURES = new Set([
  'visit_tco', 'visit_compare', 'visit_salary', 'visit_checklist',
  'tco_detailed', 'checklist_generated', 'salary_pro', 'compare_unlock',
])
const USAGE_GATES = new Set(['free', 'bonus', 'subscribed'])

// Valid US state / territory codes for the market-analytics search tracker.
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

// Rolling window (days) used for all public market-analytics aggregations.
const MARKET_WINDOW_DAYS = 90
// Retention window for raw search rows (pseudonymous — keyed only by session UUID).
const MARKET_RETENTION_DAYS = 365
// Admin key that unlocks the full, sellable per-state insights export.
const INSIGHTS_API_KEY = (process.env.INSIGHTS_API_KEY || '').trim()
// Emails that bypass all subscription and device checks — configure via env var
// PRO_USER_EMAILS=pro@cashpedal.io,owner@example.com
const PRO_USERS_SERVER = new Set(
  (process.env.PRO_USER_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
)

// Promo codes that grant pro access — configure via env var
// PROMO_CODES=Sumo2026!,AnotherCode
const PROMO_CODES = new Set(
  (process.env.PROMO_CODES || '')
    .split(',')
    .map(c => c.trim())
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
          queuePurchaseEmail(email, session.id, 'subscription', null)
          queueCrmPurchase(email, session.id, 'subscription', session.amount_total)
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
          queuePurchaseEmail(email, session.id, 'one_time', accessUntil)
          queueCrmPurchase(email, session.id, 'one_time', session.amount_total)
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
      // Analytics: Microsoft Clarity, Google Analytics (gtag), Meta Pixel.
      // The three inline bootstrap snippets in index.html are pinned by their
      // SHA-256 hashes (regenerate these if those snippets are ever edited).
      // Each provider's loader injects a further <script> from its own origin,
      // so those origins are allowlisted here too.
      scriptSrc:               [
        "'self'",
        "'sha256-VIXIVMTLdCz6TviHvNWyf45Q9138C/47GZTs0fP77JQ='", // Clarity bootstrap
        "'sha256-oz2xh8YLXn81ZM73Eaw3s5E4PZb/rBg4LDYQpzWrDXw='", // gtag config
        "'sha256-irTpNMUQ0ne6m1/a5pIj3szjcqIgskBNLca5j2XaBxk='", // Meta Pixel
        "https://*.clarity.ms", // tag host + the collector script it injects (scripts.clarity.ms)
        "https://www.googletagmanager.com",
        "https://connect.facebook.net",
      ],
      styleSrc:                ["'self'", "'unsafe-inline'"],
      imgSrc:                  [
        "'self'",
        "data:",
        "https://*.clarity.ms",
        "https://c.bing.com",
        "https://www.google-analytics.com",
        "https://stats.g.doubleclick.net", // GA4 Google Signals / Ads beacons
        "https://www.facebook.com",
      ],
      fontSrc:                 ["'self'"],
      connectSrc:              [
        "'self'",
        "https://*.clarity.ms",
        "https://c.bing.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
        "https://www.googletagmanager.com",
        "https://stats.g.doubleclick.net", // GA4 Google Signals / Ads beacons
        "https://*.facebook.com",
      ],
      // Clarity's session-replay processing runs in a blob: web worker; without
      // this it falls back to script-src (no blob:) and recordings are dropped.
      workerSrc:               ["'self'", "blob:"],
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
  permissionsPolicy: {
    features: {
      camera:      "'none'",
      microphone:  "'none'",
      geolocation: "'none'",
      payment:     "'self'",
    },
  },
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
    console.warn(`[rate-limit] ${req.method} ${req.path} blocked — IP: ${anonymizeIp(req.ip)}`)
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
    console.warn(`[rate-limit:sensitive] ${req.method} ${req.path} blocked — IP: ${anonymizeIp(req.ip)}`)
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
    console.warn(`[rate-limit:cancel] cancellation blocked — IP: ${anonymizeIp(req.ip)}, email: ${redactEmail(req.body?.email || '')}`)
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

// ── Transactional email (Resend) ──────────────────────
// Thank-you automations: a one-time welcome email when a visitor shares their
// email (tips opt-in or bonus-credit funnel) and a purchase confirmation when
// a checkout completes. Sends go through Resend's HTTPS API — no SDK needed.
// Without RESEND_API_KEY every send is a logged no-op, matching how the rest
// of the server degrades when an integration isn't configured.
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim()
const EMAIL_FROM     = (process.env.EMAIL_FROM || 'Cash Pedal <hello@cashpedal.io>').trim()

// Branded wrapper shared by all transactional emails. Inline styles only —
// email clients strip <style> blocks.
function emailLayout(bodyHtml) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background-color:#111111;padding:24px 32px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;">Cash <span style="color:rgb(200,255,0);">Pedal</span></span>
        </td></tr>
        <tr><td style="padding:32px;color:#27272a;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px;line-height:1.5;">
          Cash Pedal &middot; <a href="${APP_URL}" style="color:#a1a1aa;">cashpedal.io</a><br>
          You're receiving this one-time email because of your activity on cashpedal.io. We don't send marketing emails from this address.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function welcomeEmailContent(firstName) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return {
    subject: 'Thanks for trying Cash Pedal',
    text: `${greeting}\n\nThanks for trying Cash Pedal! We built it to take the guesswork out of car buying.\n\nHere's what you can do with it:\n- True Cost to Own calculator — see the real monthly cost of any vehicle\n- Side-by-side comparison — line up to 5 vehicles\n- Salary calculator — know what you can actually afford (20/4/10 rule)\n- Used-car checklist — a mileage-based maintenance audit\n\nJump back in any time: ${APP_URL}\n\nHappy car hunting,\nThe Cash Pedal team`,
    html: emailLayout(`
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">Thanks for trying <strong>Cash Pedal</strong>! We built it to take the guesswork out of car buying.</p>
      <p style="margin:0 0 8px;">Here's what you can do with it:</p>
      <ul style="margin:0 0 20px;padding-left:20px;">
        <li style="margin-bottom:6px;"><strong>True Cost to Own calculator</strong> — see the real monthly cost of any vehicle</li>
        <li style="margin-bottom:6px;"><strong>Side-by-side comparison</strong> — line up to 5 vehicles</li>
        <li style="margin-bottom:6px;"><strong>Salary calculator</strong> — know what you can actually afford (20/4/10 rule)</li>
        <li><strong>Used-car checklist</strong> — a mileage-based maintenance audit</li>
      </ul>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background-color:rgb(200,255,0);">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 24px;color:#111111;font-weight:700;text-decoration:none;">Open Cash Pedal</a>
      </td></tr></table>
      <p style="margin:20px 0 0;">Happy car hunting,<br>The Cash Pedal team</p>
    `),
  }
}

function purchaseEmailContent(purchaseType, accessUntil) {
  const isSub = purchaseType === 'subscription'
  const untilDate = accessUntil
    ? new Date(accessUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const accessLine = isSub
    ? 'Your Pro subscription is now active and renews automatically. You can manage or cancel it any time on the subscribe page.'
    : `Your ${ACCESS_DAYS}-day Pro pass is now active${untilDate ? ` and runs through ${untilDate}` : ''}. No auto-renewal — access simply expires on its own.`
  return {
    subject: 'Thanks for your purchase — Pro access is live',
    text: `Thanks for buying Cash Pedal Pro!\n\n${accessLine}\n\nPro unlocks detailed TCO breakdowns, multi-vehicle comparisons, salary insights, and more — on up to ${MAX_DEVICES} devices.\n\nGet started: ${APP_URL}\nManage your access: ${APP_URL}/subscribe\n\nThanks for the support,\nThe Cash Pedal team`,
    html: emailLayout(`
      <p style="margin:0 0 16px;">Thanks for buying <strong>Cash Pedal Pro</strong>!</p>
      <p style="margin:0 0 16px;">${accessLine}</p>
      <p style="margin:0 0 20px;">Pro unlocks detailed TCO breakdowns, multi-vehicle comparisons, salary insights, and more — on up to ${MAX_DEVICES} devices.</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background-color:rgb(200,255,0);">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 24px;color:#111111;font-weight:700;text-decoration:none;">Start using Pro</a>
      </td></tr></table>
      <p style="margin:20px 0 0;">Manage your access any time at <a href="${APP_URL}/subscribe" style="color:#27272a;">cashpedal.io/subscribe</a>.</p>
      <p style="margin:16px 0 0;">Thanks for the support,<br>The Cash Pedal team</p>
    `),
  }
}

async function deliverEmail(to, { subject, text, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text, html }),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Resend ${resp.status}: ${body.slice(0, 200)}`)
  }
}

// Idempotency gate shared by the email and CRM automations. The automation_log
// unique constraint is the gate: the row is claimed before the side effect runs
// so concurrent triggers (e.g. the Stripe webhook and /api/verify-session racing
// on the same checkout) can't double-fire. If the provider call fails the claim
// is released so a later trigger can retry.
async function claimAutomation(eventType, email, reference) {
  if (!pool) return true
  const claim = await pool.query(
    `INSERT INTO automation_log (email, event_type, reference)
     VALUES ($1,$2,$3)
     ON CONFLICT (email, event_type, reference) DO NOTHING
     RETURNING id`,
    [email, eventType, reference]
  )
  return claim.rows.length > 0
}

async function releaseAutomation(eventType, email, reference) {
  if (!pool) return
  await pool.query(
    `DELETE FROM automation_log WHERE email = $1 AND event_type = $2 AND reference = $3`,
    [email, eventType, reference]
  ).catch(() => {})
}

// Idempotent send. Never throws — callers fire-and-forget without awaiting.
async function sendTransactionalEmail(emailType, email, reference, content) {
  if (!RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping ${emailType} for ${redactEmail(email)}`)
    return
  }
  try {
    if (!(await claimAutomation(emailType, email, reference))) return // already sent (or in flight)
    try {
      await deliverEmail(email, content)
      console.log(`[email] sent ${emailType} to ${redactEmail(email)}`)
    } catch (err) {
      await releaseAutomation(emailType, email, reference)
      throw err
    }
  } catch (err) {
    console.error(`[email] ${emailType} failed for ${redactEmail(email)}:`, err.message)
  }
}

// Automation 1: thank-you for trying the tool, once per email address ever,
// regardless of which funnel (tips opt-in or bonus-credit unlock) captured it.
function queueWelcomeEmail(email, firstName) {
  sendTransactionalEmail('welcome', email, email, welcomeEmailContent(firstName))
}

// Automation 2: thank-you for purchasing, once per checkout session. Keyed on
// the Stripe session ID so a repeat one-time purchase still gets its own email.
function queuePurchaseEmail(email, checkoutSessionId, purchaseType, accessUntil) {
  sendTransactionalEmail('purchase_thanks', email, checkoutSessionId, purchaseEmailContent(purchaseType, accessUntil))
}

// ── HubSpot CRM sync ──────────────────────────────────
// Mirrors leads and purchases into HubSpot's free CRM so engagement and
// opportunities can be worked from a real pipeline. Same conventions as the
// email module: plain HTTPS API (no SDK), fire-and-forget, logged no-op when
// HUBSPOT_ACCESS_TOKEN isn't configured. The token is a HubSpot private-app
// token with crm.objects.contacts and crm.objects.deals read/write scopes.
const HUBSPOT_TOKEN = (process.env.HUBSPOT_ACCESS_TOKEN || '').trim()

async function hubspotRequest(path, body) {
  const resp = await fetch(`https://api.hubapi.com${path}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(`HubSpot ${resp.status}: ${String(data.message || '').slice(0, 200)}`)
  return data
}

// Create-or-update a contact keyed by email. Returns the HubSpot contact id.
async function upsertHubSpotContact(email, properties) {
  const res = await hubspotRequest('/crm/v3/objects/contacts/batch/upsert', {
    inputs: [{ idProperty: 'email', id: email, properties }],
  })
  return res.results?.[0]?.id
}

// CRM automation 1: a shared email becomes (or refreshes) a HubSpot contact.
// Upserts are idempotent so no automation_log claim is needed here.
function queueCrmLead(email, firstName, lastName, source) {
  if (!HUBSPOT_TOKEN) return
  ;(async () => {
    const props = { lifecyclestage: 'lead' }
    if (firstName) props.firstname    = firstName
    if (lastName)  props.lastname     = lastName
    if (source)    props.lead_source  = source
    props.signup_date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    try {
      await upsertHubSpotContact(email, props)
    } catch (err) {
      // HubSpot rejects backwards lifecycle moves (an existing customer coming
      // back through a lead funnel) — retry without the stage so name updates land.
      if (!/lifecycle/i.test(err.message)) throw err
      delete props.lifecyclestage
      await upsertHubSpotContact(email, props)
    }
    console.log(`[crm] lead synced — ${redactEmail(email)} (${source})`)
  })().catch(err => console.error(`[crm] lead sync failed for ${redactEmail(email)}:`, err.message))
}

// CRM automation 2: a completed checkout marks the contact as a customer and
// logs a closed-won deal in the default pipeline. Keyed on the Stripe checkout
// session ID so the webhook and /api/verify-session can't create duplicates.
function queueCrmPurchase(email, checkoutSessionId, purchaseType, amountCents) {
  if (!HUBSPOT_TOKEN) return
  ;(async () => {
    if (!(await claimAutomation('crm_deal', email, checkoutSessionId))) return
    try {
      const contactId = await upsertHubSpotContact(email, { lifecyclestage: 'customer' })
      const properties = {
        dealname:  purchaseType === 'subscription'
          ? `Cash Pedal Pro subscription — ${email}`
          : `Cash Pedal Pro ${ACCESS_DAYS}-day pass — ${email}`,
        pipeline:  'default',
        dealstage: 'closedwon',
        closedate: new Date().toISOString(),
      }
      if (Number.isFinite(amountCents)) properties.amount = (amountCents / 100).toFixed(2)
      await hubspotRequest('/crm/v3/objects/deals', {
        properties,
        associations: contactId
          ? [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }]
          : [],
      })
      console.log(`[crm] deal logged — ${redactEmail(email)} (${purchaseType})`)
    } catch (err) {
      await releaseAutomation('crm_deal', email, checkoutSessionId)
      throw err
    }
  })().catch(err => console.error(`[crm] purchase sync failed for ${redactEmail(email)}:`, err.message))
}

// ── JSON body for all other routes ────────────────────
app.use(express.json())

// ── PostgreSQL ────────────────────────────────────────
const dbUrl = (process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL || '').trim()

const isInternalDb = dbUrl.includes('.railway.internal') || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
// Railway's public proxy endpoints (xxxx.proxy.rlwy.net, legacy *.railway.app)
// present a self-signed certificate, so strict verification can never succeed
// against them — encrypt without identity verification for those hosts only.
// The private-network URL (postgres.railway.internal) remains preferable:
// faster, no egress fees, and traffic never leaves the project.
const isRailwayProxy = dbUrl.includes('rlwy.net') || dbUrl.includes('railway.app')
const pool = dbUrl
  ? new Pool({
      connectionString: dbUrl,
      ssl: isInternalDb
        ? false
        : { rejectUnauthorized: !isRailwayProxy },
    })
  : null
if (isRailwayProxy) {
  console.warn('[db] connecting via Railway public proxy — consider switching DATABASE_URL to the private-network URL (postgres.railway.internal)')
}

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
    // Lead source: 'tips_optin' (calc-count email prompt) or 'email_unlock' (5 free Pro calcs funnel)
    await client.query(`
      ALTER TABLE user_data_collection
        ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'tips_optin'
    `)

    // ── Bonus credits (email funnel — server-enforced) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS bonus_credits (
        id              SERIAL PRIMARY KEY,
        email           VARCHAR(255) UNIQUE NOT NULL,
        session_id      VARCHAR(36) NOT NULL,
        first_name      VARCHAR(100) NOT NULL,
        last_name       VARCHAR(100) NOT NULL,
        credits_granted INTEGER NOT NULL DEFAULT 5,
        credits_used    INTEGER NOT NULL DEFAULT 0,
        ip_hash         VARCHAR(64),
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_credits_session
        ON bonus_credits(session_id)
    `)

    // ── Usage events (anonymous + identified visitors) ──
    // session_id is the same browser-generated UUID used for consent and
    // lead records, so anonymous usage can be joined to a lead if the
    // visitor later provides their email.
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id          SERIAL PRIMARY KEY,
        session_id  VARCHAR(36) NOT NULL,
        email       VARCHAR(255),
        feature     VARCHAR(40) NOT NULL,
        gate        VARCHAR(20),
        ip_address  VARCHAR(45),
        user_agent  TEXT,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_events_session
        ON usage_events(session_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_events_feature
        ON usage_events(feature, created_at)
    `)

    // ── Vehicle searches (market analytics) ───────────
    // One row per make/model a visitor inspects in a tool, tagged with the
    // resolved US state when the visitor has entered a ZIP/state. Keyed only by
    // the browser-generated session UUID — no email, no IP. Powers the public
    // /market page and the sellable per-state insights export.
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_searches (
        id          SERIAL PRIMARY KEY,
        session_id  VARCHAR(36) NOT NULL,
        state       VARCHAR(2),
        make        VARCHAR(50)  NOT NULL,
        model       VARCHAR(100) NOT NULL,
        year        SMALLINT,
        segment     VARCHAR(20),
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_searches_state
        ON vehicle_searches(state, created_at)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_searches_make_model
        ON vehicle_searches(make, model, created_at)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_searches_created
        ON vehicle_searches(created_at)
    `)

    // ── NHTSA reliability cache ───────────────────────
    // Caches recall + complaint summaries from NHTSA's public API for 7 days.
    // Keyed by "make|model|year"; stale rows are pruned in the daily sweep.
    await client.query(`
      CREATE TABLE IF NOT EXISTS nhtsa_cache (
        id         SERIAL PRIMARY KEY,
        cache_key  VARCHAR(200) UNIQUE NOT NULL,
        data       JSONB NOT NULL,
        fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nhtsa_cache_key ON nhtsa_cache(cache_key)
    `)

    // ── Automation log (email + CRM dedupe) ───────────
    // One row per automation actually executed (transactional email sent,
    // CRM deal created). The unique constraint is what makes automations
    // idempotent across funnels and across webhook/verify-session races.
    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_log (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL,
        event_type  VARCHAR(30)  NOT NULL,
        reference   VARCHAR(255) NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (email, event_type, reference)
      )
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
    // usage_events are pseudonymous analytics — same 365-day retention.
    await client.query(`
      DELETE FROM usage_events
      WHERE created_at < NOW() - INTERVAL '365 days'
    `)
    // Bonus-credit grants expire 365 days after last activity.
    await client.query(`
      DELETE FROM bonus_credits
      WHERE updated_at < NOW() - INTERVAL '365 days'
    `)
    // Vehicle searches are pseudonymous analytics — same 365-day retention.
    await client.query(`
      DELETE FROM vehicle_searches
      WHERE created_at < NOW() - INTERVAL '${MARKET_RETENTION_DAYS} days'
    `)
    // Stale device slots (no login in 30 days) are cleaned per-request already,
    // but also sweep on startup to catch orphaned rows from inactive subscribers.
    await client.query(`
      DELETE FROM subscriber_devices
      WHERE last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'
    `)
    // NHTSA cache — expire rows older than 30 days (TTL check in queries is 7 days,
    // this keeps the table from growing unbounded on dormant make/model combos).
    await client.query(`DELETE FROM nhtsa_cache WHERE fetched_at < NOW() - INTERVAL '30 days'`)
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
const VALID_LEAD_SOURCES = ['tips_optin', 'email_unlock']

app.post('/api/user-data', async (req, res) => {
  const { record_id, session_id, first_name, last_name, email, calculation_count, source } = req.body

  if (!isValidUUID(record_id) || !isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid record_id or session_id format' })
  }
  // Names may be empty (the tips opt-in collects email only) but must be strings
  if (typeof first_name !== 'string' || typeof last_name !== 'string') {
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
  const leadSource    = VALID_LEAD_SOURCES.includes(source) ? source : 'tips_optin'

  if (!pool) {
    console.log('[user-data] No DB configured — skipping save')
    return res.json({ success: true, record_id, storage: 'none' })
  }

  try {
    await pool.query(
      `INSERT INTO user_data_collection
         (record_id, session_id, timestamp_utc, first_name, last_name,
          email, calculation_count, ip_address, user_agent, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (record_id) DO NOTHING`,
      [
        record_id, session_id, timestamp_utc,
        sanitizeName(first_name), sanitizeName(last_name),
        normalizeEmail(email),
        count,
        storedIp, user_agent,
        leadSource,
      ]
    )
    queueWelcomeEmail(normalizeEmail(email), sanitizeName(first_name))
    queueCrmLead(normalizeEmail(email), sanitizeName(first_name), sanitizeName(last_name), leadSource)
    res.json({ success: true, record_id })
  } catch (err) {
    console.error('[user-data] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Track usage event ────────────────────────────
// First-party usage tracking for ALL visitors, anonymous or identified.
// Keyed by the browser-generated session UUID; IP is anonymized before storage.
app.post('/api/track-usage', async (req, res) => {
  const { session_id, feature, gate, email } = req.body

  if (!isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid session_id format' })
  }
  if (typeof feature !== 'string' || !USAGE_FEATURES.has(feature)) {
    return res.status(400).json({ success: false, error: 'Unknown feature' })
  }
  const cleanGate  = USAGE_GATES.has(gate) ? gate : null
  const cleanEmail = isValidEmail(email) ? normalizeEmail(email) : null

  if (!pool) return res.json({ success: true, storage: 'none' })

  try {
    await pool.query(
      `INSERT INTO usage_events (session_id, email, feature, gate, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        session_id, cleanEmail, feature, cleanGate,
        anonymizeIp(req.ip || 'unknown'),
        clamp(req.headers['user-agent'] || 'unknown', 512),
      ]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[track-usage] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Track a vehicle search (market analytics) ────
// Fired when a visitor selects a make/model in a tool. State is optional —
// it's recorded only when the visitor has entered a ZIP/state. make/model are
// validated against the vehicle database so the analytics tables stay clean.
app.post('/api/track-search', async (req, res) => {
  const { session_id, state, make, model, year } = req.body

  if (!isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid session_id format' })
  }
  if (typeof make !== 'string' || typeof model !== 'string') {
    return res.status(400).json({ success: false, error: 'make and model required' })
  }
  // Only accept real make/model pairs that exist in the vehicle database.
  const modelData = VEHICLES[make]?.[model]
  if (!modelData) {
    return res.status(400).json({ success: false, error: 'Unknown make/model' })
  }

  const cleanState = typeof state === 'string' && US_STATES.has(state.toUpperCase())
    ? state.toUpperCase()
    : null

  // Trust the database for the year range and segment, not the client.
  let cleanYear = null
  const parsedYear = parseInt(year, 10)
  if (!isNaN(parsedYear) && parsedYear >= 1990 && parsedYear <= 2035) cleanYear = parsedYear
  const segment = typeof modelData.type === 'string' ? modelData.type.slice(0, 20) : null

  if (!pool) return res.json({ success: true, storage: 'none' })

  try {
    await pool.query(
      `INSERT INTO vehicle_searches (session_id, state, make, model, year, segment)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [session_id, cleanState, make, model, cleanYear, segment]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[track-search] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Public market analytics ──────────────────────
// Aggregate-only, no PII. Powers the /market page. Counts DISTINCT sessions
// (not raw hits) so a single visitor can't skew the rankings. Optionally
// scoped to a state via ?state=CA.
app.get('/api/market-analytics', async (req, res) => {
  if (!pool) return res.json({ available: false, reason: 'db_not_configured' })

  const stateParam = typeof req.query.state === 'string' ? req.query.state.toUpperCase() : ''
  const state = US_STATES.has(stateParam) ? stateParam : null
  const win = `NOW() - INTERVAL '${MARKET_WINDOW_DAYS} days'`

  try {
    const [totals, topModels, topMakes, statesWithData] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT state)          AS states_covered,
                COUNT(DISTINCT (make||model))  AS unique_models
         FROM vehicle_searches WHERE created_at > ${win}`
      ),
      pool.query(
        `SELECT make, model, COUNT(DISTINCT session_id)::int AS searches
         FROM vehicle_searches WHERE created_at > ${win}
         GROUP BY make, model ORDER BY searches DESC, make, model LIMIT 10`
      ),
      pool.query(
        `SELECT make, COUNT(DISTINCT session_id)::int AS searches
         FROM vehicle_searches WHERE created_at > ${win}
         GROUP BY make ORDER BY searches DESC, make LIMIT 10`
      ),
      pool.query(
        `SELECT DISTINCT state FROM vehicle_searches
         WHERE state IS NOT NULL AND created_at > ${win} ORDER BY state`
      ),
    ])

    // Public rankings expose ORDER and a relative weight only — never raw search
    // counts. The top item in each list is weight 100; everything else is scaled
    // against it. Absolute quantities remain backend-only (insights export).
    const toRanked = rows => {
      const max = rows.reduce((m, r) => Math.max(m, r.searches), 0) || 1
      return rows.map(({ searches, ...rest }) => ({
        ...rest,
        weight: Math.max(1, Math.round((searches / max) * 100)),
      }))
    }

    const payload = {
      available:  true,
      generatedAt: new Date().toISOString(),
      windowDays: MARKET_WINDOW_DAYS,
      totals: {
        statesCovered: parseInt(totals.rows[0].states_covered, 10),
        uniqueModels:  parseInt(totals.rows[0].unique_models, 10),
      },
      topModels:      toRanked(topModels.rows),
      topMakes:       toRanked(topMakes.rows),
      statesWithData: statesWithData.rows.map(r => r.state),
    }

    if (state) {
      const stateModels = await pool.query(
        `SELECT make, model, COUNT(DISTINCT session_id)::int AS searches
         FROM vehicle_searches
         WHERE state = $1 AND created_at > ${win}
         GROUP BY make, model ORDER BY searches DESC, make, model LIMIT 10`,
        [state]
      )
      payload.state = state
      payload.stateTopModels = toRanked(stateModels.rows)
    }

    res.json(payload)
  } catch (err) {
    console.error('[market-analytics] DB error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Full market insights export (sellable) ───────
// Protected by the INSIGHTS_API_KEY header. Returns the complete per-state
// ranking breakdown — the dataset that can be licensed to dealers, lenders,
// and market researchers. Not exposed to the public /market page.
app.get('/api/insights/market', async (req, res) => {
  if (!INSIGHTS_API_KEY) {
    return res.status(503).json({ error: 'Insights export not configured' })
  }
  const provided = req.get('x-api-key') || ''
  // Constant-time comparison to avoid leaking the key via timing.
  const ok = provided.length === INSIGHTS_API_KEY.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(INSIGHTS_API_KEY))
  if (!ok) {
    console.warn(`[insights] unauthorized attempt — IP: ${anonymizeIp(req.ip)}`)
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!pool) return res.status(503).json({ error: 'DB not configured' })

  const windowDays = Math.min(Math.max(parseInt(req.query.windowDays, 10) || MARKET_WINDOW_DAYS, 1), MARKET_RETENTION_DAYS)
  const perState   = Math.min(Math.max(parseInt(req.query.perState, 10) || 25, 1), 100)
  const win = `NOW() - INTERVAL '${windowDays} days'`

  try {
    const [byStateRows, makeRows, nationalRows] = await Promise.all([
      pool.query(
        `SELECT state, make, model, segment,
                COUNT(DISTINCT session_id)::int AS searchers,
                COUNT(*)::int                   AS hits
         FROM vehicle_searches
         WHERE state IS NOT NULL AND created_at > ${win}
         GROUP BY state, make, model, segment
         ORDER BY state, searchers DESC, hits DESC`
      ),
      pool.query(
        `SELECT state, make,
                COUNT(DISTINCT session_id)::int AS searchers
         FROM vehicle_searches
         WHERE state IS NOT NULL AND created_at > ${win}
         GROUP BY state, make ORDER BY state, searchers DESC`
      ),
      pool.query(
        `SELECT make, model, segment,
                COUNT(DISTINCT session_id)::int AS searchers,
                COUNT(*)::int                   AS hits
         FROM vehicle_searches WHERE created_at > ${win}
         GROUP BY make, model, segment
         ORDER BY searchers DESC, hits DESC LIMIT 100`
      ),
    ])

    // Assemble per-state breakdown, capping each state's model list at perState.
    const byState = {}
    for (const row of byStateRows.rows) {
      const s = (byState[row.state] ||= { totalSearchers: 0, topModels: [], topMakes: [] })
      if (s.topModels.length < perState) {
        s.topModels.push({
          make: row.make, model: row.model, segment: row.segment,
          searchers: row.searchers, hits: row.hits,
        })
      }
    }
    for (const row of makeRows.rows) {
      const s = byState[row.state]
      if (s && s.topMakes.length < perState) {
        s.topMakes.push({ make: row.make, searchers: row.searchers })
      }
    }
    // totalSearchers per state = distinct sessions in that state
    const stateTotals = await pool.query(
      `SELECT state, COUNT(DISTINCT session_id)::int AS searchers
       FROM vehicle_searches
       WHERE state IS NOT NULL AND created_at > ${win}
       GROUP BY state`
    )
    for (const row of stateTotals.rows) {
      if (byState[row.state]) byState[row.state].totalSearchers = row.searchers
    }

    res.json({
      generatedAt: new Date().toISOString(),
      windowDays,
      perState,
      national: nationalRows.rows,
      byState,
    })
  } catch (err) {
    console.error('[insights] DB error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Claim bonus credits (email funnel) ───────────
// Trades name + email for BONUS_CREDITS free Pro calculations.
// One claim per email (re-claiming restores the remaining balance) and
// one claim per anonymous session, so a device can't farm credits with
// throwaway emails. Also records the lead in user_data_collection.
app.post('/api/claim-bonus', sensitiveLimiter, async (req, res) => {
  const { session_id, first_name, last_name, email } = req.body

  if (!isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid session_id format' })
  }
  const cleanFirst = sanitizeName(first_name)
  const cleanLast  = sanitizeName(last_name)
  if (!cleanFirst || !cleanLast) {
    return res.status(400).json({ success: false, error: 'First and last name required' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' })
  }
  const normEmail = normalizeEmail(email)

  if (!pool) {
    console.log('[claim-bonus] No DB configured — granting without persistence')
    return res.json({ success: true, creditsLeft: BONUS_CREDITS, storage: 'none' })
  }

  try {
    // Re-claim with a known email → restore the remaining balance (new device, cleared storage)
    const existing = await pool.query(
      `SELECT credits_granted, credits_used FROM bonus_credits WHERE email = $1`,
      [normEmail]
    )
    if (existing.rows.length > 0) {
      const { credits_granted, credits_used } = existing.rows[0]
      return res.json({
        success:     true,
        restored:    true,
        creditsLeft: Math.max(0, credits_granted - credits_used),
      })
    }

    // One claim per anonymous session
    const sess = await pool.query(
      `SELECT 1 FROM bonus_credits WHERE session_id = $1 LIMIT 1`,
      [session_id]
    )
    if (sess.rows.length > 0) {
      return res.json({ success: false, error: 'device_claimed' })
    }

    await pool.query(
      `INSERT INTO bonus_credits (email, session_id, first_name, last_name, credits_granted, ip_hash)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [normEmail, session_id, cleanFirst, cleanLast, BONUS_CREDITS, pseudonymizeIp(req.ip || 'unknown')]
    )
    // Record the lead alongside the credit grant
    await pool.query(
      `INSERT INTO user_data_collection
         (record_id, session_id, timestamp_utc, first_name, last_name,
          email, calculation_count, ip_address, user_agent, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (record_id) DO NOTHING`,
      [
        crypto.randomUUID(), session_id, new Date().toISOString(),
        cleanFirst, cleanLast, normEmail, 0,
        anonymizeIp(req.ip || 'unknown'),
        clamp(req.headers['user-agent'] || 'unknown', 512),
        'email_unlock',
      ]
    )
    queueWelcomeEmail(normEmail, cleanFirst)
    queueCrmLead(normEmail, cleanFirst, cleanLast, 'email_unlock')
    res.json({ success: true, creditsLeft: BONUS_CREDITS })
  } catch (err) {
    console.error('[claim-bonus] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Spend one bonus credit ───────────────────────
// Atomic decrement — the server is the source of truth for the balance.
app.post('/api/spend-bonus', sensitiveLimiter, async (req, res) => {
  const { session_id, email, feature } = req.body

  if (!isValidUUID(session_id)) {
    return res.status(400).json({ success: false, error: 'Invalid session_id format' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' })
  }
  const normEmail = normalizeEmail(email)

  if (!pool) {
    console.log('[spend-bonus] No DB configured — allowing without persistence')
    return res.json({ success: true, creditsLeft: BONUS_CREDITS, storage: 'none' })
  }

  try {
    const result = await pool.query(
      `UPDATE bonus_credits
         SET credits_used = credits_used + 1, updated_at = NOW()
       WHERE email = $1 AND credits_used < credits_granted
       RETURNING credits_granted - credits_used AS credits_left`,
      [normEmail]
    )
    if (result.rows.length > 0) {
      // Log the spend as a usage event so bonus usage is queryable server-side
      const cleanFeature = USAGE_FEATURES.has(feature) ? feature : 'bonus_spend'
      await pool.query(
        `INSERT INTO usage_events (session_id, email, feature, gate, ip_address, user_agent)
         VALUES ($1,$2,$3,'bonus',$4,$5)`,
        [
          session_id, normEmail, cleanFeature,
          anonymizeIp(req.ip || 'unknown'),
          clamp(req.headers['user-agent'] || 'unknown', 512),
        ]
      )
      return res.json({ success: true, creditsLeft: result.rows[0].credits_left })
    }
    const claimedRow = await pool.query(`SELECT 1 FROM bonus_credits WHERE email = $1`, [normEmail])
    res.json({
      success:     false,
      reason:      claimedRow.rows.length > 0 ? 'exhausted' : 'not_claimed',
      creditsLeft: 0,
    })
  } catch (err) {
    console.error('[spend-bonus] DB error:', err.message)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── API: Bonus credit balance ─────────────────────────
app.post('/api/bonus-status', sensitiveLimiter, async (req, res) => {
  const { email } = req.body
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' })
  }
  if (!pool) return res.json({ success: true, claimed: null, storage: 'none' })

  try {
    const result = await pool.query(
      `SELECT credits_granted, credits_used FROM bonus_credits WHERE email = $1`,
      [normalizeEmail(email)]
    )
    if (result.rows.length === 0) {
      return res.json({ success: true, claimed: false, creditsLeft: 0 })
    }
    const { credits_granted, credits_used } = result.rows[0]
    res.json({
      success:     true,
      claimed:     true,
      creditsLeft: Math.max(0, credits_granted - credits_used),
    })
  } catch (err) {
    console.error('[bonus-status] DB error:', err.message)
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
        queuePurchaseEmail(email, session.id, 'one_time', accessUntil)
        queueCrmPurchase(email, session.id, 'one_time', session.amount_total)
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
      queuePurchaseEmail(email, session.id, 'subscription', null)
      queueCrmPurchase(email, session.id, 'subscription', session.amount_total)
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
app.post('/api/subscription-status', sensitiveLimiter, async (req, res) => {
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
  console.log(`[reset-devices] attempt — email: ${redactEmail(email)}, IP: ${anonymizeIp(req.ip)}`)

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
  console.log(`[cancel-subscription] attempt — email: ${redactEmail(normalizedEmail)}, IP: ${anonymizeIp(req.ip)}`)

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
    // Remove bonus-credit grant and any usage events linked to this email
    await pool.query(`DELETE FROM bonus_credits WHERE email = $1`, [normalizedEmail])
    await pool.query(`DELETE FROM usage_events WHERE email = $1`, [normalizedEmail])
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

    console.log(`[delete-my-data] erasure completed — email: ${redactEmail(normalizedEmail)}, IP: ${anonymizeIp(req.ip)}`)
    // Return the same shape whether or not the email existed to prevent enumeration.
    res.json({ success: true, message: 'Your data has been erased.' })
  } catch (err) {
    console.error('[delete-my-data] error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── API: Verify promo code ────────────────────────────
app.post('/api/verify-promo-code', sensitiveLimiter, (req, res) => {
  const { code } = req.body
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ valid: false, error: 'Code required' })
  }
  if (PROMO_CODES.size === 0) {
    return res.json({ valid: false, error: 'No promo codes configured' })
  }
  const valid = PROMO_CODES.has(code.trim())
  if (!valid) console.log(`[promo] invalid attempt — IP: ${anonymizeIp(req.ip)}`)
  res.json({ valid })
})

// ── API: Reliability data (NHTSA proxy + 7-day cache) ─
// Fetches recall counts and complaint summaries from NHTSA's free public API.
// Results are cached in nhtsa_cache so repeated page loads don't hammer NHTSA.
// Returns a degraded response (cached:false, error) on NHTSA timeout rather
// than a 502 so the UI can show a partial state without breaking the checklist.
app.get('/api/reliability/:make/:model/:year', async (req, res) => {
  const { make, model, year } = req.params

  const yearNum = parseInt(year, 10)
  if (!make || !model || isNaN(yearNum) || yearNum < 1990 || yearNum > 2030) {
    return res.status(400).json({ error: 'Invalid make, model, or year' })
  }

  const cleanMake  = clamp(String(make),  50)
  const cleanModel = clamp(String(model), 100)
  const cacheKey   = `${cleanMake}|${cleanModel}|${yearNum}`
  const CACHE_TTL  = 7 // days

  // Serve from cache when fresh
  if (pool) {
    try {
      const hit = await pool.query(
        `SELECT data FROM nhtsa_cache
         WHERE cache_key = $1 AND fetched_at > NOW() - INTERVAL '${CACHE_TTL} days'`,
        [cacheKey]
      )
      if (hit.rows.length > 0) return res.json({ ...hit.rows[0].data, cached: true })
    } catch (err) {
      console.warn('[reliability] cache read error:', err.message)
    }
  }

  // Fetch from NHTSA (both endpoints in parallel, 8 s timeout each)
  try {
    const enc  = s => encodeURIComponent(s)
    const base = `https://api.nhtsa.dot.gov`
    const sig  = AbortSignal.timeout(8000)

    const [recallsRes, complaintsRes] = await Promise.allSettled([
      fetch(`${base}/recalls/recallsByVehicle?make=${enc(cleanMake)}&model=${enc(cleanModel)}&modelYear=${yearNum}`,    { signal: sig }),
      fetch(`${base}/complaints/complaintsByVehicle?make=${enc(cleanMake)}&model=${enc(cleanModel)}&modelYear=${yearNum}`, { signal: sig }),
    ])

    let recalls = []
    let complaintCount = 0
    let topComponents = []

    if (recallsRes.status === 'fulfilled' && recallsRes.value.ok) {
      const d = await recallsRes.value.json().catch(() => ({}))
      recalls = (d.results || []).map(r => ({
        id:          r.NHTSAActionNumber || '',
        component:   r.Component         || '',
        summary:    (r.Summary           || '').slice(0, 220),
        consequence:(r.Consequence       || '').slice(0, 160),
      }))
    }

    if (complaintsRes.status === 'fulfilled' && complaintsRes.value.ok) {
      const d = await complaintsRes.value.json().catch(() => ({}))
      complaintCount = d.Count || 0
      const tally = {}
      for (const c of (d.results || [])) {
        const comp = (c.components || '').split(',')[0].trim()
        if (comp) tally[comp] = (tally[comp] || 0) + 1
      }
      topComponents = Object.entries(tally)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([name, count]) => ({ name, count }))
    }

    const payload = {
      make: cleanMake, model: cleanModel, year: yearNum,
      recallCount: recalls.length,
      recalls: recalls.slice(0, 5),
      complaintCount,
      topComponents,
      source: 'NHTSA',
      asOf: new Date().toISOString(),
    }

    if (pool) {
      pool.query(
        `INSERT INTO nhtsa_cache (cache_key, data) VALUES ($1, $2)
         ON CONFLICT (cache_key) DO UPDATE SET data = $2, fetched_at = NOW()`,
        [cacheKey, JSON.stringify(payload)]
      ).catch(err => console.warn('[reliability] cache write error:', err.message))
    }

    res.json({ ...payload, cached: false })
  } catch (err) {
    console.error('[reliability] NHTSA fetch error:', err.message)
    res.status(502).json({ error: 'Could not fetch reliability data', detail: err.message })
  }
})

// ── EIA Fuel Price Cache ──────────────────────────────
// Fetches weekly retail regular-unleaded prices by state from the EIA v2 API.
// Cached in-memory for 24 h; falls back to static defaults if no API key or
// the fetch fails.
const EIA_API_KEY = (process.env.EIA_API_KEY || '').trim()
const FUEL_CACHE_TTL = 24 * 60 * 60 * 1000
let fuelPriceCache = { prices: null, fetchedAt: 0 }

const FALLBACK_FUEL_PRICES = {
  AL:3.05,AK:3.95,AZ:3.70,AR:2.95,CA:4.80,CO:3.30,CT:3.55,
  DE:3.20,FL:3.25,GA:3.05,HI:4.90,ID:3.50,IL:3.55,IN:3.25,
  IA:3.10,KS:2.95,KY:3.05,LA:2.90,ME:3.45,MD:3.35,MA:3.60,
  MI:3.40,MN:3.30,MS:2.90,MO:2.95,MT:3.40,NE:3.10,NV:3.90,
  NH:3.35,NJ:3.45,NM:3.10,NY:3.75,NC:3.10,ND:3.05,OH:3.15,
  OK:2.95,OR:3.95,PA:3.55,RI:3.50,SC:3.05,SD:3.15,TN:3.05,
  TX:3.00,UT:3.55,VT:3.50,VA:3.20,WA:4.10,WV:3.25,WI:3.30,
  WY:3.25,DC:3.75,
}

async function fetchEIAFuelPrices() {
  // EIA v2 — weekly retail regular unleaded (product EPM0), all state duoareas
  // Duoarea format: "S" + 2-letter state code (e.g., SCA, STX, SDC)
  const url = new URL('https://api.eia.gov/v2/petroleum/pri/gnd/data/')
  url.searchParams.set('api_key', EIA_API_KEY)
  url.searchParams.set('frequency', 'weekly')
  url.searchParams.append('data[0]', 'value')
  url.searchParams.append('facets[product][0]', 'EPM0')
  url.searchParams.set('sort[0][column]', 'period')
  url.searchParams.set('sort[0][direction]', 'desc')
  url.searchParams.set('length', '100')

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`EIA API responded ${res.status}`)
  const json = await res.json()

  const prices = { ...FALLBACK_FUEL_PRICES }
  const seen = new Set()
  for (const row of json.response?.data ?? []) {
    const duoarea = row.duoarea // e.g. "SCA"
    if (!duoarea || duoarea === 'NUS') continue
    if (!duoarea.startsWith('S') || duoarea.length !== 3) continue
    const state = duoarea.slice(1) // "CA"
    if (seen.has(state) || row.value == null) continue
    if (Object.prototype.hasOwnProperty.call(FALLBACK_FUEL_PRICES, state)) {
      prices[state] = Math.round(parseFloat(row.value) * 100) / 100
      seen.add(state)
    }
  }
  console.log(`[fuel-prices] EIA refresh — ${seen.size} states updated`)
  return prices
}

app.get('/api/fuel-prices', async (req, res) => {
  const now = Date.now()

  if (fuelPriceCache.prices && now - fuelPriceCache.fetchedAt < FUEL_CACHE_TTL) {
    return res.json({ prices: fuelPriceCache.prices, source: 'cache', fetchedAt: fuelPriceCache.fetchedAt })
  }

  if (!EIA_API_KEY) {
    return res.json({ prices: FALLBACK_FUEL_PRICES, source: 'fallback' })
  }

  try {
    const prices = await fetchEIAFuelPrices()
    fuelPriceCache = { prices, fetchedAt: now }
    return res.json({ prices, source: 'eia', fetchedAt: now })
  } catch (err) {
    console.error('[fuel-prices] EIA fetch error:', err.message)
  }

  if (fuelPriceCache.prices) {
    return res.json({ prices: fuelPriceCache.prices, source: 'stale-cache', fetchedAt: fuelPriceCache.fetchedAt })
  }
  return res.json({ prices: FALLBACK_FUEL_PRICES, source: 'fallback' })
})

// ── OpenEI Electricity Rate (zip-level) ──────────────
// Queries the OpenEI Utility Rate Database for residential $/kWh by zip code.
// Cached per zip for 30 days — retail residential rates change infrequently.
// Falls back gracefully (returns null) when no key, zip not found, or parse fails.
const OPENEI_API_KEY  = (process.env.OPENEI_API_KEY || '').trim()
const ELEC_CACHE_TTL  = 30 * 24 * 60 * 60 * 1000
const elecRateCache   = new Map() // zip → { rate, fetchedAt }

function extractResidentialKwhRate(items) {
  const rates = []
  for (const item of items ?? []) {
    const sector = (item.sector ?? '').toLowerCase()
    if (!sector.includes('residential')) continue
    const struct = item.energyratestructure
    if (!Array.isArray(struct)) continue
    let sum = 0, count = 0
    for (const period of struct) {
      if (!Array.isArray(period)) continue
      for (const tier of period) {
        const r = (tier.rate ?? 0) + (tier.adj ?? 0)
        if (r > 0.01 && r < 2.0) { sum += r; count++ }
      }
    }
    if (count > 0) rates.push(sum / count)
  }
  if (rates.length === 0) return null
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 1000) / 1000
}

app.get('/api/electricity-rate', async (req, res) => {
  const zip = (req.query.zip ?? '').trim()
  if (!/^\d{5}$/.test(zip)) return res.status(400).json({ error: 'zip must be a 5-digit US zip code' })

  const now = Date.now()
  const cached = elecRateCache.get(zip)
  if (cached && now - cached.fetchedAt < ELEC_CACHE_TTL) {
    return res.json({ rate: cached.rate, source: 'cache', zip })
  }

  if (!OPENEI_API_KEY) return res.json({ rate: null, source: 'no-key', zip })

  try {
    const url = new URL('https://api.openei.org/utility_rates')
    url.searchParams.set('version', '8')
    url.searchParams.set('format', 'json')
    url.searchParams.set('api_key', OPENEI_API_KEY)
    url.searchParams.set('address', zip)
    url.searchParams.set('sector', 'Residential')
    url.searchParams.set('limit', '10')
    url.searchParams.set('detail', 'full')

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`OpenEI responded ${r.status}`)
    const json = await r.json()
    const rate = extractResidentialKwhRate(json.items)
    elecRateCache.set(zip, { rate, fetchedAt: now })
    return res.json({ rate, source: 'openei', zip })
  } catch (err) {
    console.error('[electricity-rate] OpenEI fetch error:', err.message)
    if (cached) return res.json({ rate: cached.rate, source: 'stale-cache', zip })
    return res.json({ rate: null, source: 'error', zip })
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
    await pool.query(`DELETE FROM usage_events WHERE created_at < NOW() - INTERVAL '365 days'`)
    await pool.query(`DELETE FROM bonus_credits WHERE updated_at < NOW() - INTERVAL '365 days'`)
    await pool.query(`DELETE FROM vehicle_searches WHERE created_at < NOW() - INTERVAL '${MARKET_RETENTION_DAYS} days'`)
    await pool.query(`DELETE FROM subscriber_devices WHERE last_seen < NOW() - INTERVAL '${DEVICE_EXPIRY_DAYS} days'`)
    await pool.query(`DELETE FROM nhtsa_cache WHERE fetched_at < NOW() - INTERVAL '30 days'`)
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
  if (!RESEND_API_KEY) console.log('No RESEND_API_KEY configured — thank-you emails disabled')
  if (!HUBSPOT_TOKEN) console.log('No HUBSPOT_ACCESS_TOKEN configured — CRM sync disabled')
  if (!process.env.IP_HMAC_SECRET) console.warn('[privacy] IP_HMAC_SECRET not set — device tracking disabled; set this env var on Railway')
})

setInterval(runRetentionSweep, 24 * 60 * 60 * 1000)
