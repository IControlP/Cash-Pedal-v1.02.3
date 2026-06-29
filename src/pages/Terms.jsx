import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// Terms version is preserved from the previous acceptance gate so existing
// consent records remain meaningful.
export const TERMS_VERSION = '4.0.0'
const LAST_UPDATED = 'March 2026'
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

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">

          <div className="anim-0 mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            <span className="w-4 h-px bg-[var(--accent)]" />
            Terms of Service
          </div>
          <h1 className="anim-1 font-display font-extrabold text-white text-3xl sm:text-4xl leading-tight mt-1 mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-8 anim-1">
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Version {TERMS_VERSION} &nbsp;·&nbsp;
            Governing State: California &nbsp;·&nbsp; Operator: Sole Proprietor d/b/a CashPedal
          </p>

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using CashPedal.io ("the Service"), you confirm that you have read,
              understood, and agree to be bound by these Terms and Conditions ("Terms") and our{' '}
              <Link to="/privacy" className="text-[var(--accent)] underline">Privacy Policy</Link>. If you
              do not agree, you must immediately stop using the Service. These Terms constitute a legally
              binding agreement governed exclusively by California law, regardless of where you are located.
            </p>
          </Section>

          <Section title="2. Operator Identity">
            <p>
              CashPedal.io is operated by a sole proprietor doing business under the trade name
              "CashPedal." No corporation, LLC, or other legal entity is implied. Use of this Service does
              not create any agency, partnership, or employment relationship.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              This Service is intended for users who are at least 18 years of age and capable of entering
              into a legally binding contract. If you are under 18, you may not use the Service.
            </p>
          </Section>

          <Section title="4. Service Description">
            <p>
              CashPedal provides vehicle Total Cost of Ownership (TCO) calculations for general
              informational and educational purposes only. All outputs are computer-generated
              approximations based on statistical models and assumed variables. The Service does not
              account for your specific financial circumstances, vehicle condition, geographic market,
              driving habits, insurance history, credit profile, or other individual factors. Fuel prices,
              depreciation rates, insurance premiums, tax rates, financing terms, and maintenance costs
              fluctuate continuously. <strong className="text-white">Actual costs may differ materially
              from any estimate produced by the Service.</strong> No output from this Service should be
              treated as a prediction, guarantee, or professional assessment.
            </p>
          </Section>

          <Section title="5. Intellectual Property & License">
            <p>
              All content, design, code, data, and output on CashPedal.io is owned by or licensed to the
              operator. You receive a limited, non-exclusive, revocable, non-transferable license to access
              and use the Service for personal, non-commercial informational purposes only. You may not
              reproduce, redistribute, resell, scrape, reverse-engineer, or commercially exploit any
              portion of the Service without prior written consent.
            </p>
          </Section>

          <Section title="6. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, ACCURACY, COMPLETENESS, OR NON-INFRINGEMENT. We expressly disclaim any warranty that
              estimates will reflect actual costs, data inputs are error-free, or the Service will be
              uninterrupted or secure. This disclaimer applies to the fullest extent permitted by
              applicable law.
            </p>
          </Section>

          <Section title="7. Not Financial, Legal, or Professional Advice">
            <p>
              Nothing on CashPedal.io constitutes financial, investment, legal, tax, insurance, or
              professional advice of any kind. Use of the Service does not create any advisory, fiduciary,
              or professional relationship. All information is provided for educational and general
              reference purposes only. <strong className="text-white">Consult a licensed financial advisor,
              attorney, insurance professional, or other qualified expert before making any financial
              decision.</strong> Reliance on this Service is entirely at your own risk.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              The following limitations apply only to claims arising from ordinary negligence or breach of
              contract. Consistent with California Civil Code §1668, these limitations do not apply to
              claims arising from fraud, willful misconduct, or intentional torts.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY CALIFORNIA LAW: (a) CashPedal shall not be liable for any
              indirect, incidental, special, consequential, or exemplary damages, including loss of
              profits, loss of data, or any financial loss arising from your use of or reliance on the
              Service; (b) CashPedal shall not be liable for any vehicle purchase, lease, financing, or
              ownership decision made in reliance on the Service's estimates; (c) our total cumulative
              liability for any negligence or contract-based claim shall not exceed the greater of: (i) the
              total fees you paid in the 12 months preceding the claim, or (ii) five dollars ($5.00). If the
              Service was accessed at no charge, our maximum liability for such claims is zero ($0.00).
            </p>
          </Section>

          <Section title="9. Assumption of Risk">
            <p>
              By using the Service, you expressly acknowledge that: vehicle ownership and purchase
              decisions carry inherent and substantial financial risk; TCO estimates are mathematical
              approximations and not guarantees; input assumptions materially affect outputs and may not
              reflect your real-world situation; you have independently verified or will independently
              verify any material information before acting on it; and you are solely and exclusively
              responsible for all financial decisions you make.
            </p>
          </Section>

          <Section title="10. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless the operator of CashPedal from and against
              any and all third-party claims, damages, losses, liabilities, costs, and expenses (including
              reasonable attorneys' fees) arising from or relating to: (a) your use of or access to the
              Service; (b) your violation of these Terms; (c) your violation of any applicable law or
              regulation; or (d) your violation of any right of a third party. This obligation survives
              termination.
            </p>
          </Section>

          <Section title="11. Dispute Resolution & Arbitration">
            <p>
              <strong className="text-white">PLEASE READ CAREFULLY — AFFECTS YOUR LEGAL RIGHTS INCLUDING
              YOUR RIGHT TO A JURY TRIAL.</strong>
            </p>
            <p>
              Except as provided below, any dispute arising out of or relating to these Terms or the
              Service shall be resolved exclusively by binding individual arbitration administered by the
              American Arbitration Association (AAA) under its Consumer Arbitration Rules. Exceptions:
              either party may bring qualifying claims in California small claims court, or seek emergency
              injunctive relief to prevent irreparable harm.
            </p>
            <p>
              <strong className="text-white">CCPA Carve-Out:</strong> Nothing in this arbitration provision
              limits any rights or remedies available to you under the CCPA/CPRA to the extent such rights
              may not be waived by private contract.
            </p>
            <p>
              <strong className="text-white">CLASS ACTION WAIVER: YOU AND CASHPEDAL EACH AGREE THAT DISPUTES
              MAY ONLY BE BROUGHT IN YOUR OR OUR INDIVIDUAL CAPACITY. YOU WAIVE ANY RIGHT TO PARTICIPATE AS
              A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION OR REPRESENTATIVE PROCEEDING.</strong>
            </p>
            <p>
              Opt-Out Right: You may opt out of arbitration within 30 days of first accepting these Terms by
              emailing support@cashpedal.io with subject "Arbitration Opt-Out." Arbitration Location: San
              Diego County, California, or remotely by mutual agreement.
            </p>
          </Section>

          <Section title="12. Governing Law & Jurisdiction">
            <p>
              These Terms shall be governed by the laws of the State of California, without regard to
              conflict-of-law principles. To the extent any matter is not subject to arbitration, the
              parties irrevocably consent to the exclusive jurisdiction of state and federal courts in San
              Diego County, California.
            </p>
          </Section>

          <Section title="13. California Consumer Rights Notice (Cal. Civil Code §1789.3)">
            <p>
              The Service is provided free of charge. To file a complaint, contact the Complaint Assistance
              Unit of the Division of Consumer Services of the California Department of Consumer Affairs at:
              1625 North Market Blvd., Suite N 112, Sacramento, CA 95834 | Tel: (800) 952-5210.
            </p>
          </Section>

          <Section title="14. Prohibited Conduct">
            <p>
              You agree not to: use the Service to provide commercial financial advice to third parties;
              submit false or fraudulent inputs; attempt to reverse-engineer or extract proprietary models
              or code; use automated bots or scrapers to harvest content; or use the Service in any manner
              that violates applicable law.
            </p>
          </Section>

          <Section title="15. User-Generated Content & Reviews">
            <p>
              Consistent with California Civil Code §1670.8, nothing in these Terms restricts your right to
              make truthful statements about your experience with the Service.
            </p>
          </Section>

          <Section title="16. Privacy & CCPA Compliance">
            <p>
              We collect limited data as described in our{' '}
              <Link to="/privacy" className="text-[var(--accent)] underline">Privacy Policy</Link>, including
              acceptance logs for legal compliance. We do not sell your personal information. California
              residents have rights under the CCPA/CPRA, including the right to know, delete, opt out, and
              non-discrimination. To exercise your rights:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section title="17. Modifications to Terms">
            <p>
              We reserve the right to modify these Terms at any time. Changes will be indicated by an
              updated version number and "Last Updated" date. Your continued use after any modification
              constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="18. Termination">
            <p>
              We reserve the right to suspend or terminate your access at any time, with or without notice,
              for any violation of these Terms. Sections 7, 8, 10, 11, 12, and 15 survive termination.
            </p>
          </Section>

          <Section title="19. Severability">
            <p>
              If any provision is found invalid or unenforceable, it shall be modified to the minimum
              extent necessary to make it enforceable, or severed. Remaining provisions continue in full
              force.
            </p>
          </Section>

          <Section title="20. Entire Agreement">
            <p>
              These Terms, together with the{' '}
              <Link to="/privacy" className="text-[var(--accent)] underline">Privacy Policy</Link> at
              cashpedal.io/privacy, constitute the entire agreement between you and CashPedal with respect
              to the Service and supersede all prior agreements.
            </p>
          </Section>

          <Section title="21. No Waiver">
            <p>
              Failure by CashPedal to enforce any right or provision shall not constitute a waiver. Any
              waiver must be in writing and signed by the operator to be effective.
            </p>
          </Section>

          <Section title="22. Contact">
            <p>
              For questions regarding these Terms, privacy rights requests, or arbitration opt-outs:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--accent)] underline">{CONTACT_EMAIL}</a>
            </p>
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  )
}
