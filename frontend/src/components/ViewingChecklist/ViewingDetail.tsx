import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  ChecklistCategory,
  ChecklistItem,
  PropertyViewing,
  PropertyViewingUpdate,
} from "@/models/viewing"

/******************************************************************************
                              Functions
******************************************************************************/

function categoryPercent(category: ChecklistCategory): number {
  if (category.items.length === 0) return 0
  const checked = category.items.filter((i) => i.checked).length
  return Math.round((checked / category.items.length) * 100)
}

function overallPercent(categories: ChecklistCategory[]): number {
  const all = categories.flatMap((c) => c.items)
  if (all.length === 0) return 0
  return Math.round((all.filter((i) => i.checked).length / all.length) * 100)
}

/******************************************************************************
                              Components
******************************************************************************/

/** Controlled notes input that only fires onSave on blur, not on every keystroke. */
function ItemNotesInput(
  props: Readonly<{ notes: string; onSave: (notes: string) => void }>,
) {
  const { notes: savedNotes, onSave } = props
  const [localValue, setLocalValue] = useState(savedNotes)

  return (
    <Input
      placeholder="Add note..."
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== savedNotes) onSave(localValue)
      }}
      className="ml-7 h-8 text-sm"
    />
  )
}

function CategoryAccordion(
  props: Readonly<{
    category: ChecklistCategory
    onItemChange: (
      categoryId: string,
      itemId: string,
      changes: Partial<ChecklistItem>,
    ) => void
  }>,
) {
  const { category, onItemChange } = props
  const [open, setOpen] = useState(true)
  const pct = categoryPercent(category)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{category.label}</span>
          <Badge
            variant={pct === 100 ? "default" : "secondary"}
            className="text-xs"
          >
            {pct}%
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="divide-y">
          {category.items.map((item) => (
            <div key={item.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${category.id}-${item.id}`}
                  checked={item.checked}
                  onCheckedChange={(checked) =>
                    onItemChange(category.id, item.id, { checked: !!checked })
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`${category.id}-${item.id}`}
                  className="cursor-pointer leading-snug"
                >
                  {item.label}
                </Label>
              </div>
              <ItemNotesInput
                notes={item.notes}
                onSave={(notes) =>
                  onItemChange(category.id, item.id, { notes })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface IProps {
  viewing: PropertyViewing
  isSaving: boolean
  onBack: () => void
  onUpdate: (updates: PropertyViewingUpdate) => void
}

/** Detailed checklist view for a single property viewing. */
function ViewingDetail(props: Readonly<IProps>) {
  const { viewing, isSaving, onBack, onUpdate } = props
  const [localNotes, setLocalNotes] = useState(viewing.notes ?? "")
  const pct = overallPercent(viewing.checklistData)

  const handleItemChange = (
    categoryId: string,
    itemId: string,
    changes: Partial<ChecklistItem>,
  ) => {
    const updated = viewing.checklistData.map((cat) => {
      if (cat.id !== categoryId) return cat
      return {
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, ...changes } : item,
        ),
      }
    })
    onUpdate({ checklistData: updated })
  }

  const handleNotesBlur = () => {
    if (localNotes !== (viewing.notes ?? "")) {
      onUpdate({ notes: localNotes })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mt-0.5 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">{viewing.address}</h2>
          {viewing.viewedAt && (
            <p className="text-muted-foreground text-sm mt-0.5">
              Viewed{" "}
              {new Date(viewing.viewedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          <Badge
            variant={pct === 100 ? "default" : "secondary"}
            className="text-sm px-3 py-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {pct}% complete
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground w-10 text-right">
          {pct}%
        </span>
      </div>

      {/* Accordion categories */}
      <div className="space-y-3">
        {viewing.checklistData.map((cat) => (
          <CategoryAccordion
            key={cat.id}
            category={cat}
            onItemChange={handleItemChange}
          />
        ))}
      </div>

      {/* General notes */}
      <div className="space-y-2">
        <Label>General Notes</Label>
        <Textarea
          placeholder="Overall impressions, questions for the agent, follow-up items…"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={4}
        />
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ViewingDetail }
