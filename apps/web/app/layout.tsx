import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/custom/toaster"
import { getLanguage } from "@/lib/i18n/server"
import { HalloweenTheme } from "./components/halloween-theme"
import { HalloweenProvider } from "./contexts/halloween-context"

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

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

  // 🎃 Halloween Theme - Check environment variable on server side
  const isHalloweenEnabled = process.env.ENABLE_HALLOWEEN_THEME === "true"

  if (isHalloweenEnabled) {
    console.log("🎃 Halloween Theme: Spooky theme is enabled! Enjoy the Halloween colors! 👻")
  }

  return (
    <html lang={language} suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <HalloweenProvider isEnabled={isHalloweenEnabled}>
            <HalloweenTheme isEnabled={isHalloweenEnabled} />
            {children}
            <Toaster />
          </HalloweenProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
