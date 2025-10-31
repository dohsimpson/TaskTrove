"use client"

import { LanguageProvider } from "@tasktrove/i18n"
import { i18nConfig, type AppLanguage } from "@/lib/i18n/config"

interface LanguageProviderWrapperProps {
  children: React.ReactNode
  initialLanguage: AppLanguage
}

/**
 * Shared wrapper for LanguageProvider across all route groups
 *
 * This component:
 * - Wraps LanguageProvider with Suspense for proper i18n initialization
 * - Imports i18nConfig (containing functions) directly in Client Component
 * - Receives only serializable data (initialLanguage) from Server Components
 */
export function LanguageProviderWrapper({
  children,
  initialLanguage,
}: LanguageProviderWrapperProps) {
  return (
    <LanguageProvider config={i18nConfig} initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  )
}
