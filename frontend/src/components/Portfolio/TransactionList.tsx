/**
 * Transaction List Component
 * Displays a table of transactions with type-based color coding
 */

import { Trash2 } from "lucide-react"
import { formatEur2 } from "@/common/utils/formatters"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PortfolioTransaction } from "@/models/portfolio"
import { INCOME_TYPES } from "@/models/portfolio"

interface IProps {
  transactions: PortfolioTransaction[]
  onDelete: (transactionId: string) => void
  isDeleting?: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const TYPE_LABELS: Record<string, string> = {
  rent_income: "Rent Income",
  operating_expense: "Operating Expense",
  maintenance: "Maintenance",
  insurance: "Insurance",
  hausgeld: "Hausgeld",
  mortgage_interest: "Mortgage Interest",
  tax_payment: "Tax Payment",
  other_income: "Other Income",
  other_expense: "Other Expense",
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("de-DE")

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Transaction table with color-coded amounts. */
function TransactionList(props: Readonly<IProps>) {
  const { transactions, onDelete, isDeleting = false } = props

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No transactions recorded yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((txn) => {
          const isIncome = INCOME_TYPES.includes(txn.type)
          return (
            <TableRow key={txn.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(txn.date)}
              </TableCell>
              <TableCell>{TYPE_LABELS[txn.type] ?? txn.type}</TableCell>
              <TableCell className="text-muted-foreground">
                {txn.category ?? "-"}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatEur2(txn.amount)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isDeleting}
                  onClick={() => onDelete(txn.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TransactionList }
export default TransactionList
