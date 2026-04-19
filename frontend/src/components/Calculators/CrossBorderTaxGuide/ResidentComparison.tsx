/**
 * Resident vs Non-Resident Comparison
 * Table comparing tax treatment for residents and non-residents
 */

import { ArrowLeftRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RESIDENT_VS_NON_RESIDENT } from "./countryTaxData"

/******************************************************************************
                              Constants
******************************************************************************/

const FAVORED_STYLES = {
  resident: "text-blue-700 dark:text-blue-400",
  "non-resident": "text-purple-700 dark:text-purple-400",
  neutral: "text-muted-foreground",
} as const

const FAVORED_LABELS = {
  resident: "Resident",
  "non-resident": "Non-resident",
  neutral: "Equal",
} as const

/******************************************************************************
                              Components
******************************************************************************/

function ResidentComparison() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="h-5 w-5" />
          Resident vs. Non-Resident Tax Treatment
        </CardTitle>
        <CardDescription>
          Key differences between full tax residents (unbeschränkt
          steuerpflichtig) and non-residents (beschränkt steuerpflichtig)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Aspect</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Non-Resident</TableHead>
                <TableHead className="text-center">Favored</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESIDENT_VS_NON_RESIDENT.map((row) => (
                <TableRow key={row.aspect}>
                  <TableCell className="font-medium">{row.aspect}</TableCell>
                  <TableCell className="text-sm">
                    {row.residentTreatment}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.nonResidentTreatment}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`text-xs font-medium ${FAVORED_STYLES[row.favored]}`}
                    >
                      {FAVORED_LABELS[row.favored]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ResidentComparison }
