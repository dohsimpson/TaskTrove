"use client"

import * as React from "react"
import { useHydrateAtoms } from "jotai/utils"

export const StoreProvider = ({
  initialValues,
  children,
}: {
  initialValues: any
  children: React.ReactNode
}) => {
  useHydrateAtoms(initialValues)
  return children
}
