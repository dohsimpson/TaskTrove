"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

interface HydrationSafeBadgeProps {
  count: number | undefined
  variant?: "default" | "secondary" | "destructive" | "outline"
  className?: string
  children?: React.ReactNode
}

/**
 * A Badge component that safely handles server-side rendering
 * by only showing the count after hydration is complete.
 * This prevents hydration mismatches when count depends on client-side state.
 */
export function HydrationSafeBadge({
  count,
  variant = "secondary",
  className = "ml-auto text-xs",
  children,
}: HydrationSafeBadgeProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // During SSR or before hydration, don't render the badge
  if (!isHydrated || count === undefined || count === 0) {
    return null
  }

  return (
    <Badge variant={variant} className={className}>
      {children || count}
    </Badge>
  )
}
