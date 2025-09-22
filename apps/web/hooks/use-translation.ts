"use client"

import { useLanguage } from "@/components/providers/language-provider"

/**
 * Custom hook for accessing translations in client components
 * This provides a simple interface that works with our LanguageProvider
 */
export function useTranslation() {
  const { t, language, setLanguage } = useLanguage()

  return {
    t,
    language,
    setLanguage,
  }
}
