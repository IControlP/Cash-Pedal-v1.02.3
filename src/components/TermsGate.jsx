import { useState } from 'react'
import { safeGet, safeSet } from '../utils/safeStorage'
import { safeUUID } from '../utils/safeId'

export const TERMS_VERSION     = '4.0.0'
export const LS_TERMS_ACCEPTED = 'cashpedal_terms_accepted'
export const LS_TERMS_VERSION  = 'cashpedal_terms_version'
export const LS_SESSION_ID     = 'cashpedal_session_id'

export function getSessionId() {
  let sid = safeGet(LS_SESSION_ID)
  if (!sid) {
    sid = safeUUID()
    safeSet(LS_SESSION_ID, sid)
  }
  return sid
}

export default function TermsGate({ onAccepted }) {
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)
  const [saving, setSaving] = useState(false)

  const allChecked = check1 && check2 && check3

  async function handleAccept() {
    if (!allChecked) return
    setSaving(true)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id:                safeUUID(),
          session_id:               getSessionId(),
          terms_version:            TERMS_VERSION,
          disclaimers_acknowledged: check1,
          liability_acknowledged:   check2,
          final_consent_given:      check3,
        }),
      })
    } catch (e) {
      console.warn('[terms] consent save failed:', e)
    }
    safeSet(LS_TERMS_ACCEPTED, 'true')
    safeSet(LS_TERMS_VERSION, TERMS_VERSION)
    setSaving(false)
    onAccepted()
  }

  const checkboxes = [
    {
      checked: check1, onChange: setCheck1,
      label: 'I understand that CashPedal provides cost estimates for informational and educational purposes only. These are approximations and not guarantees.',
    },
    {
      checked: check2, onChange: setCheck2,
      label: 'I acknowledge the limitation of liability and assumption of risk. CashPedal is not liable for any decisions I make based on these estimates.',
    },
    {
      checked: check3, onChange: setCheck3,
      label: 'I have read, understood, and agree to be bound by the complete Terms and Conditions above and the Privacy Policy, including the binding arbitration clause, class action waiver, and California governing law provisions (Sections 11–12).',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-start justify-center py-12 px-4">
      <div className="card w-full max-w-2xl">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
            <span className="w-4 h-px bg-[var(--accent)]" /> CashPedal
          </div>
          <h1 className="font-display font-extrabold text-white text-2xl sm:text-3xl">Welcome to CashPedal</h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm">
            Please review and accept our Terms and Privacy Policy to continue
          </p>
        </div>

        <details className="mb-6 rounded-xl border border-[var(--border)] overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--accent)] select-none hover:bg-[var(--surface-hover)] transition-colors">
            View Full Terms and Conditions
          </summary>
          <div className="px-4 pb-4 pt-2 max-h-60 overflow-y-auto text-[var(--text-muted)] text-xs space-y-3 border-t border-[var(--border)]">
            <p className="text-white font-semibold">Terms and Conditions — Version {TERMS_VERSION} — Last Updated: March 2026</p>
            <p className="text-[var(--text-muted)] italic">Governing State: California | Operator: Sole Proprietor d/b/a CashPedal</p>

            <p><strong className="text-white">1. Acceptance of Terms</strong><br />
            By accessing or using CashPedal.io ("the Service"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree, you must immediately stop using the Service. These Terms constitute a legally binding agreement governed exclusively by California law, regardless of where you are located.</p>

            <p><strong className="text-white">2. Operator Identity</strong><br />
            CashPedal.io is operated by a sole proprietor doing business under the trade name "CashPedal." No corporation, LLC, or other legal entity is implied. Use of this Service does not create any agency, partnership, or employment relationship.</p>

            <p><strong className="text-white">3. Eligibility</strong><br />
            This Service is intended for users who are at least 18 years of age and capable of entering into a legally binding contract. If you are under 18, you may not use the Service.</p>

            <p><strong className="text-white">4. Service Description</strong><br />
            CashPedal provides vehicle Total Cost of Ownership (TCO) calculations for general informational and educational purposes only. All outputs are computer-generated approximations based on statistical models and assumed variables. The Service does not account for your specific financial circumstances, vehicle condition, geographic market, driving habits, insurance history, credit profile, or other individual factors. Fuel prices, depreciation rates, insurance premiums, tax rates, financing terms, and maintenance costs fluctuate continuously. <strong className="text-white">Actual costs may differ materially from any estimate produced by the Service.</strong> No output from this Service should be treated as a prediction, guarantee, or professional assessment.</p>

            <p><strong className="text-white">5. Intellectual Property &amp; License</strong><br />
            All content, design, code, data, and output on CashPedal.io is owned by or licensed to the operator. You receive a limited, non-exclusive, revocable, non-transferable license to access and use the Service for personal, non-commercial informational purposes only. You may not reproduce, redistribute, resell, scrape, reverse-engineer, or commercially exploit any portion of the Service without prior written consent.</p>

            <p><strong className="text-white">6. Disclaimer of Warranties</strong><br />
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, COMPLETENESS, OR NON-INFRINGEMENT. We expressly disclaim any warranty that estimates will reflect actual costs, data inputs are error-free, or the Service will be uninterrupted or secure. This disclaimer applies to the fullest extent permitted by applicable law.</p>

            <p><strong className="text-white">7. Not Financial, Legal, or Professional Advice</strong><br />
            Nothing on CashPedal.io constitutes financial, investment, legal, tax, insurance, or professional advice of any kind. Use of the Service does not create any advisory, fiduciary, or professional relationship. All information is provided for educational and general reference purposes only. <strong className="text-white">Consult a licensed financial advisor, attorney, insurance professional, or other qualified expert before making any financial decision.</strong> Reliance on this Service is entirely at your own risk.</p>

            <p><strong className="text-white">8. Limitation of Liability</strong><br />
            The following limitations apply only to claims arising from ordinary negligence or breach of contract. Consistent with California Civil Code §1668, these limitations do not apply to claims arising from fraud, willful misconduct, or intentional torts.<br /><br />
            TO THE MAXIMUM EXTENT PERMITTED BY CALIFORNIA LAW: (a) CashPedal shall not be liable for any indirect, incidental, special, consequential, or exemplary damages, including loss of profits, loss of data, or any financial loss arising from your use of or reliance on the Service; (b) CashPedal shall not be liable for any vehicle purchase, lease, financing, or ownership decision made in reliance on the Service's estimates; (c) our total cumulative liability for any negligence or contract-based claim shall not exceed the greater of: (i) the total fees you paid in the 12 months preceding the claim, or (ii) five dollars ($5.00). If the Service was accessed at no charge, our maximum liability for such claims is zero ($0.00).</p>

            <p><strong className="text-white">9. Assumption of Risk</strong><br />
            By using the Service, you expressly acknowledge that: vehicle ownership and purchase decisions carry inherent and substantial financial risk; TCO estimates are mathematical approximations and not guarantees; input assumptions materially affect outputs and may not reflect your real-world situation; you have independently verified or will independently verify any material information before acting on it; and you are solely and exclusively responsible for all financial decisions you make.</p>

            <p><strong className="text-white">10. Indemnification</strong><br />
            You agree to defend, indemnify, and hold harmless the operator of CashPedal from and against any and all third-party claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or relating to: (a) your use of or access to the Service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) your violation of any right of a third party. This obligation survives termination.</p>

            <p><strong className="text-white">11. Dispute Resolution &amp; Arbitration</strong><br />
            <strong className="text-white">PLEASE READ CAREFULLY — AFFECTS YOUR LEGAL RIGHTS INCLUDING YOUR RIGHT TO A JURY TRIAL.</strong><br /><br />
            Except as provided below, any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively by binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Exceptions: either party may bring qualifying claims in California small claims court, or seek emergency injunctive relief to prevent irreparable harm.<br /><br />
            <strong className="text-white">CCPA Carve-Out:</strong> Nothing in this arbitration provision limits any rights or remedies available to you under the CCPA/CPRA to the extent such rights may not be waived by private contract.<br /><br />
            <strong className="text-white">CLASS ACTION WAIVER: YOU AND CASHPEDAL EACH AGREE THAT DISPUTES MAY ONLY BE BROUGHT IN YOUR OR OUR INDIVIDUAL CAPACITY. YOU WAIVE ANY RIGHT TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION OR REPRESENTATIVE PROCEEDING.</strong><br /><br />
            Opt-Out Right: You may opt out of arbitration within 30 days of first accepting these Terms by emailing support@cashpedal.io with subject "Arbitration Opt-Out." Arbitration Location: San Diego County, California, or remotely by mutual agreement.</p>

            <p><strong className="text-white">12. Governing Law &amp; Jurisdiction</strong><br />
            These Terms shall be governed by the laws of the State of California, without regard to conflict-of-law principles. To the extent any matter is not subject to arbitration, the parties irrevocably consent to the exclusive jurisdiction of state and federal courts in San Diego County, California.</p>

            <p><strong className="text-white">13. California Consumer Rights Notice (Cal. Civil Code §1789.3)</strong><br />
            The Service is provided free of charge. To file a complaint, contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs at: 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834 | Tel: (800) 952-5210.</p>

            <p><strong className="text-white">14. Prohibited Conduct</strong><br />
            You agree not to: use the Service to provide commercial financial advice to third parties; submit false or fraudulent inputs; attempt to reverse-engineer or extract proprietary models or code; use automated bots or scrapers to harvest content; or use the Service in any manner that violates applicable law.</p>

            <p><strong className="text-white">15. User-Generated Content &amp; Reviews</strong><br />
            Consistent with California Civil Code §1670.8, nothing in these Terms restricts your right to make truthful statements about your experience with the Service.</p>

            <p><strong className="text-white">16. Privacy &amp; CCPA Compliance</strong><br />
            We collect limited data as described in our <a href="/privacy" className="text-[var(--accent)] underline">Privacy Policy</a>, including acceptance logs for legal compliance. We do not sell your personal information. California residents have rights under the CCPA/CPRA, including the right to know, delete, opt out, and non-discrimination. To exercise your rights: support@cashpedal.io.</p>

            <p><strong className="text-white">17. Modifications to Terms</strong><br />
            We reserve the right to modify these Terms at any time. Changes will be indicated by an updated version number and "Last Updated" date. Your continued use after any modification constitutes acceptance of the revised Terms.</p>

            <p><strong className="text-white">18. Termination</strong><br />
            We reserve the right to suspend or terminate your access at any time, with or without notice, for any violation of these Terms. Sections 7, 8, 10, 11, 12, and 15 survive termination.</p>

            <p><strong className="text-white">19. Severability</strong><br />
            If any provision is found invalid or unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, or severed. Remaining provisions continue in full force.</p>

            <p><strong className="text-white">20. Entire Agreement</strong><br />
            These Terms, together with the Privacy Policy at cashpedal.io/privacy, constitute the entire agreement between you and CashPedal with respect to the Service and supersede all prior agreements.</p>

            <p><strong className="text-white">21. No Waiver</strong><br />
            Failure by CashPedal to enforce any right or provision shall not constitute a waiver. Any waiver must be in writing and signed by the operator to be effective.</p>

            <p><strong className="text-white">22. Contact</strong><br />
            For questions regarding these Terms, privacy rights requests, or arbitration opt-outs: <strong>support@cashpedal.io</strong></p>
          </div>
        </details>

        <div className="h-px bg-[var(--border)] mb-6" />

        <p className="text-white font-semibold text-sm mb-4">
          Required Acknowledgments — check all boxes to proceed:
        </p>

        <div className="flex flex-col gap-3 mb-5">
          {checkboxes.map(({ checked, onChange, label }, i) => (
            <label key={i}
              className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
              style={{
                borderColor: checked ? 'rgba(255,184,0,0.4)' : 'var(--border)',
                background: checked ? 'rgba(255,184,0,0.04)' : 'var(--surface)',
              }}>
              <input
                type="checkbox" checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-sm text-[var(--text-muted)] leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        {!allChecked && (
          <p className="text-xs text-yellow-400 mb-4">
            Please check all three boxes above to accept the terms.
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={!allChecked || saving}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'I Accept These Terms — Continue to CashPedal'}
        </button>

        <p className="text-center text-[var(--text-muted)] text-xs mt-4">
          By continuing you also agree to our{' '}
          <a href="/privacy" className="text-[var(--accent)] underline hover:brightness-110">Privacy Policy</a>.{' '}
          Questions? Contact <strong className="text-white">support@cashpedal.io</strong>
        </p>
      </div>
    </div>
  )
}
