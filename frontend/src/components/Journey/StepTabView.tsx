/**
 * Step Tab View Component
 * Two-level tab navigation: phase pills (outer) → step tabs (inner)
 * Alternative to the list view for viewing journey steps
 */

import { useMemo, useState } from "react"

import { JOURNEY_PHASES, PHASE_COLORS } from "@/common/constants"
import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { JourneyPhase, JourneyStep } from "@/models/journey"
import { StepBody } from "./StepContent/StepBody"

interface IProps {
  steps: JourneyStep[]
  activeStepNumber: number
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
}

/******************************************************************************
                              Components
******************************************************************************/

function StepTabView(props: IProps) {
  const { steps, activeStepNumber, onTaskToggle, onStepOpen } = props

  const activeStep = steps.find((s) => s.step_number === activeStepNumber)
  const defaultPhase = activeStep?.phase ?? "research"

  const [selectedPhase, setSelectedPhase] = useState<JourneyPhase>(defaultPhase)

  const stepsByPhase = useMemo(() => {
    const grouped: Record<JourneyPhase, JourneyStep[]> = {
      research: [],
      preparation: [],
      buying: [],
      closing: [],
    }
    for (const step of steps) {
      grouped[step.phase].push(step)
    }
    return grouped
  }, [steps])

  const phaseSteps = stepsByPhase[selectedPhase]

  const defaultStepId = useMemo(() => {
    if (activeStep && activeStep.phase === selectedPhase) {
      return activeStep.id
    }
    return phaseSteps[0]?.id ?? ""
  }, [activeStep, selectedPhase, phaseSteps])

  return (
    <div className="space-y-4">
      {/* Phase pills */}
      <Tabs
        value={selectedPhase}
        onValueChange={(v) => setSelectedPhase(v as JourneyPhase)}
      >
        <TabsList className="flex w-full flex-wrap gap-1">
          {JOURNEY_PHASES.map((phase) => (
            <TabsTrigger
              key={phase.key}
              value={phase.key}
              className={cn(
                "text-xs sm:text-sm",
                selectedPhase === phase.key && PHASE_COLORS[phase.key],
              )}
            >
              {phase.label}
              <span className="ml-1 text-xs text-muted-foreground">
                ({stepsByPhase[phase.key as JourneyPhase].length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Step tabs within selected phase */}
      {phaseSteps.length > 0 && (
        <Tabs key={selectedPhase} defaultValue={defaultStepId}>
          <TabsList className="flex w-full flex-wrap gap-1">
            {phaseSteps.map((step) => (
              <TabsTrigger
                key={step.id}
                value={step.id}
                className={cn(
                  "text-xs sm:text-sm",
                  step.step_number === activeStepNumber &&
                    "ring-2 ring-blue-600 ring-offset-1",
                )}
              >
                <span className="mr-1 font-mono text-xs text-muted-foreground">
                  {step.step_number}.
                </span>
                <span className="max-w-[12ch] truncate sm:max-w-[20ch]">
                  {step.title}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {phaseSteps.map((step) => (
            <TabsContent key={step.id} value={step.id}>
              <Card>
                <CardHeader>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      Step {step.step_number}
                    </div>
                    <CardTitle className="text-base sm:text-lg">
                      {step.title}
                    </CardTitle>
                    {step.description && (
                      <CardDescription>{step.description}</CardDescription>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <StepBody
                    step={step}
                    onTaskToggle={onTaskToggle}
                    onStepOpen={onStepOpen}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepTabView }
