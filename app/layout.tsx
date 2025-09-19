import type { Metadata } from "next"
import "./globals.css"
import { JotaiProvider } from "@/providers/index"
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper"
import { HydrateWrapper } from "@/providers/hydrate-wrapper"
// import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/custom/toaster"
import { LanguageProvider } from "@/components/providers/language-provider"
import { getLanguage } from "@/lib/i18n/server"

export const metadata: Metadata = {
  title: "TaskTrove",
  description: "Task management application",
  appleWebApp: {
    title: "TaskTrove",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const language = await getLanguage()

  return (
    <html lang={language} suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <LanguageProvider initialLanguage={language}>
            <JotaiProvider>
              <HydrateWrapper>
                <MainLayoutWrapper>{children}</MainLayoutWrapper>
              </HydrateWrapper>
            </JotaiProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
