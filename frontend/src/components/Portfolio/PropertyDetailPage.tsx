/**
 * Property Detail Page Component
 * Displays full property info, edit button, transaction list, and income/expense totals
 */

import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Edit, MapPin, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCreateTransaction,
  useDeleteProperty,
  useDeleteTransaction,
  useUpdateProperty,
} from "@/hooks/mutations/usePortfolioMutations"
import {
  usePortfolioProperty,
  usePortfolioTransactions,
} from "@/hooks/queries/usePortfolioQueries"
import useCustomToast from "@/hooks/useCustomToast"
import type {
  PortfolioPropertyInput,
  PortfolioTransactionInput,
} from "@/models/portfolio"
import { INCOME_TYPES } from "@/models/portfolio"
import { PropertyFormModal } from "./PropertyFormModal"
import { TransactionFormModal } from "./TransactionFormModal"
import { TransactionList } from "./TransactionList"

interface IProps {
  propertyId: string
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

const formatDate = (dateStr: string | null) =>
  dateStr ? new Date(dateStr).toLocaleDateString("de-DE") : "-"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property detail page with transactions. */
function PropertyDetailPage(props: IProps) {
  const { propertyId } = props
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: property, isLoading, error } = usePortfolioProperty(propertyId)
  const { data: transactionsData } = usePortfolioTransactions(propertyId)

  const updateProperty = useUpdateProperty()
  const deleteProperty = useDeleteProperty()
  const createTransaction = useCreateTransaction()
  const deleteTransaction = useDeleteTransaction()

  const transactions = transactionsData?.data ?? []
  const totalIncome = transactions
    .filter((t) => INCOME_TYPES.includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions
    .filter((t) => !INCOME_TYPES.includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const handleUpdate = (input: PortfolioPropertyInput) => {
    updateProperty.mutate(
      { id: propertyId, input },
      {
        onSuccess: () => showSuccessToast("Property updated"),
        onError: () => showErrorToast("Failed to update property"),
      },
    )
  }

  const handleDelete = () => {
    deleteProperty.mutate(propertyId, {
      onSuccess: () => {
        showSuccessToast("Property deleted")
        navigate({ to: "/portfolio" })
      },
      onError: () => showErrorToast("Failed to delete property"),
    })
  }

  const handleCreateTransaction = (input: PortfolioTransactionInput) => {
    createTransaction.mutate(
      { propertyId, input },
      {
        onSuccess: () => showSuccessToast("Transaction added"),
        onError: () => showErrorToast("Failed to add transaction"),
      },
    )
  }

  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransaction.mutate(
      { transactionId, propertyId },
      {
        onSuccess: () => showSuccessToast("Transaction deleted"),
        onError: () => showErrorToast("Failed to delete transaction"),
      },
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load property
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The property could not be found or there was an error loading it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !property) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/portfolio"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolio
          </Link>
          <h1 className="text-2xl font-bold">{property.address}</h1>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {property.postcode} {property.city}
            {property.isVacant ? (
              <Badge
                variant="outline"
                className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Vacant
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="ml-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Occupied
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <PropertyFormModal
            property={property}
            trigger={
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            }
            onSubmit={handleUpdate}
            isPending={updateProperty.isPending}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleteProperty.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Property Details */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchase Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(property.purchasePrice)}
            </p>
            {property.currentValueEstimate && (
              <p className="text-sm text-muted-foreground">
                Est. value: {formatCurrency(property.currentValueEstimate)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Size & Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{property.squareMeters} m²</p>
            {property.buildingYear && (
              <p className="text-sm text-muted-foreground">
                Built in {property.buildingYear}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {property.tenantName ?? "No tenant"}
            </p>
            {property.leaseStartDate && (
              <p className="text-sm text-muted-foreground">
                Lease: {formatDate(property.leaseStartDate)} -{" "}
                {formatDate(property.leaseEndDate)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income / Expense Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Cash Flow</p>
            <p
              className={`text-xl font-bold ${
                totalIncome - totalExpenses >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(totalIncome - totalExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <TransactionFormModal
            trigger={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            }
            onSubmit={handleCreateTransaction}
            isPending={createTransaction.isPending}
          />
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            isDeleting={deleteTransaction.isPending}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {property.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {property.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyDetailPage }
export default PropertyDetailPage
