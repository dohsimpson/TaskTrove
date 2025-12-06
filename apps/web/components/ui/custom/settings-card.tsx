import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ExperimentalBadge } from "./experimental-badge"
import { isAndroid, isIos, isMobileApp } from "@/lib/utils/env"

interface SettingsCardProps {
  /** Card title text */
  title: string
  /** Optional card description */
  description?: string
  /** Optional icon to show before title */
  icon?: React.ComponentType<{ className?: string }>
  /** Whether to show experimental badge */
  experimental?: boolean
  /** Whether to show Pro badge */
  proOnly?: boolean
  /** Only render on Android (Capacitor / browser UA) */
  androidOnly?: boolean
  /** Only render on iOS */
  iosOnly?: boolean
  /** Only render when running inside the mobile app shell */
  mobileAppOnly?: boolean
  /** Card content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  experimental = false,
  proOnly = false,
  androidOnly = false,
  iosOnly = false,
  mobileAppOnly = false,
  children,
  className,
}: SettingsCardProps) {
  const platformMismatch = (androidOnly && !isAndroid()) || (iosOnly && !isIos())
  if (platformMismatch) return null

  const mobileAppMismatch = !androidOnly && !iosOnly && mobileAppOnly && !isMobileApp()
  if (mobileAppMismatch) return null

  return (
    <Card className={cn("w-full max-w-full overflow-x-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-5" />}
          {title}
          {proOnly && <Badge variant="outline">Pro</Badge>}
          {androidOnly && <Badge variant="secondary">Android</Badge>}
          {iosOnly && <Badge variant="secondary">iOS</Badge>}
          {!androidOnly && !iosOnly && mobileAppOnly && <Badge variant="secondary">Mobile</Badge>}
          {experimental && <ExperimentalBadge />}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">{children}</CardContent>
    </Card>
  )
}
