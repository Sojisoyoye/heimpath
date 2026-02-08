import { Home, Scale, Calculator, FileText } from "lucide-react"

import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Footer } from "./Footer"

interface IProps {
  children: React.ReactNode
}

/******************************************************************************
                              Constants
******************************************************************************/

const FEATURES = [
  {
    icon: Home,
    title: "Guided Property Journeys",
    description: "Step-by-step guidance through the German buying process",
  },
  {
    icon: Scale,
    title: "Legal Knowledge Base",
    description: "50+ German real estate laws explained in plain English",
  },
  {
    icon: Calculator,
    title: "Hidden Costs Calculator",
    description: "Discover the true cost of buying property in Germany",
  },
  {
    icon: FileText,
    title: "Document Translation",
    description: "AI-powered translation of German legal documents",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Feature item displayed in the sidebar. */
function FeatureItem(props: { icon: typeof Home; title: string; description: string }) {
  const { icon: Icon, title, description } = props
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/** Default component. Auth page layout with branding sidebar. */
function AuthLayout(props: IProps) {
  const { children } = props

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-muted dark:bg-zinc-900 relative hidden lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="mx-auto max-w-md space-y-8">
          <Logo variant="full" asLink={false} />

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Navigate German Real Estate with Confidence
            </h2>
            <p className="text-muted-foreground">
              HeimPath guides foreign investors and immigrants through the
              property buying process in Germany.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo variant="icon" />
          </div>
          <Appearance />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <Footer />
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AuthLayout }
