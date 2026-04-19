/**
 * DBA Treaty Section
 * Shows double taxation agreement status and details
 */

import { Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ICountryTaxData } from "../types"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  dba: ICountryTaxData["dba"]
}

/******************************************************************************
                              Components
******************************************************************************/

function DbaSection(props: Readonly<IProps>) {
  const { dba } = props

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">
          Double Taxation Agreement (DBA)
        </h4>
        {dba.hasTreaty ? (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
          >
            Active Treaty {dba.treatyYear && `(${dba.treatyYear})`}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
          >
            No Treaty
          </Badge>
        )}
      </div>
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        {dba.reliefMethod && (
          <p>
            <strong>Relief method:</strong>{" "}
            <span className="capitalize">{dba.reliefMethod}</span>
          </p>
        )}
        <p>
          <strong>Rental income:</strong> {dba.rentalIncomeRule}
        </p>
        <p>
          <strong>Capital gains:</strong> {dba.capitalGainsRule}
        </p>
        {dba.notes && (
          <p className="text-muted-foreground text-xs">{dba.notes}</p>
        )}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DbaSection }
