# Accounts, saved profiles and lead generation — data and compliance notes

Engineering notes, **not legal advice**. Have counsel review before any personal data is shared
with or sold to a third party.

## What is built

Passwordless accounts (`account.js`), encrypted saved lifestyle profiles, an append-only consent ledger,
export and erase, retention sweeps, and a "does not share" statement in the privacy policy (v1.2).
**Nothing is shared with partners by this code.** The partner-sharing consent exists but is off
(`LEAD_SHARING_ENABLED` unset).

## Data inventory

| Data | Where | Protection | Retention |
|---|---|---|---|
| Email, sign-in times | `accounts` | DB access controls | Until deleted, or 24 months without sign-in |
| Sign-in links, sessions | `auth_links`, `account_sessions` | Only SHA-256 hashes stored | 15 min / 30 days |
| Saved profiles (income, debts, savings, state/city, household, survey answers) | `saved_profiles.payload_enc` | AES-256-GCM, key in env, ciphertext bound to the account id, allowlisted fields only | Until deleted by the user or with the account |
| Consent ledger | `consent_ledger` | Append-only; wording version + SHA-256 of exact text; pseudonymized IP | Kept after erasure **without email** as evidence |
| Activity log | `account_audit_log` | Pseudonymized IP (HMAC) | 24 months |

Controls: HttpOnly + SameSite=Lax session cookie (Secure over https), custom-header + origin check on all
state-changing calls, rate limits (per IP and 5 links/hour/email), no email in logs, `Cache-Control: no-store`
on account responses, analytics masks (`data-clarity-mask`) on financial inputs and saved values.

## What counsel needs to decide before any sharing or sale

1. **The privacy policy currently states that Cash Pedal does not sell or share saved profiles or email
   addresses with partners, and (section 4) "We do not sell your personal data for money".** Selling or sharing
   leads contradicts this; the policy, the footer "Do Not Sell or Share" handling and the terms must change first,
   and the date/version bumped.
2. **Consent design.** The product owner chose one broad marketing consent at account level. Risks to review:
   specificity and granularity of consent (several state privacy laws and the FTC expect consent that is
   specific, informed and freely given, not bundled with account creation); consent to share **financial**
   details such as income and debt; withdrawal handling; whether per-offer consent (user picks a specific
   partner and sees the exact fields) is required or advisable. The current UI keeps it separate from sign-up
   and unticked by default.
3. **State laws** (CCPA/CPRA, and the other US state privacy laws): "sale" and "share" disclosures, opt-out
   links, Global Privacy Control, sensitive-data rules, data-broker registration (California, Texas, Oregon,
   Vermont) if applicable, children under 16.
4. **Financial-privacy rules.** Whether GLBA or FCRA is implicated depends on who the partners are and how they
   use the data (credit, insurance and employment decisions have extra rules).
5. **Outreach rules for partners** (TCPA for calls and texts, CAN-SPAM for email, state telemarketing laws) and
   the contracts that bind buyers: permitted use, no resale, deletion on request, security, breach notice.
6. **Data minimization.** Share the fewest fields the offer needs (for example an income band rather than exact
   income), and keep a per-recipient record of what was shared, when, and under which consent version.
7. **Withdrawal and deletion propagation** to partners, and breach-notification procedures.

## Before enabling `LEAD_SHARING_ENABLED`

- Privacy policy, terms and footer updated and approved; consent wording reviewed (bump `CONSENT_WORDING` version).
- Partner list, contracts and a delivery mechanism with an outbound log exist (not built).
- `POST /api/account/consent` already refuses grants while the flag is off, so no consent text can be recorded for
  wording that is not live.
