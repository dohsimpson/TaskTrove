/**
 * Recurring Task Processor
 *
 * Simple RRULE processing engine that integrates with existing task completion flow.
 * Handles basic recurring patterns without external dependencies.
 */

import { Task, createTaskId } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"

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
    if (!key || value === undefined) continue

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
        parsed.byday = value.split(",").filter((day) => day.trim() !== "")
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
 * Find all dates in a month that match the given weekdays
 * Clean, focused implementation from Agent4's approach
 */
function findWeekdayDatesInMonth(year: number, month: number, weekdays: number[]): Date[] {
  const dates: Date[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    if (weekdays.includes(date.getDay())) {
      dates.push(date)
    }
  }

  return dates
}

/**
 * Apply BYSETPOS filter to a list of dates with enhanced validation
 * Combines Agent4's clean approach with Agent3's validation
 */
function applyBysetpos(dates: Date[], bysetpos: number[]): Date[] {
  const result: Date[] = []

  for (const pos of bysetpos) {
    if (pos === 0) continue // BYSETPOS=0 is invalid per RFC5545

    let targetIndex: number
    if (pos > 0) {
      // Positive: 1st, 2nd, 3rd, etc.
      targetIndex = pos - 1
    } else {
      // Negative: last (-1), second-to-last (-2), etc.
      targetIndex = dates.length + pos
    }

    if (targetIndex >= 0 && targetIndex < dates.length) {
      const targetDate = dates[targetIndex]
      if (targetDate) {
        result.push(targetDate)
      }
    }
  }

  return result.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * Validate if a date combination is impossible (from Agent3's validation logic)
 */
function isImpossibleDate(month: number, day: number): boolean {
  if (day <= 0 && day !== -1) return true // Invalid negative day
  if (day > 31) return true // Day > 31 is impossible
  if (month === 2 && day >= 30) return true // Feb 30th+ never exists
  if ([4, 6, 9, 11].includes(month) && day === 31) return true // Apr, Jun, Sep, Nov don't have 31 days
  return false
}

/**
 * Check if a date matches a recurring pattern
 */
export function dateMatchesRecurringPattern(
  date: Date,
  rrule: string,
  referenceDate: Date,
): boolean {
  const parsed = parseRRule(rrule)
  if (!parsed) {
    return false
  }

  const interval = parsed.interval || 1

  switch (parsed.freq) {
    case "DAILY":
      // For daily, when date === referenceDate (same day), it always matches
      const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const refNormalized = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate(),
      )

      if (dateNormalized.getTime() === refNormalized.getTime()) {
        return true // Same day always matches for daily
      }

      // For different days, check if the number of days since reference is divisible by interval
      const daysDiff = Math.floor(
        (dateNormalized.getTime() - refNormalized.getTime()) / (24 * 60 * 60 * 1000),
      )
      return daysDiff > 0 && daysDiff % interval === 0

    case "WEEKLY":
      if (parsed.byday) {
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
          .filter((day) => typeof day === "number")
        return targetDays.length > 0 && targetDays.includes(date.getDay())
      } else {
        // Simple weekly: same day of week, proper interval
        const weeksDiff = Math.floor(
          (date.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        )
        return (
          date.getDay() === referenceDate.getDay() && weeksDiff >= 0 && weeksDiff % interval === 0
        )
      }

    case "MONTHLY":
      if (parsed.bymonthday && parsed.bymonthday.length > 0) {
        return parsed.bymonthday.includes(date.getDate())
      } else {
        // Same day of month
        return date.getDate() === referenceDate.getDate()
      }

    case "YEARLY":
      // Same month and day
      return (
        date.getMonth() === referenceDate.getMonth() && date.getDate() === referenceDate.getDate()
      )

    default:
      return false
  }
}

/**
 * Calculate next due date based on RRULE pattern
 */
/**
 * Calculate the reference date for recurring task calculations based on recurringMode
 * - For "completedAt" mode: uses the later of actionDate and dueDate to prevent backwards scheduling
 * - For "dueDate" mode: always uses the dueDate
 */
export function getRecurringReferenceDate(
  dueDate: Date,
  recurringMode: "dueDate" | "completedAt" | undefined,
  actionDate?: Date,
): Date {
  if (recurringMode === "completedAt" && actionDate) {
    // Use Math.max to prevent infinite loop when completing/skipping tasks early.
    // Example: Daily task due tomorrow, completed/skipped today → use tomorrow as reference, not today.
    // This ensures we never move the schedule backwards and get stuck in a loop.
    return new Date(Math.max(actionDate.getTime(), dueDate.getTime()))
  }
  return new Date(dueDate)
}

export function calculateNextDueDate(
  rrule: string,
  fromDate: Date,
  includeFromDate: boolean = false,
): Date | null {
  const parsed = parseRRule(rrule)
  if (!parsed) {
    return null
  }

  // If includeFromDate is true, check if fromDate matches the recurring pattern
  if (includeFromDate && dateMatchesRecurringPattern(fromDate, rrule, fromDate)) {
    // Check UNTIL constraint before returning fromDate
    if (parsed.until) {
      const untilDateString = parsed.until.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
      const fromDateString = format(fromDate, "yyyy-MM-dd")

      if (fromDateString > untilDateString) {
        return null // Past the end date
      }
    }
    return fromDate
  }

  const nextDate = new Date(fromDate)
  const interval = parsed.interval || 1

  switch (parsed.freq) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + interval)
      break

    case "WEEKLY":
      if (parsed.byday) {
        // Handle specific weekdays with enhanced interval support
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
          .filter((day) => typeof day === "number")

        if (targetDays.length === 0) {
          return null
        }

        if (interval === 1) {
          // Simple case: find next occurrence of target weekdays
          const currentDayOfWeek = nextDate.getDay()
          let daysToAdd = 0

          // Find the next target day
          for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDayOfWeek + i) % 7
            if (targetDays.includes(checkDay)) {
              daysToAdd = i
              break
            }
          }

          nextDate.setDate(nextDate.getDate() + daysToAdd)
        } else {
          // Complex case: interval > 1, need to respect interval
          const currentDayOfWeek = nextDate.getDay()

          if (targetDays.length === 1 && targetDays.includes(currentDayOfWeek)) {
            // Single target day and it matches current day, advance by full interval
            nextDate.setDate(nextDate.getDate() + 7 * interval)
          } else {
            // Multiple target days OR current day doesn't match, check for later days in current week
            let daysToAdd = 0
            for (let i = 1; i <= 7; i++) {
              const checkDay = (currentDayOfWeek + i) % 7
              if (targetDays.includes(checkDay)) {
                daysToAdd = i
                break
              }
            }

            if (daysToAdd > 0) {
              // Found a matching day later in the current week
              nextDate.setDate(nextDate.getDate() + daysToAdd)
            } else {
              // No matching day found in current week, advance by full interval
              nextDate.setDate(nextDate.getDate() + 7 * interval)
              // Then find the first matching day in the new week
              const newDayOfWeek = nextDate.getDay()
              for (let i = 0; i < 7; i++) {
                const checkDay = (newDayOfWeek + i) % 7
                if (targetDays.includes(checkDay)) {
                  nextDate.setDate(nextDate.getDate() + i)
                  break
                }
              }
            }
          }
        }
      } else {
        // Simple weekly recurrence
        nextDate.setDate(nextDate.getDate() + 7 * interval)
      }
      break

    case "MONTHLY":
      if (
        parsed.byday &&
        parsed.byday.length > 0 &&
        parsed.bysetpos &&
        parsed.bysetpos.length > 0
      ) {
        // Handle BYDAY + BYSETPOS patterns (e.g., first Monday, last Friday)
        const weekdayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        }
        const targetWeekdays = parsed.byday
          .map((day) => weekdayMap[day])
          .filter((day) => typeof day === "number")

        if (targetWeekdays.length === 0) {
          return null
        }

        // Move to the next interval month
        const targetYear = nextDate.getFullYear()
        const targetMonth = nextDate.getMonth() + interval

        // Handle year rollover
        let finalYear = targetYear
        let finalMonth = targetMonth
        if (targetMonth > 11) {
          finalYear += Math.floor(targetMonth / 12)
          finalMonth = targetMonth % 12
        }

        // Find all matching weekday dates in the target month
        const matchingDates = findWeekdayDatesInMonth(finalYear, finalMonth, targetWeekdays)

        if (matchingDates.length === 0) {
          return null
        }

        // Apply BYSETPOS filter
        const filteredDates = applyBysetpos(matchingDates, parsed.bysetpos)

        if (filteredDates.length === 0) {
          return null
        }

        // Use the earliest matching date and preserve the original time
        const targetDate = filteredDates[0]
        if (!targetDate) {
          return null
        }
        // Store original time
        const originalHours = nextDate.getHours()
        const originalMinutes = nextDate.getMinutes()
        const originalSeconds = nextDate.getSeconds()
        const originalMilliseconds = nextDate.getMilliseconds()
        // Set date components
        nextDate.setFullYear(targetDate.getFullYear())
        nextDate.setMonth(targetDate.getMonth())
        nextDate.setDate(targetDate.getDate())
        // Restore original time to avoid DST shifts
        nextDate.setHours(originalHours, originalMinutes, originalSeconds, originalMilliseconds)
      } else if (parsed.bymonthday && parsed.bymonthday.length > 0) {
        // Handle multiple specific month days (e.g., 15th and 30th)
        // Always move to next interval period first (like original behavior)
        const targetYear = nextDate.getFullYear()
        const targetMonth = nextDate.getMonth() + interval

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
              return new Date(finalYear, finalMonth + 1, 0).getDate()
            }
            // Clamp day to last day of month to handle edge cases (e.g., Feb 31st -> Feb 28th)
            return Math.min(day, new Date(finalYear, finalMonth + 1, 0).getDate())
          }),
        )

        // Set the date properly using local methods to avoid rollover and DST issues
        nextDate.setDate(1)
        nextDate.setFullYear(finalYear)
        nextDate.setMonth(finalMonth)
        nextDate.setDate(nextDay)
      } else {
        // Simple monthly recurrence - same day of month
        const originalDay = fromDate.getDate()
        const targetYear = nextDate.getFullYear()
        const targetMonth = nextDate.getMonth() + interval
        // Get last day of target month
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
        const finalDay = Math.min(originalDay, lastDayOfTargetMonth)
        // Set the date properly using local methods to avoid rollover and DST issues (e.g., Jan 31 -> Feb 28)
        // Set date to 1 first to avoid month rollover, then month, then final day
        nextDate.setDate(1)
        nextDate.setFullYear(targetYear)
        nextDate.setMonth(targetMonth)
        nextDate.setDate(finalDay)
      }
      break

    case "YEARLY":
      if (
        parsed.byday &&
        parsed.byday.length > 0 &&
        parsed.bysetpos &&
        parsed.bysetpos.length > 0 &&
        parsed.bymonth &&
        parsed.bymonth.length > 0
      ) {
        // Handle BYDAY + BYSETPOS + BYMONTH patterns (e.g., 4th Thursday in November - Thanksgiving)
        const weekdayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        }
        const targetWeekdays = parsed.byday
          .map((day) => weekdayMap[day])
          .filter((day) => typeof day === "number")

        if (targetWeekdays.length === 0) {
          return null
        }

        const currentMonth = nextDate.getMonth() + 1 // Convert to 1-based
        const currentYear = nextDate.getFullYear()

        // Find next valid month in current year or future years
        const validMonthsInCurrentYear = parsed.bymonth.filter((month) => month > currentMonth)

        let targetYear: number
        let targetMonth: number

        if (validMonthsInCurrentYear.length > 0) {
          // Use the earliest valid month in current year
          targetYear = currentYear
          targetMonth = Math.min(...validMonthsInCurrentYear)
        } else {
          // Move to next year and use earliest valid month
          targetYear = currentYear + interval
          targetMonth = Math.min(...parsed.bymonth)
        }

        // Find all matching weekday dates in the target month
        const matchingDates = findWeekdayDatesInMonth(targetYear, targetMonth - 1, targetWeekdays) // Convert to 0-based month

        if (matchingDates.length === 0) {
          return null
        }

        // Apply BYSETPOS filter
        const filteredDates = applyBysetpos(matchingDates, parsed.bysetpos)

        if (filteredDates.length === 0) {
          return null
        }

        // Use the earliest matching date and preserve the original time
        const targetDate = filteredDates[0]
        if (!targetDate) {
          return null
        }
        // Store original time
        const originalHours = nextDate.getHours()
        const originalMinutes = nextDate.getMinutes()
        const originalSeconds = nextDate.getSeconds()
        const originalMilliseconds = nextDate.getMilliseconds()
        // Set date components
        nextDate.setFullYear(targetDate.getFullYear())
        nextDate.setMonth(targetDate.getMonth())
        nextDate.setDate(targetDate.getDate())
        // Restore original time to avoid DST shifts
        nextDate.setHours(originalHours, originalMinutes, originalSeconds, originalMilliseconds)
      } else if (parsed.bymonth && parsed.bymonth.length > 0) {
        // Handle specific months with optional specific days
        const currentMonth = nextDate.getMonth() + 1 // Convert to 1-based
        const currentYear = nextDate.getFullYear()
        const currentDay = nextDate.getDate()

        if (parsed.bymonthday && parsed.bymonthday.length > 0) {
          // Handle BYMONTH + BYMONTHDAY combinations with validation
          const candidates: Date[] = []

          // Check current year first
          for (const month of parsed.bymonth) {
            if (
              month > currentMonth ||
              (month === currentMonth &&
                parsed.bymonthday.some((day) => {
                  const actualDay = day === -1 ? new Date(currentYear, month, 0).getDate() : day
                  return actualDay > currentDay
                }))
            ) {
              // Add all valid days for this month
              for (const day of parsed.bymonthday) {
                if (!isImpossibleDate(month, day)) {
                  const actualDay =
                    day === -1
                      ? new Date(currentYear, month, 0).getDate()
                      : Math.min(day, new Date(currentYear, month, 0).getDate())
                  if (month > currentMonth || actualDay > currentDay) {
                    const candidateDate = new Date(nextDate)
                    candidateDate.setFullYear(currentYear)
                    candidateDate.setMonth(month - 1)
                    candidateDate.setDate(actualDay)
                    candidates.push(candidateDate)
                  }
                }
              }
            }
          }

          // If no candidates in current year, check next interval year
          if (candidates.length === 0) {
            const targetYear = currentYear + interval
            for (const month of parsed.bymonth) {
              for (const day of parsed.bymonthday) {
                if (!isImpossibleDate(month, day)) {
                  const actualDay =
                    day === -1
                      ? new Date(targetYear, month, 0).getDate()
                      : Math.min(day, new Date(targetYear, month, 0).getDate())
                  const candidateDate = new Date(nextDate)
                  candidateDate.setFullYear(targetYear)
                  candidateDate.setMonth(month - 1)
                  candidateDate.setDate(actualDay)
                  candidates.push(candidateDate)
                }
              }
            }
          }

          if (candidates.length === 0) {
            return null
          }

          // Sort and use earliest candidate
          candidates.sort((a, b) => a.getTime() - b.getTime())
          const targetDate = candidates[0]
          if (!targetDate) {
            return null
          }

          nextDate.setFullYear(targetDate.getFullYear())
          nextDate.setMonth(targetDate.getMonth())
          nextDate.setDate(targetDate.getDate())
        } else {
          // Handle specific months only (keep same day)
          const validMonthsInCurrentYear = parsed.bymonth.filter((month) => month > currentMonth)

          if (validMonthsInCurrentYear.length > 0) {
            // Use the earliest valid month in current year
            const nextMonth = Math.min(...validMonthsInCurrentYear)
            nextDate.setMonth(nextMonth - 1) // Convert back to 0-based
            // Keep the same day, but handle month-end edge cases
            const originalDay = nextDate.getDate()
            const lastDayOfTargetMonth = new Date(currentYear, nextMonth, 0).getDate()
            nextDate.setDate(Math.min(originalDay, lastDayOfTargetMonth))
          } else {
            // Move to next year and use earliest valid month
            const targetYear = currentYear + interval
            const nextMonth = Math.min(...parsed.bymonth)
            nextDate.setFullYear(targetYear)
            nextDate.setMonth(nextMonth - 1) // Convert back to 0-based
            // Keep the same day, but handle month-end edge cases
            const originalDay = nextDate.getDate()
            const lastDayOfTargetMonth = new Date(targetYear, nextMonth, 0).getDate()
            nextDate.setDate(Math.min(originalDay, lastDayOfTargetMonth))
          }
        }
      } else {
        // Simple yearly recurrence - same month and day
        nextDate.setFullYear(nextDate.getFullYear() + interval)
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
    if (!year || !month || !day) {
      return null
    }
    const untilDate = new Date(`${year}-${month}-${day}`)

    // Validate that the date is actually valid (not Feb 31st, etc.)
    // Use local methods for consistency
    if (
      untilDate.getFullYear() !== parseInt(year) ||
      untilDate.getMonth() !== parseInt(month) - 1 ||
      untilDate.getDate() !== parseInt(day)
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
  const referenceDate = getRecurringReferenceDate(
    completedTask.dueDate,
    completedTask.recurringMode,
    completedTask.completedAt,
  )

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
