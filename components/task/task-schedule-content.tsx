"use client"

import { useState, useCallback } from "react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Sun,
  Sunrise,
  ArrowRight,
  Repeat,
  X,
  FastForward,
  AlarmClockOff,
  Ban,
} from "lucide-react"
import { format, addDays } from "date-fns"
import type { CreateTaskRequest, Task, TaskId } from "@/lib/types"
import { formatTaskDateTime } from "@/lib/utils/task-date-formatter"
import { CommonRRules, buildRRule, RRuleFrequency, parseRRule } from "@/lib/types"
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
  const [customInterval, setCustomInterval] = useState<string>("1")
  const [customUnit, setCustomUnit] = useState<string>("days")

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
    if (!nlInput.trim()) return

    const parsed = parseEnhancedNaturalLanguage(nlInput)

    // Collect all parsed values
    let parsedDate: Date | undefined = undefined
    let parsedTime: Date | undefined = undefined
    let parsedRecurring: string | undefined = undefined
    let hasAppliedValue = false

    // Process parsed date
    if (parsed.dueDate) {
      parsedDate = parsed.dueDate
      hasAppliedValue = true
    }

    // Process parsed time
    if (parsed.time) {
      const timeFormatted = convertTimeToHHMMSS(parsed.time)
      if (timeFormatted) {
        const [hours, minutes] = timeFormatted.split(":").map(Number)
        const timeDate = new Date()
        timeDate.setHours(hours, minutes, 0, 0)
        parsedTime = timeDate
        hasAppliedValue = true
      }
    }

    // Process parsed recurring
    if (parsed.recurring) {
      parsedRecurring = parsed.recurring
      hasAppliedValue = true
    }

    // Apply all updates in a single call
    if (hasAppliedValue) {
      handleUpdate(taskId, parsedDate, parsedTime, "parsed", parsedRecurring)
      setNlInput("")
    }
  }, [nlInput, taskId, handleUpdate])

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

  // Helper function to get display text for RRULE
  const getRRuleDisplay = (rrule: string): string => {
    const parsed = parseRRule(rrule)
    if (!parsed) return "Custom recurring pattern"

    const interval = parsed.interval || 1 // Default to 1 if interval is undefined

    if (parsed.freq === RRuleFrequency.DAILY) {
      if (interval === 1) return "Daily"
      return `Every ${interval} days`
    } else if (parsed.freq === RRuleFrequency.WEEKLY) {
      if (interval === 1) return "Weekly"
      return `Every ${interval} weeks`
    } else if (parsed.freq === RRuleFrequency.MONTHLY) {
      if (interval === 1) return "Monthly"
      return `Every ${interval} months`
    } else if (parsed.freq === RRuleFrequency.YEARLY) {
      return "Yearly"
    }
    return "Custom recurring pattern"
  }

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
        rrule = CommonRRules.daily()
        break
      case "weekly":
        rrule = CommonRRules.weekly()
        break
      case "monthly":
        rrule = CommonRRules.monthly()
        break
      case "custom":
        const interval = parseInt(customInterval)
        if (customUnit === "days") {
          rrule = CommonRRules.everyNDays(interval)
        } else if (customUnit === "weeks") {
          rrule = CommonRRules.everyNWeeks(interval)
        } else {
          rrule = buildRRule({ freq: RRuleFrequency.MONTHLY, interval })
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
                disabled={!nlInput.trim()}
                size="sm"
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
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              onClick={() => handleQuickSchedule("today")}
            >
              <Sun className="h-4 w-4 text-yellow-500 mb-1" />
              <span>Today</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              onClick={() => handleQuickSchedule("tomorrow")}
            >
              <Sunrise className="h-4 w-4 text-orange-500 mb-1" />
              <span>Tomorrow</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              onClick={() => handleQuickSchedule("next-week")}
            >
              <ArrowRight className="h-4 w-4 text-green-600 mb-1" />
              <span>Next Week</span>
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
            <div className="flex gap-1">
              <Button
                variant="ghost"
                className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                onClick={() => handleRecurringSelect("daily")}
              >
                <Sun className="h-4 w-4 text-yellow-500 mb-1" />
                <span>Daily</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                onClick={() => handleRecurringSelect("weekly")}
              >
                <Repeat className="h-4 w-4 text-blue-500 mb-1" />
                <span>Weekly</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-12 text-xs flex flex-col items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                onClick={() => handleRecurringSelect("monthly")}
              >
                <CalendarIcon className="h-4 w-4 text-purple-500 mb-1" />
                <span>Monthly</span>
              </Button>
            </div>

            {/* Custom interval */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom interval
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={customInterval}
                  onChange={(e) => setCustomInterval(e.target.value)}
                  className="w-16 text-center"
                  placeholder="1"
                />
                <Select value={customUnit} onValueChange={setCustomUnit}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">days</SelectItem>
                    <SelectItem value="weeks">weeks</SelectItem>
                    <SelectItem value="months">months</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecurringSelect("custom")}
                  className="px-3"
                >
                  Set
                </Button>
              </div>
            </div>

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

            {task.recurring && (
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-8 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleRecurringSelect("remove")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove recurring pattern
              </Button>
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
