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
  variant?: "default" | "compact" | "kanban" | "calendar" | "subtask"
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
  // Different styling based on variant
  const variantStyles = {
    default: cn(
      "p-3 sm:p-4 md:p-5 rounded-xl border border-l-4 transition-all duration-300",
      // Material Design elevation with subtle default shadow
      "shadow-sm hover:shadow-lg dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-gray-300/20",
      // Hover effects for material feel
      "hover:-translate-y-0.5 hover:border-opacity-80",
      selected
        ? "bg-accent text-accent-foreground border-accent-foreground/20 shadow-md"
        : "bg-card border-border/50",
    ),
    compact: cn(
      "p-2 rounded border border-t-0 border-l-3 transition-all duration-200",
      "hover:shadow-md dark:hover:shadow-gray-300/30",
      selected ? "bg-accent text-accent-foreground border-accent-foreground/20" : "bg-card",
    ),
    kanban: cn(
      "p-3 border border-t-1 border-l-3 rounded-lg shadow-xs transition-all duration-200",
      "hover:shadow-md dark:hover:shadow-gray-300/30",
      selected ? "bg-accent text-accent-foreground border-accent-foreground/20" : "bg-card",
    ),
    calendar: cn(
      "p-0.5 lg:p-1 rounded transition-all duration-200 border border-t-0 border-l-3",
      completed ? "bg-muted text-muted-foreground line-through" : "bg-card hover:bg-accent",
    ),
    subtask: cn("rounded-md transition-colors p-2 bg-muted/50 hover:bg-muted/70"),
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
