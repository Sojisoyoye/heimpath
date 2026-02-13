/**
 * Rent, Taxes, Forecast Section
 * Inputs for rental income, depreciation, tax settings, and forecast assumptions
 */

import { Banknote } from "lucide-react";

import { cn } from "@/common/utils";
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RentInputs } from "../types";

interface IProps {
  values: RentInputs;
  squareMeters: number;
  totalAllocableCosts: number;
  onChange: (updates: Partial<RentInputs>) => void;
  className?: string;
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Rent, Taxes, Forecast section. */
function RentSection(props: IProps) {
  const { values, squareMeters, totalAllocableCosts, onChange, className } = props;

  const handleNumberChange = (field: keyof RentInputs, value: string) => {
    const num = parseFloat(value) || 0;
    onChange({ [field]: num });
  };

  const coldRentMonthly =
    values.rentPerSqm * squareMeters + values.parkingRent;
  const warmRentMonthly = coldRentMonthly + totalAllocableCosts;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.rent)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          Rent, Taxes, Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Monthly Rent subsection */}
        <p className="text-sm font-medium text-muted-foreground">
          Monthly Rent (retrieve from Expose)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rentPerSqm">Rent per m² (EUR)</Label>
            <Input
              id="rentPerSqm"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 12"
              value={values.rentPerSqm || ""}
              onChange={(e) => handleNumberChange("rentPerSqm", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parkingRent">Parking Rent (EUR/month)</Label>
            <Input
              id="parkingRent"
              type="number"
              step="10"
              min="0"
              placeholder="e.g., 50"
              value={values.parkingRent || ""}
              onChange={(e) => handleNumberChange("parkingRent", e.target.value)}
            />
          </div>
        </div>

        {/* Rent summary */}
        {squareMeters > 0 && (
          <div className="rounded-md bg-green-50 p-3 space-y-2 dark:bg-green-950/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Cold Rent</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(values.rentPerSqm * squareMeters)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Parking Space</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(values.parkingRent)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">= Total Cold Rent</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(coldRentMonthly)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Allocable Costs</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(totalAllocableCosts)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2 font-semibold">
              <span>= Warm Rent</span>
              <span>{CURRENCY_FORMATTER.format(warmRentMonthly)}</span>
            </div>
          </div>
        )}

        {/* Taxes subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Taxes</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="depreciationRate">Depreciation Rate (%)</Label>
              <Input
                id="depreciationRate"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={values.depreciationRatePercent || ""}
                onChange={(e) =>
                  handleNumberChange("depreciationRatePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingShare">Building Share (%)</Label>
              <Input
                id="buildingShare"
                type="number"
                step="5"
                min="0"
                max="100"
                value={values.buildingSharePercent || ""}
                onChange={(e) =>
                  handleNumberChange("buildingSharePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginalTaxRate">Marginal Tax Rate (%)</Label>
              <Input
                id="marginalTaxRate"
                type="number"
                step="1"
                min="0"
                max="50"
                placeholder="e.g., 42"
                value={values.marginalTaxRatePercent || ""}
                onChange={(e) =>
                  handleNumberChange("marginalTaxRatePercent", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Personal income tax bracket
              </p>
            </div>
          </div>
        </div>

        {/* Forecast subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Forecast</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="costIncrease">Cost Increase p.a. (%)</Label>
              <Input
                id="costIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.costIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("costIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentIncrease">Rent Increase p.a. (%)</Label>
              <Input
                id="rentIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.rentIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("rentIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueIncrease">Value Increase p.a. (%)</Label>
              <Input
                id="valueIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.valueIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("valueIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equityInterest">Interest on Equity p.a. (%)</Label>
              <Input
                id="equityInterest"
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={values.equityInterestPercent || ""}
                onChange={(e) =>
                  handleNumberChange("equityInterestPercent", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentSection };
