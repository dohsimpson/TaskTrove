"use client"

import * as React from "react"
import { useHydrateAtoms } from "jotai/utils"

type HydrateValues = Parameters<typeof useHydrateAtoms>[0]

export const StoreProvider = ({
  initialValues,
  children,
}: {
  initialValues: HydrateValues
  children: React.ReactNode
}) => {
  useHydrateAtoms(initialValues)
  return children
}
