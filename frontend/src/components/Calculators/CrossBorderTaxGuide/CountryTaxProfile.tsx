/**
 * Country Tax Profile
 * Detailed per-country tax information: DBA treaty, withholding rates,
 * filing requirements, deductible expenses, and deadlines
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DbaSection,
  DeadlinesSection,
  ExpensesSection,
  FilingSection,
  NotesSection,
  WithholdingSection,
} from "./sections"
import type { ICountryTaxData } from "./types"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  country: ICountryTaxData
}

/******************************************************************************
                              Components
******************************************************************************/

function CountryTaxProfile(props: Readonly<IProps>) {
  const { country } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-xl">{country.flag}</span>
          {country.name} — Tax Profile
        </CardTitle>
        <CardDescription>
          Double taxation treaty details and German tax obligations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DbaSection dba={country.dba} />
        <WithholdingSection withholding={country.withholding} />
        <FilingSection filings={country.filings} />
        <ExpensesSection expenses={country.expenses} />
        <DeadlinesSection deadlines={country.deadlines} />
        {country.notes.length > 0 && <NotesSection notes={country.notes} />}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CountryTaxProfile }
