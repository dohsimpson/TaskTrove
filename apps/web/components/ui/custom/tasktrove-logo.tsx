import React from "react"
import { cn } from "@/lib/utils"
import { FlickerText } from "./flicker-text"

interface TaskTroveLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  badge?: React.ReactNode
}

const SIZE_CLASSES = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
} as const

export const getLogoFontStyle = () =>
  cn(
    "font-semibold tracking-[0.4em] text-sidebar-foreground uppercase",
    "transition-all duration-300 ease-in-out",
    "hover:text-primary", // Color change on hover
    "hover:[text-shadow:0.5px_0_0_currentColor]", // Fake bold effect in light mode using text-shadow
    // Removed dark mode glow - FlickerText handles this with animation
  )

export const getLogoUnderlineStyle = () =>
  cn(
    "relative pb-1",
    "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-[0.4em] after:h-[1px]",
    "after:bg-sidebar-foreground/30 after:transition-all after:duration-300",
    "hover:after:bg-primary hover:after:h-[2px]", // Thicker underline on hover
    // Removed dark mode underline glow - FlickerText handles all glow effects
  )

export function TaskTroveLogo({ className, size = "md", badge }: TaskTroveLogoProps) {
  return (
    <h1
      className={cn(
        "cursor-default flex flex-col items-center gap-2",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <FlickerText className={cn(getLogoFontStyle(), getLogoUnderlineStyle())}>
        TaskTrove
      </FlickerText>
      {badge}
    </h1>
  )
}
