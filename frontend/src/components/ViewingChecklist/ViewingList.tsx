import { Building2, Calendar, CheckSquare, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PropertyViewing } from "@/models/viewing"

/******************************************************************************
                              Functions
******************************************************************************/

function completionPercent(viewing: PropertyViewing): number {
  const all = viewing.checklistData.flatMap((c) => c.items)
  if (all.length === 0) return 0
  const checked = all.filter((i) => i.checked).length
  return Math.round((checked / all.length) * 100)
}

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  viewings: PropertyViewing[]
  isDeleting: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

function ViewingCard(
  props: Readonly<{
    viewing: PropertyViewing
    isDeleting: boolean
    onSelect: (id: string) => void
    onDelete: (id: string) => void
  }>,
) {
  const { viewing, isDeleting, onSelect, onDelete } = props
  const pct = completionPercent(viewing)

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(viewing.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base truncate">
              {viewing.address}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(viewing.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-3 mt-1">
          {viewing.viewedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(viewing.viewedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Badge
            variant={pct === 100 ? "default" : "secondary"}
            className="shrink-0"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            {pct}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/** List of all property viewings with create button. */
function ViewingList(props: Readonly<IProps>) {
  const { viewings, isDeleting, onSelect, onCreate, onDelete } = props

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Viewing Checklist</h1>
          <p className="text-muted-foreground mt-1">
            Track and assess every property you visit.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Viewing
        </Button>
      </div>

      {viewings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No viewings recorded yet</p>
          <p className="text-muted-foreground mt-1">
            Add your first property viewing to start tracking.
          </p>
          <Button onClick={onCreate} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Add First Viewing
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {viewings.map((v) => (
            <ViewingCard
              key={v.id}
              viewing={v}
              isDeleting={isDeleting}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ViewingList }
