"use client"

import { Suspense } from "react"
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">TaskTrove</h1>
            <p className="text-muted-foreground">Loading translations...</p>
          </div>
        </div>
      }
    >
      <LanguageProvider config={i18nConfig} initialLanguage={initialLanguage}>
        {children}
      </LanguageProvider>
    </Suspense>
  )
}
