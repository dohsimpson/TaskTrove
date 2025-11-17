"use client"

import type { ReactNode } from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskDueDate } from "@/components/ui/custom/task-due-date"
import type { Task } from "@tasktrove/types/core"
import { parse, parseISO } from "date-fns"

type RecurringPattern = Task["recurring"]

type TriggerVariant = "default" | "compact" | "button" | "panel"

interface TaskScheduleTriggerProps {
  dueDate?: Date | string | null
  dueTime?: Date | string | null
  recurring?: RecurringPattern
  recurringMode?: Task["recurringMode"]
  completed?: boolean
  variant?: TriggerVariant
  className?: string
  fallbackLabel?: ReactNode
  showLabel?: boolean
  labelClassName?: string
}

const TRIGGER_BASE_CLASSES: Record<TriggerVariant, string> = {
  default:
    "flex items-center gap-1 cursor-pointer transition-colors hover:bg-accent hover:opacity-100",
  compact:
    "flex items-center gap-1 text-xs flex-shrink-0 cursor-pointer transition-colors hover:bg-accent hover:opacity-100",
  button: "flex items-center gap-1",
  panel:
    "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 bg-muted/20 border border-transparent hover:border-border/50 hover:bg-accent/50",
}

const FALLBACK_TEXT_CLASSES: Record<TriggerVariant, string> = {
  default: "text-muted-foreground opacity-70 hover:text-foreground",
  compact: "text-muted-foreground opacity-70 hover:text-foreground",
  button: "text-muted-foreground",
  panel: "text-muted-foreground",
}

const LABEL_VISIBILITY_CLASSES: Record<TriggerVariant, string> = {
  default: "whitespace-nowrap",
  compact: "whitespace-nowrap",
  button: "whitespace-nowrap",
  panel: "text-sm font-medium truncate",
}

const normalizeDate = (value?: Date | string | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const TIME_FORMATS = ["HH:mm:ss", "HH:mm"]

const normalizeTime = (value?: Date | string | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value

  for (const format of TIME_FORMATS) {
    const parsed = parse(value, format, new Date())
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

export function TaskScheduleTrigger({
  dueDate,
  dueTime,
  recurring,
  recurringMode,
  completed = false,
  variant = "default",
  className,
  fallbackLabel,
  showLabel = true,
  labelClassName,
}: TaskScheduleTriggerProps) {
  const hasSchedule = Boolean(dueDate || recurring)

  if (hasSchedule) {
    return (
      <TaskDueDate
        dueDate={normalizeDate(dueDate)}
        dueTime={normalizeTime(dueTime)}
        recurring={recurring ?? undefined}
        recurringMode={recurringMode}
        completed={completed}
        variant={variant === "compact" ? "compact" : "default"}
        className={cn(TRIGGER_BASE_CLASSES[variant], className)}
      />
    )
  }

  return (
    <span
      className={cn(
        TRIGGER_BASE_CLASSES[variant],
        FALLBACK_TEXT_CLASSES[variant],
        variant === "panel" && "rounded-lg",
        className,
      )}
    >
      <Calendar className={cn("h-3 w-3 flex-shrink-0", variant === "panel" ? "h-4 w-4" : "")} />
      {fallbackLabel && showLabel && (
        <span className={labelClassName ?? LABEL_VISIBILITY_CLASSES[variant]}>{fallbackLabel}</span>
      )}
    </span>
  )
}
