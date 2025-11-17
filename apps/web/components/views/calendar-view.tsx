"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSetAtom } from "jotai"
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useTranslation } from "@tasktrove/i18n"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isSameWeek,
  addDays,
  addMonths,
} from "date-fns"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { AllDaySection } from "@/components/calendar/all-day-section"
import { WeekDayHeaders } from "@/components/calendar/week-day-headers"
import { CalendarAddButton } from "@/components/calendar/calendar-add-button"
import { FloatingDock } from "@/components/ui/custom/floating-dock"
import { updateQuickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import { TaskViewSidePanelLayout } from "@/components/task/task-view-side-panel-layout"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import type { Task, Project, UpdateTaskRequest, ProjectId } from "@/lib/types"
import { TaskIdSchema } from "@/lib/types"
import { log } from "@/lib/utils/logger"
import type { CalendarTaskPosition } from "@/lib/calendar/types"
import { isCalendarDragData, isValidTaskId } from "@/lib/calendar/types"

// Constants
const DEFAULT_TASK_DURATION = 1800 // 30 minutes in seconds

type TaskCreationFunction = (projectId?: ProjectId, sectionId?: string) => void
type UpdateQuickAddTaskFunction = (params: { updateRequest: Partial<Task> }) => void

// Unified task creation helper
const performTaskCreation = (
  date: Date,
  project?: Project,
  hour?: number,
  addTaskToSection?: TaskCreationFunction | undefined,
  updateQuickAddTask?: UpdateQuickAddTaskFunction | undefined,
) => {
  // Use the project's default section (first section) or undefined
  const defaultSectionId = project?.sections[0]?.id

  // Open quick add with project/section prefilled
  addTaskToSection?.(project?.id, defaultSectionId)

  // Create the date/time for the selected slot
  const taskDate =
    hour !== undefined
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0)
      : date

  // Immediately update with the selected date and time
  updateQuickAddTask?.({
    updateRequest: {
      dueDate: taskDate,
      dueTime: hour !== undefined ? taskDate : undefined, // Date object with time or undefined for all-day
      estimation: DEFAULT_TASK_DURATION,
    },
  })
}

// TaskPosition is now imported from @/lib/calendar/types as CalendarTaskPosition

export type CalendarLayoutOptions = {
  showViewToggle?: boolean
  showDateControls?: boolean
  monthMaxVisibleTasksPerDay?: number
  monthFixedCellHeight?: number | string
  hideFloatingDockBreakpoint?: "sm" | "md" | "lg" | "xl"
}

interface CalendarViewProps {
  tasks: Task[]
  onDateClick: (date: Date) => void
  project?: Project
  layoutOptions?: CalendarLayoutOptions
  viewMode?: "month" | "week"
  onViewModeChange?: (mode: "month" | "week") => void
  currentDate?: Date
  onCurrentDateChange?: (date: Date) => void
  onMonthDayLongPress?: (date: Date) => void
  onWeekSlotLongPress?: (date: Date, hour: number) => void
}

// =============================================================================
// TIME GRID UTILITIES AND COMPONENTS
// =============================================================================

// Calculate task position within the time grid
const calculateTaskPosition = (task: Task, date: Date): CalendarTaskPosition | null => {
  if (!task.dueTime || !task.dueDate) return null

  // Check if task is for this date
  if (!isSameDay(task.dueDate, date)) return null

  // Parse due time
  let hours = 0,
    minutes = 0

  if (task.dueTime instanceof Date) {
    hours = task.dueTime.getHours()
    minutes = task.dueTime.getMinutes()
  } else if (typeof task.dueTime === "string") {
    // Simple split for HH:MM format - handle undefined gracefully
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const dueTimeStr = task.dueTime as string
    if (dueTimeStr.includes(":")) {
      const timeParts = dueTimeStr.split(":")
      hours = parseInt(timeParts[0] || "0") || 0
      minutes = parseInt(timeParts[1] || "0") || 0
    }
  }

  // Type guard to ensure both values are valid numbers
  if (typeof hours !== "number" || typeof minutes !== "number" || isNaN(hours) || isNaN(minutes)) {
    return null
  }

  // Calculate position (each hour = 60px height, 1px per minute)
  const top = hours * 60 + minutes

  // Default height: 30 minutes for tasks without estimation, or based on estimation
  const height = task.estimation
    ? Math.max(30, (task.estimation / 60) * 60) // Convert seconds to minutes, then to pixels
    : 30 // Minimum 30 minutes (30px)

  return { top, height, task, overlaps: 0, zIndex: 1 }
}

