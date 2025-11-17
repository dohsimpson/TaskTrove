"use client"

import { createContext, useContext } from "react"

type NavigateHandler = (categoryId: string) => void

type SettingsDialogContextValue = {
  navigateToCategory: NavigateHandler
}

const noop: NavigateHandler = () => {}

export const SettingsDialogContext = createContext<SettingsDialogContextValue>({
  navigateToCategory: noop,
})

export function useSettingsDialogNavigation() {
  return useContext(SettingsDialogContext)
}
