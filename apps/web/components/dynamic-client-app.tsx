"use client"

import dynamic from "next/dynamic"
import { type Language } from "@/lib/i18n/settings"
import { ClientApp } from "@/components/client-app"
import { isPro } from "@/lib/utils/env"

// Dynamically import the main app with SSR disabled
const ClientAppWrapper = dynamic(() => Promise.resolve(ClientApp), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{`TaskTrove${isPro() ? " Pro" : ""}`}</h1>
        <p className="text-muted-foreground">Redirecting to your tasks...</p>
      </div>
    </div>
  ),
})

interface DynamicClientAppProps {
  children: React.ReactNode
  initialLanguage: Language
}

/**
 * Client-side wrapper for dynamic import
 * This component handles the ssr: false dynamic import on the client side
 */
export function DynamicClientApp({ children, initialLanguage }: DynamicClientAppProps) {
  return <ClientAppWrapper initialLanguage={initialLanguage}>{children}</ClientAppWrapper>
}