// Current time indicator component
interface CurrentTimeIndicatorProps {
  isToday: boolean
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

function CurrentTimeIndicator({ isToday, slotRefs }: CurrentTimeIndicatorProps) {
  const [currentTimePosition, setCurrentTimePosition] = useState(0)
  const [slotHeights, setSlotHeights] = useState<number[]>(Array(24).fill(60))

  // Update current time position based on actual slot heights
  const updateCurrentTimePosition = useCallback(() => {
    if (!isToday) return

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Calculate position based on accumulated heights
    let accumulatedHeight = 0
    for (let hour = 0; hour < currentHour; hour++) {
      accumulatedHeight += slotHeights[hour] || 60
    }

    // Add minutes within the current hour (proportional to the current hour's height)
    const currentHourHeight = slotHeights[currentHour] || 60
    const minuteOffset = (currentMinute / 60) * currentHourHeight

    setCurrentTimePosition(accumulatedHeight + minuteOffset)
  }, [isToday, slotHeights])

  // Measure slot heights using ResizeObserver
  useEffect(() => {
    if (!isToday) return

    const resizeObserver = new ResizeObserver((entries) => {
      const newHeights = [...slotHeights]

      entries.forEach((entry) => {
        const slotIndex = parseInt(entry.target.getAttribute("data-slot-index") || "0")
        if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 24) {
          newHeights[slotIndex] = entry.contentRect.height
        }
      })

      setSlotHeights(newHeights)
    })

    // Observe all slot elements
    slotRefs.current.forEach((ref) => {
      if (ref) {
        resizeObserver.observe(ref)
      }
    })

    return () => {
      resizeObserver.disconnect()
    }
  }, [isToday, slotRefs, slotHeights])

