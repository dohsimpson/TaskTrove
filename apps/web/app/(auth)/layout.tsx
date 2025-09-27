import { LanguageProvider } from "@/components/providers/language-provider"
import { getLanguage } from "@/lib/i18n/server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()

  return <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
}
