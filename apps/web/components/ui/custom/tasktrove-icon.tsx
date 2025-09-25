import React from "react"
import { cn } from "@/lib/utils"

interface TaskTroveIconProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function TaskTroveIcon({ className, size = "md" }: TaskTroveIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return <img src="/icon0.svg" alt="TaskTrove Icon" className={cn(sizeClasses[size], className)} />
}
