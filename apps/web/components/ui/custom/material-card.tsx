import React from "react"
import { cn } from "@/lib/utils"

interface MaterialCardProps {
  /** Card content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Whether the card is selected/focused */
  selected?: boolean
  /** Whether the card is hovered */
  isHovered?: boolean
  /** Whether the card content is completed */
  completed?: boolean
  /** Left border color class for priority/status indication */
  leftBorderColor?: string
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void
  /** Mouse enter handler */
  onMouseEnter?: () => void
  /** Mouse leave handler */
  onMouseLeave?: () => void
  /** Data attributes for testing/selection */
  "data-task-focused"?: boolean
  /** Variant of the card */
  variant?: "default" | "compact" | "kanban" | "narrow" | "calendar" | "subtask"
}

export function MaterialCard({
  children,
  className,
  selected = false,
  completed = false,
  leftBorderColor,
  onClick,
  onMouseEnter,
  onMouseLeave,
  variant = "default",
  ...props
}: MaterialCardProps) {
  // Shared base styles across all variants
  const baseStyles =
    "border-l-[3px] hover:border-opacity-90 transition-all dark:shadow-gray-300/10 bg-background"

  // Common selected state for card variants
  const selectedStyles = "bg-accent text-accent-foreground border-accent-foreground"

  // Unified Material Design styling system with consistent elevation hierarchy
  const variantStyles = {
    default: cn(
      baseStyles,
      "duration-300",
      "p-3 sm:p-4 rounded-lg",
      "shadow-sm hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-gray-300/20",
      "hover:-translate-y-0.5",
      selected && cn(selectedStyles, "shadow-md"),
    ),
    compact: cn(
      baseStyles,
      "duration-200",
      "p-2.5 rounded-lg",
      "shadow-xs hover:shadow-sm dark:hover:shadow-gray-300/20",
      selected && selectedStyles,
    ),
    kanban: cn(
      baseStyles,
      "duration-200",
      "p-3 rounded-lg",
      "shadow-sm hover:shadow-md dark:hover:shadow-gray-300/30",
      selected && selectedStyles,
    ),
    narrow: cn(
      baseStyles,
      "duration-200",
      "p-1 rounded-lg",
      "border-l-0 border-none",
      selected && selectedStyles,
    ),
    calendar: cn(
      baseStyles,
      "duration-200",
      "p-1 rounded",
      "hover:shadow-xs dark:hover:shadow-gray-300/10",
      completed
        ? "bg-muted text-muted-foreground line-through border-muted-foreground/30"
        : "hover:bg-accent/50",
    ),
    subtask: cn(baseStyles, "duration-200", "p-2 rounded-lg"),
  }

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        variantStyles[variant],
        completed && variant !== "calendar" && "opacity-60",
        leftBorderColor,
        className,
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
}
