/**
 * Journey Context
 * Provides journey data to step content components without prop drilling
 */

import { createContext, useContext } from "react"
import type { JourneyPublic } from "@/models/journey"

/******************************************************************************
                              Types
******************************************************************************/

interface IJourneyContext {
  journey: JourneyPublic
}

/******************************************************************************
                              Context
******************************************************************************/

const JourneyContext = createContext<IJourneyContext | null>(null)

/******************************************************************************
                              Hook
******************************************************************************/

function useJourneyContext(): IJourneyContext {
  const ctx = useContext(JourneyContext)
  if (!ctx) {
    throw new Error("useJourneyContext must be used within a JourneyProvider")
  }
  return ctx
}

/******************************************************************************
                              Components
******************************************************************************/

interface IProps {
  journey: JourneyPublic
  children: React.ReactNode
}

function JourneyProvider(props: IProps) {
  const { journey, children } = props

  return (
    <JourneyContext.Provider value={{ journey }}>
      {children}
    </JourneyContext.Provider>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyProvider, useJourneyContext }
