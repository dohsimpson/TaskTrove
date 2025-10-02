import { LanguageProvider } from "@tasktrove/i18n"
import { i18nConfig } from "@/lib/i18n/config"
import { getLanguage } from "@/lib/i18n/server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()

  return (
    <LanguageProvider config={i18nConfig} initialLanguage={language}>
      {children}
    </LanguageProvider>
  )
}
