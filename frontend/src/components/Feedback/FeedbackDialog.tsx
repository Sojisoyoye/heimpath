/**
 * Feedback Dialog
 * Floating feedback button + dialog for beta testers to submit feedback
 */

import { MessageSquarePlus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSubmitFeedback } from "@/hooks/mutations/useFeedbackMutations"

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "improvement", label: "Improvement" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Floating feedback button with dialog form. */
function FeedbackDialog() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [message, setMessage] = useState("")

  const submitMutation = useSubmitFeedback(() => {
    setOpen(false)
    setCategory("")
    setMessage("")
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitMutation.mutate({
      category,
      message,
      pageUrl: window.location.pathname,
    })
  }

  const isValid = category.length > 0 && message.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 right-6 z-50 h-12 w-12 rounded-full shadow-lg sm:bottom-6"
          aria-label="Send feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve HeimPath. Your feedback is invaluable during our
            beta phase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="feedback-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              placeholder="Describe your feedback in detail (minimum 10 characters)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FeedbackDialog }
