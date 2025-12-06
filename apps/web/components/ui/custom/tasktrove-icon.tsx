import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface TaskTroveIconProps {
  className?: string
  size?: "sm" | "md" | "lg"
  /** Use rounded-corner variant (for auth screens, badges, etc.) */
  rounded?: boolean
}

export function TaskTroveIcon({ className, size = "md", rounded = false }: TaskTroveIconProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const sizeDimensions = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  const src = rounded ? "/icon-rounded.svg" : "/icon0.svg"

  return (
    <Image
      src={src}
      alt="TaskTrove Icon"
      width={sizeDimensions[size]}
      height={sizeDimensions[size]}
      className={cn(sizeClasses[size], className)}
    />
  )
}
