/**
 * Recurring Task Processor
 *
 * Simple RRULE processing engine that integrates with existing task completion flow.
 * Handles basic recurring patterns without external dependencies.
 */

import { Task, createTaskId } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

/**
 * Parsed RRULE components for date calculation
 */
interface ParsedRRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  interval?: number
  count?: number
  until?: string
  byday?: string[]
  bymonthday?: number[]
  bymonth?: number[]
  bysetpos?: number[]
}

/**
 * Parse RRULE string into components
 */
export function parseRRule(rrule: string): ParsedRRule | null {
  if (!rrule.startsWith("RRULE:")) {
    return null
  }

  const ruleString = rrule.substring(6) // Remove 'RRULE:'
  const parts = ruleString.split(";")
  const parsed: Partial<ParsedRRule> = {}

  for (const part of parts) {
    const [key, value] = part.split("=")

    switch (key) {
      case "FREQ":
        // Type-safe frequency validation
        if (value === "DAILY" || value === "WEEKLY" || value === "MONTHLY" || value === "YEARLY") {
          parsed.freq = value
        }
        break
      case "INTERVAL":
        parsed.interval = parseInt(value, 10)
        break
      case "COUNT":
        parsed.count = parseInt(value, 10)
        break
      case "UNTIL":
        parsed.until = value
        break
      case "BYDAY":
        parsed.byday = value.split(",")
        break
      case "BYMONTHDAY":
        parsed.bymonthday = value.split(",").map((n) => parseInt(n, 10))
        break
      case "BYMONTH":
        parsed.bymonth = value.split(",").map((n) => parseInt(n, 10))
        break
      case "BYSETPOS":
        parsed.bysetpos = value.split(",").map((n) => parseInt(n, 10))
        break
    }
  }

  if (!parsed.freq) {
    return null
  }

  // Type-safe return - we know freq is set at this point
  return {
    freq: parsed.freq,
    interval: parsed.interval,
    count: parsed.count,
    until: parsed.until,
    byday: parsed.byday,
    bymonthday: parsed.bymonthday,
    bymonth: parsed.bymonth,
    bysetpos: parsed.bysetpos,
  }
}

/**
 * Check if a date matches a recurring pattern
 */
function dateMatchesRecurringPattern(date: Date, rrule: string, referenceDate: Date): boolean {
  const parsed = parseRRule(rrule)
  if (!parsed) {
    return false
  }

  const interval = parsed.interval || 1

  switch (parsed.freq) {
    case "DAILY":
      // For daily, when date === referenceDate (same day), it always matches
      const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const refUTC = new Date(
        Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()),
      )

      if (dateUTC.getTime() === refUTC.getTime()) {
        return true // Same day always matches for daily
      }

      // For different days, check if the number of days since reference is divisible by interval
      const daysDiff = Math.floor((dateUTC.getTime() - refUTC.getTime()) / (24 * 60 * 60 * 1000))
      return daysDiff > 0 && daysDiff % interval === 0

    case "WEEKLY":
      if (parsed.byday && parsed.byday.length > 0) {
        const weekdayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        }
        const targetDays = parsed.byday
          .map((day) => weekdayMap[day])
          .filter((day) => day !== undefined)
        return targetDays.includes(date.getUTCDay())
      } else {
        // Simple weekly: same day of week, proper interval
        const weeksDiff = Math.floor(
          (date.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        )
        return (
          date.getUTCDay() === referenceDate.getUTCDay() &&
          weeksDiff >= 0 &&
          weeksDiff % interval === 0
        )
      }

    case "MONTHLY":
      if (parsed.bymonthday && parsed.bymonthday.length > 0) {
        return parsed.bymonthday.includes(date.getUTCDate())
      } else {
        // Same day of month
        return date.getUTCDate() === referenceDate.getUTCDate()
      }

    case "YEARLY":
      // Same month and day
      return (
        date.getUTCMonth() === referenceDate.getUTCMonth() &&
        date.getUTCDate() === referenceDate.getUTCDate()
      )

    default:
      return false
  }
}

/**
 * Calculate next due date based on RRULE pattern
 */
