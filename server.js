import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'
import crypto from 'crypto'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000

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

  const ip = (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  )
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

  const ip = (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  )
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
})
