import { getLanguage } from "@/lib/i18n/server"
import { LanguageProviderWrapper } from "@/components/providers/language-provider-wrapper"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()

  return <LanguageProviderWrapper initialLanguage={language}>{children}</LanguageProviderWrapper>
}
