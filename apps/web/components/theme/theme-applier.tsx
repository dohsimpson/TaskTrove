"use client"

import { DEFAULT_SELECTED_THEME } from "@tasktrove/constants"

/**
 * Hook to manage selected theme in localStorage
 * Placeholder implementation for theme management
 */
export function useSelectedTheme() {
  const selectedTheme = DEFAULT_SELECTED_THEME

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTheme = (...args: unknown[]) => {}

  return { selectedTheme, setTheme }
}
