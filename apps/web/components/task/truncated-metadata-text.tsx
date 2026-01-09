import React from "react"
import { cn } from "@/lib/utils"

interface TruncatedMetadataTextProps {
  children: React.ReactNode
  className?: string
  showOnHover?: boolean
  maxWidth?: string
}

export function TruncatedMetadataText({
  children,
  className,
  showOnHover = false,
  maxWidth = "max-w-20",
}: TruncatedMetadataTextProps) {
  const hoverClasses = showOnHover ? "hidden group-hover/metadata:inline" : ""

  const widthClass =
    showOnHover && maxWidth === "max-w-20"
      ? "max-w-16" // Use smaller width for hover-to-show text
      : maxWidth

  return (
    <span className={cn("truncate sm:max-w-none", hoverClasses, widthClass, className)}>
      {children}
    </span>
  )
}
