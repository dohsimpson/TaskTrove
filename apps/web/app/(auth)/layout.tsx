import { Suspense } from "react"
import { LanguageProvider } from "@tasktrove/i18n"
import { i18nConfig } from "@/lib/i18n/config"
import { getLanguage } from "@/lib/i18n/server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage()

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">TaskTrove</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LanguageProvider config={i18nConfig} initialLanguage={language}>
        {children}
      </LanguageProvider>
    </Suspense>
  )
}
