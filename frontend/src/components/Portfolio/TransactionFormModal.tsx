/**
 * Transaction Form Modal Component
 * Add modal for portfolio transactions
 */

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  CostCategory,
  PortfolioTransactionInput,
  TransactionType,
} from "@/models/portfolio"
import { COST_CATEGORY_LABELS, INCOME_TYPES } from "@/models/portfolio"

interface IProps {
  trigger: React.ReactNode
  onSubmit: (data: PortfolioTransactionInput) => void | Promise<void>
  isPending: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "rent_income", label: "Rent Income" },
  { value: "other_income", label: "Other Income" },
  { value: "operating_expense", label: "Operating Expense" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "hausgeld", label: "Hausgeld" },
  { value: "mortgage_interest", label: "Mortgage Interest" },
  { value: "tax_payment", label: "Tax Payment" },
  { value: "other_expense", label: "Other Expense" },
]

const COST_CATEGORY_OPTIONS = Object.entries(COST_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

const formSchema = z.object({
  type: z.string().min(1, "Type is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean(),
  costCategory: z.string().optional(),
  estimatedAmount: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Transaction add form modal. */
function TransactionFormModal(props: Readonly<IProps>) {
  const { trigger, onSubmit, isPending } = props
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      type: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      category: "",
      description: "",
      isRecurring: false,
      costCategory: "",
      estimatedAmount: "",
    },
  })

  const selectedType = form.watch("type") as TransactionType
  const isExpenseType = !!selectedType && !INCOME_TYPES.includes(selectedType)
  const selectedCostCategory = form.watch("costCategory")

  const handleSubmit = async (data: FormData) => {
    const isExpense = !INCOME_TYPES.includes(data.type as TransactionType)
    const input: PortfolioTransactionInput = {
      type: data.type as TransactionType,
      amount: Number(data.amount),
      date: data.date,
      category: data.category || null,
      description: data.description || null,
      isRecurring: data.isRecurring,
      costCategory:
        isExpense && data.costCategory
          ? (data.costCategory as CostCategory)
          : null,
      estimatedAmount:
        isExpense && data.estimatedAmount ? Number(data.estimatedAmount) : null,
    }
    try {
      await onSubmit(input)
      setIsOpen(false)
      form.reset()
    } catch {
      // Keep modal open on failure — toast shown by parent
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense for this property.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount (EUR) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Plumbing, Utilities"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isExpenseType && (
                <FormField
                  control={form.control}
                  name="costCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cost category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COST_CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isExpenseType && selectedCostCategory && (
                <FormField
                  control={form.control}
                  name="estimatedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Amount (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Expected monthly cost"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      This is a recurring transaction
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={isPending}>
                Add Transaction
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TransactionFormModal }
export default TransactionFormModal
