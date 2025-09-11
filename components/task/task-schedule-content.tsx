"use client"

import { useState, useCallback, useMemo } from "react"
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
  Settings,
} from "lucide-react"
import { format, addDays } from "date-fns"
import type { CreateTaskRequest, Task, TaskId } from "@/lib/types"
import { formatTaskDateTime } from "@/lib/utils/task-date-formatter"
import { CommonRRules, buildRRule, RRuleFrequency, RRuleWeekday, parseRRule } from "@/lib/types"
import { calculateNextDueDate } from "@/lib/utils/recurring-task-processor"
import { useAtomValue, useSetAtom } from "jotai"
import { tasksAtom, updateTaskAtom } from "@/lib/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@/lib/atoms/ui/dialogs"
import { HelpPopover } from "@/components/ui/help-popover"
import {
  parseEnhancedNaturalLanguage,
  convertTimeToHHMMSS,
} from "@/lib/utils/enhanced-natural-language-parser"
import { useIsMobile } from "@/hooks/use-mobile"

interface TaskScheduleContentProps {
  taskId?: TaskId
  onClose?: () => void // close the popover
  isNewTask?: boolean
  defaultTab?: "schedule" | "recurring" // for testing
}

export function TaskScheduleContent({
  taskId,
  onClose,
  defaultTab = "schedule",
}: TaskScheduleContentProps) {
  const allTasks = useAtomValue(tasksAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const newTask = useAtomValue(quickAddTaskAtom)
  const isNewTask = !taskId
  const task: Task | CreateTaskRequest | undefined = isNewTask
    ? newTask
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
          const month = parsed.bymonth[i] - 1 // Convert to 0-based month
          const day = parsed.bymonthday[i]
          dates.push(new Date(2024, month, day)) // Use reference year 2024
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
        return parsed.byday.map((day) => weekdayMap[day] ?? 0)
      }
    }
    return []
  })
  const [selectedDailyType, setSelectedDailyType] = useState<"all" | "weekdays" | "weekends">("all")

  // Interval recurring pattern state
  const [customFrequency, setCustomFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY")
  const [customInterval, setCustomIntervalValue] = useState<number>(1)
  const [customWeekdays, setCustomWeekdays] = useState<number[]>([1]) // Monday by default
  const [customOccurrences, setCustomOccurrences] = useState<number[]>([1]) // First occurrence by default
  const [customMonths, setCustomMonths] = useState<number[]>([1])
  const [customPatternType, setCustomPatternType] = useState<"weekday" | "day">("weekday") // weekday or calendar day

  // Time selection state
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (task?.dueTime) {
      return task.dueTime.getHours().toString()
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
      taskId: TaskId | undefined,
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
          default:
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
      })()

      // Apply updates using appropriate function
      if (!taskId) {
        updateQuickAddTask({ updateRequest: updates })
      } else {
        updateTask({ updateRequest: { id: taskId, ...updates } })
      }
    },
    [isNewTask, updateTask, updateQuickAddTask],
  )

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
        const [hours, minutes] = timeFormatted.split(":").map(Number)
        const timeDate = new Date()
        timeDate.setHours(hours, minutes, 0, 0)
        parsedTime = timeDate
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
    handleUpdate(taskId, undefined, newTime, "time")
  }

  // Helper function to add ordinal suffix to day numbers
  const getDayWithSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return `${day}th`
    switch (day % 10) {
      case 1:
        return `${day}st`
      case 2:
        return `${day}nd`
      case 3:
        return `${day}rd`
      default:
        return `${day}th`
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
    } else if (parsed.freq === RRuleFrequency.YEARLY) {
      if (
        parsed.bymonth &&
        parsed.bymonthday &&
        parsed.bymonth.length > 0 &&
        parsed.bymonthday.length > 0
      ) {
        const dateStrings = []
        for (let i = 0; i < Math.min(parsed.bymonth.length, parsed.bymonthday.length); i++) {
          const month = parsed.bymonth[i] - 1 // Convert to 0-based month
          const day = parsed.bymonthday[i]
          const referenceDate = new Date(2024, month, day)
          const monthName = referenceDate.toLocaleDateString("en-US", { month: "long" })
          const dayWithSuffix = getDayWithSuffix(day)
          dateStrings.push(`${monthName} ${dayWithSuffix}`)
        }
        const datesText = dateStrings.join(", ")
        if (interval === 1)
          return `Yearly on ${dateStrings.length > 1 ? "dates" : "date"} ${datesText}`
        return `Every ${interval} years on ${dateStrings.length > 1 ? "dates" : "date"} ${datesText}`
      }
      return "Yearly"
    }
    return "Interval recurring pattern"
  }

  // Helper function to determine current recurring type for highlighting
  const getCurrentRecurringType = ():
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "interval"
    | null => {
    if (!task?.recurring) return null

    const parsed = parseRRule(task.recurring)
    if (!parsed) return "interval"

    const interval = parsed.interval || 1

    // Check for interval patterns (complex patterns with bysetpos, intervals > 1, etc.)
    if (parsed.bysetpos && parsed.bysetpos.length > 0) return "interval"
    if (interval > 1) return "interval"

    // Check for complex patterns within simple frequencies
    if (parsed.freq === RRuleFrequency.DAILY && interval === 1) {
      // Daily with specific weekdays (weekdays/weekends) is still considered daily
      if (parsed.byday && parsed.byday.length > 0) {
        const weekdayCount = parsed.byday.length
        if (weekdayCount === 5 || weekdayCount === 2) return "daily" // weekdays or weekends
        return "interval"
      }
      return "daily"
    }

    if (parsed.freq === RRuleFrequency.WEEKLY && interval === 1) {
      // Weekly with specific days is still weekly
      return "weekly"
    }

    if (parsed.freq === RRuleFrequency.MONTHLY && interval === 1) {
      // Monthly with specific days is still monthly
      return "monthly"
    }

    if (parsed.freq === RRuleFrequency.YEARLY && interval === 1) {
      // Yearly with specific dates is still yearly
      return "yearly"
    }

    return "interval"
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
      case "next-week":
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        date = nextWeek
        break
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
      // If task has recurring pattern, calculate next occurrence
      nextDueDate = calculateNextDueDate(task.recurring, task.dueDate, false)
    } else {
      // If no recurring pattern, just advance by one day using date-fns
      nextDueDate = addDays(task.dueDate, 1)
    }

    if (nextDueDate) {
      handleUpdate(taskId, nextDueDate, undefined, "skip-to-next", undefined)
    }
  }

  const handleRecurringSelect = (type: string) => {
    if (!task) return

    let rrule: string

    switch (type) {
      case "daily":
        if (selectedDailyType === "weekdays") {
          // Monday to Friday
          rrule = buildRRule({
            freq: RRuleFrequency.WEEKLY,
            byday: [
              RRuleWeekday.MO,
              RRuleWeekday.TU,
              RRuleWeekday.WE,
              RRuleWeekday.TH,
              RRuleWeekday.FR,
            ],
          })
        } else if (selectedDailyType === "weekends") {
          // Saturday and Sunday
          rrule = buildRRule({
            freq: RRuleFrequency.WEEKLY,
            byday: [RRuleWeekday.SA, RRuleWeekday.SU],
          })
        } else {
          // Every day
          rrule = CommonRRules.daily()
        }
        break
      case "weekly":
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
          const weekdayCodes = selectedWeekdays.map((day) => weekdayMap[day])
          rrule = buildRRule({ freq: RRuleFrequency.WEEKLY, byday: weekdayCodes })
        } else {
          // Use default weekly (same day of week as due date)
          rrule = CommonRRules.weekly()
        }
        break
      case "monthly":
        if (selectedMonthlyDays.length > 0) {
          // Use specific days of the month
          rrule = buildRRule({ freq: RRuleFrequency.MONTHLY, bymonthday: selectedMonthlyDays })
        } else {
          // Use default monthly (same day of month as due date)
          rrule = CommonRRules.monthly()
        }
        break
      case "yearly":
        if (selectedYearlyDates.length > 0) {
          // Use specific months and days for yearly recurring
          const months = selectedYearlyDates.map((date) => date.getMonth() + 1) // Convert to 1-based months
          const days = selectedYearlyDates.map((date) => date.getDate())
          rrule = buildRRule({
            freq: RRuleFrequency.YEARLY,
            interval: 1,
            bymonth: months,
            bymonthday: days,
          })
        } else {
          // Use default yearly (same month and day as due date)
          rrule = buildRRule({ freq: RRuleFrequency.YEARLY, interval: 1 })
        }
        break
      case "interval":
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
            // WEEKLY doesn't make sense for calendar days, fallback to weekday
            const weekdayCodes = customWeekdays.map((day) => weekdayMap[day])
            rrule = buildRRule({
              freq: RRuleFrequency.WEEKLY,
              interval: customInterval,
              byday: weekdayCodes,
            })
          }
        } else {
          // Weekday patterns (1st Monday, 2nd Tuesday, etc.)
          if (customFrequency === "MONTHLY") {
            const weekdayCodes = customWeekdays.map((day) => weekdayMap[day])
            rrule = buildRRule({
              freq: RRuleFrequency.MONTHLY,
              interval: customInterval,
              byday: weekdayCodes,
              bysetpos: customOccurrences,
            })
          } else if (customFrequency === "YEARLY") {
            const weekdayCodes = customWeekdays.map((day) => weekdayMap[day])
            rrule = buildRRule({
              freq: RRuleFrequency.YEARLY,
              interval: customInterval,
              byday: weekdayCodes,
              bysetpos: customOccurrences,
              bymonth: customMonths,
            })
          } else {
            // WEEKLY interval pattern - use selected weekdays
            const weekdayCodes = customWeekdays.map((day) => weekdayMap[day])
            rrule = buildRRule({
              freq: RRuleFrequency.WEEKLY,
              interval: customInterval,
              byday: weekdayCodes,
            })
          }
        }
        break
      case "remove":
        handleUpdate(taskId, null, null, "remove-recurring", undefined)
        return
      default:
        return
    }

    // If task already has a due date, preserve it and just add recurring pattern
    // If no due date, calculate one based on the recurring pattern
    if (task.dueDate) {
      // Keep existing due date and time, just add recurring pattern
      handleUpdate(taskId, undefined, undefined, type, rrule)
    } else {
      // Calculate a due date for tasks without one
      const nextDueDate = calculateNextDueDate(rrule, new Date(), true)
      if (nextDueDate) {
        // Don't set default time when creating a new recurring task
        handleUpdate(taskId, nextDueDate, undefined, type, rrule)
      } else {
        // Fallback: just set recurring pattern without due date
        handleUpdate(taskId, undefined, undefined, type, rrule)
      }
    }
  }

  const handleCustomDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    // Only preserve existing time, don't set default time for custom dates
    const preserveTime = task?.dueTime || undefined
    handleUpdate(taskId, date, preserveTime, "custom")
  }

  if (!task) {
    console.warn("Task not found", taskId)
    return null
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">Schedule</span>
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
            Schedule
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-1">
          {/* Natural Language Input */}
          <div className="mb-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., tomorrow 3PM, next monday, daily"
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
              <span className={currentSchedulePreset === "today" ? "font-medium" : ""}>Today</span>
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
                Tomorrow
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
                Next Week
              </span>
            </Button>
          </div>

          {/* Action buttons row */}
          <div className="flex gap-1 mb-3">
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSkipToNext}
              disabled={!task.dueDate}
            >
              <FastForward className="h-4 w-4 text-blue-600 mb-1" />
              <span className="text-center leading-tight">Skip</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleQuickSchedule("remove")}
              disabled={!task.dueDate}
            >
              <Ban className="h-4 w-4 mb-1" />
              <span className="text-center leading-tight">Clear Date</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleUpdate(taskId, undefined, null, "remove-time")}
              disabled={!task.dueTime}
            >
              <AlarmClockOff className="h-4 w-4 mb-1" />
              <span className="text-center leading-tight">Clear Time</span>
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
                {showInlineCalendar ? "Hide calendar & time" : "Show calendar & time"}
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
                    Set
                  </Button>
                </div>
              </div>
            </div>
          )}

          {task.dueDate && (
            <div className="pt-3 mt-3 border-t">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due:{" "}
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
                onClick={() => handleRecurringSelect("daily")}
              >
                <Sun className="h-4 w-4 text-yellow-500 mb-1" />
                <span className={currentRecurringType === "daily" ? "font-medium" : ""}>Daily</span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "weekly"
                    ? "bg-blue-500/20 hover:bg-blue-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleRecurringSelect("weekly")}
              >
                <Repeat className="h-4 w-4 text-blue-500 mb-1" />
                <span className={currentRecurringType === "weekly" ? "font-medium" : ""}>
                  Weekly
                </span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "monthly"
                    ? "bg-purple-500/20 hover:bg-purple-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleRecurringSelect("monthly")}
              >
                <CalendarIcon className="h-4 w-4 text-purple-500 mb-1" />
                <span className={currentRecurringType === "monthly" ? "font-medium" : ""}>
                  Monthly
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
                onClick={() => handleRecurringSelect("yearly")}
              >
                <CalendarIcon className="h-4 w-4 text-green-500 mb-1" />
                <span className={currentRecurringType === "yearly" ? "font-medium" : ""}>
                  Yearly
                </span>
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 rounded-md ${
                  currentRecurringType === "interval"
                    ? "bg-orange-500/20 hover:bg-orange-500/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handleRecurringSelect("interval")}
              >
                <Settings className="h-4 w-4 text-orange-500 mb-1" />
                <span className={currentRecurringType === "interval" ? "font-medium" : ""}>
                  Interval
                </span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleRecurringSelect("remove")}
                disabled={!task.recurring}
              >
                <Ban className="h-4 w-4 mb-1" />
                <span className="text-center leading-tight">Clear</span>
              </Button>
            </div>

            {/* Monthly day picker - show when monthly is selected */}
            {currentRecurringType === "monthly" && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    Select days of the month
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
                          const newSelection = selectedMonthlyDays.includes(day)
                            ? selectedMonthlyDays.filter((d) => d !== day)
                            : [...selectedMonthlyDays, day].sort((a, b) => a - b)
                          setSelectedMonthlyDays(newSelection)
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
                        const newSelection = selectedMonthlyDays.includes(-1)
                          ? selectedMonthlyDays.filter((d) => d !== -1)
                          : [...selectedMonthlyDays, -1].sort((a, b) => a - b)
                        setSelectedMonthlyDays(newSelection)
                      }}
                    >
                      Last day
                    </Button>
                  </div>

                  <div className="flex justify-center mt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedMonthlyDays.length > 0) {
                          handleRecurringSelect("monthly")
                        }
                      }}
                      disabled={selectedMonthlyDays.length === 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Yearly date picker - show when yearly is selected */}
            {currentRecurringType === "yearly" && (
              <div className="space-y-2">
                {selectedYearlyDates.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Selected dates:{" "}
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
                    Select date in the year
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
                      selectedYearlyDates.length > 0 ? selectedYearlyDates[0] : new Date(2024, 0, 1)
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
                      onClick={() => {
                        if (selectedYearlyDates.length > 0) {
                          handleRecurringSelect("yearly")
                        }
                      }}
                      disabled={selectedYearlyDates.length === 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly weekday picker - show when weekly is selected */}
            {currentRecurringType === "weekly" && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">
                    Select days of the week
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
                      onClick={() => {
                        if (selectedWeekdays.length > 0) {
                          handleRecurringSelect("weekly")
                        }
                      }}
                      disabled={selectedWeekdays.length === 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Daily options - show when daily is selected */}
            {currentRecurringType === "daily" && (
              <div className="space-y-2">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-gray-500 mb-3 text-center">Select daily pattern</div>

                  {/* Daily pattern options */}
                  <div className="grid grid-cols-1 gap-1 mb-3">
                    <Button
                      variant={selectedDailyType === "all" ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${
                        selectedDailyType === "all"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedDailyType("all")}
                    >
                      Every day
                    </Button>
                    <Button
                      variant={selectedDailyType === "weekdays" ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${
                        selectedDailyType === "weekdays"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedDailyType("weekdays")}
                    >
                      Weekdays only (Mon-Fri)
                    </Button>
                    <Button
                      variant={selectedDailyType === "weekends" ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${
                        selectedDailyType === "weekends"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedDailyType("weekends")}
                    >
                      Weekends only (Sat-Sun)
                    </Button>
                  </div>

                  <div className="flex justify-center mt-2">
                    <Button size="sm" onClick={() => handleRecurringSelect("daily")}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Interval recurring patterns - show when interval is selected */}
            {currentRecurringType === "interval" && (
              <div className="space-y-2">
                <div className="border rounded-md p-4">
                  <div className="text-xs text-gray-500 mb-4 text-center">
                    Create a custom recurring pattern
                  </div>

                  {/* Natural sentence UI */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 flex-wrap">
                      <span>Every</span>
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
                        onValueChange={(value: "WEEKLY" | "MONTHLY" | "YEARLY") =>
                          setCustomFrequency(value)
                        }
                      >
                        <SelectTrigger className="h-8 w-24 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">
                            {customInterval === 1 ? "week" : "weeks"}
                          </SelectItem>
                          <SelectItem value="MONTHLY">
                            {customInterval === 1 ? "month" : "months"}
                          </SelectItem>
                          <SelectItem value="YEARLY">
                            {customInterval === 1 ? "year" : "years"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <span>on</span>
                      {(customFrequency === "MONTHLY" || customFrequency === "YEARLY") && (
                        <>
                          <span>the</span>
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
                        onValueChange={(value: "day" | "weekday") => setCustomPatternType(value)}
                      >
                        <SelectTrigger className="h-8 w-20 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">day</SelectItem>
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
                          <span>of</span>
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
                    <Button size="sm" onClick={() => handleRecurringSelect("interval")}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Mode Toggle */}
            {task.recurring && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Calculate next due date from
                  </label>
                  <HelpPopover content="Choose how the next due date is calculated: 'Due date' always calculates from the original due date. 'Adaptive' adjusts to your actual timing - if you complete after the due date, it calculates from your completion date (i.e. today), but if you completed before due, it calculates based on your due date. Examples: Overdue weekly task, completed on Tuesday → scheduled to next Tuesday. Weekly task due this Friday, completed early on Tuesday → scheduled to next Friday." />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={task.recurringMode !== "completedAt" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const updates = { recurringMode: "dueDate" as const }
                      if (!taskId) {
                        updateQuickAddTask({ updateRequest: updates })
                      } else {
                        updateTask({ updateRequest: { id: taskId, ...updates } })
                      }
                    }}
                  >
                    Due date
                  </Button>
                  <Button
                    variant={task.recurringMode === "completedAt" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      const updates = { recurringMode: "completedAt" as const }
                      if (!taskId) {
                        updateQuickAddTask({ updateRequest: updates })
                      } else {
                        updateTask({ updateRequest: { id: taskId, ...updates } })
                      }
                    }}
                  >
                    Adaptive
                  </Button>
                </div>
              </div>
            )}
          </div>

          {task.recurring && (
            <div className="pt-3 mt-3 border-t">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                Current: {getRRuleDisplay(task.recurring || "")}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
