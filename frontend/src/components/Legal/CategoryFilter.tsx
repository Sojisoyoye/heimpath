/**
 * Category Filter Component
 * Filter laws by category
 */

import { FileText, Calculator, Home, Building, Users } from "lucide-react"

import { cn } from "@/common/utils"
import { LAW_CATEGORIES } from "@/common/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LawCategoryType } from "@/models/legal"

interface IProps {
  selectedCategory?: LawCategoryType
  onCategoryChange: (category: LawCategoryType | undefined) => void
  categoryCounts?: Record<string, number>
  variant?: "horizontal" | "vertical"
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  FileText: FileText,
  Calculator: Calculator,
  Home: Home,
  Building: Building,
  Users: Users,
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single category button. */
function CategoryButton(props: {
  category: (typeof LAW_CATEGORIES)[number]
  isSelected: boolean
  count?: number
  onClick: () => void
}) {
  const { category, isSelected, count, onClick } = props
  const Icon = CATEGORY_ICONS[category.icon] || FileText

  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "justify-start gap-2",
        isSelected && "bg-blue-600 hover:bg-blue-700"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{category.label}</span>
      {count !== undefined && (
        <Badge
          variant={isSelected ? "secondary" : "outline"}
          className="ml-auto"
        >
          {count}
        </Badge>
      )}
    </Button>
  )
}

/** Default component. Category filter buttons. */
function CategoryFilter(props: IProps) {
  const {
    selectedCategory,
    onCategoryChange,
    categoryCounts,
    variant = "horizontal",
    className,
  } = props

  const handleCategoryClick = (categoryKey: string) => {
    if (selectedCategory === categoryKey) {
      onCategoryChange(undefined)
    } else {
      onCategoryChange(categoryKey as LawCategoryType)
    }
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        variant === "vertical" ? "flex-col" : "flex-wrap",
        className
      )}
    >
      {variant === "horizontal" && (
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          onClick={() => onCategoryChange(undefined)}
          className={cn(!selectedCategory && "bg-blue-600 hover:bg-blue-700")}
        >
          All Categories
        </Button>
      )}

      {LAW_CATEGORIES.map((category) => (
        <CategoryButton
          key={category.key}
          category={category}
          isSelected={selectedCategory === category.key}
          count={categoryCounts?.[category.key]}
          onClick={() => handleCategoryClick(category.key)}
        />
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CategoryFilter }
