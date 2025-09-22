"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface TaskShadowProps {
  height: number
  className?: string
}

/**
 * Shadow placeholder for dragged tasks
 * Renders a placeholder with the same height as the dragging task
 */
export function TaskShadow({ height, className }: TaskShadowProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-md bg-muted/30 border-2 border-dashed border-muted-foreground/20",
        className,
      )}
      style={{ height }}
    />
  )
}
