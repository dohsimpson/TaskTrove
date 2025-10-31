"use client"

import { AlertTriangle, Calendar, Repeat } from "lucide-react"
import { isPast, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { getDueDateTextColor, getScheduleIcons } from "@/lib/color-utils"
import { formatTaskDateTimeBadge } from "@/lib/utils/task-date-formatter"
import { getEffectiveDueDate } from "@tasktrove/utils"
import { log } from "@/lib/utils/logger"
import { createTaskId } from "@tasktrove/types/id"
import type { Task } from "@tasktrove/types/core"

interface TaskDueDateProps {
  dueDate?: Date | null
  dueTime?: Date | null
  recurring?: string
  recurringMode?: Task["recurringMode"]
  completed?: boolean
  variant?: "default" | "compact"
  className?: string
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

  const formatDueDate = (date: Date | null | undefined, time: Date | null | undefined) => {
    return formatTaskDateTimeBadge({ dueDate: date || null, dueTime: time }) || ""
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
      {displayDate || dueTime ? formatDueDate(displayDate, dueTime || undefined) : ""}
    </span>
  )
}
