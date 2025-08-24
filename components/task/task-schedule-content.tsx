"use client"

import { useState } from "react"
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
import {
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  ChevronLeft,
  Sun,
  Sunrise,
  ArrowRight,
  Repeat,
  RotateCcw,
  X,
} from "lucide-react"
import { format } from "date-fns"
import type { CreateTaskRequest, Task, TaskId } from "@/lib/types"
import { formatTaskDateTime } from "@/lib/utils/task-date-formatter"
import { CommonRRules, buildRRule, RRuleFrequency, parseRRule } from "@/lib/types"
import { calculateNextDueDate } from "@/lib/utils/recurring-task-processor"
import { useAtomValue, useSetAtom } from "jotai"
import { tasksAtom, updateTaskAtom } from "@/lib/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@/lib/atoms/ui/dialogs"
import { HelpPopover } from "@/components/ui/help-popover"

interface TaskScheduleContentProps {
  taskId?: TaskId
  onModeChange?: (mode: "quick" | "calendar" | "recurring") => void
  onClose?: () => void // close the popover
  isNewTask?: boolean
}

export function TaskScheduleContent({ taskId, onModeChange, onClose }: TaskScheduleContentProps) {
  const allTasks = useAtomValue(tasksAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const newTask = useAtomValue(quickAddTaskAtom)
  const isNewTask = !taskId
  const task: Task | CreateTaskRequest | undefined = isNewTask
    ? newTask
    : allTasks.find((t: Task) => t.id === taskId)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task?.dueDate)
  const [customInterval, setCustomInterval] = useState<string>("1")
  const [customUnit, setCustomUnit] = useState<string>("days")

  const handleUpdate = (
    taskId: TaskId | undefined,
    date: Date | undefined | null,
    type: string,
    recurring?: string,
  ) => {
    // Build update object based on operation type
    const updates = (() => {
      switch (type) {
        case "remove":
          return { dueDate: isNewTask ? undefined : null }
        case "remove-recurring":
          return { recurring: isNewTask ? undefined : null }
        default:
          // Handle cases where both recurring and date need to be set
          const updateObj: { recurring?: string; dueDate?: Date | null } = {}
          if (recurring !== undefined) {
            updateObj.recurring = recurring
          }
          if (date !== undefined) {
            updateObj.dueDate = date
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
    handleUpdate(taskId, date, type, undefined)
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
        handleUpdate(taskId, null, "remove-recurring", undefined)
        return
      default:
        return
    }

    // If task already has a due date, preserve it and just add recurring pattern
    // If no due date, calculate one based on the recurring pattern
    if (task.dueDate) {
      // Keep existing due date, just add recurring pattern
      handleUpdate(taskId, undefined, type, rrule)
    } else {
      // Calculate a due date for tasks without one
      const nextDueDate = calculateNextDueDate(rrule, new Date(), true)
      if (nextDueDate) {
        handleUpdate(taskId, nextDueDate, type, rrule)
      } else {
        // Fallback: just set recurring pattern without due date
        handleUpdate(taskId, undefined, type, rrule)
      }
    }
  }

  const handleCustomDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    handleUpdate(taskId, date, "custom")
  }

  const toggleCalendar = () => {
    const newMode = !showCalendar
    setShowCalendar(newMode)
    setShowRecurring(false)
    onModeChange?.(newMode ? "calendar" : "quick")
  }

  const toggleRecurring = () => {
    const newMode = !showRecurring
    setShowRecurring(newMode)
    setShowCalendar(false)
    onModeChange?.(newMode ? "recurring" : "quick")
  }

  if (!task) {
    console.warn("Task not found", taskId)
    return null
  }

  if (showCalendar) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowCalendar(false)}
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CalendarIcon className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">Pick Date</span>
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

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleCustomDateSelect}
          className="rounded-md border-0 w-full"
          classNames={{
            week: "flex w-full mt-1",
          }}
        />
      </div>
    )
  }

  if (showRecurring) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowRecurring(false)}
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Repeat className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">Make Recurring</span>
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

        <div className="space-y-3">
          {/* Quick recurring options */}
          <div className="flex gap-1 mb-3">
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
                <HelpPopover content="Choose how the next due date is calculated: 'Due date' calculates from the original due date, 'Completion date' calculates from when the task was actually completed. For example, if you have a weekly task that is due on Monday, but you complete it on Tuesday. When using the former option, the next task will be created for next Monday. Using the latter option, next Tuesday." />
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
                  Completion date
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
          <div className="pt-2 mt-2 border-t">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Current: {getRRuleDisplay(task.recurring || "")}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between border-b pb-2 mb-2">
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

      <div className="flex gap-1 mb-2">
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

      <div className="space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-8 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={toggleCalendar}
        >
          <CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
          Custom date
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-8 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={toggleRecurring}
        >
          <Repeat className="h-4 w-4 mr-2 text-green-600" />
          Make recurring
        </Button>
        {task.dueDate && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => handleQuickSchedule("remove")}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove date
          </Button>
        )}
        {task.recurring && (
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => handleRecurringSelect("remove")}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Remove recurring
          </Button>
        )}
      </div>

      {(task.dueDate || task.recurring) && (
        <div className="pt-2 mt-2 border-t space-y-1">
          {task.dueDate && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Due:{" "}
              {formatTaskDateTime(task, { format: "compact" }) || format(task.dueDate, "MMM d")}
            </div>
          )}
          {task.recurring && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Recurring: {getRRuleDisplay(task.recurring || "")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
