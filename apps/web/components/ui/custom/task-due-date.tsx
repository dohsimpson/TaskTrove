"use client"

import { AlertTriangle, Calendar, Repeat } from "lucide-react"
import { isPast, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { getDueDateTextColor, getScheduleIcons } from "@/lib/color-utils"
import { formatTaskDateTimeBadge } from "@/lib/utils/task-date-formatter"

interface TaskDueDateProps {
  dueDate?: Date | null
  dueTime?: Date | null
  recurring?: string
  completed?: boolean
  variant?: "default" | "compact"
  className?: string
}

export function TaskDueDate({
  dueDate,
  dueTime,
  recurring,
  completed = false,
  variant = "default",
  className,
}: TaskDueDateProps) {
  if (!dueDate && !recurring) {
    return null
  }

  const isOverdue = Boolean(dueDate && isPast(dueDate) && !isToday(dueDate) && !completed)
  const scheduleIcons = getScheduleIcons(dueDate || undefined, recurring, completed, isOverdue)

  const formatDueDate = (task: { dueDate?: Date | null; dueTime?: Date | null }) => {
    return formatTaskDateTimeBadge(task) || ""
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1",
        dueDate ? getDueDateTextColor(dueDate, completed, variant) : "text-muted-foreground",
        className,
      )}
    >
      {scheduleIcons.primaryIcon === "overdue" && (
        <AlertTriangle className="h-3 w-3 text-red-500" data-testid="alert-triangle-icon" />
      )}
      {scheduleIcons.primaryIcon === "calendar" && (
        <Calendar className="h-3 w-3" data-testid="calendar-icon" />
      )}
      {scheduleIcons.primaryIcon === "repeat" && (
        <Repeat className="h-3 w-3" data-testid="repeat-icon" />
      )}
      {scheduleIcons.secondaryIcon === "repeat" && (
        <Repeat className="h-3 w-3" data-testid="repeat-icon" />
      )}
      {dueDate ? formatDueDate({ dueDate, dueTime }) : ""}
    </span>
  )
}
