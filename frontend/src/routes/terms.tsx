/**
 * Terms of Service Page
 * Public legal page — accessible without authentication
 */

import { createFileRoute } from "@tanstack/react-router"

import { LegalSection } from "@/components/Common/LegalSection"
import { LandingFooter } from "@/components/Landing/LandingFooter"
import { LandingHeader } from "@/components/Landing/LandingHeader"

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service - HeimPath" },
      {
        name: "description",
        content:
          "Terms of Service for HeimPath, the German real estate navigator for foreign investors and immigrants.",
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

/** Default component. Terms of Service page. */
function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            <LegalSection title="1. Scope of Services">
              <p>
                HeimPath (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
                provides an online platform that helps foreign investors and
                immigrants navigate the German real estate market. Our services
                include guided property journeys, financial calculators, a legal
                knowledge base, document translation tools, and a glossary of
                German real estate terminology.
              </p>
              <p>
                By creating an account or using our services, you agree to these
                Terms of Service. If you do not agree, please do not use
                HeimPath.
              </p>
            </LegalSection>

            <LegalSection title="2. Important Disclaimers">
              <p className="font-medium text-foreground">
                HeimPath is an informational and educational platform. We are
                not a law firm, tax advisory service, financial advisor, or
                licensed real estate broker.
              </p>
              <p>
                The content provided through our platform — including legal
                summaries, financial calculations, cost estimates, and document
                translations — is for general informational purposes only and
                does not constitute legal, tax, financial, or professional
                advice.
              </p>
              <p>
                Our calculators provide estimates based on publicly available
                rates and user-provided inputs. Actual costs may vary. Always
                consult a qualified notary (Notar), tax advisor (Steuerberater),
                or legal professional before making property purchase decisions.
              </p>
            </LegalSection>

            <LegalSection title="3. User Accounts">
              <p>
                You must provide accurate and complete information when creating
                an account. You are responsible for maintaining the
                confidentiality of your login credentials and for all activities
                under your account.
              </p>
              <p>
                You must be at least 18 years old to create an account. We
                reserve the right to suspend or terminate accounts that violate
                these terms.
              </p>
            </LegalSection>

            <LegalSection title="4. Acceptable Use">
              <p>You agree not to:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>
                  Use the platform for any unlawful purpose or in violation of
                  applicable laws
                </li>
                <li>
                  Upload documents you do not have the legal right to share
                </li>
                <li>
                  Attempt to gain unauthorized access to other users&apos;
                  accounts or data
                </li>
                <li>
                  Reverse-engineer, decompile, or attempt to extract source code
                  from our platform
                </li>
                <li>
                  Use automated tools to scrape or collect data from the
                  platform
                </li>
              </ul>
            </LegalSection>

            <LegalSection title="5. Subscriptions and Payments">
              <p>
                HeimPath offers free and paid subscription tiers. Paid
                subscriptions are billed through our payment processor (Stripe).
                By subscribing to a paid plan, you authorize us to charge the
                payment method on file.
              </p>
              <p>
                Subscription fees are billed in advance on a monthly or annual
                basis. You may cancel your subscription at any time through your
                account settings. Cancellation takes effect at the end of the
                current billing period.
              </p>
              <p>
                We reserve the right to change subscription pricing with 30 days
                advance notice. Existing subscribers will be notified before any
                price change takes effect.
              </p>
            </LegalSection>

            <LegalSection title="6. Document Translation">
              <p>
                Our document translation feature uses automated translation
                technology. Translations are provided as-is and may contain
                inaccuracies, particularly for legal and financial terminology.
              </p>
              <p>
                Translated documents should be reviewed by a qualified
                professional before being relied upon for legal or financial
                decisions. We flag terms that may require expert review, but
                this flagging is not exhaustive.
              </p>
              <p>
                Documents you upload are processed in accordance with our
                Privacy Policy. We do not claim ownership of your uploaded
                documents.
              </p>
            </LegalSection>

            <LegalSection title="7. Intellectual Property">
              <p>
                All content on HeimPath — including text, graphics, logos, and
                software — is owned by HeimPath or its licensors and protected
                by applicable intellectual property laws.
              </p>
              <p>
                You retain ownership of any documents you upload. By using our
                translation and analysis features, you grant us a limited
                license to process your documents solely for the purpose of
                providing the requested services.
              </p>
            </LegalSection>

            <LegalSection title="8. Limitation of Liability">
              <p>
                To the maximum extent permitted by applicable law, HeimPath
                shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from your use of or
                inability to use the platform.
              </p>
              <p>
                Our total liability for any claim arising from these terms or
                your use of the platform shall not exceed the amount you paid to
                us in the 12 months preceding the claim.
              </p>
              <p>
                We do not guarantee the accuracy, completeness, or timeliness of
                any information provided through the platform, including but not
                limited to tax rates, legal summaries, cost calculations, and
                market data.
              </p>
            </LegalSection>

            <LegalSection title="9. Termination">
              <p>
                You may delete your account at any time through your account
                settings. We may suspend or terminate your account if you
                violate these terms.
              </p>
              <p>
                Upon termination, your right to use the platform ceases
                immediately. We may retain certain data as required by law or
                for legitimate business purposes, as described in our Privacy
                Policy.
              </p>
            </LegalSection>

            <LegalSection title="10. Changes to These Terms">
              <p>
                We may update these Terms of Service from time to time. We will
                notify registered users of material changes via email or an
                in-app notification at least 14 days before the changes take
                effect.
              </p>
              <p>
                Continued use of the platform after changes take effect
                constitutes acceptance of the updated terms.
              </p>
            </LegalSection>

            <LegalSection title="11. Governing Law and Jurisdiction">
              <p>
                These terms are governed by the laws of the Federal Republic of
                Germany. Any disputes arising from these terms or your use of
                the platform shall be subject to the exclusive jurisdiction of
                the courts of Berlin, Germany.
              </p>
            </LegalSection>

            <LegalSection title="12. Contact">
              <p>
                If you have questions about these Terms of Service, please
                contact us at{" "}
                <a
                  href="mailto:legal@heimpath.com"
                  className="text-foreground underline underline-offset-4"
                >
                  legal@heimpath.com
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
