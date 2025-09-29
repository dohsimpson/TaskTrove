"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface TaskShadowProps {
  height?: number
  fillRemaining?: boolean
  className?: string
}

/**
 * Shadow placeholder for dragged tasks
 * Renders a placeholder with the same height as the dragging task or fills remaining space
 */
export function TaskShadow({ height, fillRemaining, className }: TaskShadowProps) {
  const baseClasses = "rounded-md bg-muted/30 border-2 border-dashed border-muted-foreground/20"

  if (fillRemaining) {
    return (
      <div
        className={cn(
          baseClasses,
          "flex-1 min-h-16", // flex-1 fills remaining space, min-h-16 ensures minimum visibility
          className,
        )}
      />
    )
  }

  return <div className={cn(baseClasses, "flex-shrink-0", className)} style={{ height }} />
}