export function calculateNextDueDate(
  rrule: string,
  fromDate: Date,
  includeFromDate: boolean = false,
): Date | null {
  const parsed = parseRRule(rrule)
  if (!parsed) {
    return null
  }

  // If includeFromDate is true and fromDate is today, check if today matches the pattern
  if (includeFromDate) {
    const today = new Date()
    // Compare dates in UTC to avoid timezone issues
    const fromDateUTC = new Date(
      Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()),
    )
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )

    // If fromDate is today and matches the recurring pattern, check UNTIL constraint first
    if (
      fromDateUTC.getTime() === todayUTC.getTime() &&
      dateMatchesRecurringPattern(fromDate, rrule, fromDate)
    ) {
      // Check UNTIL constraint before returning today
      if (parsed.until) {
        const untilDate = new Date(parsed.until.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"))
        // Compare dates, not timestamps (UNTIL means "through the end of this date")
        const fromDateOnly = new Date(
          Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()),
        )
        const untilDateOnly = new Date(
          Date.UTC(untilDate.getUTCFullYear(), untilDate.getUTCMonth(), untilDate.getUTCDate()),
        )
        if (fromDateOnly > untilDateOnly) {
          return null // Past the end date
        }
      }
      return fromDate
    }
  }

  const nextDate = new Date(fromDate)
  const interval = parsed.interval || 1

  switch (parsed.freq) {
    case "DAILY":
      nextDate.setUTCDate(nextDate.getUTCDate() + interval)
      break

    case "WEEKLY":
      if (parsed.byday && parsed.byday.length > 0) {
        // Handle specific weekdays (e.g., BYDAY=MO,WE,FR)
        const weekdayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        }

        const targetDays = parsed.byday
          .map((day) => weekdayMap[day])
          .filter((day) => day !== undefined)
        if (targetDays.length === 0) {
          return null
        }

        // Find next occurrence of target weekdays using UTC methods
        const currentDayOfWeek = nextDate.getUTCDay()
        let daysToAdd = 0

        // Find the next target day
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDayOfWeek + i) % 7
          if (targetDays.includes(checkDay)) {
            daysToAdd = i
            break
          }
        }

        nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd)
      } else {
        // Simple weekly recurrence
        nextDate.setUTCDate(nextDate.getUTCDate() + 7 * interval)
      }
      break

    case "MONTHLY":
      if (parsed.bymonthday && parsed.bymonthday.length > 0) {
        // Handle multiple specific month days (e.g., 15th and 30th)
        // Always move to next interval period first (like original behavior)
        const targetYear = nextDate.getUTCFullYear()
        const targetMonth = nextDate.getUTCMonth() + interval

        // Handle year rollover
        let finalYear = targetYear
        let finalMonth = targetMonth
        if (targetMonth > 11) {
          finalYear += Math.floor(targetMonth / 12)
          finalMonth = targetMonth % 12
        }

        // Find the earliest valid day from the specified days
        const nextDay = Math.min(
          ...parsed.bymonthday.map((day) => {
            if (day === -1) {
              // -1 means last day of month
              return new Date(Date.UTC(finalYear, finalMonth + 1, 0)).getUTCDate()
            }
            // Clamp day to last day of month to handle edge cases (e.g., Feb 31st -> Feb 28th)
            return Math.min(day, new Date(Date.UTC(finalYear, finalMonth + 1, 0)).getUTCDate())
          }),
        )

        // Set the date properly using UTC methods to avoid rollover and DST issues
        nextDate.setUTCDate(1)
        nextDate.setUTCFullYear(finalYear)
        nextDate.setUTCMonth(finalMonth)
        nextDate.setUTCDate(nextDay)
      } else {
        // Simple monthly recurrence - same day of month
        const originalDay = fromDate.getUTCDate()
        const targetYear = nextDate.getUTCFullYear()
        const targetMonth = nextDate.getUTCMonth() + interval
        // Get last day of target month using UTC
        const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
        const finalDay = Math.min(originalDay, lastDayOfTargetMonth)
        // Set the date properly using UTC methods to avoid rollover and DST issues (e.g., Jan 31 -> Feb 28)
        // Set date to 1 first to avoid month rollover, then month, then final day
        nextDate.setUTCDate(1)
        nextDate.setUTCFullYear(targetYear)
        nextDate.setUTCMonth(targetMonth)
        nextDate.setUTCDate(finalDay)
      }
      break

    case "YEARLY":
      if (parsed.bymonth && parsed.bymonth.length > 0) {
        // Handle specific months (e.g., January and June)
        const currentMonth = nextDate.getUTCMonth() + 1 // Convert to 1-based
        const currentYear = nextDate.getUTCFullYear()

        // Find next valid month in current year or future years
        const validMonthsInCurrentYear = parsed.bymonth.filter((month) => month > currentMonth)

        if (validMonthsInCurrentYear.length > 0) {
          // Use the earliest valid month in current year
          const nextMonth = Math.min(...validMonthsInCurrentYear)
          nextDate.setUTCMonth(nextMonth - 1) // Convert back to 0-based
          // Keep the same day, but handle month-end edge cases
          const originalDay = nextDate.getUTCDate()
          const lastDayOfTargetMonth = new Date(Date.UTC(currentYear, nextMonth, 0)).getUTCDate()
          nextDate.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth))
        } else {
          // Move to next year and use earliest valid month
          const targetYear = currentYear + interval
          const nextMonth = Math.min(...parsed.bymonth)
          nextDate.setUTCFullYear(targetYear)
          nextDate.setUTCMonth(nextMonth - 1) // Convert back to 0-based
          // Keep the same day, but handle month-end edge cases
          const originalDay = nextDate.getUTCDate()
          const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, nextMonth, 0)).getUTCDate()
          nextDate.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth))
        }
      } else {
        // Simple yearly recurrence - same month and day
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + interval)
      }
      break

    default:
      return null
  }

  // Check UNTIL constraint
  if (parsed.until) {
    // Validate UNTIL date format (should be YYYYMMDD)
    const untilMatch = parsed.until.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (!untilMatch) {
      // Invalid UNTIL format
      return null
    }

    const [, year, month, day] = untilMatch
    const untilDate = new Date(`${year}-${month}-${day}`)

    // Validate that the date is actually valid (not Feb 31st, etc.)
    // Use UTC methods to avoid timezone issues
    if (
      untilDate.getUTCFullYear() !== parseInt(year) ||
      untilDate.getUTCMonth() !== parseInt(month) - 1 ||
      untilDate.getUTCDate() !== parseInt(day)
    ) {
      // Invalid date (e.g., Feb 31st)
      return null
    }

    if (nextDate > untilDate) {
      return null // Past the end date
    }
  }

  return nextDate
}

