"use client"

import { useState, useCallback, useMemo } from "react"
import { useTranslation } from "@tasktrove/i18n"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/custom/multi-select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Calendar as CalendarIcon,
  Clock,
  Sun,
  Sunrise,
  ArrowRight,
  Repeat,
  X,
  FastForward,
  AlarmClockOff,
  Ban,
  CalendarClock,
  CalendarDays,
} from "lucide-react"
import { format, addDays } from "date-fns"
import type { CreateTaskRequest, Task, TaskId } from "@/lib/types"
import { formatTaskDateTime } from "@/lib/utils/task-date-formatter"
import { CommonRRules, buildRRule, RRuleFrequency, RRuleWeekday, parseRRule } from "@/lib/types"
import {
  calculateNextDueDate,
  getRecurringReferenceDate,
} from "@/lib/utils/recurring-task-processor"
import { useAtomValue, useSetAtom } from "jotai"
import { tasksAtom } from "@/lib/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@tasktrove/atoms"
import { HelpPopover } from "@/components/ui/help-popover"
import {
  parseEnhancedNaturalLanguage,
  convertTimeToHHMMSS,
} from "@/lib/utils/enhanced-natural-language-parser"
import { useIsMobile } from "@/hooks/use-mobile"

interface TaskScheduleContentProps {
  taskId?: TaskId | TaskId[]
  onClose?: () => void // close the popover
  isNewTask?: boolean
  defaultTab?: "schedule" | "recurring" // for testing
}

