import { DynamicClientApp } from "@/components/dynamic-client-app"
import { getLanguage } from "@/lib/i18n/server"

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const language = await getLanguage()

  return <DynamicClientApp initialLanguage={language}>{children}</DynamicClientApp>
}
