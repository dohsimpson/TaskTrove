"use client"

import { Suspense } from "react"
import { SessionProvider } from "next-auth/react"
import { JotaiProvider } from "@/providers/index"
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper"
import { HydrateWrapper } from "@/providers/hydrate-wrapper"
import { LanguageProvider } from "@tasktrove/i18n"
import { i18nConfig, type AppLanguage } from "@/lib/i18n/config"

interface ClientAppProps {
  children: React.ReactNode
  initialLanguage: AppLanguage
}

/**
 * Client-side only app component
 * This component contains all the providers and main layout
 * and will be dynamically imported with { ssr: false }
 */
export function ClientApp({ children, initialLanguage }: ClientAppProps) {
  return (
    <SessionProvider>
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
          <JotaiProvider>
            <HydrateWrapper>
              <MainLayoutWrapper>{children}</MainLayoutWrapper>
            </HydrateWrapper>
          </JotaiProvider>
        </LanguageProvider>
      </Suspense>
    </SessionProvider>
  )
}
