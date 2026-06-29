import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const LAST_UPDATED = 'May 2026'
const CONTACT_EMAIL = 'support@cashpedal.io'

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="font-display font-bold text-white text-xl mb-3">{title}</h2>
      <div className="card text-sm text-[var(--text-muted)] leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  )
}

function Table({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {rows[0].map((h, i) => (
              <th key={i} className="py-2 pr-4 font-semibold text-white whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--border)]/40">
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 pr-4 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">

          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Privacy Policy
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-2">
            Your Data &amp; Privacy
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-8 anim-1">
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Version 1.0
          </p>

          <Section title="1. Who we are">
            <p>
              Cash Pedal (cashpedal.io) is operated by a sole proprietor doing business under the
              trade name "CashPedal." We are the data controller for personal data collected through
              this website.
            </p>
            <p>
              <strong className="text-white">Contact:</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline">{CONTACT_EMAIL}</a>
            </p>
          </Section>

          <Section title="2. What data we collect and why">
            <p>
              We collect the minimum data needed to operate the service. Here is every category,
              with the purpose and legal basis for each.
            </p>
            <Table rows={[
              ['Category', 'What it includes', 'Purpose', 'Legal basis', 'Kept for'],
              [
                'Consent records',
                'Session ID, anonymized IP (last octet masked), browser user-agent, terms version, timestamp',
                'Proof of legal agreement (captured when you provide an email, subscribe, or check out) — required to defend against liability claims',
                'Legal obligation (GDPR Art. 6(1)(c))',
                'Indefinitely — exempt from erasure under Art. 17(3)(b)',
              ],
              [
                'Subscriber data',
                'Email address, Stripe customer ID, subscription status, access expiry',
                'Delivering and managing the paid subscription',
                'Contract performance (Art. 6(1)(b))',
                'Duration of subscription + 7 years for financial records',
              ],
              [
                'Device records',
                'HMAC-pseudonymized IP (irreversible hash — original IP never stored), email, timestamps',
                'Enforcing the 2-device access limit per subscription',
                'Legitimate interests (Art. 6(1)(f)) — preventing credential sharing',
                '30 days of inactivity, then auto-deleted',
              ],
              [
                'User-submitted profile',
                'First name, last name, email address, calculator usage count',
                'Optional: sending vehicle-buying tips by email (only if you opted in), and granting free Pro calculations claimed through the email offer',
                'Consent (Art. 6(1)(a))',
                '365 days, then auto-deleted',
              ],
              [
                'Free Pro calculation balance',
                'Email address, name, credits granted and used, session ID, HMAC-pseudonymized IP',
                'Enforcing the one-time grant of free Pro calculations per email',
                'Legitimate interests (Art. 6(1)(f)) — preventing abuse of the free offer',
                '365 days after last update, or on erasure request',
              ],
              [
                'Usage events',
                'Random session ID, tool/feature used, anonymized IP (last octet masked), browser user-agent; email only if you have identified yourself',
                'Understanding which tools are used and how often, including by anonymous visitors',
                'Legitimate interests (Art. 6(1)(f)) — product analytics',
                '365 days, then auto-deleted',
              ],
            ]} />
            <p className="text-xs italic">
              Calculator inputs (vehicle, loan terms, ZIP code) are processed entirely in your browser
              and are never sent to our servers.
            </p>
          </Section>

          <Section title="3. localStorage and browser storage">
            <p>
              We use your browser's <code className="text-white bg-white/10 px-1 rounded">localStorage</code> for
              strictly functional purposes — no tracking cookies are used.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Session ID</strong> — a random UUID generated in your browser, used to link anonymous activity (analytics, market rankings, and any consent record) to a session</li>
              <li><strong className="text-white">Subscriber email &amp; expiry</strong> — so you stay logged in without a password</li>
              <li><strong className="text-white">Calculator state</strong> — your last vehicle inputs, saved locally for convenience</li>
              <li><strong className="text-white">Usage counters</strong> — to enforce free-tier limits locally</li>
            </ul>
            <p>
              None of this localStorage data is shared with third parties or sent to analytics services.
              You can clear it at any time via your browser's site data settings.
            </p>
          </Section>

          <Section title="4. Third-party data processors">
            <p>
              We share data with the following processors only as needed to provide the service:
            </p>
            <Table rows={[
              ['Processor', 'Purpose', 'Data shared', 'Their privacy policy'],
              [
                'Stripe',
                'Payment processing and subscription management',
                'Email address, payment card (handled entirely by Stripe — we never see your card number)',
                'stripe.com/privacy',
              ],
              [
                'Railway',
                'Cloud hosting (server + database)',
                'All data stored in our PostgreSQL database is hosted on Railway infrastructure',
                'railway.app/legal/privacy',
              ],
            ]} />
            <p>
              We do not use Google Analytics, Facebook Pixel, or any other behavioral tracking
              service. We do not sell, rent, or trade your personal data to any third party.
            </p>
          </Section>

          <Section title="5. Data transfers">
            <p>
              Our servers and database are hosted in the United States (Railway infrastructure). If
              you access Cash Pedal from outside the US, your data is transferred to and processed
              in the US. By using the service you acknowledge this transfer.
            </p>
            <p>
              Stripe maintains Standard Contractual Clauses for EU/UK data transfers. Railway's
              infrastructure is subject to US law. For EU residents: by accepting our Terms you
              consent to this transfer under Article 49(1)(b) GDPR (necessary for the performance
              of a contract).
            </p>
          </Section>

          <Section title="6. Your rights">
            <p>
              Depending on your location you have the following rights over your personal data.
              To exercise any of these, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline">{CONTACT_EMAIL}</a>{' '}
              or use the tools below.
            </p>
            <Table rows={[
              ['Right', 'What it means', 'How to exercise it'],
              [
                'Access (Art. 15)',
                'Request a copy of the personal data we hold about you',
                `Email ${CONTACT_EMAIL} with subject "Data Access Request"`,
              ],
              [
                'Erasure (Art. 17)',
                'Request deletion of your personal data (where no legal obligation requires retention)',
                'Use the erasure form below, or email us',
              ],
              [
                'Rectification (Art. 16)',
                'Correct inaccurate data we hold',
                `Email ${CONTACT_EMAIL}`,
              ],
              [
                'Portability (Art. 20)',
                'Receive your data in a machine-readable format',
                `Email ${CONTACT_EMAIL}`,
              ],
              [
                'Objection (Art. 21)',
                'Object to processing based on legitimate interests (device tracking)',
                `Email ${CONTACT_EMAIL} — we will stop and delete the records`,
              ],
              [
                'Withdraw consent (Art. 7)',
                'Withdraw marketing consent at any time; withdrawal does not affect past processing',
                'Use the erasure form below or email us',
              ],
              [
                'Complaint',
                'Lodge a complaint with your national data protection authority',
                'EU residents: your national DPA. UK residents: ico.org.uk. California residents: state AG or CPPA.',
              ],
            ]} />
            <p className="text-xs italic">
              Note: Consent records (your agreement to our Terms) are exempt from the right to erasure
              under GDPR Art. 17(3)(b) because they are required as legal evidence of agreement.
              Stripe payment records are retained for financial dispute resolution and must be
              addressed directly to Stripe if you wish them deleted.
            </p>
          </Section>

          <Section title="7. Erase your data">
            <p>
              To delete your user profile data (name, email, and calculator history) from our
              database, send an erasure request. We process requests within 30 days.
            </p>
            <p>
              <strong className="text-white">Important:</strong> If you have an active subscription,
              cancel it first — we cannot erase data while access is still being delivered.
            </p>
            <div className="mt-3 p-4 rounded-xl border border-[var(--border)]"
              style={{ background: 'var(--surface)' }}>
              <p className="font-semibold text-white text-sm mb-1">Request erasure by email</p>
              <p className="mb-3">
                Send an email to{' '}
                <a href={`mailto:${CONTACT_EMAIL}?subject=Data Erasure Request&body=Please erase all personal data associated with this email address.`}
                  className="text-[var(--accent)] underline font-semibold">
                  {CONTACT_EMAIL}
                </a>{' '}
                with subject <em>"Data Erasure Request"</em> from the email address you used on
                Cash Pedal. We will confirm deletion within 30 days.
              </p>
              <p className="text-xs italic">
                We may ask you to verify ownership of the email address before processing the request.
              </p>
            </div>
          </Section>

          <Section title="8. Data security">
            <p>
              We use the following technical safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All traffic encrypted in transit via TLS</li>
              <li>Database connections require TLS with certificate verification</li>
              <li>IP addresses in device records stored as irreversible HMAC-SHA256 hashes — the original IP is never written to disk</li>
              <li>IP addresses in consent records have the last octet masked before storage</li>
              <li>Email addresses in logs are always redacted (only first character and domain shown)</li>
              <li>Stripe handles all payment card data — we never receive or store card numbers</li>
            </ul>
          </Section>

          <Section title="9. Children's data">
            <p>
              Cash Pedal is intended for users aged 18 and over. We do not knowingly collect
              personal data from anyone under 18. If you believe a minor has provided us with
              personal data, please contact us and we will delete it promptly.
            </p>
          </Section>

          <Section title="10. Changes to this policy">
            <p>
              We may update this Privacy Policy when our practices change. We will update the
              "Last updated" date at the top, and material changes affecting your rights will be
              reflected here and in our Terms of Service. Your continued use after the updated
              policy is posted constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For any privacy-related questions, data subject requests, or complaints:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline font-semibold">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>
              We are a small operation and read every email. Response time is typically within 5
              business days; legal deadline for data requests is 30 days.
            </p>
          </Section>

          <div className="mt-4 mb-10 flex flex-wrap gap-4 text-sm">
            <Link to="/about" className="text-[var(--accent)] hover:underline">← About &amp; FAQ</Link>
            <Link to="/subscribe" className="text-[var(--accent)] hover:underline">Manage subscription →</Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
