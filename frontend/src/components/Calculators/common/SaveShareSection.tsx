import { Save, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isLoggedIn } from "@/hooks/useAuth"
import { SaveSignUpCta } from "../../Tools/ToolsCta"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  saveName: string
  onSaveNameChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  shareUrl: string
  onCopyShareUrl: () => void
}

/******************************************************************************
                              Components
******************************************************************************/

/** Save/share controls when authenticated, or sign-up CTA when not. */
function SaveShareSection(props: Readonly<IProps>) {
  const {
    saveName,
    onSaveNameChange,
    onSave,
    isSaving,
    shareUrl,
    onCopyShareUrl,
  } = props

  if (!isLoggedIn()) {
    return <SaveSignUpCta />
  }

  return (
    <>
      <div className="space-y-2">
        <Input
          placeholder="Name this calculation (optional)"
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
        />
        <Button onClick={onSave} disabled={isSaving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Calculation"}
        </Button>
      </div>
      {shareUrl && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Link
          </p>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-xs" />
            <Button variant="outline" size="sm" onClick={onCopyShareUrl}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SaveShareSection }
