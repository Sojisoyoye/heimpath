/**
 * Property Card Component
 * Displays a portfolio property summary in a card format
 */

import { Link } from "@tanstack/react-router"
import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioPropertySummary } from "@/models/portfolio"

interface IProps {
  property: PortfolioPropertySummary
}

/******************************************************************************
                              Constants
******************************************************************************/

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property summary card with link to detail. */
function PropertyCard(props: IProps) {
  const { property } = props

  return (
    <Link to="/portfolio/$propertyId" params={{ propertyId: property.id }}>
      <Card className="transition-shadow hover:shadow-md group cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors line-clamp-1">
              {property.address}
            </CardTitle>
            {property.isVacant ? (
              <Badge
                variant="outline"
                className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Vacant
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Occupied
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {property.postcode} {property.city}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Purchase Price</p>
              <p className="font-semibold">
                {formatCurrency(property.purchasePrice)}
              </p>
            </div>
            {property.monthlyRentTarget != null && (
              <div className="text-right">
                <p className="text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">
                  {formatCurrency(property.monthlyRentTarget)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyCard }
export default PropertyCard
