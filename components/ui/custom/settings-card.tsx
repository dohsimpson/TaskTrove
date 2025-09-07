import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExperimentalBadge } from "./experimental-badge"

interface SettingsCardProps {
  /** Card title text */
  title: string
  /** Optional card description */
  description?: string
  /** Optional icon to show before title */
  icon?: React.ComponentType<{ className?: string }>
  /** Whether to show experimental badge */
  experimental?: boolean
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
  children,
  className,
}: SettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-5" />}
          {title}
          {experimental && <ExperimentalBadge />}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
