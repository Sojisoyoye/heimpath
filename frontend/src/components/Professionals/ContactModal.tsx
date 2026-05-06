/**
 * Contact Modal Component
 * Modal form to submit a contact inquiry to a professional
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSubmitInquiry } from "@/hooks/mutations"

interface IProps {
  professionalId: string
  professionalName: string
  open: boolean
  onClose: () => void
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Contact inquiry modal form. */
function ContactModal(props: Readonly<IProps>) {
  const { professionalId, professionalName, open, onClose } = props
  const [senderName, setSenderName] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [message, setMessage] = useState("")

  const submitInquiry = useSubmitInquiry(professionalId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!senderName.trim() || !senderEmail.trim() || !message.trim()) return

    submitInquiry.mutate(
      {
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        message: message.trim(),
      },
      {
        onSuccess: () => {
          setSenderName("")
          setSenderEmail("")
          setMessage("")
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {professionalName}</DialogTitle>
          <DialogDescription>
            Send a message directly to this professional. They will receive your
            inquiry by email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="inquiry-name" className="text-sm font-medium">
              Your name
            </label>
            <Input
              id="inquiry-name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Jane Doe"
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="inquiry-email" className="text-sm font-medium">
              Your email
            </label>
            <Input
              id="inquiry-email"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="inquiry-message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need help with..."
              maxLength={2000}
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !senderName.trim() ||
                !senderEmail.trim() ||
                !message.trim() ||
                submitInquiry.isPending
              }
            >
              {submitInquiry.isPending ? "Sending..." : "Send Inquiry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ContactModal }
