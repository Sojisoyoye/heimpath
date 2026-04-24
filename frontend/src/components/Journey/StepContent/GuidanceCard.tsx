/**
 * Guidance Card Component
 * Reusable informational card for journey step content
 */

import { Link } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Lightbulb } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface IGuidanceItem {
  icon: LucideIcon
  label: string
  detail: string
}

interface IProps {
  title: string
  description: string
  items: IGuidanceItem[]
  tip?: string
  ctaLabel?: string
  ctaHref?: string
}

/******************************************************************************
                              Components
******************************************************************************/

function GuidanceCard(props: Readonly<IProps>) {
  const { title, description, items, tip, ctaLabel, ctaHref } = props

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
        {tip && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-200">{tip}</p>
          </div>
        )}
        {ctaLabel && ctaHref && (
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GuidanceCard }
export type { IGuidanceItem }
