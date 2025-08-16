import type { Metadata } from "next"
import "./globals.css"
import { JotaiProvider } from "@/providers/index"
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper"
import { HydrateWrapper } from "@/providers/hydrate-wrapper"
// import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/custom/toaster"

export const metadata: Metadata = {
  title: "TaskTrove",
  description: "Task management application",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <JotaiProvider>
            <HydrateWrapper>
              <MainLayoutWrapper>{children}</MainLayoutWrapper>
            </HydrateWrapper>
          </JotaiProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
