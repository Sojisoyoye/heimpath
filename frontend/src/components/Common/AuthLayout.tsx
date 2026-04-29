import { BarChart2, Calculator, FileText, Home, Scale } from "lucide-react"

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
  {
    icon: BarChart2,
    title: "Portfolio Management",
    description: "Track and manage all your German property investments",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Feature item displayed in the sidebar. */
function FeatureItem(props: {
  icon: typeof Home
  title: string
  description: string
}) {
  const { icon: Icon, title, description } = props
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="hidden text-sm text-white/70 md:block">{description}</p>
      </div>
    </div>
  )
}

/** Default component. Auth page layout with branding sidebar. */
function AuthLayout(props: IProps) {
  const { children } = props

  return (
    <div className="grid min-h-svh md:grid-cols-2">
      <div
        className="relative hidden flex-col justify-center overflow-hidden p-6 md:flex md:p-12 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/auth-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto max-w-md space-y-4 text-white md:space-y-8">
          <Logo variant="full" />

          <div className="space-y-1 md:space-y-2">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              Navigate German Real Estate with Confidence
            </h2>
            <p className="text-sm text-white/80 md:text-base">
              HeimPath guides foreign investors and immigrants through the
              property buying process in Germany.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
            {FEATURES.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-end">
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
