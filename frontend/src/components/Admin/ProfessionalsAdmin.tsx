/**
 * Admin panel for managing the Professionals Directory
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle, Pencil, Plus, Trash2, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
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
import type { Professional, ProfessionalCreate } from "@/models/professional"
import { queryKeys } from "@/query/queryKeys"
import { ProfessionalService } from "@/services/ProfessionalService"

/******************************************************************************
                              Constants
******************************************************************************/

const TYPES = [
  { value: "lawyer", label: "Lawyer" },
  { value: "notary", label: "Notary" },
  { value: "tax_advisor", label: "Tax Advisor" },
  { value: "mortgage_broker", label: "Mortgage Broker" },
  { value: "real_estate_agent", label: "Real Estate Agent" },
]

/******************************************************************************
                              Components
******************************************************************************/

interface IFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editProfessional: Professional | null
}

function ProfessionalFormDialog({
  open,
  onOpenChange,
  editProfessional,
}: Readonly<IFormDialogProps>) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { register, handleSubmit, reset, setValue } =
    useForm<ProfessionalCreate>({
      defaultValues: editProfessional
        ? {
            name: editProfessional.name,
            type: editProfessional.type,
            city: editProfessional.city,
            languages: editProfessional.languages,
            description: editProfessional.description,
            email: editProfessional.email,
            phone: editProfessional.phone,
            website: editProfessional.website,
            isVerified: editProfessional.isVerified,
          }
        : { isVerified: false },
    })

  useEffect(() => {
    reset(
      editProfessional
        ? {
            name: editProfessional.name,
            type: editProfessional.type,
            city: editProfessional.city,
            languages: editProfessional.languages,
            description: editProfessional.description,
            email: editProfessional.email,
            phone: editProfessional.phone,
            website: editProfessional.website,
            isVerified: editProfessional.isVerified,
          }
        : { isVerified: false },
    )
  }, [editProfessional, reset])

  const mutation = useMutation({
    mutationFn: (data: ProfessionalCreate) =>
      editProfessional
        ? ProfessionalService.updateProfessional(editProfessional.id, data)
        : ProfessionalService.createProfessional(data),
    onSuccess: () => {
      showSuccessToast(
        editProfessional ? "Professional updated" : "Professional created",
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.professionals.all })
      reset()
      onOpenChange(false)
    },
    onError: () =>
      showErrorToast("Failed to save professional — check all required fields"),
  })

  const onSubmit = (data: ProfessionalCreate) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editProfessional ? "Edit Professional" : "Add Professional"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input {...register("name", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select
                defaultValue={editProfessional?.type}
                onValueChange={(v) =>
                  setValue("type", v as ProfessionalCreate["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>City *</Label>
              <Input
                {...register("city", { required: true })}
                placeholder="Berlin"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Languages *</Label>
            <Input
              {...register("languages", { required: true })}
              placeholder="German, English"
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={3} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Website</Label>
            <Input
              type="url"
              {...register("website")}
              placeholder="https://..."
            />
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

function ProfessionalsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProfessional, setEditProfessional] = useState<Professional | null>(
    null,
  )
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.professionals.list({ pageSize: 100 }),
    queryFn: () => ProfessionalService.getProfessionals({ pageSize: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ProfessionalService.deleteProfessional(id),
    onSuccess: () => {
      showSuccessToast("Professional deleted")
      queryClient.invalidateQueries({ queryKey: queryKeys.professionals.all })
    },
    onError: () => showErrorToast("Failed to delete professional"),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      ProfessionalService.verifyProfessional(id, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.professionals.all })
    },
    onError: () => showErrorToast("Failed to update verification status"),
  })

  const openCreate = () => {
    setEditProfessional(null)
    setDialogOpen(true)
  }
  const openEdit = (p: Professional) => {
    setEditProfessional(p)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} professionals
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Professional
        </Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">City</th>
              <th className="px-4 py-3 text-left font-medium">Verified</th>
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
              (data?.data ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {p.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">{p.city}</td>
                  <td className="px-4 py-3">
                    {p.isVerified ? (
                      <Badge variant="default" className="text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Unverified
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={p.isVerified ? "Unverify" : "Verify"}
                        onClick={() =>
                          verifyMutation.mutate({
                            id: p.id,
                            isVerified: !p.isVerified,
                          })
                        }
                        disabled={verifyMutation.isPending}
                      >
                        {p.isVerified ? (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(p.id)}
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
      <ProfessionalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editProfessional={editProfessional}
      />
    </div>
  )
}

export default ProfessionalsAdmin
