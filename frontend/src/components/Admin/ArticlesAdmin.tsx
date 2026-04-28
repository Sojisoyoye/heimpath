/**
 * Admin panel for managing Articles (Content Library)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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
import type { ArticleCreate, ArticleSummary } from "@/models/article"
import { queryKeys } from "@/query/queryKeys"
import { ArticleService } from "@/services/ArticleService"

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORIES = [
  { value: "buying_process", label: "Buying Process" },
  { value: "costs_and_taxes", label: "Costs & Taxes" },
  { value: "regulations", label: "Regulations" },
  { value: "common_pitfalls", label: "Common Pitfalls" },
]

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
}

/******************************************************************************
                              Components
******************************************************************************/

interface IFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editArticle: ArticleSummary | null
}

function ArticleFormDialog({
  open,
  onOpenChange,
  editArticle,
}: Readonly<IFormDialogProps>) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { register, handleSubmit, reset, setValue } = useForm<ArticleCreate>({
    defaultValues: editArticle
      ? {
          title: editArticle.title,
          slug: editArticle.slug,
          category: editArticle.category,
          difficultyLevel: editArticle.difficultyLevel,
          excerpt: editArticle.excerpt,
          authorName: editArticle.authorName,
        }
      : { status: "draft" },
  })

  const mutation = useMutation({
    mutationFn: (data: ArticleCreate) =>
      editArticle
        ? ArticleService.updateArticle(editArticle.id, data)
        : ArticleService.createArticle(data),
    onSuccess: () => {
      showSuccessToast(editArticle ? "Article updated" : "Article created")
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.all })
      reset()
      onOpenChange(false)
    },
    onError: () =>
      showErrorToast("Failed to save article — check all required fields"),
  })

  const onSubmit = (data: ArticleCreate) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editArticle ? "Edit Article" : "Add Article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Slug *</Label>
              <Input
                {...register("slug", { required: true })}
                placeholder="buying-process-guide"
              />
            </div>
            <div className="space-y-1">
              <Label>Author *</Label>
              <Input {...register("authorName", { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select
                defaultValue={editArticle?.category}
                onValueChange={(v) =>
                  setValue("category", v as ArticleCreate["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
            <div className="space-y-1">
              <Label>Difficulty *</Label>
              <Select
                defaultValue={editArticle?.difficultyLevel}
                onValueChange={(v) =>
                  setValue(
                    "difficultyLevel",
                    v as ArticleCreate["difficultyLevel"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                defaultValue="draft"
                onValueChange={(v) =>
                  setValue("status", v as ArticleCreate["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Meta Description *</Label>
            <Input {...register("metaDescription", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Excerpt *</Label>
            <Textarea rows={2} {...register("excerpt", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Content *</Label>
            <Textarea
              rows={8}
              {...register("content", { required: true })}
              placeholder="Markdown or HTML content"
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

function ArticlesAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editArticle, setEditArticle] = useState<ArticleSummary | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.articles.list({ pageSize: 200 }),
    queryFn: () => ArticleService.getArticles({ pageSize: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ArticleService.deleteArticle(id),
    onSuccess: () => {
      showSuccessToast("Article deleted")
      queryClient.invalidateQueries({ queryKey: queryKeys.articles.all })
    },
    onError: () => showErrorToast("Failed to delete article"),
  })

  const openCreate = () => {
    setEditArticle(null)
    setDialogOpen(true)
  }
  const openEdit = (article: ArticleSummary) => {
    setEditArticle(article)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} articles
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Article
        </Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Difficulty</th>
              <th className="px-4 py-3 text-left font-medium">Author</th>
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
              (data?.data ?? []).map((article) => (
                <tr
                  key={article.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 max-w-xs truncate font-medium">
                    {article.title}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {article.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        STATUS_VARIANT[article.difficultyLevel] ?? "outline"
                      }
                      className="text-xs"
                    >
                      {article.difficultyLevel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {article.authorName}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(article)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(article.id)}
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
      <ArticleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editArticle={editArticle}
      />
    </div>
  )
}

export default ArticlesAdmin
