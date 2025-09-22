"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface SidebarDropIndicatorProps {
  height?: number
  className?: string
  level?: number // 0 = root, 1 = inside group
}

/**
 * Drop indicator for sidebar drag and drop operations
 * Shows visual feedback for where items will be dropped
 */
export function SidebarDropIndicator({
  height = 2,
  className,
  level = 0,
}: SidebarDropIndicatorProps) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 bg-primary rounded-full transition-all duration-200 pointer-events-none z-50",
        className,
      )}
      style={{
        height: `${height}px`,
        marginLeft: level > 0 ? "24px" : "8px", // Indent for group levels
      }}
    />
  )
}
