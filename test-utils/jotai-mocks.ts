import React from "react"
import { Provider } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import { ReactNode } from "react"
import { WritableAtom } from "jotai"

// Helper component to hydrate atoms with initial values
const HydrateAtoms = ({
  initialValues,
  children,
}: {
  initialValues: Array<[WritableAtom<any, any[], any>, any]>
  children: ReactNode
}) => {
  useHydrateAtoms(initialValues)
  return children as React.ReactElement
}

// Mock provider for testing
export const TestJotaiProvider = ({
  children,
  initialValues = [],
}: {
  children: ReactNode
  initialValues?: Array<[WritableAtom<any, any[], any>, any]>
}) => {
  return React.createElement(
    Provider,
    {},
    React.createElement(HydrateAtoms, { initialValues, children }),
  )
}

// Helper to create mock atom values in the correct format
export const createMockAtomValues = (
  atomValuePairs: Array<[WritableAtom<any, any[], any>, any]>,
) => {
  return atomValuePairs
}