  // Update position every minute and when slot heights change
  useEffect(() => {
    if (!isToday) return

    const updateCurrentTime = () => {
      updateCurrentTimePosition()
    }

    updateCurrentTime()
    const interval = setInterval(updateCurrentTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isToday, updateCurrentTimePosition])

  // Update position when slot heights change
  useEffect(() => {
    updateCurrentTimePosition()
  }, [slotHeights, updateCurrentTimePosition])

  if (!isToday) return null

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${currentTimePosition}px` }}
    >
      <div className="flex items-center">
        {/* Time column spacer */}
        <div className="w-12"></div>

        {/* Current time indicator spanning the remaining width */}
        <div className="flex-1 relative">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
            <div className="flex-1 h-[2px] bg-red-500/80 shadow-sm" />
            {/* Time label */}
            <div className="absolute -top-5 left-0 text-xs text-red-500 font-medium bg-background px-1 rounded shadow-sm">
              {format(new Date(), "HH:mm")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Time Grid Day Component
// Week Time Grid Component with Shared Time Axis
interface WeekTimeGridProps {
  weekDays: Date[]
  selectedDate?: Date
  onDateClick: (date: Date) => void
  onTaskClick: (task: Task) => void
  onTaskDrop: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime: number
  }) => void
  getTasksForDate: (date: Date) => Task[]
  currentDate: Date
  project?: Project
  onWeekSlotLongPress?: (date: Date, hour: number) => void
}

function WeekTimeGrid({
  weekDays,
  selectedDate,
  onDateClick,
  onTaskDrop,
  getTasksForDate,
  project,
  onWeekSlotLongPress,
}: WeekTimeGridProps) {
  // Task creation hooks
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  // Unified task creation handlers
  const handleTimeSlotClick = useCallback(
    (day: Date, hour: number) => {
      performTaskCreation(day, project, hour, addTaskToSection, updateQuickAddTask)
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  const handleAllDayClick = useCallback(
    (day: Date) => {
      performTaskCreation(day, project, undefined, addTaskToSection, updateQuickAddTask)
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  // Generate time slots for the week (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: format(new Date(2000, 0, 1, i), "ha"),
  }))

  // Refs for time slots to track their actual heights
  const slotRefs = useRef<(HTMLDivElement | null)[]>(Array(24).fill(null))

  // Create ref callbacks for each slot to work with React's ref system
  const getSlotRef = useCallback(
    (hour: number) => (el: HTMLDivElement | null) => {
      slotRefs.current[hour] = el
    },
    [],
  )

  // Calculate tasks for each day
  const weekTasks = weekDays.map((day) => {
    const dayTasks = getTasksForDate(day)
    const allDayTasks = dayTasks.filter((task) => !task.dueTime)
    const timedTasks = dayTasks.filter((task) => task.dueTime)

    // Calculate positions for timed tasks
    const taskPositions: CalendarTaskPosition[] = timedTasks
      .map((task) => calculateTaskPosition(task, day))
      .filter((task): task is CalendarTaskPosition => task !== null)

    const positionedTasks = taskPositions.sort((a, b) => a.top - b.top)

    return {
      date: day,
      allDayTasks,
      positionedTasks,
    }
  })

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-sm">
      {/* Unified horizontal scroller for headers + all-day + time grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[504px]">
          {/* Day Headers */}
          <WeekDayHeaders
            weekDays={weekDays}
            selectedDate={selectedDate}
            onDateClick={onDateClick}
          />

          {/* All-Day Tasks Row */}
          <AllDaySection
            weekDays={weekDays}
            allDayTasks={weekTasks.map(({ allDayTasks }) => allDayTasks)}
            onTaskDrop={onTaskDrop}
            onAllDayClick={handleAllDayClick}
          />

          {/* Time Grid - Simplified structure */}
          <div className="relative">
            {/* Current Time Indicator */}
            <CurrentTimeIndicator
              isToday={weekDays.some((day) => isToday(day))}
              slotRefs={slotRefs}
            />

            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                ref={getSlotRef(slot.hour)}
                data-slot-index={slot.hour}
                className="flex border-b border-border/50 min-h-[56px] md:min-h-[50px]"
              >
                {/* Time Label */}
                <div className="w-10 sm:w-12 flex-shrink-0 p-1 text-right border-r border-border bg-muted/20">
                  <div className="text-xs text-muted-foreground font-medium leading-tight">
                    {slot.label}
                  </div>
                </div>

                {/* Day columns with simplified time slot cells */}
                <div className="flex-1 grid grid-cols-7 gap-0.5 lg:gap-1">
                  {weekDays.map((day) => {
                    const dayData = weekTasks.find((wd) => isSameDay(wd.date, day))
                    const isTodayDate = isToday(day)
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    const hourTasks =
                      dayData?.positionedTasks.filter((task) => {
                        const taskHour = Math.floor(task.top / 60)
                        return taskHour === slot.hour
                      }) || []

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                        p-1 hover:bg-muted/20 transition-colors border-r border-border last:border-r-0 relative group outline-none
                        ${isTodayDate ? "bg-primary/5" : ""}
                        ${isWeekend ? "bg-muted/15" : ""}
                      `}
                        onPointerDown={(e) => {
                          if (!onWeekSlotLongPress) return
                          if (!(e.currentTarget instanceof HTMLElement)) return
                          const bounds = e.currentTarget.getBoundingClientRect()
                          const y = e.clientY - bounds.top
                          const hour = Math.max(
                            0,
                            Math.min(23, Math.floor((y / bounds.height) * 24)),
                          )
                          const timeoutId = window.setTimeout(
                            () => onWeekSlotLongPress(day, hour),
                            450,
                          )
                          const clear = () => window.clearTimeout(timeoutId)
                          e.currentTarget.addEventListener("pointerup", clear, { once: true })
                          e.currentTarget.addEventListener("pointercancel", clear, { once: true })
                          e.currentTarget.addEventListener("pointerleave", clear, { once: true })
                        }}
                      >
                        <CalendarAddButton
                          onClick={() => handleTimeSlotClick(day, slot.hour)}
                          title="Add task to this time slot"
                          placement="top-right"
                        />

