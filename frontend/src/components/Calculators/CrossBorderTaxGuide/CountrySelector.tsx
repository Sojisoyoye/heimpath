/**
 * Country Selector
 * Card with dropdown to select investor's home country
 */

import { Globe } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COUNTRY_TAX_DATA } from "./countryTaxData"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  selectedCountry: string | null
  onSelect: (code: string) => void
}

/******************************************************************************
                              Components
******************************************************************************/

function CountrySelector(props: Readonly<IProps>) {
  const { selectedCountry, onSelect } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5" />
          Select Your Home Country
        </CardTitle>
        <CardDescription>
          Choose your tax residency country to see how its tax treaty with
          Germany affects your property investment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedCountry ?? undefined} onValueChange={onSelect}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Select a country..." />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_TAX_DATA.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.flag} {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CountrySelector }
