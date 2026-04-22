/**
 * Imprint (Impressum) Page
 * Legally required in Germany under TMG §5
 * Public legal page — accessible without authentication
 *
 * TODO: Replace all bracketed placeholder fields (e.g., [Company legal name])
 * with real company information before production launch. TMG §5 requires
 * complete company details for any commercial German website.
 */

import { createFileRoute } from "@tanstack/react-router"

import { seoMeta } from "@/common/seo"
import { LegalSection } from "@/components/Common/LegalSection"
import { LandingFooter } from "@/components/Landing/LandingFooter"
import { LandingHeader } from "@/components/Landing/LandingHeader"

export const Route = createFileRoute("/imprint")({
  component: ImprintPage,
  head: () => ({
    meta: seoMeta({
      title: "Imprint - HeimPath",
      description:
        "Impressum (Imprint) for HeimPath pursuant to §5 TMG. Company information, contact details, and legal notices.",
      path: "/imprint",
    }),
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

const LAST_UPDATED = "April 20, 2026"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Imprint (Impressum) page. */
function ImprintPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Imprint (Impressum)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Information pursuant to &sect;5 TMG (Telemediengesetz)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            <LegalSection title="Company Information">
              <p>
                HeimPath
                <br />
                [Company legal name to be added]
                <br />
                [Street address]
                <br />
                [Postal code, City], Germany
              </p>
            </LegalSection>

            <LegalSection title="Contact">
              <p>
                Email:{" "}
                <a
                  href="mailto:contact@heimpath.com"
                  className="text-foreground underline underline-offset-4"
                >
                  contact@heimpath.com
                </a>
                <br />
                Phone: [Phone number to be added]
              </p>
            </LegalSection>

            <LegalSection title="Represented by">
              <p>[Managing director / founder name to be added]</p>
            </LegalSection>

            <LegalSection title="Register Entry">
              <p>
                [Trade register entry to be added upon registration]
                <br />
                Registration court: [Amtsgericht]
                <br />
                Registration number: [HRB number]
              </p>
            </LegalSection>

            <LegalSection title="VAT Identification Number">
              <p>
                VAT ID pursuant to &sect;27a Umsatzsteuergesetz:
                <br />
                [VAT ID to be added, e.g., DE XXXXXXXXX]
              </p>
            </LegalSection>

            <LegalSection title="Responsible for Content">
              <p>
                Responsible for content pursuant to &sect;18 Abs. 2 MStV:
                <br />
                [Name]
                <br />
                [Address]
              </p>
            </LegalSection>

            <LegalSection title="Dispute Resolution">
              <p>
                The European Commission provides a platform for online dispute
                resolution (ODR):{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>
                We are neither obligated nor willing to participate in dispute
                resolution proceedings before a consumer arbitration board.
              </p>
            </LegalSection>

            <LegalSection title="Liability for Content">
              <p>
                As a service provider, we are responsible for our own content on
                these pages under general law pursuant to &sect;7(1) TMG.
                However, under &sect;&sect;8 to 10 TMG, we are not obligated to
                monitor transmitted or stored third-party information or to
                investigate circumstances that indicate illegal activity.
              </p>
              <p>
                Obligations to remove or block the use of information under
                general law remain unaffected. However, liability in this regard
                is only possible from the point in time at which we become aware
                of a specific infringement. Upon becoming aware of such
                violations, we will remove the content immediately.
              </p>
            </LegalSection>

            <LegalSection title="Liability for Links">
              <p>
                Our website contains links to external third-party websites over
                whose content we have no influence. We therefore cannot accept
                any liability for this third-party content. The respective
                provider or operator of the linked pages is always responsible
                for the content of the linked pages.
              </p>
              <p>
                The linked pages were checked for possible legal violations at
                the time of linking. Illegal content was not recognizable at the
                time of linking. Permanent monitoring of the content of the
                linked pages is not reasonable without concrete evidence of an
                infringement. Upon becoming aware of legal violations, we will
                remove such links immediately.
              </p>
            </LegalSection>

            <LegalSection title="Copyright">
              <p>
                The content and works on these pages created by the site
                operator are subject to German copyright law. Duplication,
                processing, distribution, and any form of commercialization of
                such material beyond the scope of copyright law require the
                prior written consent of the respective author or creator.
              </p>
            </LegalSection>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
