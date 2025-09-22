"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "@/lib/i18n/client"
import { type Language, fallbackLng, cookieName, isValidLanguage } from "@/lib/i18n/settings"

interface LanguageContextType {
  language: Language
  setLanguage: (lng: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: string
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Use initialLanguage from server if provided, otherwise fallback
    const lng = initialLanguage && isValidLanguage(initialLanguage) ? initialLanguage : fallbackLng
    return lng
  })

  const { t, i18n } = useTranslation(language, "common")

  const setLanguage = (lng: Language) => {
    setLanguageState(lng)
    // Set cookie for persistence
    document.cookie = `${cookieName}=${lng}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    // Change i18next language
    i18n.changeLanguage(lng)
  }

  useEffect(() => {
    // Sync with i18next resolved language if different
    if (
      i18n.resolvedLanguage &&
      i18n.resolvedLanguage !== language &&
      isValidLanguage(i18n.resolvedLanguage)
    ) {
      setLanguageState(i18n.resolvedLanguage)
    }
  }, [i18n.resolvedLanguage, language])

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
