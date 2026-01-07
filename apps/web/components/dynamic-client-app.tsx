"use client"

import dynamic from "next/dynamic"
import { LoadingScreen } from "@/components/loading-screen"
import { type Language } from "@/lib/i18n/settings"
import { ClientApp } from "@/components/client-app"

const ClientAppWrapper = dynamic(() => Promise.resolve(ClientApp), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

interface DynamicClientAppProps {
  children: React.ReactNode
  initialLanguage: Language
}

export function DynamicClientApp({ children, initialLanguage }: DynamicClientAppProps) {
  return <ClientAppWrapper initialLanguage={initialLanguage}>{children}</ClientAppWrapper>
}
