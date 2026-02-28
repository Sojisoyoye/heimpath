/**
 * Delete Journey Confirmation Dialog
 * Reusable dialog for confirming journey deletion
 */

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface IProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Confirmation dialog for journey deletion. */
function DeleteJourneyDialog(props: IProps) {
  const { open, onOpenChange, onConfirm, isPending = false } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Journey</DialogTitle>
          <DialogDescription>
            This will permanently remove the journey and all its progress. Are
            you sure? You will not be able to undo this action.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DeleteJourneyDialog }
