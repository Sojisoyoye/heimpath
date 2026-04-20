/**
 * Privacy Policy Page
 * Public legal page — accessible without authentication
 * GDPR-compliant privacy policy for EU users
 */

import { createFileRoute } from "@tanstack/react-router"

import { LegalSection } from "@/components/Common/LegalSection"
import { LandingFooter } from "@/components/Landing/LandingFooter"
import { LandingHeader } from "@/components/Landing/LandingHeader"

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy - HeimPath" },
      {
        name: "description",
        content:
          "HeimPath privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR.",
      },
    ],
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

const LAST_UPDATED = "April 20, 2026"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Privacy Policy page. */
function PrivacyPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            <LegalSection title="1. Data Controller">
              <p>
                The data controller responsible for processing your personal
                data is:
              </p>
              <p>
                HeimPath
                <br />
                Email:{" "}
                <a
                  href="mailto:privacy@heimpath.com"
                  className="text-foreground underline underline-offset-4"
                >
                  privacy@heimpath.com
                </a>
              </p>
              <p>
                For details about our company, please see our{" "}
                <a
                  href="/imprint"
                  className="text-foreground underline underline-offset-4"
                >
                  Imprint
                </a>
                .
              </p>
            </LegalSection>

            <LegalSection title="2. What Data We Collect">
              <p>We collect and process the following categories of data:</p>
              <p className="font-medium text-foreground">Account data</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Email address, name, and password (hashed) when you create an
                  account
                </li>
                <li>
                  Profile information you provide (e.g., citizenship, property
                  preferences)
                </li>
              </ul>
              <p className="font-medium text-foreground">Usage data</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Pages visited, features used, journey progress, and calculator
                  inputs
                </li>
                <li>
                  Device information (browser type, operating system, screen
                  resolution)
                </li>
                <li>IP address and approximate location (country/region)</li>
              </ul>
              <p className="font-medium text-foreground">Uploaded documents</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Documents you upload for translation (e.g., purchase
                  agreements, rental contracts)
                </li>
                <li>
                  These may contain personal data — please redact sensitive
                  information before uploading if you wish
                </li>
              </ul>
              <p className="font-medium text-foreground">Payment data</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Payment processing is handled by Stripe. We do not store your
                  credit card numbers
                </li>
                <li>
                  We receive transaction confirmations, subscription status, and
                  billing email from Stripe
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="3. Legal Basis for Processing">
              <p>
                We process your data under the following legal bases (GDPR Art.
                6):
              </p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  <span className="font-medium text-foreground">
                    Contract performance (Art. 6(1)(b)):
                  </span>{" "}
                  Processing necessary to provide our services (account
                  management, journey tracking, calculations, document
                  translation)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Legitimate interest (Art. 6(1)(f)):
                  </span>{" "}
                  Analytics and error monitoring to improve our services, fraud
                  prevention, and security
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Consent (Art. 6(1)(a)):
                  </span>{" "}
                  Marketing communications (you can withdraw consent at any
                  time)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Legal obligation (Art. 6(1)(c)):
                  </span>{" "}
                  Retention of billing records as required by German tax law
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="4. Third-Party Services">
              <p>
                We share data with the following third-party processors, each
                bound by data processing agreements
                (Auftragsverarbeitungsvertrag / AVV):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th
                        scope="col"
                        className="pb-2 pr-4 font-semibold text-foreground"
                      >
                        Service
                      </th>
                      <th
                        scope="col"
                        className="pb-2 pr-4 font-semibold text-foreground"
                      >
                        Purpose
                      </th>
                      <th
                        scope="col"
                        className="pb-2 font-semibold text-foreground"
                      >
                        Data shared
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 pr-4">Microsoft Azure</td>
                      <td className="py-2 pr-4">
                        Hosting, document translation (Azure Translator)
                      </td>
                      <td className="py-2">
                        All platform data, uploaded documents
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Stripe</td>
                      <td className="py-2 pr-4">Payment processing</td>
                      <td className="py-2">
                        Email, subscription plan, payment details
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">SendGrid</td>
                      <td className="py-2 pr-4">Transactional emails</td>
                      <td className="py-2">Email address, name</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Sentry</td>
                      <td className="py-2 pr-4">Error monitoring</td>
                      <td className="py-2">
                        Error logs, device info, IP address
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                All processors are located within the EU/EEA or operate under
                Standard Contractual Clauses (SCCs) approved by the European
                Commission for data transfers outside the EU.
              </p>
            </LegalSection>

            <LegalSection title="5. Cookies and Tracking">
              <p>
                We use essential cookies required for the platform to function
                (e.g., authentication tokens, session management). These do not
                require consent under the ePrivacy Directive.
              </p>
              <p>
                We do not currently use third-party analytics cookies or
                advertising trackers. If this changes, we will implement a
                cookie consent mechanism and update this policy.
              </p>
            </LegalSection>

            <LegalSection title="6. Data Retention">
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  <span className="font-medium text-foreground">
                    Account data:
                  </span>{" "}
                  Retained while your account is active. Deleted within 30 days
                  of account deletion.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Uploaded documents:
                  </span>{" "}
                  Retained while your account is active. Deleted within 30 days
                  of account deletion or upon your request.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Billing records:
                  </span>{" "}
                  Retained for 10 years as required by German tax law (AO
                  &sect;147).
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Error logs:
                  </span>{" "}
                  Retained for 90 days, then automatically purged.
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="7. Your Rights (GDPR)">
              <p>
                Under the General Data Protection Regulation, you have the
                following rights:
              </p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  <span className="font-medium text-foreground">
                    Right of access (Art. 15):
                  </span>{" "}
                  Request a copy of all personal data we hold about you
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to rectification (Art. 16):
                  </span>{" "}
                  Correct inaccurate personal data
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to erasure (Art. 17):
                  </span>{" "}
                  Request deletion of your personal data (&quot;right to be
                  forgotten&quot;)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to restrict processing (Art. 18):
                  </span>{" "}
                  Limit how we use your data
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to data portability (Art. 20):
                  </span>{" "}
                  Receive your data in a machine-readable format
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to object (Art. 21):
                  </span>{" "}
                  Object to processing based on legitimate interest
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Right to withdraw consent (Art. 7(3)):
                  </span>{" "}
                  Withdraw consent for marketing communications at any time
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a
                  href="mailto:privacy@heimpath.com"
                  className="text-foreground underline underline-offset-4"
                >
                  privacy@heimpath.com
                </a>
                . We will respond within 30 days.
              </p>
            </LegalSection>

            <LegalSection title="8. Right to Lodge a Complaint">
              <p>
                You have the right to lodge a complaint with a data protection
                supervisory authority. In Germany, you can contact:
              </p>
              <p>
                Berliner Beauftragte für Datenschutz und Informationsfreiheit
                <br />
                Friedrichstr. 219, 10969 Berlin
                <br />
                <a
                  href="https://www.datenschutz-berlin.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  www.datenschutz-berlin.de
                </a>
              </p>
            </LegalSection>

            <LegalSection title="9. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify registered users of material changes via email at least
                14 days before the changes take effect. The &quot;Last
                updated&quot; date at the top of this page indicates the most
                recent revision.
              </p>
            </LegalSection>

            <LegalSection title="10. Contact">
              <p>
                For privacy-related inquiries, please contact us at{" "}
                <a
                  href="mailto:privacy@heimpath.com"
                  className="text-foreground underline underline-offset-4"
                >
                  privacy@heimpath.com
                </a>
                .
              </p>
            </LegalSection>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
