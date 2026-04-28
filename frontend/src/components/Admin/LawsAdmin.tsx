/**
 * Admin panel for managing the Legal Knowledge Base
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import type { LawCreate, LawSummary } from "@/models/legal"
import { queryKeys } from "@/query/queryKeys"
import { LegalService } from "@/services/LegalService"

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORIES = [
  { value: "buying_process", label: "Buying Process" },
  { value: "costs_and_taxes", label: "Costs & Taxes" },
  { value: "rental_law", label: "Rental Law" },
  { value: "condominium", label: "Condominium" },
  { value: "agent_regulations", label: "Agent Regulations" },
]

const PROPERTY_TYPES = [
  { value: "all", label: "All" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
]

/******************************************************************************
                              Components
******************************************************************************/

interface IFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editLaw: LawSummary | null
}

function LawFormDialog({
  open,
  onOpenChange,
  editLaw,
}: Readonly<IFormDialogProps>) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { register, handleSubmit, reset, setValue } = useForm<LawCreate>({
    defaultValues: editLaw
      ? {
          citation: editLaw.citation,
          titleDe: editLaw.titleDe,
          titleEn: editLaw.titleEn,
          category: editLaw.category,
          propertyType: editLaw.propertyType,
          oneLineSummary: editLaw.oneLineSummary,
        }
      : {},
  })

  const mutation = useMutation({
    mutationFn: (data: LawCreate) =>
      editLaw
        ? LegalService.updateLaw(editLaw.id, data)
        : LegalService.createLaw(data),
    onSuccess: () => {
      showSuccessToast(editLaw ? "Law updated" : "Law created")
      queryClient.invalidateQueries({ queryKey: queryKeys.laws.all })
      reset()
      onOpenChange(false)
    },
    onError: () =>
      showErrorToast("Failed to save law — check all required fields"),
  })

  const onSubmit = (data: LawCreate) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editLaw ? "Edit Law" : "Add Law"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Citation *</Label>
              <Input
                {...register("citation", { required: true })}
                placeholder="§ 433 BGB"
              />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select
                defaultValue={editLaw?.category}
                onValueChange={(v) =>
                  setValue("category", v as LawCreate["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Property Type *</Label>
            <Select
              defaultValue={editLaw?.propertyType}
              onValueChange={(v) =>
                setValue("propertyType", v as LawCreate["propertyType"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Title (German) *</Label>
            <Input
              {...register("titleDe", { required: true })}
              placeholder="Kaufvertrag"
            />
          </div>
          <div className="space-y-1">
            <Label>Title (English) *</Label>
            <Input
              {...register("titleEn", { required: true })}
              placeholder="Purchase Contract"
            />
          </div>
          <div className="space-y-1">
            <Label>One-Line Summary *</Label>
            <Input {...register("oneLineSummary", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Short Summary *</Label>
            <Textarea
              rows={3}
              {...register("shortSummary", { required: true })}
            />
          </div>
          <div className="space-y-1">
            <Label>Detailed Explanation *</Label>
            <Textarea
              rows={5}
              {...register("detailedExplanation", { required: true })}
            />
          </div>
          <div className="space-y-1">
            <Label>Real-World Example</Label>
            <Textarea rows={3} {...register("realWorldExample")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                type="button"
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton type="submit" loading={mutation.isPending}>
              Save
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Main Export
******************************************************************************/

function LawsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editLaw, setEditLaw] = useState<LawSummary | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.laws.list({ pageSize: 200 }),
    queryFn: () => LegalService.getLaws({ pageSize: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => LegalService.deleteLaw(id),
    onSuccess: () => {
      showSuccessToast("Law deleted")
      queryClient.invalidateQueries({ queryKey: queryKeys.laws.all })
    },
    onError: () => showErrorToast("Failed to delete law"),
  })

  const openCreate = () => {
    setEditLaw(null)
    setDialogOpen(true)
  }
  const openEdit = (law: LawSummary) => {
    setEditLaw(law)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} laws</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Law
        </Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Citation</th>
              <th className="px-4 py-3 text-left font-medium">Title (EN)</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : (
              (data?.data ?? []).map((law) => (
                <tr
                  key={law.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {law.citation}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{law.titleEn}</td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {law.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {law.propertyType}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(law)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(law.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <LawFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editLaw={editLaw}
      />
    </div>
  )
}

export default LawsAdmin
