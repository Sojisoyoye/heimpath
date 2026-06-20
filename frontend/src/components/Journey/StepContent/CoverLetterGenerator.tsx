/**
 * Cover Letter Generator Component
 * Generates a formal landlord cover letter (Anschreiben) from user-provided details
 */

import { Check, ClipboardCopy, FileText } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import useAuth from "@/hooks/useAuth"

/******************************************************************************
                              Constants
******************************************************************************/

type Language = "en" | "de"

const PLACEHOLDER = "Click Generate to create your personalised Anschreiben"
const CLIPBOARD_RESET_MS = 2000

function buildEnglishLetter(
  name: string,
  profession: string,
  income: string,
  moveInDate: string,
  householdSize: string,
): string {
  return `Dear Landlord / Ladies and Gentlemen,

My name is ${name}. I am a ${profession} with a net monthly income of ${income} EUR. I am currently looking for a rental apartment and would like to move in on ${moveInDate}.

My household consists of ${householdSize} person(s). I am a reliable, tidy, and considerate tenant who always pays rent on time.

I would be delighted to arrange a viewing at your earliest convenience. Please feel free to contact me for any further information.

Yours sincerely,
${name}`
}

function buildGermanLetter(
  name: string,
  profession: string,
  income: string,
  moveInDate: string,
  householdSize: string,
): string {
  return `Sehr geehrte Damen und Herren,

mein Name ist ${name}. Ich bin als ${profession} tätig und verfüge über ein monatliches Nettoeinkommen von ${income} EUR. Ich suche derzeit eine Mietwohnung und würde gerne zum ${moveInDate} einziehen.

Mein Haushalt besteht aus ${householdSize} Person(en). Ich bin ein zuverlässiger, ordentlicher und rücksichtsvoller Mieter, der die Miete stets pünktlich zahlt.

Über die Möglichkeit eines Besichtigungstermins würde ich mich sehr freuen. Für weitere Informationen stehe ich Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen,
${name}`
}

/******************************************************************************
                              Components
******************************************************************************/

function CoverLetterGenerator() {
  const { user } = useAuth()

  const [profession, setProfession] = useState("")
  const [income, setIncome] = useState("")
  const [moveInDate, setMoveInDate] = useState("")
  const [householdSize, setHouseholdSize] = useState("1")
  const [letterText, setLetterText] = useState("")
  const [language, setLanguage] = useState<Language>("en")
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    const name = user?.full_name || "[Your Name]"
    const displayProfession = profession || "[Profession]"
    const displayIncome = income || "[Net Monthly Income]"
    const displayMoveInDate = moveInDate || "[Move-in Date]"
    const displayHouseholdSize = householdSize || "1"

    const text =
      language === "en"
        ? buildEnglishLetter(
            name,
            displayProfession,
            displayIncome,
            displayMoveInDate,
            displayHouseholdSize,
          )
        : buildGermanLetter(
            name,
            displayProfession,
            displayIncome,
            displayMoveInDate,
            displayHouseholdSize,
          )

    setLetterText(text)
  }

  const handleCopy = async () => {
    if (!letterText) return
    await navigator.clipboard.writeText(letterText)
    setCopied(true)
    setTimeout(() => setCopied(false), CLIPBOARD_RESET_MS)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <CardTitle className="text-base">
              Cover Letter Generator (Anschreiben)
            </CardTitle>
          </div>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-all",
                language === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("de")}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-all",
                language === "de"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              DE
            </button>
          </div>
        </div>
        <CardDescription>
          Fill in your details and generate a personalised cover letter to
          impress landlords.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cl-profession" className="text-xs">
              Profession
            </Label>
            <Input
              id="cl-profession"
              placeholder="e.g. Software Engineer"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-income" className="text-xs">
              Net Monthly Income (EUR)
            </Label>
            <Input
              id="cl-income"
              placeholder="e.g. 3500"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-move-in" className="text-xs">
              Requested Move-in Date
            </Label>
            <Input
              id="cl-move-in"
              placeholder="e.g. 01.09.2025"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cl-household" className="text-xs">
              Household Size
            </Label>
            <Input
              id="cl-household"
              placeholder="e.g. 2"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button onClick={handleGenerate} size="sm" className="w-full">
          Generate Letter
        </Button>

        <Textarea
          value={letterText}
          onChange={(e) => setLetterText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="min-h-[220px] resize-y text-sm"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!letterText}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CoverLetterGenerator }
