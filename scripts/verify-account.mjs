// Unit checks for the account helpers in account.js (crypto, tokens, cookies, payload
// validation, CSRF). End-to-end route checks live in scripts/verify-account-e2e.mjs.
import crypto from 'node:crypto'
import {
  encryptPayload, decryptPayload, validatePayload, parseCookies, sameOriginOk, sha256, newToken, CONSENT_WORDING, MAX_PAYLOAD_BYTES,
} from '../account.js'

let failures = 0
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); if (!ok) failures++ }
const throws = fn => { try { fn(); return false } catch { return true } }

const key = crypto.randomBytes(32).toString('base64')
const key2 = crypto.randomBytes(32).toString('base64')
const env = { PROFILE_ENC_KEY: key }
const acct = crypto.randomUUID()
const payload = { form: { income1: '85000', state: 'CO' }, prefs: { goal: 'home' }, mode: 'current', events: [] }

// Encryption
const blob = encryptPayload(payload, acct, env)
check('round trip', JSON.stringify(decryptPayload(blob, acct, env)) === JSON.stringify(payload))
check('ciphertext does not contain the plaintext', !blob.includes('85000') && !Buffer.from(blob.split('.')[4], 'base64url').toString().includes('85000'))
check('fresh IV each time', encryptPayload(payload, acct, env) !== blob)
check('bound to the account id', throws(() => decryptPayload(blob, crypto.randomUUID(), env)))
const parts = blob.split('.'); parts[4] = Buffer.from('tampered').toString('base64url')
check('tampered ciphertext is rejected', throws(() => decryptPayload(parts.join('.'), acct, env)))
const p2 = blob.split('.'); p2[3] = crypto.randomBytes(16).toString('base64url')
check('tampered tag is rejected', throws(() => decryptPayload(p2.join('.'), acct, env)))
check('wrong key is rejected', throws(() => decryptPayload(blob, acct, { PROFILE_ENC_KEY: key2 })))
check('key rotation: old key still decrypts via PROFILE_ENC_KEY_PREV', JSON.stringify(decryptPayload(blob, acct, { PROFILE_ENC_KEY: key2, PROFILE_ENC_KEY_PREV: key })) === JSON.stringify(payload))
check('new writes use the current key', encryptPayload(payload, acct, { PROFILE_ENC_KEY: key2, PROFILE_ENC_KEY_PREV: key }).split('.')[1] !== blob.split('.')[1])
check('no key → refuses to store (no plaintext fallback)', throws(() => encryptPayload(payload, acct, {})))
check('malformed key is rejected', throws(() => encryptPayload(payload, acct, { PROFILE_ENC_KEY: 'c2hvcnQ=' })))

// Tokens
const t = newToken()
check('tokens are 256-bit and URL-safe', Buffer.from(t, 'base64url').length === 32 && /^[A-Za-z0-9_-]+$/.test(t))
check('tokens are unique', newToken() !== newToken())
check('stored token is a hash, not the token', sha256(t).length === 64 && sha256(t) !== t)

// Cookies
check('cookie parsing', parseCookies('a=1; cp_session=abc%20d; b=2').cp_session === 'abc d' && parseCookies(undefined).x === undefined)

// Payload validation (data minimisation)
check('valid payload accepted', validatePayload(payload) === null)
check('unknown field rejected', validatePayload({ form: {}, ssn: '1' }) !== null)
check('arrays and non-objects rejected', validatePayload([]) !== null && validatePayload('x') !== null && validatePayload(null) !== null)
check('bad mode rejected', validatePayload({ mode: 'hack' }) !== null)
check('events must be short strings', validatePayload({ events: [1] }) !== null && validatePayload({ events: ['x'.repeat(50)] }) !== null)
check('oversized payload rejected', validatePayload({ form: { a: 'x'.repeat(MAX_PAYLOAD_BYTES) } }) !== null)

// CSRF
const req = (headers = {}) => ({ get: k => headers[k.toLowerCase()] })
const app = 'https://cashpedal.io'
check('CSRF: custom header required', !sameOriginOk(req({}), app) && sameOriginOk(req({ 'x-cp-request': '1' }), app))
check('CSRF: same origin accepted', sameOriginOk(req({ 'x-cp-request': '1', origin: 'https://cashpedal.io' }), app))
check('CSRF: foreign origin rejected', !sameOriginOk(req({ 'x-cp-request': '1', origin: 'https://evil.example' }), app))
check('CSRF: garbage origin rejected', !sameOriginOk(req({ 'x-cp-request': '1', origin: 'not a url' }), app))

// Consent wording is versioned and non-empty
check('consent wording present', Object.values(CONSENT_WORDING).every(w => w.version && w.text.length > 40))
check('marketing wording names the data, the categories, and withdrawal', /email address/.test(CONSENT_WORDING.marketing_sharing.text) && /mortgage/.test(CONSENT_WORDING.marketing_sharing.text) && /withdraw/.test(CONSENT_WORDING.marketing_sharing.text) && /not required/.test(CONSENT_WORDING.marketing_sharing.text))

process.exit(failures ? 1 : 0)
