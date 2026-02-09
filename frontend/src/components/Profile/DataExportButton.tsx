/**
 * Data Export Button Component
 * GDPR-compliant data export functionality
 */

import { useState } from "react"
import { Download, Loader2, FileJson, Check, Info } from "lucide-react"

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

interface IProps {
  onExport?: () => Promise<Blob>
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const EXPORTED_DATA_TYPES = [
  { label: "Profile information", description: "Your account details and preferences" },
  { label: "Journey data", description: "All your property buying journeys and progress" },
  { label: "Bookmarks", description: "Saved laws and articles" },
  { label: "Calculations", description: "Saved calculator results" },
  { label: "Activity history", description: "Your usage and interaction history" },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Data export button with info dialog. */
function DataExportButton(props: IProps) {
  const { onExport, className } = props

  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    setIsComplete(false)

    try {
      if (onExport) {
        const blob = await onExport()
        // Download the blob
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `heimpath-data-export-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        // Simulate export for demo
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      setIsComplete(true)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setIsComplete(false)
    }, 300)
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Your Data
        </CardTitle>
        <CardDescription>
          Download a copy of all your data in accordance with GDPR
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Request Data Export
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Your Data</DialogTitle>
              <DialogDescription>
                We'll prepare a JSON file containing all your personal data
              </DialogDescription>
            </DialogHeader>

            {isComplete ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="mt-4 font-semibold">Export Complete!</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your data has been downloaded. Check your downloads folder.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-3">
                      The following data will be included:
                    </p>
                    <ul className="space-y-2">
                      {EXPORTED_DATA_TYPES.map((type, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium">
                              {type.label}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Your data will be exported as a JSON file. This process
                      may take a few moments depending on the amount of data.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}

            {isComplete && (
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
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

export { DataExportButton }
