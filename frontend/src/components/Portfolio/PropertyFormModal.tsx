/**
 * Property Form Modal Component
 * Add/Edit modal for portfolio properties
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
import { Textarea } from "@/components/ui/textarea"
import type {
  PortfolioProperty,
  PortfolioPropertyInput,
} from "@/models/portfolio"

interface IProps {
  property?: PortfolioProperty | null
  trigger: React.ReactNode
  onSubmit: (data: PortfolioPropertyInput) => void | Promise<void>
  isPending: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const formSchema = z.object({
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(255),
  postcode: z.string().min(1, "Postcode is required").max(10),
  stateCode: z.string().optional(),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  purchaseDate: z.string().optional(),
  squareMeters: z.string().min(1, "Size is required"),
  buildingYear: z.string().optional(),
  currentValueEstimate: z.string().optional(),
  monthlyRentTarget: z.string().optional(),
  tenantName: z.string().optional(),
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
  monthlyHausgeld: z.string().optional(),
  isVacant: z.boolean(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const toNumber = (v: string | undefined): number | null => {
  if (!v) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property add/edit form modal. */
function PropertyFormModal(props: Readonly<IProps>) {
  const { property, trigger, onSubmit, isPending } = props
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      address: property?.address ?? "",
      city: property?.city ?? "",
      postcode: property?.postcode ?? "",
      stateCode: property?.stateCode ?? "",
      purchasePrice: property?.purchasePrice?.toString() ?? "",
      purchaseDate: property?.purchaseDate ?? "",
      squareMeters: property?.squareMeters?.toString() ?? "",
      buildingYear: property?.buildingYear?.toString() ?? "",
      currentValueEstimate: property?.currentValueEstimate?.toString() ?? "",
      monthlyRentTarget: property?.monthlyRentTarget?.toString() ?? "",
      tenantName: property?.tenantName ?? "",
      leaseStartDate: property?.leaseStartDate ?? "",
      leaseEndDate: property?.leaseEndDate ?? "",
      monthlyHausgeld: property?.monthlyHausgeld?.toString() ?? "",
      isVacant: property?.isVacant ?? false,
      notes: property?.notes ?? "",
    },
  })

  const handleSubmit = async (data: FormData) => {
    const input: PortfolioPropertyInput = {
      address: data.address,
      city: data.city,
      postcode: data.postcode,
      purchasePrice: Number(data.purchasePrice),
      squareMeters: Number(data.squareMeters),
      stateCode: data.stateCode || null,
      purchaseDate: data.purchaseDate || null,
      buildingYear: toNumber(data.buildingYear),
      currentValueEstimate: toNumber(data.currentValueEstimate),
      monthlyRentTarget: toNumber(data.monthlyRentTarget),
      tenantName: data.tenantName || null,
      leaseStartDate: data.leaseStartDate || null,
      leaseEndDate: data.leaseEndDate || null,
      monthlyHausgeld: toNumber(data.monthlyHausgeld),
      isVacant: data.isVacant,
      notes: data.notes || null,
    }
    try {
      await onSubmit(input)
      setIsOpen(false)
      if (!property) form.reset()
    } catch {
      // Keep modal open on failure — toast shown by parent
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {property ? "Edit Property" : "Add Property"}
          </DialogTitle>
          <DialogDescription>
            {property
              ? "Update the details of your property."
              : "Enter the details of your rental property."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 py-4">
              {/* Property Info */}
              <p className="text-sm font-medium text-muted-foreground">
                Property Info
              </p>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Musterstr. 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        City <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Berlin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Postcode <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="10115" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="squareMeters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Size (m²) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="75"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buildingYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1990" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Financial */}
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Financial
              </p>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Purchase Price (EUR){" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="300000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currentValueEstimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="310000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyRentTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (EUR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="1200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="monthlyHausgeld"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Hausgeld (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="350"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tenant */}
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Tenant
              </p>

              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Max Mustermann" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leaseStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaseEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease End</FormLabel>
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
                name="isVacant"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Property is currently vacant
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                {property ? "Update" : "Add Property"}
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

export { PropertyFormModal }
export default PropertyFormModal
