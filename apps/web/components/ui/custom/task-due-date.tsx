"use client"

import { Calendar, Repeat } from "lucide-react"
import { isPast, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { getDueDateTextColor, getScheduleIcons } from "@/lib/color-utils"
import { formatTaskDateTimeBadge } from "@/lib/utils/task-date-formatter"
import { getEffectiveDueDate } from "@tasktrove/utils"
import { log } from "@/lib/utils/logger"
import { createTaskId } from "@tasktrove/types/id"
import type { Task } from "@tasktrove/types/core"
import { useAtomValue } from "jotai"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"

interface TaskDueDateProps {
  dueDate?: Date | null
  dueTime?: Date | null
  recurring?: string
  recurringMode?: Task["recurringMode"]
  completed?: boolean
  variant?: "default" | "compact"
  className?: string
}

// Overdue background styling constants
const OVERDUE_BACKGROUND_CLASSES = {
  default: "rounded-md px-1 bg-rose-100/80 dark:bg-rose-500/30",
  compact: "rounded px-1 bg-rose-100/80 dark:bg-rose-500/30",
}

export function TaskDueDate({
  dueDate,
  dueTime,
  recurring,
  recurringMode,
  completed = false,
  variant = "default",
  className,
}: TaskDueDateProps) {
  const settings = useAtomValue(settingsAtom)
  const use24HourTime = Boolean(settings.uiSettings.use24HourTime)
  const preferDayMonthFormat = Boolean(settings.general.preferDayMonthFormat)

  if (!dueDate && !recurring) {
    return null
  }

  // For auto-rollover tasks, use effective due date
  const task: Task = {
    id: createTaskId("00000000-0000-0000-0000-000000000000"), // Consistent mock ID for effective due date calculation
    title: "",
    completed,
    priority: 1,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    dueDate: dueDate || undefined,
    recurring,
    recurringMode: recurringMode || "dueDate",
  }

  const effectiveDueDate = getEffectiveDueDate(task)
  const displayDate = effectiveDueDate || dueDate

  // Debug: Log what we're actually displaying
  if (task.recurringMode === "autoRollover") {
    log.debug(
      {
        module: "TaskDueDate",
        taskId: task.id,
        originalDueDate: dueDate?.toISOString(),
        effectiveDueDate: effectiveDueDate?.toISOString(),
        displayDate: displayDate?.toISOString(),
        completed: task.completed,
      },
      "TaskDueDate display",
    )
  }

  const isOverdue = Boolean(
    displayDate && isPast(displayDate) && !isToday(displayDate) && !completed,
  )
  const scheduleIcons = getScheduleIcons(dueDate || undefined, recurring, completed, isOverdue)
  const { hasRecurring, primaryIcon, secondaryIcon } = scheduleIcons
  const showCalendarIcon =
    primaryIcon === "calendar" || (primaryIcon === "overdue" && !hasRecurring)

  const iconSize = variant === "compact" ? "h-3 w-3" : "h-4 w-4"

  const formatDueDate = (date: Date | null | undefined, time: Date | null | undefined) => {
    return formatTaskDateTimeBadge({ dueDate: date || null, dueTime: time }, undefined, {
      use24HourTime,
      preferDayMonthFormat,
    })
  }

  return (
    <span
      className={cn(
        "flex items-center gap-2",
        dueDate ? getDueDateTextColor(dueDate, completed, variant) : "text-muted-foreground",
        isOverdue && OVERDUE_BACKGROUND_CLASSES[variant],
        className,
      )}
    >
      {showCalendarIcon && (
        <Calendar className={cn(iconSize, "shrink-0 flex-none")} data-testid="calendar-icon" />
      )}
      {primaryIcon === "repeat" && (
        <Repeat className={cn(iconSize, "shrink-0 flex-none")} data-testid="repeat-icon" />
      )}
      {secondaryIcon === "repeat" && (
        <Repeat className={cn(iconSize, "shrink-0 flex-none")} data-testid="repeat-icon" />
      )}
      {displayDate || dueTime ? formatDueDate(displayDate, dueTime || undefined) : ""}
    </span>
  )
}
