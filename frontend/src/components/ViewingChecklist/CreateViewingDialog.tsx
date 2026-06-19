import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  open: boolean
  isCreating: boolean
  onClose: () => void
  onCreate: (address: string, viewedAt?: string) => void
}

/** Dialog for creating a new property viewing record. */
function CreateViewingDialog(props: Readonly<IProps>) {
  const { open, isCreating, onClose, onCreate } = props
  const [address, setAddress] = useState("")
  const [viewedAt, setViewedAt] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    onCreate(address.trim(), viewedAt || undefined)
    setAddress("")
    setViewedAt("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Property Viewing</DialogTitle>
          <DialogDescription>
            Enter the property address to start your viewing checklist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              placeholder="Musterstraße 1, 10115 Berlin"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewedAt">Viewing Date (optional)</Label>
            <Input
              id="viewedAt"
              type="date"
              value={viewedAt}
              onChange={(e) => setViewedAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!address.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CreateViewingDialog }
