"use client"

import { SessionProvider } from "next-auth/react"
import { JotaiProvider } from "@/providers/index"
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper"
import { HydrateWrapper } from "@/providers/hydrate-wrapper"
import { LanguageProvider } from "@/components/providers/language-provider"
import { type Language } from "@/lib/i18n/settings"

interface ClientAppProps {
  children: React.ReactNode
  initialLanguage: Language
}

/**
 * Client-side only app component
 * This component contains all the providers and main layout
 * and will be dynamically imported with { ssr: false }
 */
export function ClientApp({ children, initialLanguage }: ClientAppProps) {
  return (
    <SessionProvider>
      <LanguageProvider initialLanguage={initialLanguage}>
        <JotaiProvider>
          <HydrateWrapper>
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </HydrateWrapper>
        </JotaiProvider>
      </LanguageProvider>
    </SessionProvider>
  )
}
