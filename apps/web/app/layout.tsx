import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/custom/toaster"
import { getLanguage } from "@/lib/i18n/server"
import { DynamicClientApp } from "@/components/dynamic-client-app"

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
          <DynamicClientApp initialLanguage={language}>{children}</DynamicClientApp>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