                        <DropTargetWrapper
                          dropTargetId={`time-slot-${format(day, "yyyy-MM-dd")}-${slot.hour}`}
                          dropClassName="ring-2 ring-primary/50 bg-primary/5"
                          onDrop={(params) => {
                            onTaskDrop({
                              ...params,
                              targetDate: day,
                              targetTime: slot.hour * 60,
                            })
                          }}
                          canDrop={({ source }) => source.data.type === "draggable-item"}
                          getData={() => ({
                            type: "calendar-time-slot",
                            date: format(day, "yyyy-MM-dd"),
                            time: slot.hour * 60,
                          })}
                          className="h-full w-full"
                        >
                          <div className="space-y-1">
                            {hourTasks.map((taskPos, index) => (
                              <DraggableWrapper
                                key={`${taskPos.task.id}-${index}`}
                                dragId={taskPos.task.id}
                                index={0}
                                getData={() => ({
                                  type: "draggable-item",
                                  dragId: taskPos.task.id,
                                  taskId: taskPos.task.id,
                                  fromTimeSlot: {
                                    date: format(day, "yyyy-MM-dd"),
                                    time: taskPos.top,
                                  },
                                })}
                              >
                                <TaskItem
                                  taskId={taskPos.task.id}
                                  variant="calendar"
                                  showProjectBadge={false}
                                />
                              </DraggableWrapper>
                            ))}
                          </div>
                        </DropTargetWrapper>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalendarView({
  tasks,
  onDateClick,
  project,
  layoutOptions,
  viewMode,
  onViewModeChange,
  currentDate: controlledCurrentDate,
  onCurrentDateChange,
  onMonthDayLongPress,
  onWeekSlotLongPress,
}: CalendarViewProps) {
  const { t } = useTranslation("task")
  const [currentDate, setCurrentDate] = useState(controlledCurrentDate ?? new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">(viewMode ?? "month")
  // Keep internal state in sync with controlled props
  useEffect(() => {
    if (viewMode && viewMode !== calendarViewMode) setCalendarViewMode(viewMode)
  }, [viewMode, calendarViewMode])
  const controlledCurrentDateTimestamp = controlledCurrentDate?.getTime()
  useEffect(() => {
    if (controlledCurrentDate && controlledCurrentDateTimestamp !== currentDate.getTime()) {
      setCurrentDate(controlledCurrentDate)
    }
  }, [controlledCurrentDate, controlledCurrentDateTimestamp, currentDate])
  const [alwaysShow6Rows] = useState(true) // TODO: Extract to view settings when needed
  const today = new Date()
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  const [isTaskDockOpen, setIsTaskDockOpen] = useState(false)

  // Task update action
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)

  // Helper: update currentDate and notify controller (mobile)
  const setDateAndNotify = (next: Date) => {
    setCurrentDate(next)
    onCurrentDateChange?.(next)
  }

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    // Set the selected task
    // This would integrate with existing task selection logic
    console.log("Task clicked:", task)
  }, [])

  // Handle task drops on calendar days
  const handleCalendarDrop = useCallback(
    ({
      source,
      location,
    }: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    }) => {
      try {
        const sourceData = source.data
        const destinationData = location.current.dropTargets[0]?.data

        // Use type guard to validate drag data
        if (!isCalendarDragData(sourceData)) {
          log.warn({ sourceType: "unknown" }, "Invalid source type for calendar drop")
          return
        }

        // Check if destination data exists
        if (!destinationData) {
          log.warn("No destination data for calendar drop")
          return
        }

        // Check if dropping on calendar day
        if (destinationData.type !== "calendar-day") {
          log.warn(
            { destinationType: destinationData.type },
            "Invalid destination type for calendar drop",
          )
          return
        }

        // Extract and validate task ID
        const taskId = sourceData.taskId
        const targetDate = typeof destinationData.date === "string" ? destinationData.date : null

        if (!targetDate) {
          log.warn({ taskId, targetDate }, "Missing target date in calendar drop")
          return
        }

        // Validate task ID with schema
        const taskIdResult = TaskIdSchema.safeParse(taskId)
        if (!taskIdResult.success) {
          log.warn({ taskId }, "Invalid task ID in calendar drop")
          return
        }

        // Convert date string to Date object in local timezone
        // Parse the date components to avoid UTC conversion issues
        const parts = targetDate.split("-").map(Number)
        if (parts.length !== 3) {
          log.warn({ targetDate }, "Invalid date format: expected YYYY-MM-DD")
          return
        }

        const year = parts[0]
        const month = parts[1]
        const day = parts[2]

        if (year === undefined || month === undefined || day === undefined) {
          log.warn({ targetDate }, "Invalid date components")
          return
        }

        const dueDate = new Date(year, month - 1, day) // month is 0-indexed
        if (isNaN(dueDate.getTime())) {
          log.warn({ targetDate }, "Invalid date format in calendar drop")
          return
        }

        // Update task due date
        updateTask({
          updateRequest: {
            id: taskIdResult.data,
            dueDate: dueDate,
          },
        })

        log.info(
          { taskId: taskIdResult.data, dueDate: targetDate },
          "Task due date updated via calendar drop",
        )
      } catch (error) {
        log.error(
          { error: error instanceof Error ? error.message : String(error) },
          "Failed to handle calendar drop",
        )
      }
    },
    [updateTask],
  )

  // Handle task drops on time slots
  const handleTimeSlotDrop = useCallback(
    ({
      source,
      targetDate,
      targetTime,
    }: {
      source: { data: Record<string, unknown> }
      targetDate: Date
      targetTime: number // Minutes from midnight
    }) => {
      try {
        const sourceData = source.data

        // Use type guard to validate drag data
        if (!isCalendarDragData(sourceData)) {
          log.warn({ sourceType: "unknown" }, "Invalid source type for time slot drop")
          return
        }

        // Extract task ID with proper typing
        const taskId = sourceData.taskId

        if (!isValidTaskId(taskId)) {
          log.warn({ taskId }, "Invalid task ID in time slot drop")
          return
        }

        // Validate task ID with schema
        const taskIdResult = TaskIdSchema.safeParse(taskId)
        if (!taskIdResult.success) {
          log.warn({ taskId }, "Invalid task ID format in time slot drop")
          return
        }

        // Handle all-day vs specific time
        let logMessage = "Task date updated via time slot drop"
        let finalLogData: { taskId: string; targetDate: string; isAllDay?: boolean; dueTime?: Date }

        const updateData: UpdateTaskRequest = {
          id: taskIdResult.data,
          dueDate: targetDate,
        }

        if (targetTime === -1) {
          // All-day task - clear dueTime by setting to null
          updateData.dueTime = null
          logMessage = "Task scheduled as all-day via time slot drop"
          finalLogData = {
            taskId: taskIdResult.data,
            targetDate: format(targetDate, "yyyy-MM-dd"),
            isAllDay: true,
          }
        } else {
          // Specific time task - set dueTime
          const hours = Math.floor(targetTime / 60)
          const minutes = targetTime % 60
          const dueTime = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            hours,
            minutes,
          )
          updateData.dueTime = dueTime
          finalLogData = {
            taskId: taskIdResult.data,
            targetDate: format(targetDate, "yyyy-MM-dd"),
            dueTime,
          }
          logMessage = "Task date and time updated via time slot drop"
        }

        // Update task
        updateTask({
          updateRequest: updateData,
        })

        log.info(finalLogData, logMessage)
      } catch (error) {
        log.error(
          { error: error instanceof Error ? error.message : String(error) },
          "Failed to handle time slot drop",
        )
      }
    },
    [updateTask],
  )

  // Generate calendar grid with proper week alignment
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Calculate calendar start based on view mode
  const calendarStart =
    calendarViewMode === "week"
      ? startOfWeek(currentDate, { weekStartsOn: 0 }) // Start of current week
      : startOfWeek(monthStart, { weekStartsOn: 0 }) // Start on Sunday

  // Choose calendar end based on view mode and layout preference
  const calendarEnd =
    calendarViewMode === "week"
      ? endOfWeek(currentDate, { weekStartsOn: 0 }) // End of current week
      : alwaysShow6Rows
        ? addDays(calendarStart, 41) // Always show exactly 42 days (6 weeks)
        : endOfWeek(monthEnd, { weekStartsOn: 0 }) // Dynamic layout based on month

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(task.dueDate, date))
  }

  const getUnscheduledTasks = () => {
    return tasks.filter((task) => !task.dueDate && !task.completed)
  }
  const handleMonthDayQuickAdd = useCallback(
    (day: Date) => {
      performTaskCreation(day, project, undefined, addTaskToSection, updateQuickAddTask)
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  // Generate month and year options (locale-aware)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i, 1), "MMMM"),
  }))

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i
    return { value: year.toString(), label: year.toString() }
  })

  // Handle month/year selection
  const handleMonthChange = (monthValue: string) => {
    const month = parseInt(monthValue)
    setDateAndNotify(new Date(currentDate.getFullYear(), month, 1))
  }

  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue)
    setDateAndNotify(new Date(year, currentDate.getMonth(), 1))
  }

  // Handle navigation based on view mode
  const handlePrevious = () => {
    if (calendarViewMode === "week") {
      setDateAndNotify(addDays(currentDate, -7))
    } else {
      setDateAndNotify(addMonths(currentDate, -1))
    }
  }

  const handleNext = () => {
    if (calendarViewMode === "week") {
      setDateAndNotify(addDays(currentDate, 7))
    } else {
      setDateAndNotify(addMonths(currentDate, 1))
    }
  }

  // Render main calendar content
  const renderCalendarContent = () => (
    <div className="h-full flex flex-col">
      {/* Sticky Calendar Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between pt-2 sm:px-3 sm:pt-4 sm:pb-3">
          {/* Calendar View Toggle */}
          {(layoutOptions?.showViewToggle ?? true) ? (
            <div className="flex items-center gap-1">
              <Button
                variant={calendarViewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCalendarViewMode("month")
                  onViewModeChange?.("month")
                }}
              >
                Month
              </Button>
              <Button
                variant={calendarViewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCalendarViewMode("week")
                  onViewModeChange?.("week")
                }}
              >
                Week
              </Button>
            </div>
          ) : (
            <div />
          )}

          {/* Month/Year Selectors and Navigation Controls */}
          {(layoutOptions?.showDateControls ?? true) && (
            <div className="flex items-center gap-1 lg:gap-2">
              {/* Current Month/Year with Dropdowns */}
              <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-auto h-auto border border-input bg-background px-3 py-2 text-lg lg:text-xl font-semibold hover:bg-accent/50 focus:ring-2 focus:ring-ring rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1 lg:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 lg:w-10"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs lg:text-sm"
                  onClick={() => setDateAndNotify(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 lg:w-10"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Day Headers - Only for Month View */}
        {calendarViewMode === "month" && (
          <div className="sm:px-3 sm:pb-2">
            {!(layoutOptions?.showDateControls ?? true) && (
              <div className="w-full text-center text-sm font-semibold pb-1">
                {format(currentDate, "MMMM yyyy")}
              </div>
            )}
            <div className="grid grid-cols-7 gap-0">
              {/* Month view: Show just weekday names */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                <div
                  key={day}
                  className={`p-0.5 md:p-1.5 text-center text-[10px] md:text-xs font-semibold tracking-[0.06em] md:tracking-[0.08em] uppercase text-muted-foreground/80 ${
                    index === 0 || index === 6 ? "text-muted-foreground" : ""
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Week View: Month label when date controls are hidden */}
        {calendarViewMode === "week" && !(layoutOptions?.showDateControls ?? true) && (
          <div className="w-full text-center text-sm font-semibold pb-1 sm:px-3">
            {format(currentDate, "MMMM yyyy")}
          </div>
        )}
      </div>

      {/* Scrollable Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col sm:px-3 h-full">
          {calendarViewMode === "week" ? (
            // Week View: Shared Time Grid
            <WeekTimeGrid
              weekDays={calendarDays.slice(0, 7)}
              selectedDate={selectedDate}
              onDateClick={(date) => {
                setSelectedDate(date)
                onDateClick(date)
              }}
              onTaskClick={handleTaskClick}
              onTaskDrop={handleTimeSlotDrop}
              getTasksForDate={getTasksForDate}
              currentDate={currentDate}
              project={project}
              onWeekSlotLongPress={onWeekSlotLongPress}
            />
          ) : (
            // Month View: Traditional Calendar Grid
            <div className="grid grid-cols-7 gap-0 flex-1">
              {calendarDays.map((day) => {
                const dayTasks = getTasksForDate(day)
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const dayId = format(day, "yyyy-MM-dd")
                const isCurrentWeek = isSameWeek(day, today, { weekStartsOn: 0 })
                const cellClasses = [
                  "flex flex-1 flex-col overflow-hidden p-1 lg:p-1.5 border border-border cursor-pointer hover:bg-muted/70 focus-visible:bg-muted/80 transition-colors relative group outline-none",
                  isCurrentWeek ? "bg-primary/5" : "",
                  isWeekend ? "bg-muted/20" : "",
                  isSelected ? "ring-2 ring-foreground" : "",
                  isTodayDate && !isSelected ? "bg-primary/10" : "",
                  !isCurrentMonth ? "opacity-40" : "",
                ]
                const dayLabel = format(day, "EEEE, MMMM d")

                // Optional compact layout: limit pills and show +N
                const limit = layoutOptions?.monthMaxVisibleTasksPerDay
                const visibleTasks = typeof limit === "number" ? dayTasks.slice(0, limit) : dayTasks
                const hiddenCount =
                  typeof limit === "number" ? Math.max(0, dayTasks.length - visibleTasks.length) : 0

                return (
                  <DropTargetWrapper
                    key={day.toISOString()}
                    dropTargetId={`calendar-day-${dayId}`}
                    dropClassName="ring-2 ring-primary/50 bg-primary/10"
                    onDrop={({ source, location }) => {
                      handleCalendarDrop({ source, location })
                    }}
                    canDrop={({ source }) => source.data.type === "draggable-item"}
                    getData={() => ({
                      type: "calendar-day",
                      date: dayId,
                    })}
                    className="flex flex-1"
                  >
                    <div
                      className={cellClasses.join(" ")}
                      style={
                        layoutOptions?.monthFixedCellHeight
                          ? {
                              height:
                                typeof layoutOptions.monthFixedCellHeight === "number"
                                  ? `${layoutOptions.monthFixedCellHeight}px`
                                  : layoutOptions.monthFixedCellHeight,
                            }
                          : undefined
                      }
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-current={isTodayDate ? "date" : undefined}
                      aria-label={`${dayLabel}${isCurrentMonth ? "" : " (adjacent month)"}`}
                      onClick={() => {
                        setSelectedDate(day)
                        onDateClick(day)
                      }}
                      onPointerDown={(e) => {
                        if (!onMonthDayLongPress) return
                        const target = e.currentTarget
                        const timeoutId = window.setTimeout(() => onMonthDayLongPress(day), 450)
                        const clear = () => window.clearTimeout(timeoutId)
                        target.addEventListener("pointerup", clear, { once: true })
                        target.addEventListener("pointercancel", clear, { once: true })
                        target.addEventListener("pointerleave", clear, { once: true })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedDate(day)
                          onDateClick(day)
                        }
                      }}
                    >
                      <CalendarAddButton
                        onClick={(event) => {
                          event.stopPropagation()
                          handleMonthDayQuickAdd(day)
                        }}
                        title="Add task to this day"
                        placement="top-right"
                      />
                      {/* Month view: Show date number */}
                      <div className="mb-0.5 lg:mb-1 text-xs lg:text-sm font-semibold">
                        {isTodayDate ? (
                          <span className="inline-flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                            {format(day, "d")}
                          </span>
                        ) : (
                          <span
                            className={
                              isCurrentMonth ? "text-foreground" : "text-muted-foreground italic"
                            }
                          >
                            {format(day, "d")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden space-y-0.5 lg:space-y-1">
                        {isCurrentMonth &&
                          visibleTasks.map((task, index) => (
                            <DraggableWrapper
                              key={task.id}
                              dragId={task.id}
                              index={index}
                              getData={() => ({
                                type: "draggable-item",
                                dragId: task.id,
                                taskId: task.id,
                                fromCalendarDay: dayId,
                              })}
                            >
                              <TaskItem
                                taskId={task.id}
                                variant="calendar"
                                showProjectBadge={false}
                              />
                            </DraggableWrapper>
                          ))}
                        {isCurrentMonth && hiddenCount > 0 && (
                          <div className="text-[10px] inline-flex rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                            +{hiddenCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropTargetWrapper>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Shared unscheduled task list content
  const renderTaskQueue = ({ onClose }: { onClose?: () => void } = {}) => {
    const unscheduledTasks = getUnscheduledTasks()

    return (
      <div className="flex min-h-[220px] flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {t("calendar.unscheduled", "Unscheduled")}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {unscheduledTasks.length}
            </span>
          </div>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("calendar.closeUnscheduled", "Close unscheduled list")}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto px-3 py-3">
          {unscheduledTasks.length > 0 ? (
            <div className="space-y-2">
              {unscheduledTasks.map((task, index) => (
                <DraggableWrapper
                  key={task.id}
                  dragId={task.id}
                  index={index}
                  getData={() => ({
                    type: "draggable-item",
                    dragId: task.id,
                    taskId: task.id,
                    fromUnscheduled: true,
                  })}
                >
                  <TaskItem taskId={task.id} variant="kanban" showProjectBadge={true} />
                </DraggableWrapper>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
              {t("calendar.noUnscheduledTasks", "All tasks are on the calendar")}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCalendarWithTaskQueue = () => {
    const unscheduledCount = getUnscheduledTasks().length

    return (
      <div className="relative h-full">
        <div className="h-full overflow-auto">{renderCalendarContent()}</div>
        <FloatingDock
          triggerLabel={t("calendar.unscheduled", "Unscheduled")}
          triggerCount={unscheduledCount}
          isOpen={isTaskDockOpen}
          onOpenChange={(open) => setIsTaskDockOpen(open)}
          hideTriggerWhenOpen
          className={
            layoutOptions?.hideFloatingDockBreakpoint === "sm"
              ? "hidden sm:flex"
              : layoutOptions?.hideFloatingDockBreakpoint === "md"
                ? "hidden md:flex"
                : layoutOptions?.hideFloatingDockBreakpoint === "lg"
                  ? "hidden lg:flex"
                  : layoutOptions?.hideFloatingDockBreakpoint === "xl"
                    ? "hidden xl:flex"
                    : undefined
          }
          // Keep trigger compact when visible
          triggerSize="sm"
          triggerVariant={unscheduledCount > 0 ? "default" : "outline"}
          triggerProps={{
            "aria-label": t("calendar.openUnscheduled", "Open unscheduled list"),
          }}
        >
          {renderTaskQueue({ onClose: () => setIsTaskDockOpen(false) })}
        </FloatingDock>
      </div>
    )
  }

  return (
    <TaskViewSidePanelLayout
      rootClassName="bg-background"
      contentWrapperClassName="flex flex-col h-full overflow-hidden"
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0">
          <SelectionToolbar />
        </div>
        <div className="flex-1 min-h-0">{renderCalendarWithTaskQueue()}</div>
      </div>
    </TaskViewSidePanelLayout>
  )
}
