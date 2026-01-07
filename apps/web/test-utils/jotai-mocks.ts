import React from "react"
import { Provider, type WritableAtom } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import { ReactNode, useMemo } from "react"

type UnsafeAny = ReturnType<typeof JSON.parse>
type AnyWritableAtom = WritableAtom<UnsafeAny, UnsafeAny[], UnsafeAny>
export type HydrateValue = readonly [AnyWritableAtom, ...unknown[]]
export type HydrateValues = ReadonlyArray<HydrateValue>
const EMPTY_HYDRATION: HydrateValues = []

// Helper component to hydrate atoms with initial values
const HydrateAtoms = ({
  initialValues,
  children,
}: {
  initialValues?: HydrateValues
  children?: ReactNode
}) => {
  const hydrationValues = useMemo(() => initialValues ?? EMPTY_HYDRATION, [initialValues])

  useHydrateAtoms(hydrationValues)
  return React.createElement(React.Fragment, null, children)
}

// Mock provider for testing
export const TestJotaiProvider = ({
  children,
  initialValues,
}: {
  children: ReactNode
  initialValues?: HydrateValues
}) => {
  return React.createElement(
    Provider,
    null,
    React.createElement(HydrateAtoms, { initialValues }, children),
  )
}

// Helper to create mock atom values in the correct format
export const createMockAtomValues = <T extends HydrateValues>(atomValuePairs: T) => atomValuePairs
