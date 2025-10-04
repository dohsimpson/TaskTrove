"use client"

import { SessionProvider } from "next-auth/react"
import { JotaiProvider } from "@/providers/index"
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper"
import { HydrateWrapper } from "@/providers/hydrate-wrapper"
import { LanguageProviderWrapper } from "@/components/providers/language-provider-wrapper"
import type { AppLanguage } from "@/lib/i18n/config"

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
      <LanguageProviderWrapper initialLanguage={initialLanguage}>
        <JotaiProvider>
          <HydrateWrapper>
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </HydrateWrapper>
        </JotaiProvider>
      </LanguageProviderWrapper>
    </SessionProvider>
  )
}
