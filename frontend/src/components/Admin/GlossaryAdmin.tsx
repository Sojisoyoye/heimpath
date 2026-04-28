/**
 * Admin panel for managing the Glossary
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
import type { GlossaryTermCreate, GlossaryTermSummary } from "@/models/glossary"
import { queryKeys } from "@/query/queryKeys"
import { GlossaryService } from "@/services/GlossaryService"

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORIES = [
  { value: "buying_process", label: "Buying Process" },
  { value: "costs_taxes", label: "Costs & Taxes" },
  { value: "financing", label: "Financing" },
  { value: "legal", label: "Legal" },
  { value: "rental", label: "Rental" },
  { value: "property_types", label: "Property Types" },
]

/******************************************************************************
                              Components
******************************************************************************/

interface IFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTerm: GlossaryTermSummary | null
}

function GlossaryFormDialog({
  open,
  onOpenChange,
  editTerm,
}: Readonly<IFormDialogProps>) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { register, handleSubmit, reset, setValue } =
    useForm<GlossaryTermCreate>({
      defaultValues: editTerm
        ? {
            termDe: editTerm.termDe,
            termEn: editTerm.termEn,
            slug: editTerm.slug,
            definitionShort: editTerm.definitionShort,
            category: editTerm.category,
          }
        : {},
    })

  const mutation = useMutation({
    mutationFn: (data: GlossaryTermCreate) =>
      editTerm
        ? GlossaryService.updateTerm(editTerm.slug, data)
        : GlossaryService.createTerm(data),
    onSuccess: () => {
      showSuccessToast(editTerm ? "Term updated" : "Term created")
      queryClient.invalidateQueries({ queryKey: queryKeys.glossary.all })
      reset()
      onOpenChange(false)
    },
    onError: () =>
      showErrorToast("Failed to save term — check all required fields"),
  })

  const onSubmit = (data: GlossaryTermCreate) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTerm ? "Edit Term" : "Add Term"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Term (German) *</Label>
              <Input
                {...register("termDe", { required: true })}
                placeholder="Grundbuch"
              />
            </div>
            <div className="space-y-1">
              <Label>Term (English) *</Label>
              <Input
                {...register("termEn", { required: true })}
                placeholder="Land Register"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input
                {...register("slug", { required: true })}
                placeholder="grundbuch"
              />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select
                defaultValue={editTerm?.category}
                onValueChange={(v) =>
                  setValue("category", v as GlossaryTermCreate["category"])
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
            <Label>Short Definition *</Label>
            <Input {...register("definitionShort", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Long Definition *</Label>
            <Textarea
              rows={5}
              {...register("definitionLong", { required: true })}
            />
          </div>
          <div className="space-y-1">
            <Label>Example Usage</Label>
            <Textarea rows={3} {...register("exampleUsage")} />
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

function GlossaryAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTerm, setEditTerm] = useState<GlossaryTermSummary | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.glossary.list({ pageSize: 200 }),
    queryFn: () => GlossaryService.getTerms({ pageSize: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => GlossaryService.deleteTerm(slug),
    onSuccess: () => {
      showSuccessToast("Term deleted")
      queryClient.invalidateQueries({ queryKey: queryKeys.glossary.all })
    },
    onError: () => showErrorToast("Failed to delete term"),
  })

  const openCreate = () => {
    setEditTerm(null)
    setDialogOpen(true)
  }
  const openEdit = (term: GlossaryTermSummary) => {
    setEditTerm(term)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} terms
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Term
        </Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Term (DE)</th>
              <th className="px-4 py-3 text-left font-medium">Term (EN)</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
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
              (data?.data ?? []).map((term) => (
                <tr
                  key={term.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{term.termDe}</td>
                  <td className="px-4 py-3">{term.termEn}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {term.slug}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {term.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(term)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(term.slug)}
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
      <GlossaryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTerm={editTerm}
      />
    </div>
  )
}

export default GlossaryAdmin