export function TaskScheduleContent({
  taskId,
  onClose,
  defaultTab = "schedule",
}: TaskScheduleContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

  const allTasks = useAtomValue(tasksAtom)
  const updateTasks = useSetAtom(tasksAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const newTask = useAtomValue(quickAddTaskAtom)

  const isMultipleTasks = Array.isArray(taskId)
  const isNewTask = !taskId

  // For multiple tasks, we don't have a single task to show - we'll only allow basic operations
  const task: Task | CreateTaskRequest | undefined = isNewTask
    ? newTask
    : isMultipleTasks
      ? undefined
      : allTasks.find((t: Task) => t.id === taskId)
  const isMobile = useIsMobile()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task?.dueDate)
  const [selectedMonthlyDays, setSelectedMonthlyDays] = useState<number[]>(() => {
    // Initialize with existing monthly days from task recurring pattern
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.freq === RRuleFrequency.MONTHLY && parsed.bymonthday) {
        return parsed.bymonthday
      }
    }
    return []
  })
  const [selectedYearlyDates, setSelectedYearlyDates] = useState<Date[]>(() => {
    // Initialize with existing yearly dates from task recurring pattern
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.freq === RRuleFrequency.YEARLY && parsed.bymonth && parsed.bymonthday) {
        const dates: Date[] = []
        // Handle multiple month/day combinations
        for (let i = 0; i < Math.min(parsed.bymonth.length, parsed.bymonthday.length); i++) {
          const monthValue = parsed.bymonth[i]
          const dayValue = parsed.bymonthday[i]
          if (monthValue !== undefined && dayValue !== undefined) {
            const month = monthValue - 1 // Convert to 0-based month
            const day = dayValue
            dates.push(new Date(new Date().getFullYear(), month, day)) // Use current year
          }
        }
        return dates
      }
    }
    return []
  })
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(() => {
    // Initialize with existing weekly days from task recurring pattern
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.freq === RRuleFrequency.WEEKLY && parsed.byday) {
        // Convert RRULE weekday codes to numbers (SU=0, MO=1, etc.)
        const weekdayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
        return parsed.byday.map((day) => weekdayMap[day])
      }
    }
    return []
  })
  const [dailyInterval, setDailyInterval] = useState<number>(() => {
    // Initialize from existing daily patterns with interval > 1
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.freq === RRuleFrequency.DAILY && parsed.interval) {
        return parsed.interval
      }
    }
    return 1
  })

  // Interval recurring pattern state
  const [customFrequency, setCustomFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">(() => {
    // Initialize from existing complex patterns
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.freq === RRuleFrequency.MONTHLY && parsed.byday && parsed.bysetpos) {
        return "MONTHLY"
      }
      if (parsed?.freq === RRuleFrequency.YEARLY && (parsed.byday || parsed.bysetpos)) {
        return "YEARLY"
      }
      if (parsed?.freq === RRuleFrequency.WEEKLY && (parsed.interval || 1) > 1) {
        return "WEEKLY"
      }
    }
    return "MONTHLY"
  })
  const [customInterval, setCustomIntervalValue] = useState<number>(() => {
    // Initialize from existing pattern interval
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.interval) {
        return parsed.interval
      }
    }
    return 1
  })
  const [customWeekdays, setCustomWeekdays] = useState<number[]>(() => {
    // Initialize from existing complex patterns
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.byday) {
        const weekdayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
        return parsed.byday.map((day) => weekdayMap[day])
      }
    }
    return [1] // Monday by default
  })
  const [customOccurrences, setCustomOccurrences] = useState<number[]>(() => {
    // Initialize from existing BYSETPOS patterns
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.bysetpos) {
        return parsed.bysetpos
      }
    }
    return [1] // First occurrence by default
  })
  const [customMonths, setCustomMonths] = useState<number[]>(() => {
    // Initialize from existing yearly patterns
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      if (parsed?.bymonth) {
        return parsed.bymonth
      }
    }
    return [1]
  })
  const [customPatternType, setCustomPatternType] = useState<"weekday" | "day">(() => {
    // Initialize pattern type from existing recurring pattern
    if (task?.recurring) {
      const parsed = parseRRule(task.recurring)
      // If pattern has BYDAY + BYSETPOS, it's a weekday pattern
      if (parsed?.byday && parsed.bysetpos) {
        return "weekday"
      }
      // If pattern has only BYMONTHDAY, it's a day pattern
      if (parsed?.bymonthday && !parsed.byday) {
        return "day"
      }
    }
    return "weekday" // weekday or calendar day
  })

  // Time selection state
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (task?.dueTime) {
      const hours24 = task.dueTime.getHours()
      // Convert 24-hour to 12-hour format
      if (hours24 === 0) return "12" // Midnight -> 12 AM
      if (hours24 <= 12) return hours24.toString()
      return (hours24 - 12).toString() // PM hours
    }
    return ""
  })
  const [selectedMinute, setSelectedMinute] = useState<string>(() => {
    if (task?.dueTime) {
      return task.dueTime.getMinutes().toString().padStart(2, "0")
    }
    return ""
  })
  const [selectedAmPm, setSelectedAmPm] = useState<string>(() => {
    if (task?.dueTime) {
      return task.dueTime.getHours() >= 12 ? "PM" : "AM"
    }
    return "AM"
  })
  const [showInlineCalendar, setShowInlineCalendar] = useState(false)
  const alwaysShowCalendar = !isMobile

  // UI mode for interval configuration
  const [showIntervalConfig, setShowIntervalConfig] = useState(false)

  // Natural language input state
  const [nlInput, setNlInput] = useState("")

  // Parse NLP input once and reuse the result
  const parsedNlInput = useMemo(() => {
    if (!nlInput.trim()) return null
    return parseEnhancedNaturalLanguage(nlInput)
  }, [nlInput])

  // Check if the parsed result has valid values
  const isNlInputValid = useMemo(() => {
    if (!parsedNlInput) return false

    const hasDate = parsedNlInput.dueDate !== undefined
    const hasTime =
      parsedNlInput.time !== undefined && convertTimeToHHMMSS(parsedNlInput.time) !== null
    const hasRecurring = parsedNlInput.recurring !== undefined

    return hasDate || hasTime || hasRecurring
  }, [parsedNlInput])

  const handleUpdate = useCallback(
    (
      taskId: TaskId | TaskId[] | undefined,
      date: Date | undefined | null,
      time: Date | undefined | null,
      type: string,
      recurring?: string,
    ) => {
      // Build update object based on operation type
      const updates = (() => {
        switch (type) {
          case "remove":
            return { dueDate: isNewTask ? undefined : null }
          case "remove-time":
            return { dueTime: isNewTask ? undefined : null }
          case "remove-recurring":
            return { recurring: isNewTask ? undefined : null }
          default: {
            // Handle cases where date, time, and recurring need to be set
            const updateObj: { recurring?: string; dueDate?: Date | null; dueTime?: Date | null } =
              {}
            if (recurring !== undefined) {
              updateObj.recurring = recurring
            }
            if (date !== undefined) {
              updateObj.dueDate = date
            }
            if (time !== undefined) {
              updateObj.dueTime = time
            }
            return updateObj
          }
        }
      })()

      // Apply updates using appropriate function
      if (!taskId) {
        updateQuickAddTask({ updateRequest: updates })
      } else if (Array.isArray(taskId)) {
        // For multiple tasks, update all at once
        updateTasks(taskId.map((id) => ({ id, ...updates })))
      } else {
        // For single task
        updateTasks([{ id: taskId, ...updates }])
      }
    },
    [isNewTask, updateTasks, updateQuickAddTask],
  )

  // Handle clearing all schedule and recurring data
  const handleClearAll = useCallback(() => {
    // Clear task data
    const updates = {
      dueDate: isNewTask ? undefined : null,
      dueTime: isNewTask ? undefined : null,
      recurring: isNewTask ? undefined : null,
    }

    // Apply updates using appropriate function
    if (!taskId) {
      updateQuickAddTask({ updateRequest: updates })
    } else if (Array.isArray(taskId)) {
      // For multiple tasks, update all at once
      updateTasks(taskId.map((id) => ({ id, ...updates })))
    } else {
      // For single task
      updateTasks([{ id: taskId, ...updates }])
    }

    // Clear all UI states
    setSelectedDate(undefined)
    setSelectedMonthlyDays([])
    setSelectedYearlyDates([])
    setSelectedWeekdays([])
    setDailyInterval(1)
    setCustomFrequency("MONTHLY")
    setCustomIntervalValue(1)
    setCustomWeekdays([1]) // Monday by default
    setCustomOccurrences([1]) // First occurrence by default
    setCustomMonths([1]) // January by default
    setCustomPatternType("day")
    setSelectedHour("")
    setSelectedMinute("")
    setSelectedAmPm("AM")
    setShowInlineCalendar(false)
    setShowIntervalConfig(false)
    setNlInput("")
  }, [isNewTask, taskId, updateTasks, updateQuickAddTask])

  // Handle manual natural language parsing
  const handleParseInput = useCallback(() => {
    if (!parsedNlInput || !isNlInputValid) return

    // Collect all parsed values
    let parsedDate: Date | undefined = undefined
    let parsedTime: Date | undefined = undefined
    let parsedRecurring: string | undefined = undefined
    let hasAppliedValue = false

    // Process parsed date
    if (parsedNlInput.dueDate) {
      parsedDate = parsedNlInput.dueDate
      hasAppliedValue = true
    }

    // Process parsed time
    if (parsedNlInput.time) {
      const timeFormatted = convertTimeToHHMMSS(parsedNlInput.time)
      if (timeFormatted) {
        const timeParts = timeFormatted.split(":").map(Number)
        const hours = timeParts[0]
        const minutes = timeParts[1]
        if (hours !== undefined && minutes !== undefined) {
          const timeDate = new Date()
          timeDate.setHours(hours, minutes, 0, 0)
          parsedTime = timeDate
        }
        hasAppliedValue = true
      }
    }

    // Process parsed recurring
    if (parsedNlInput.recurring) {
      parsedRecurring = parsedNlInput.recurring
      hasAppliedValue = true
    }

    // Apply all updates in a single call
    if (hasAppliedValue) {
      handleUpdate(taskId, parsedDate, parsedTime, "parsed", parsedRecurring)
      setNlInput("")
    }
  }, [parsedNlInput, isNlInputValid, taskId, handleUpdate])

  // Helper function to create time Date object
  const createTimeFromHourMinute = (hour: string, minute: string, ampm: string): Date => {
    const time = new Date()
    let hours = parseInt(hour)
    if (ampm === "PM" && hours !== 12) {
      hours += 12
    } else if (ampm === "AM" && hours === 12) {
      hours = 0
    }
    time.setHours(hours, parseInt(minute), 0, 0)
    return time
  }

  // Handle time selection
  const handleTimeUpdate = () => {
    const newTime = createTimeFromHourMinute(selectedHour, selectedMinute, selectedAmPm)

    // If no due date exists, set it to today when setting time
    const newDate = task?.dueDate || new Date()

    handleUpdate(taskId, newDate, newTime, "time")
  }

  // Helper function to add ordinal suffix to day numbers
  const getDayWithSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return `${day}th`
    switch (day % 10) {
      case 1: {
        return `${day}st`
      }
      case 2: {
        return `${day}nd`
      }
      case 3: {
        return `${day}rd`
      }
      default: {
        return `${day}th`
      }
    }
  }

  // Helper function to get display text for RRULE
  const getRRuleDisplay = (rrule: string): string => {
    const parsed = parseRRule(rrule)
    if (!parsed) return "Interval recurring pattern"

    const interval = parsed.interval || 1 // Default to 1 if interval is undefined

    if (parsed.freq === RRuleFrequency.DAILY) {
      if (interval === 1) return "Daily"
      return `Every ${interval} days`
    } else if (parsed.freq === RRuleFrequency.WEEKLY) {
      if (interval === 1) return "Weekly"
      return `Every ${interval} weeks`
    } else if (parsed.freq === RRuleFrequency.MONTHLY) {
      if (parsed.bymonthday && parsed.bymonthday.length > 0) {
        const dayStrings = parsed.bymonthday
          .sort((a, b) => a - b)
          .map((day) => (day === -1 ? "last day" : day.toString()))
        const daysText = dayStrings.join(", ")
        if (interval === 1)
          return `Monthly on ${dayStrings.length > 1 ? "days" : "day"} ${daysText}`
        return `Every ${interval} months on ${dayStrings.length > 1 ? "days" : "day"} ${daysText}`
      }
      if (interval === 1) return "Monthly"
      return `Every ${interval} months`
    } else {
      if (
        parsed.bymonth &&
        parsed.bymonthday &&
        parsed.bymonth.length > 0 &&
        parsed.bymonthday.length > 0
      ) {
        // Check if this creates a Cartesian product (multiple months AND multiple days)
        if (parsed.bymonth.length > 1 && parsed.bymonthday.length > 1) {
          // Cartesian product case - show warning
          const monthNames = parsed.bymonth.map((month) =>
            new Date(2024, month - 1, 1).toLocaleDateString("en-US", { month: "long" }),
          )
          const dayNumbers = parsed.bymonthday.map((day) => getDayWithSuffix(day))
          return `Yearly in ${monthNames.join(", ")} on ${dayNumbers.join(", ")} (${parsed.bymonth.length * parsed.bymonthday.length} dates total)`
        } else {
          // Simple case - either one month or one day list
          const dateStrings = []
          if (parsed.bymonth.length === 1) {
            // One month, multiple days
            const monthValue = parsed.bymonth[0]
            if (monthValue === undefined) return "Invalid month data"
            const month = monthValue - 1
            const monthName = new Date(2024, month, 1).toLocaleDateString("en-US", {
              month: "long",
            })
            const dayList = parsed.bymonthday.map(getDayWithSuffix).join(", ")
            dateStrings.push(`${monthName} ${dayList}`)
          } else {
            // Multiple months, one day
            const dayValue = parsed.bymonthday[0]
            if (dayValue === undefined) return "Invalid day data"
            const day = dayValue
            const dayWithSuffix = getDayWithSuffix(day)
            for (const month of parsed.bymonth) {
              const monthName = new Date(2024, month - 1, 1).toLocaleDateString("en-US", {
                month: "long",
              })
              dateStrings.push(`${monthName} ${dayWithSuffix}`)
            }
          }
          const datesText = dateStrings.join(", ")
          if (interval === 1)
            return `Yearly on ${dateStrings.length > 1 ? "dates" : "date"} ${datesText}`
          return `Every ${interval} years on ${dateStrings.length > 1 ? "dates" : "date"} ${datesText}`
        }
      }
      return "Yearly"
    }
    return "Interval recurring pattern"
  }

  // Helper function to determine current recurring type for highlighting
  const getCurrentRecurringType = (): "daily" | "weekly" | "monthly" | "yearly" | "interval" => {
    if (!task?.recurring) return "interval"

    const parsed = parseRRule(task.recurring)
    if (!parsed) return "interval"

    const interval = parsed.interval || 1

    // Check for truly complex interval patterns
    // Simple patterns with BYSETPOS (like "first Monday") should still be categorized by their base frequency
    // Only complex multi-dimensional patterns should be "interval"
    const hasComplexBysetpos = parsed.bysetpos && parsed.bysetpos.length > 1
    const hasComplexInterval =
      interval > 1 &&
      ((parsed.byday && parsed.byday.length > 1) ||
        (parsed.bymonth && parsed.bymonth.length > 1) ||
        (parsed.bymonthday && parsed.bymonthday.length > 1))

    if (hasComplexBysetpos || hasComplexInterval) return "interval"

    // Check for complex patterns within simple frequencies
    if (parsed.freq === RRuleFrequency.DAILY) {
      // Daily with specific weekdays (weekdays/weekends) is still considered daily
      if (parsed.byday && parsed.byday.length > 0) {
        const weekdayCount = parsed.byday.length
        if (weekdayCount === 5 || weekdayCount === 2) return "daily" // weekdays or weekends
        if (interval > 1) return "interval" // "every 2 days on Mon,Wed" is complex
        return "interval" // other daily + weekday combinations are complex
      }
      return "daily"
    }

    if (parsed.freq === RRuleFrequency.WEEKLY) {
      // Simple weekly patterns (even with interval > 1) are still "weekly"
      // Complex weekly patterns (with BYSETPOS, etc.) are "interval"
      if (parsed.bysetpos && parsed.bysetpos.length > 0) return "interval"
      return "weekly"
    }

    if (parsed.freq === RRuleFrequency.MONTHLY) {
      // Simple monthly patterns (BYMONTHDAY only) are "monthly"
      // Complex monthly patterns (BYDAY + BYSETPOS, interval > 1) are "interval"
      if (parsed.byday && parsed.bysetpos) return "interval" // "first Monday" patterns
      if (interval > 1) return "interval" // "every 3 months"
      return "monthly"
    }

    // Simple yearly patterns are "yearly", complex ones are "interval"
    if (parsed.byday && parsed.bysetpos) return "interval" // "first Monday of March" patterns
    if (interval > 1) return "interval" // "every 2 years"
    // Check for Cartesian product patterns
    if (
      parsed.bymonth &&
      parsed.bymonthday &&
      parsed.bymonth.length > 1 &&
      parsed.bymonthday.length > 1
    ) {
      return "interval" // Complex multi-month/multi-day patterns
    }
    return "yearly"
  }

  const currentRecurringType = getCurrentRecurringType()

  // Helper function to determine current schedule preset for highlighting
  const getCurrentSchedulePreset = (): "today" | "tomorrow" | "next-week" | null => {
    if (!task?.dueDate) return null

    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const taskDate = new Date(task.dueDate)

    // Check if dates match (ignoring time)
    const isSameDay = (date1: Date, date2: Date) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      )
    }

    if (isSameDay(taskDate, today)) return "today"
    if (isSameDay(taskDate, tomorrow)) return "tomorrow"
    if (isSameDay(taskDate, nextWeek)) return "next-week"

    return null
  }

  const currentSchedulePreset = getCurrentSchedulePreset()

  const handleQuickSchedule = (type: string) => {
    const today = new Date()
    let date: Date | undefined | null

    switch (type) {
      case "today":
        date = today
        break
      case "tomorrow":
        date = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case "next-week": {
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        date = nextWeek
        break
      }
      case "remove":
        date = null
        break
      default:
        return
    }

    // Only preserve existing time, don't set default time for quick dates
    const preserveTime = task?.dueTime || undefined

    handleUpdate(taskId, date, preserveTime, type, undefined)
  }

  const handleSkipToNext = () => {
    if (!task?.dueDate) return

    let nextDueDate: Date | null = null

    if (task.recurring) {
      // Use same logic as task completion for determining reference date
      const referenceDate = getRecurringReferenceDate(
        task.dueDate,
        task.recurringMode,
        new Date(), // Use current date as the "action date" for skip
      )
      nextDueDate = calculateNextDueDate(task.recurring, referenceDate, false)
    } else {
      // If no recurring pattern, just advance by one day using date-fns
      nextDueDate = addDays(task.dueDate, 1)
    }

    if (nextDueDate) {
      handleUpdate(taskId, nextDueDate, undefined, "skip-to-next", undefined)
    }
  }

  const handleRecurringSelect = (type: string) => {
    let rrule: string | null = null

    switch (type) {
      case "daily":
        // Use daily interval (every N days)
        if (dailyInterval === 1) {
          rrule = CommonRRules.daily()
        } else {
          rrule = buildRRule({
            freq: RRuleFrequency.DAILY,
            interval: dailyInterval,
          })
        }
        break
      case "weekly": {
        if (selectedWeekdays.length > 0) {
          // Convert numeric weekdays to RRULE format (0=SU, 1=MO, etc.)
          const weekdayMap = [
            RRuleWeekday.SU,
            RRuleWeekday.MO,
            RRuleWeekday.TU,
            RRuleWeekday.WE,
            RRuleWeekday.TH,
            RRuleWeekday.FR,
            RRuleWeekday.SA,
          ]
          const weekdayCodes = selectedWeekdays
            .map((day) => weekdayMap[day])
            .filter((code) => code !== undefined)
          rrule = buildRRule({ freq: RRuleFrequency.WEEKLY, byday: weekdayCodes })
        } else {
          // Use default weekly (same day of week as due date) - only if no UI selection made
          rrule = CommonRRules.weekly()
        }
        break
      }
      case "monthly":
        if (selectedMonthlyDays.length > 0) {
          // Use specific days of the month
          rrule = buildRRule({ freq: RRuleFrequency.MONTHLY, bymonthday: selectedMonthlyDays })
        } else {
          // Use default monthly (same day of month as due date) - only if no UI selection made
          rrule = CommonRRules.monthly()
        }
        break
      case "yearly": {
        if (selectedYearlyDates.length > 0) {
          // Group dates by month to avoid Cartesian product issue
          const datesByMonth = new Map<number, number[]>()
          selectedYearlyDates.forEach((date) => {
            const month = date.getMonth() + 1 // Convert to 1-based month
            const day = date.getDate()
            if (!datesByMonth.has(month)) {
              datesByMonth.set(month, [])
            }
            const monthDays = datesByMonth.get(month)
            if (monthDays) {
              monthDays.push(day)
            }
          })

          // If all dates are in the same month, create a simple RRULE
          if (datesByMonth.size === 1) {
            const firstEntry = Array.from(datesByMonth.entries())[0]
            if (firstEntry) {
              const [month, days] = firstEntry
              rrule = buildRRule({
                freq: RRuleFrequency.YEARLY,
                interval: 1,
                bymonth: [month],
                bymonthday: days,
              })
            }
          } else {
            // Multiple months: for now, use the first selected date to avoid Cartesian product
            // TODO: Future enhancement could create multiple RRULEs or use RDATE
            const firstDate = selectedYearlyDates[0]
            if (firstDate) {
              rrule = buildRRule({
                freq: RRuleFrequency.YEARLY,
                interval: 1,
                bymonth: [firstDate.getMonth() + 1],
                bymonthday: [firstDate.getDate()],
              })
            }
            console.warn(
              "Multiple months selected for yearly pattern. Using first date only to avoid Cartesian product.",
            )
          }
        } else {
          // Use default yearly (same month and day as due date)
          rrule = buildRRule({ freq: RRuleFrequency.YEARLY, interval: 1 })
        }
        break
      }
      case "interval": {
        // Generate RRULE based on interval patterns (weekday or day-based)
        const weekdayMap = [
          RRuleWeekday.SU,
          RRuleWeekday.MO,
          RRuleWeekday.TU,
          RRuleWeekday.WE,
          RRuleWeekday.TH,
          RRuleWeekday.FR,
          RRuleWeekday.SA,
        ]

        if (customPatternType === "day") {
          // Calendar day patterns (1st day, 15th day, last day)
          if (customFrequency === "MONTHLY") {
            rrule = buildRRule({
              freq: RRuleFrequency.MONTHLY,
              interval: customInterval,
              bymonthday: customOccurrences,
            })
          } else if (customFrequency === "YEARLY") {
            rrule = buildRRule({
              freq: RRuleFrequency.YEARLY,
              interval: customInterval,
              bymonthday: customOccurrences,
              bymonth: customMonths,
            })
          } else {
            // WEEKLY with calendar days is invalid - this should not happen due to UI validation
            console.error("Invalid combination: WEEKLY frequency with calendar day pattern")
            return
          }
        } else {
          // Weekday patterns (1st Monday, 2nd Tuesday, etc.)
          if (customFrequency === "MONTHLY") {
            const weekdayCodes = customWeekdays
              .map((day) => weekdayMap[day])
              .filter((code) => code !== undefined)
            rrule = buildRRule({
              freq: RRuleFrequency.MONTHLY,
              interval: customInterval,
              byday: weekdayCodes,
              bysetpos: customOccurrences,
            })
          } else if (customFrequency === "YEARLY") {
            const weekdayCodes = customWeekdays
              .map((day) => weekdayMap[day])
              .filter((code) => code !== undefined)
            rrule = buildRRule({
              freq: RRuleFrequency.YEARLY,
              interval: customInterval,
              byday: weekdayCodes,
              bysetpos: customOccurrences,
              bymonth: customMonths,
            })
          } else {
            // WEEKLY interval pattern - use selected weekdays
            const weekdayCodes = customWeekdays
              .map((day) => weekdayMap[day])
              .filter((code) => code !== undefined)
            rrule = buildRRule({
              freq: RRuleFrequency.WEEKLY,
              interval: customInterval,
              byday: weekdayCodes,
            })
          }
        }
        break
      }
      case "remove":
        handleUpdate(taskId, null, null, "remove-recurring", undefined)
        return
      default:
        return
    }

    // If task already has a due date, preserve it and just add recurring pattern
    // If no due date, calculate one based on the recurring pattern
    if (rrule) {
      if (task?.dueDate) {
        // Keep existing due date and time, just add recurring pattern
        handleUpdate(taskId, undefined, undefined, type, rrule)
      } else {
        // Calculate a due date for tasks without one
        // Use normalized date (start of day) to avoid time zone issues with late-night pattern creation
        const today = new Date()
        const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const nextDueDate = calculateNextDueDate(rrule, normalizedToday, true)
        if (nextDueDate) {
          // Don't set default time when creating a new recurring task
          handleUpdate(taskId, nextDueDate, undefined, type, rrule)
        } else {
          // Fallback: just set recurring pattern without due date
          handleUpdate(taskId, undefined, undefined, type, rrule)
        }
      }
    }
  }

  const handleCustomDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    // Only preserve existing time, don't set default time for custom dates
    const preserveTime = task?.dueTime || undefined
    handleUpdate(taskId, date, preserveTime, "custom")
  }

  // Allow rendering for multiple tasks mode (task will be undefined but that's ok)
  if (!task && !isMultipleTasks && !isNewTask) {
    console.warn("Task not found", taskId)
    return null
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-medium text-sm">{t("schedule.title", "Schedule")}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full" data-testid="schedule-tabs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("schedule.title", "Schedule")}
            {(task?.dueDate || task?.dueTime) && (
              <div className="w-1.5 h-1.5 bg-foreground rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            {t("schedule.recurring", "Recurring")}
            {task?.recurring && <div className="w-1.5 h-1.5 bg-foreground rounded-full" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-1">
          {/* Natural Language Input */}
          <div className="mb-3">
            <div className="flex gap-2">
              <Input
                // NOTE: Only translate "e.g.," - examples must remain in English since NLP parsing only supports English
                placeholder={`${t("schedule.examplePrefix", "e.g.,")} tomorrow 3PM, next monday, daily`}
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleParseInput()}
                className="text-sm flex-1"
              />
              <Button
                onClick={handleParseInput}
                disabled={!nlInput.trim() || !isNlInputValid}
                size="default"
                variant="default"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1 mb-3">
            <Button
              variant="ghost"
              className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                currentSchedulePreset === "today"
                  ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleQuickSchedule("today")}
            >
              <Sun className="h-4 w-4 text-yellow-500 mb-1" />
              <span className={currentSchedulePreset === "today" ? "font-medium" : ""}>
                {t("schedule.today", "Today")}
              </span>
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                currentSchedulePreset === "tomorrow"
                  ? "bg-orange-500/20 hover:bg-orange-500/30"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleQuickSchedule("tomorrow")}
            >
              <Sunrise className="h-4 w-4 text-orange-500 mb-1" />
              <span className={currentSchedulePreset === "tomorrow" ? "font-medium" : ""}>
                {t("schedule.tomorrow", "Tomorrow")}
              </span>
            </Button>
            <Button
              variant="ghost"
              className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                currentSchedulePreset === "next-week"
                  ? "bg-green-500/20 hover:bg-green-500/30"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleQuickSchedule("next-week")}
            >
              <ArrowRight className="h-4 w-4 text-green-500 mb-1" />
              <span className={currentSchedulePreset === "next-week" ? "font-medium" : ""}>
                {t("schedule.nextWeek", "Next Week")}
              </span>
            </Button>
          </div>

          {/* Action buttons row */}
          <div className="flex gap-1 mb-3">
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSkipToNext}
              disabled={!task?.dueDate}
            >
              <FastForward className="h-4 w-4 text-blue-600 mb-1" />
              <span className="text-center leading-tight">{t("schedule.skip", "Skip")}</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleUpdate(taskId, undefined, null, "remove-time")}
              disabled={!task?.dueTime}
            >
              <AlarmClockOff className="h-4 w-4 mb-1" />
              <span className="text-center leading-tight">
                {t("schedule.clearTime", "Clear Time")}
              </span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleClearAll}
              disabled={!task?.dueDate && !task?.dueTime && !task?.recurring}
            >
              <Ban className="h-4 w-4 mb-1" />
              <span className="text-center leading-tight">{t("schedule.clear", "Clear")}</span>
            </Button>
          </div>

          {/* Calendar Toggle Button - only show when not always showing calendar */}
          {!alwaysShowCalendar && (
            <div className="mb-3">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-8 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowInlineCalendar(!showInlineCalendar)}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
                {showInlineCalendar
                  ? t("schedule.hideCalendar", "Hide calendar & time")
                  : t("schedule.showCalendar", "Show calendar & time")}
              </Button>
            </div>
          )}

          {/* Collapsible Calendar & Time Selector */}
          {(showInlineCalendar || alwaysShowCalendar) && (
            <div className="mb-3 border rounded-md">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCustomDateSelect}
                fixedWeeks={false}
                showOutsideDays={false}
                captionLayout="dropdown"
                // Restrict year range to reasonable bounds for task scheduling
                // 2 years back (for overdue tasks) to 10 years forward (for long-term planning)
                startMonth={new Date(new Date().getFullYear() - 2, 0)}
                endMonth={new Date(new Date().getFullYear() + 10, 11)}
                className="rounded-md border-0 w-full"
                classNames={{
                  week: "flex w-full mt-1",
                }}
              />

              {/* Time Selector */}
              <div className="px-3 pb-3">
                <div className="flex gap-1 items-center">
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={selectedHour}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value >= 1 && value <= 12) {
                        setSelectedHour(e.target.value)
                        // Auto-fill minute to "00" if it's empty when hour is set
                        if (!selectedMinute) {
                          setSelectedMinute("00")
                        }
                      } else if (e.target.value === "") {
                        setSelectedHour("")
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") return // Allow empty
                      const value = parseInt(e.target.value)
                      if (isNaN(value) || value < 1) {
                        setSelectedHour("1")
                      } else if (value > 12) {
                        setSelectedHour("12")
                      }
                    }}
                    className="w-16 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={selectedMinute}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value >= 0 && value <= 59) {
                        setSelectedMinute(e.target.value)
                      } else if (e.target.value === "") {
                        setSelectedMinute("")
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") return // Allow empty
                      const value = parseInt(e.target.value)
                      let finalValue: string
                      if (isNaN(value) || value < 0) {
                        finalValue = "00"
                      } else if (value > 59) {
                        finalValue = "59"
                      } else {
                        finalValue = value.toString().padStart(2, "0")
                      }
                      setSelectedMinute(finalValue)
                    }}
                    className="w-16 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Select value={selectedAmPm} onValueChange={setSelectedAmPm}>
                    <SelectTrigger className="w-18 [&>svg]:w-3 [&>svg]:h-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleTimeUpdate} disabled={!selectedHour || !selectedMinute}>
                    {t("schedule.set", "Set")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {task?.dueDate && (
            <div className="pt-3 mt-3 border-t">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("schedule.due", "Due:")}{" "}
                {formatTaskDateTime(task, { format: "compact" }) || format(task.dueDate, "MMM d")}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="mt-1">
          <div className="space-y-4">
            {/* Quick recurring options */}
            <div className="flex gap-1 mb-3">
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "daily"
                    ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  setShowIntervalConfig(false)
                  handleRecurringSelect("daily")
                }}
              >
                <Sun className="h-4 w-4 text-yellow-500 mb-1" />
                <span className={currentRecurringType === "daily" ? "font-medium" : ""}>
                  {t("recurring.daily", "Daily")}
                </span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "weekly"
                    ? "bg-blue-500/20 hover:bg-blue-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  setShowIntervalConfig(false)
                  handleRecurringSelect("weekly")
                }}
              >
                <Repeat className="h-4 w-4 text-blue-500 mb-1" />
                <span className={currentRecurringType === "weekly" ? "font-medium" : ""}>
                  {t("recurring.weekly", "Weekly")}
                </span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "monthly"
                    ? "bg-purple-500/20 hover:bg-purple-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  setShowIntervalConfig(false)
                  handleRecurringSelect("monthly")
                }}
              >
                <CalendarIcon className="h-4 w-4 text-purple-500 mb-1" />
                <span className={currentRecurringType === "monthly" ? "font-medium" : ""}>
                  {t("recurring.monthly", "Monthly")}
                </span>
              </Button>
            </div>

            {/* Second row buttons */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "yearly"
                    ? "bg-green-500/20 hover:bg-green-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  setShowIntervalConfig(false)
                  handleRecurringSelect("yearly")
                }}
              >
                <CalendarDays className="h-4 w-4 text-green-500 mb-1" />
                <span className={currentRecurringType === "yearly" ? "font-medium" : ""}>
                  {t("recurring.yearly", "Yearly")}
                </span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "interval" || showIntervalConfig
                    ? "bg-orange-500/20 hover:bg-orange-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => setShowIntervalConfig(true)}
              >
                <CalendarClock className="h-4 w-4 text-orange-500 mb-1" />
                <span
                  className={
                    currentRecurringType === "interval" || showIntervalConfig ? "font-medium" : ""
                  }
                >
                  {t("recurring.interval", "Interval")}
                </span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowIntervalConfig(false)
                  handleClearAll()
                }}
                disabled={!task?.dueDate && !task?.dueTime && !task?.recurring}
              >
                <Ban className="h-4 w-4 mb-1" />
                <span className="text-center leading-tight">{t("schedule.clear", "Clear")}</span>
              </Button>
            </div>

            {/* Monthly day picker - show when monthly is selected and not showing interval config */}
            {currentRecurringType === "monthly" && !showIntervalConfig && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    {t("recurring.selectDaysOfMonth", "Select days of the month")}
                  </div>

                  {/* Custom day grid with Last day in same row as 31 */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <Button
                        key={day}
                        variant={selectedMonthlyDays.includes(day) ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 text-xs ${
                          selectedMonthlyDays.includes(day)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        onClick={() => {
                          if (selectedMonthlyDays.includes(day)) {
                            // Remove this day
                            setSelectedMonthlyDays(selectedMonthlyDays.filter((d) => d !== day))
                          } else {
                            // Add this day, but if it's 31st, remove "last day" to avoid duplicates
                            let newSelection = [...selectedMonthlyDays, day]
                            if (day === 31 && selectedMonthlyDays.includes(-1)) {
                              newSelection = newSelection.filter((d) => d !== -1)
                            }
                            setSelectedMonthlyDays(newSelection.sort((a, b) => a - b))
                          }
                        }}
                      >
                        {day}
                      </Button>
                    ))}

                    {/* Last day button spanning remaining columns */}
                    <Button
                      variant={selectedMonthlyDays.includes(-1) ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs col-span-4 ${
                        selectedMonthlyDays.includes(-1)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => {
                        if (selectedMonthlyDays.includes(-1)) {
                          // Remove "last day"
                          setSelectedMonthlyDays(selectedMonthlyDays.filter((d) => d !== -1))
                        } else {
                          // Add "last day" but remove 31st to avoid duplicates in 31-day months
                          const newSelection = [
                            ...selectedMonthlyDays.filter((d) => d !== 31),
                            -1,
                          ].sort((a, b) => a - b)
                          setSelectedMonthlyDays(newSelection)
                        }
                      }}
                    >
                      {t("recurring.lastDay", "Last day")}
                    </Button>
                  </div>

                  <div className="flex justify-center mt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (selectedMonthlyDays.length > 0) {
                          handleRecurringSelect("monthly")
                        }
                      }}
                      disabled={selectedMonthlyDays.length === 0}
                    >
                      {t("recurring.apply", "Apply")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Yearly date picker - show when yearly is selected and not showing interval config */}
            {currentRecurringType === "yearly" && !showIntervalConfig && (
              <div className="space-y-2">
                {selectedYearlyDates.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {t("recurring.selectedDates", "Selected dates:")}{" "}
                    {selectedYearlyDates
                      .map((date) =>
                        date.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        }),
                      )
                      .join(", ")}
                  </div>
                )}

                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    {t("recurring.selectDateInYear", "Select date in the year")}
                  </div>

                  <Calendar
                    mode="multiple"
                    selected={selectedYearlyDates}
                    onSelect={(dates) => setSelectedYearlyDates(dates || [])}
                    fixedWeeks={false}
                    showOutsideDays={false}
                    captionLayout="label"
                    // Set to a reference year
                    defaultMonth={
                      selectedYearlyDates.length > 0
                        ? selectedYearlyDates[0]
                        : new Date(new Date().getFullYear(), 0, 1)
                    }
                    formatters={{
                      formatCaption: (date) => date.toLocaleString("default", { month: "long" }), // Show only month name
                    }}
                    className="rounded-md border-0 w-full"
                    classNames={{
                      week: "flex w-full mt-1",
                    }}
                  />

                  <div className="flex justify-center mt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (selectedYearlyDates.length > 0) {
                          handleRecurringSelect("yearly")
                        }
                      }}
                      disabled={selectedYearlyDates.length === 0}
                    >
                      {t("recurring.apply", "Apply")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly weekday picker - show when weekly is selected and not showing interval config */}
            {currentRecurringType === "weekly" && !showIntervalConfig && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    {t("recurring.selectDaysOfWeek", "Select days of the week")}
                  </div>

                  {/* Preset buttons */}
                  <div className="flex gap-1 mb-3">
                    <Button
                      variant={
                        selectedWeekdays.length === 5 &&
                        selectedWeekdays.every((day) => [1, 2, 3, 4, 5].includes(day))
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className={`flex-1 text-xs ${
                        selectedWeekdays.length === 5 &&
                        selectedWeekdays.every((day) => [1, 2, 3, 4, 5].includes(day))
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => {
                        setSelectedWeekdays([1, 2, 3, 4, 5]) // Mon-Fri
                      }}
                    >
                      {t("recurring.weekdays", "Weekdays")}
                    </Button>
                    <Button
                      variant={
                        selectedWeekdays.length === 2 &&
                        selectedWeekdays.every((day) => [0, 6].includes(day))
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className={`flex-1 text-xs ${
                        selectedWeekdays.length === 2 &&
                        selectedWeekdays.every((day) => [0, 6].includes(day))
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => {
                        setSelectedWeekdays([0, 6]) // Sun, Sat
                      }}
                    >
                      {t("recurring.weekends", "Weekends")}
                    </Button>
                  </div>

                  {/* Weekday grid */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                      <Button
                        key={day}
                        variant={selectedWeekdays.includes(index) ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 text-xs ${
                          selectedWeekdays.includes(index)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        onClick={() => {
                          const newSelection = selectedWeekdays.includes(index)
                            ? selectedWeekdays.filter((d) => d !== index)
                            : [...selectedWeekdays, index].sort((a, b) => a - b)
                          setSelectedWeekdays(newSelection)
                        }}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-center mt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (selectedWeekdays.length > 0) {
                          handleRecurringSelect("weekly")
                        }
                      }}
                      disabled={selectedWeekdays.length === 0}
                    >
                      {t("recurring.apply", "Apply")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Daily options - show when daily is selected and not showing interval config */}
            {currentRecurringType === "daily" && !showIntervalConfig && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    {t("recurring.setDailyInterval", "Set daily interval")}
                  </div>

                  {/* Daily interval input */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-sm">{t("recurring.every", "Every")}</span>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={dailyInterval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1
                        if (value >= 1 && value <= 365) {
                          setDailyInterval(value)
                        }
                      }}
                      className="h-8 w-16 text-center text-sm"
                    />
                    <span className="text-sm">
                      {dailyInterval === 1
                        ? t("recurring.day", "day")
                        : t("recurring.days", "days")}
                    </span>
                  </div>

                  <div className="flex justify-center mt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRecurringSelect("daily")
                      }}
                    >
                      {t("recurring.apply", "Apply")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Interval recurring patterns - show when interval is selected or user wants to configure interval */}
            {(currentRecurringType === "interval" || showIntervalConfig) && (
              <div className="space-y-2">
                <div className="border rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-4 text-center">
                    {t("recurring.createCustomPattern", "Create a custom recurring pattern")}
                  </div>

                  {/* Natural sentence UI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex-wrap">
                      <span>{t("recurring.every", "Every")}</span>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={customInterval}
                        onChange={(e) => setCustomIntervalValue(parseInt(e.target.value) || 1)}
                        className="h-8 w-16 text-center text-sm"
                      />
                      <Select
                        value={customFrequency}
                        onValueChange={(value: "WEEKLY" | "MONTHLY" | "YEARLY") => {
                          setCustomFrequency(value)
                          // Auto-switch to weekday pattern if WEEKLY is selected
                          if (value === "WEEKLY" && customPatternType === "day") {
                            setCustomPatternType("weekday")
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-24 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">
                            {customInterval === 1
                              ? t("recurring.week", "week")
                              : t("recurring.weeks", "weeks")}
                          </SelectItem>
                          <SelectItem value="MONTHLY">
                            {customInterval === 1
                              ? t("recurring.month", "month")
                              : t("recurring.months", "months")}
                          </SelectItem>
                          <SelectItem value="YEARLY">
                            {customInterval === 1
                              ? t("recurring.year", "year")
                              : t("recurring.years", "years")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <span>{t("recurring.on", "on")}</span>
                      {(customFrequency === "MONTHLY" || customFrequency === "YEARLY") && (
                        <>
                          <span>{t("recurring.the", "the")}</span>
                          <MultiSelect
                            options={
                              customPatternType === "day"
                                ? // Calendar day options: 1st through 31st, plus last
                                  [
                                    ...Array.from({ length: 31 }, (_, i) => {
                                      const day = i + 1
                                      const suffix =
                                        day === 1
                                          ? "st"
                                          : day === 2
                                            ? "nd"
                                            : day === 3
                                              ? "rd"
                                              : "th"
                                      return { value: day, label: `${day}${suffix}` }
                                    }),
                                    { value: -1, label: "last" },
                                  ]
                                : // Weekday options: 1st through 5th, plus last
                                  [
                                    { value: 1, label: "1st" },
                                    { value: 2, label: "2nd" },
                                    { value: 3, label: "3rd" },
                                    { value: 4, label: "4th" },
                                    { value: 5, label: "5th" },
                                    { value: -1, label: "last" },
                                  ]
                            }
                            value={customOccurrences}
                            onValueChange={setCustomOccurrences}
                            className="h-8 w-20 text-sm"
                            size="sm"
                            maxDisplay={2}
                          />
                        </>
                      )}
                      <Select
                        value={customPatternType}
                        onValueChange={(value: "day" | "weekday") => {
                          // Auto-switch to weekday if WEEKLY is selected and user tries to select day
                          if (customFrequency === "WEEKLY" && value === "day") {
                            // Don't allow day patterns for weekly frequency
                            return
                          }
                          setCustomPatternType(value)
                        }}
                      >
                        <SelectTrigger className="h-8 w-20 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day" disabled={customFrequency === "WEEKLY"}>
                            day
                          </SelectItem>
                          <SelectItem value="weekday">weekday</SelectItem>
                        </SelectContent>
                      </Select>
                      {customPatternType === "weekday" && (
                        <MultiSelect
                          options={[
                            { value: 0, label: "Sunday" },
                            { value: 1, label: "Monday" },
                            { value: 2, label: "Tuesday" },
                            { value: 3, label: "Wednesday" },
                            { value: 4, label: "Thursday" },
                            { value: 5, label: "Friday" },
                            { value: 6, label: "Saturday" },
                          ]}
                          value={customWeekdays}
                          onValueChange={setCustomWeekdays}
                          className="h-8 w-28 text-sm"
                          size="sm"
                          maxDisplay={2}
                        />
                      )}
                      {customFrequency === "YEARLY" && (
                        <>
                          <span>{t("recurring.of", "of")}</span>
                          <MultiSelect
                            options={[
                              { value: 1, label: "January" },
                              { value: 2, label: "February" },
                              { value: 3, label: "March" },
                              { value: 4, label: "April" },
                              { value: 5, label: "May" },
                              { value: 6, label: "June" },
                              { value: 7, label: "July" },
                              { value: 8, label: "August" },
                              { value: 9, label: "September" },
                              { value: 10, label: "October" },
                              { value: 11, label: "November" },
                              { value: 12, label: "December" },
                            ]}
                            value={customMonths}
                            onValueChange={setCustomMonths}
                            className="h-8 w-28 text-sm"
                            size="sm"
                            maxDisplay={2}
                          />
                        </>
                      )}
                    </div>

                    {/* Preview text */}
                    <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {(() => {
                        const intervalText = customInterval === 1 ? "" : customInterval + " "
                        const frequencyText = customFrequency.toLowerCase().slice(0, -2)
                        const pluralSuffix = customInterval > 1 ? "s" : ""

                        if (customFrequency === "WEEKLY") {
                          // For weekly, use selected weekdays
                          const weekdays = [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ]
                          const weekdayNames = customWeekdays.map((day) => weekdays[day]).join(", ")
                          return `Every ${intervalText}${frequencyText}${pluralSuffix} on ${weekdayNames || "Monday"}`
                        }

                        // Format months for yearly patterns
                        const monthsText =
                          customFrequency === "YEARLY" && customMonths.length > 0
                            ? ` of ${customMonths.map((month) => new Date(2024, month - 1, 1).toLocaleDateString("en-US", { month: "long" })).join(", ")}`
                            : ""

                        if (customPatternType === "day") {
                          // Calendar day patterns
                          const dayTexts = customOccurrences.map((occ) => {
                            if (occ === -1) return "last day"
                            const suffix =
                              occ === 1 ? "st" : occ === 2 ? "nd" : occ === 3 ? "rd" : "th"
                            return `${occ}${suffix} day`
                          })
                          const dayText = dayTexts.join(", ")
                          return `Every ${intervalText}${frequencyText}${pluralSuffix} on the ${dayText}${monthsText}`
                        } else {
                          // Weekday patterns
                          const weekdays = [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ]
                          const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "last"]

                          const occurrenceTexts = customOccurrences.map((occ) => {
                            const ordinalIndex = occ === -1 ? 5 : occ - 1
                            return ordinals[ordinalIndex]
                          })
                          const weekdayNames = customWeekdays.map((day) => weekdays[day])

                          const occurrenceText = occurrenceTexts.join(", ")
                          const weekdayText = weekdayNames.join(", ")

                          return `Every ${intervalText}${frequencyText}${pluralSuffix} on the ${occurrenceText} ${weekdayText}${monthsText}`
                        }
                      })()}
                    </div>
                  </div>

                  <div className="flex justify-center mt-4">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRecurringSelect("interval")
                        setShowIntervalConfig(false)
                      }}
                    >
                      {t("recurring.apply", "Apply")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Mode Toggle */}
            {task?.recurring && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("recurring.calculateNextFrom", "Calculate next due date from")}
                  </label>
                  <HelpPopover content="Choose how the next due date is calculated: 'Due date' always calculates from the original due date. 'Adaptive' adjusts to your actual timing - if you complete after the due date, it calculates from your completion date (i.e. today), but if you completed before due, it calculates based on your due date. Examples: Overdue weekly task, completed on Tuesday → scheduled to next Tuesday. Weekly task due this Friday, completed early on Tuesday → scheduled to next Friday." />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={task.recurringMode !== "completedAt" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const updates: { recurringMode: "dueDate" } = { recurringMode: "dueDate" }
                      if (!taskId) {
                        updateQuickAddTask({ updateRequest: updates })
                      } else if (Array.isArray(taskId)) {
                        updateTasks(taskId.map((id) => ({ id, ...updates })))
                      } else {
                        updateTasks([{ id: taskId, ...updates }])
                      }
                    }}
                  >
                    {t("recurring.dueDate", "Due date")}
                  </Button>
                  <Button
                    variant={task.recurringMode === "completedAt" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const updates: { recurringMode: "completedAt" } = {
                        recurringMode: "completedAt",
                      }
                      if (!taskId) {
                        updateQuickAddTask({ updateRequest: updates })
                      } else if (Array.isArray(taskId)) {
                        updateTasks(taskId.map((id) => ({ id, ...updates })))
                      } else {
                        updateTasks([{ id: taskId, ...updates }])
                      }
                    }}
                  >
                    {t("recurring.adaptive", "Adaptive")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {task?.recurring && (
            <div className="pt-3 mt-3 border-t">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {t("recurring.current", "Current:")} {getRRuleDisplay(task.recurring || "")}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
