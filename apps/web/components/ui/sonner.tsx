"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "@/lib/toast"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  const toasterTheme: ToasterProps["theme"] =
    theme === "dark" || theme === "light" || theme === "system" ? theme : "system"

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      style={
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- CSS custom properties require type assertion
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
