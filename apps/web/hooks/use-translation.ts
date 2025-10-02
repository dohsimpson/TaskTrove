"use client"

import { useLanguage } from "@tasktrove/i18n"

/**
 * Custom hook for accessing translations in client components
 * Re-export of useLanguage from @tasktrove/i18n for convenience
 */
export function useTranslation() {
  return useLanguage()
}
