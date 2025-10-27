"use client"

import { useEffect } from "react"
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
  // Suppress React 19 ref warning from motion library
  // TODO: Remove this once motion releases a React 19 compatible version
  useEffect(() => {
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      const message = String(args[0])
      // Filter out the motion ref warning
      if (message.includes("Accessing element.ref was removed in React 19")) {
        return
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

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
