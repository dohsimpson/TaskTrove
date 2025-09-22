"use client"

import * as React from "react"
import { useHydrateAtoms } from "jotai/utils"
import { queryClientAtom } from "jotai-tanstack-query"
import { queryClient } from "./jotai-provider"

export const HydrateWrapper = ({ children }: { children: React.ReactNode }) => {
  // Only hydrate the queryClient atom for React Query integration
  // Data will be fetched via atomWithQuery instead of manual hydration
  useHydrateAtoms([[queryClientAtom, queryClient]])
  return children
}
