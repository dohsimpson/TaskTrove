/**
 * Task date and time formatting utilities
 *
 * Provides consistent formatting for task due dates and times across the application
 */

import { format, isToday, isTomorrow, isPast } from "date-fns"
import type { Locale } from "date-fns"
import type { Task, CreateTaskRequest } from "@/lib/types"

export type TaskDateFormat =
  | "full" // "Jan 15, 2024 at 9:00 AM" or "Today at 9:00 AM"
  | "compact" // "Jan 15" or "Today"
  | "badge" // "Aug 24 at 9AM" or "Today at 9AM"
  | "short" // "9:00 AM" (time only) or "Jan 15" (date only)
  | "relative" // "Today", "Tomorrow", "Jan 15, 2024"

export interface TaskDateFormatOptions {
  format: TaskDateFormat
  showTimeOnly?: boolean // Show only time when no date is set
  includeYear?: boolean // Include year in date formatting (defaults to current year only)
  use12Hour?: boolean // Use 12-hour time format (defaults to true)
  locale?: Locale // Locale for date/time formatting (defaults to system locale)
}

/**
 * Format a task's due date and time for display
 *
 * @param task - Task object with dueDate and dueTime
 * @param options - Formatting options including locale for internationalization
 * @returns Formatted date/time string or null if no date/time to display
 *
 * @example
 * ```typescript
 * import { es } from 'date-fns/locale'
 *
 * // English (default): "Jan 15 9AM"
 * formatTaskDateTime(task, { format: "badge" })
 *
 * // Spanish: "15 ene 9AM"
 * formatTaskDateTime(task, { format: "badge", locale: es })
 * ```
 */
export function formatTaskDateTime(
  task: Task | CreateTaskRequest | { dueDate?: Date | null; dueTime?: Date | null },
  options: TaskDateFormatOptions = { format: "full" },
): string | null {
  const { dueDate, dueTime } = task
  const { format: formatType, showTimeOnly = true, includeYear, use12Hour = true, locale } = options

  // Handle case where only time is set (no date)
  if (!dueDate && dueTime && showTimeOnly) {
    return formatTime(dueTime, use12Hour, locale)
  }

  // Handle case where no date is set
  if (!dueDate) {
    return null
  }

  // Format the date part
  const dateText = formatDatePart(dueDate, formatType, includeYear, locale)

  // Add time if available
  if (dueTime) {
    const timeText = formatTime(dueTime, use12Hour, locale)
    // For "Today", just show the time. For other dates, show concise format without "at"
    if (isToday(dueDate)) {
      return timeText
    }
    return `${dateText} ${timeText}`
  }

  return dateText
}

/**
 * Get localized relative date labels (Today/Tomorrow)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRelativeDateLabel(date: Date, locale?: Locale): string | null {
  if (isToday(date)) {
    // For now, return "Today" in English. In the future, this could be localized
    // using locale-specific translations or Intl.RelativeTimeFormat
    return "Today"
  }
  if (isTomorrow(date)) {
    return "Tomorrow"
  }
  return null
}

/**
 * Format the date portion of a task's due date
 */
function formatDatePart(
  date: Date,
  formatType: TaskDateFormat,
  includeYear?: boolean,
  locale?: Locale,
): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const dateYear = date.getFullYear()
  const shouldIncludeYear = includeYear ?? dateYear !== currentYear

  const formatOptions = locale ? { locale } : undefined
  const relativeLabel = getRelativeDateLabel(date, locale)

  switch (formatType) {
    case "full":
      if (relativeLabel) return relativeLabel
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)

    case "compact":
      if (relativeLabel) return relativeLabel
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)

    case "badge":
      if (relativeLabel) return relativeLabel
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)

    case "short":
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)

    case "relative":
      if (relativeLabel) return relativeLabel
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)

    default:
      return shouldIncludeYear
        ? format(date, "MMM d, yyyy", formatOptions)
        : format(date, "MMM d", formatOptions)
  }
}

/**
 * Format time portion
 */
function formatTime(time: Date, use12Hour: boolean = true, locale?: Locale): string {
  const formatOptions = locale ? { locale } : undefined

  if (use12Hour) {
    return format(time, "h:mm a", formatOptions)
  } else {
    return format(time, "HH:mm", formatOptions)
  }
}

/**
 * Get a short time format for badges and compact displays
 */
export function formatTimeShort(time: Date): string {
  // For badges, use shorter format like "9AM" instead of "9:00 AM"
  const hours = time.getHours()
  const minutes = time.getMinutes()

  if (hours === 0) {
    return minutes === 0 ? "12AM" : `12:${minutes.toString().padStart(2, "0")}AM`
  } else if (hours < 12) {
    return minutes === 0 ? `${hours}AM` : `${hours}:${minutes.toString().padStart(2, "0")}AM`
  } else if (hours === 12) {
    return minutes === 0 ? "12PM" : `12:${minutes.toString().padStart(2, "0")}PM`
  } else {
    const hour12 = hours - 12
    return minutes === 0 ? `${hour12}PM` : `${hour12}:${minutes.toString().padStart(2, "0")}PM`
  }
}

/**
 * Format task date for schedule popover badge (compact with short time)
 *
 * @param task - Task object with dueDate and dueTime
 * @param locale - Optional locale for date formatting
 * @returns Formatted badge text or null if no date/time to display
 */
export function formatTaskDateTimeBadge(
  task: Task | CreateTaskRequest | { dueDate?: Date | null; dueTime?: Date | null },
  locale?: Locale,
): string | null {
  const { dueDate, dueTime } = task

  if (!dueDate && dueTime) {
    return formatTimeShort(dueTime)
  }

  if (!dueDate) {
    return null
  }

  const dateText = formatDatePart(dueDate, "badge", undefined, locale)

  if (dueTime) {
    const timeText = formatTimeShort(dueTime)
    // For "Today", just show the time. For other dates, show "Tomorrow 9AM" format
    if (isToday(dueDate)) {
      return timeText
    }
    return `${dateText} ${timeText}`
  }

  return dateText
}

/**
 * Check if a task is overdue (considering completion status)
 */
export function isTaskOverdue(task: { dueDate?: Date | null; completed?: boolean }): boolean {
  if (!task.dueDate || task.completed) return false
  return isPast(task.dueDate) && !isToday(task.dueDate)
}

/**
 * Get appropriate status text for a task's due date
 */
export function getTaskDueDateStatus(task: {
  dueDate?: Date | null
  dueTime?: Date | null
  completed?: boolean
}): {
  text: string | null
  status: "overdue" | "today" | "upcoming" | "none"
} {
  const { dueDate } = task

  if (!dueDate) {
    return { text: null, status: "none" }
  }

  if (isTaskOverdue(task)) {
    return {
      text: formatTaskDateTime(task, { format: "relative" }),
      status: "overdue",
    }
  }

  if (isToday(dueDate)) {
    return {
      text: formatTaskDateTime(task, { format: "relative" }),
      status: "today",
    }
  }

  return {
    text: formatTaskDateTime(task, { format: "relative" }),
    status: "upcoming",
  }
}
