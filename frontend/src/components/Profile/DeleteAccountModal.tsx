/**
 * Delete Account Modal Component
 * Account deletion with multi-step confirmation
 */

import { useState } from "react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IProps {
  email: string
  onDelete?: () => Promise<void>
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const DELETION_CONSEQUENCES = [
  "All your property buying journeys will be permanently deleted",
  "Your bookmarked laws and saved articles will be removed",
  "All calculation history will be erased",
  "Your account cannot be recovered after deletion",
  "Any active subscription will be cancelled",
]

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Delete account modal with confirmation. */
function DeleteAccountModal(props: IProps) {
  const { email, onDelete, className } = props

  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"warning" | "confirm">("warning")
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const confirmationPhrase = "delete my account"
  const isConfirmValid = confirmText.toLowerCase() === confirmationPhrase

  const handleProceed = () => {
    setStep("confirm")
  }

  const handleDelete = async () => {
    if (!isConfirmValid) return

    setIsDeleting(true)
    try {
      if (onDelete) {
        await onDelete()
      } else {
        // Simulate deletion for demo
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      setIsOpen(false)
    } catch (error) {
      console.error("Deletion failed:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("warning")
      setConfirmText("")
    }, 300)
  }

  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete My Account</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {step === "warning" ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Your Account?
                  </DialogTitle>
                  <DialogDescription>
                    This action is permanent and cannot be undone
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive mb-3">
                      The following will be permanently deleted:
                    </p>
                    <ul className="space-y-2">
                      {DELETION_CONSEQUENCES.map((consequence, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                          <span className="text-muted-foreground">
                            {consequence}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm">
                      <strong>Account to be deleted:</strong>
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      {email}
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleProceed}>
                    I Understand, Continue
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Final Confirmation
                  </DialogTitle>
                  <DialogDescription>
                    Type the confirmation phrase to delete your account
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm">
                      Type <strong>"{confirmationPhrase}"</strong> to confirm:
                    </Label>
                    <Input
                      id="confirm"
                      type="text"
                      placeholder={confirmationPhrase}
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className={cn(
                        isConfirmValid &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      This is your last chance to cancel. After clicking delete,
                      your account and all data will be permanently removed.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setStep("warning")}>
                    Go Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={!isConfirmValid || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Permanently Delete Account
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DeleteAccountModal }