/**
 * Generate next task instance from a completed recurring task
 */
export function generateNextTaskInstance(completedTask: Task): Task | null {
  if (!completedTask.recurring || !completedTask.dueDate) {
    return null
  }

  // Parse the RRULE to check for COUNT limitation
  const parsed = parseRRule(completedTask.recurring)
  if (!parsed) {
    return null
  }

  // Handle COUNT limitation
  let nextRecurringPattern = completedTask.recurring
  if (parsed.count !== undefined) {
    if (parsed.count <= 1) {
      // This was the last occurrence, no more instances
      return null
    }

    // Decrement the count for the next instance
    const newCount = parsed.count - 1
    nextRecurringPattern = completedTask.recurring.replace(/COUNT=\d+/, `COUNT=${newCount}`)
  }

  // Determine the reference date for calculating next occurrence
  const referenceDate =
    completedTask.recurringMode === "completedAt" && completedTask.completedAt
      ? // Use Math.max to prevent infinite loop when completing tasks early.
        // Example: Daily task due tomorrow, completed today → use tomorrow as reference, not today.
        // This ensures we never move the schedule backwards and get stuck in a loop.
        new Date(Math.max(completedTask.completedAt.getTime(), completedTask.dueDate.getTime()))
      : new Date(completedTask.dueDate)

  const nextDueDate = calculateNextDueDate(completedTask.recurring, referenceDate)

  if (!nextDueDate) {
    return null // No next occurrence (e.g., reached UNTIL date)
  }

  // Reset subtask completion status for the new instance
  const resetSubtasks = completedTask.subtasks.map((subtask) => ({
    ...subtask,
    completed: false,
  }))

  // Create new task instance
  const nextTask: Task = {
    ...completedTask,
    id: createTaskId(uuidv4()),
    completed: false,
    completedAt: undefined,
    dueDate: nextDueDate, // Keep as Date object
    createdAt: new Date(),
    status: "active",
    recurring: nextRecurringPattern, // Use the updated recurring pattern with decremented COUNT
    subtasks: resetSubtasks, // Use the reset subtasks array
  }

  return nextTask
}

/**
 * Check if a task should generate a next instance when completed
 */
export function shouldGenerateNextInstance(task: Task): boolean {
  return !!(task.recurring && task.dueDate)
}

/**
 * Main processor function to handle recurring task completion
 */
export function processRecurringTaskCompletion(task: Task): Task | null {
  if (!shouldGenerateNextInstance(task)) {
    return null
  }

  return generateNextTaskInstance(task)
}
