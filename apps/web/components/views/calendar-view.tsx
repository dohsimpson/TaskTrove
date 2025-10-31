"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
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
  addDays,
  addMonths,
} from "date-fns"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { TaskSidePanel } from "@/components/task/task-side-panel"
import { AllDaySection } from "@/components/calendar/all-day-section"
import { WeekDayHeaders } from "@/components/calendar/week-day-headers"
import { CalendarAddButton } from "@/components/calendar/calendar-add-button"
import { showTaskPanelAtom, closeTaskPanelAtom } from "@tasktrove/atoms/ui/dialogs"
import { selectedTaskAtom } from "@tasktrove/atoms/ui/selection"
import { currentViewStateAtom, updateGlobalViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { updateQuickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import { sidePanelWidthAtom } from "@tasktrove/atoms/ui/views"
import { SIDE_PANEL_WIDTH_MIN, SIDE_PANEL_WIDTH_MAX } from "@tasktrove/constants"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import type { Task, Project, UpdateTaskRequest, ProjectId } from "@/lib/types"
import { TaskIdSchema } from "@/lib/types"
import { log } from "@/lib/utils/logger"
import type { CalendarTaskPosition } from "@/lib/calendar/types"
import { isCalendarDragData, isValidTaskId } from "@/lib/calendar/types"

// No longer needed - using ResizablePanel components for layout

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

interface CalendarViewProps {
  tasks: Task[]
  onDateClick: (date: Date) => void
  droppableId: string // Required ID for the droppable sidebar
  project?: Project // Optional project context for adding tasks
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
}

function WeekTimeGrid({
  weekDays,
  selectedDate,
  onDateClick,
  onTaskDrop,
  getTasksForDate,
  project,
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
    <div className="flex flex-col h-full min-h-[600px] border border-border rounded-sm">
      {/* Day Headers - Using extracted component */}
      <WeekDayHeaders weekDays={weekDays} selectedDate={selectedDate} onDateClick={onDateClick} />

      {/* All-Day Tasks Row - Using extracted component */}
      <AllDaySection
        weekDays={weekDays}
        allDayTasks={weekTasks.map(({ allDayTasks }) => allDayTasks)}
        onTaskDrop={onTaskDrop}
        onAllDayClick={handleAllDayClick}
      />

      {/* Time Grid - Simplified structure */}
      <div className="flex-1 overflow-auto">
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
              className="flex border-b border-border/50 min-h-[60px]"
            >
              {/* Time Label */}
              <div className="w-12 flex-shrink-0 p-1 text-right border-r border-border bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium leading-tight">
                  {slot.label}
                </div>
              </div>

              {/* Day columns with simplified time slot cells */}
              <div className="flex-1 grid grid-cols-7 gap-0.5 lg:gap-1">
                {weekDays.map((day) => {
                  const dayData = weekTasks.find((wd) => isSameDay(wd.date, day))
                  const isTodayDate = isToday(day)
                  const hourTasks =
                    dayData?.positionedTasks.filter((task) => {
                      const taskHour = Math.floor(task.top / 60)
                      return taskHour === slot.hour
                    }) || []

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        p-1 hover:bg-muted/20 transition-colors border-r border-border last:border-r-0 relative group
                        ${isTodayDate ? "bg-primary/5" : ""}
                      `}
                    >
                      <CalendarAddButton
                        onClick={() => handleTimeSlotClick(day, slot.hour)}
                        title="Add task to this time slot"
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
  )
}

export function CalendarView({ tasks, onDateClick, droppableId, project }: CalendarViewProps) {
  const { t } = useTranslation("task")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">("month")
  const [alwaysShow6Rows] = useState(true) // TODO: Extract to view settings when needed

  // Panel width state (global, persisted in localStorage)
  const sidePanelWidth = useAtomValue(sidePanelWidthAtom)
  const updateGlobalViewOptions = useSetAtom(updateGlobalViewOptionsAtom)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(30) // Default 30%

  // Task update action
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)

  // Task creation hooks
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  // Add task functionality
  const handleAddTask = useCallback(() => {
    if (!selectedDate) return
    performTaskCreation(selectedDate, project, undefined, addTaskToSection, updateQuickAddTask)
  }, [selectedDate, project, addTaskToSection, updateQuickAddTask])

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    // Set the selected task
    // This would integrate with existing task selection logic
    console.log("Task clicked:", task)
  }, [])

  // Panel resize handlers
  const handleSidePanelResize = useCallback(
    (sizes: number[]) => {
      if (sizes.length >= 2 && sizes[1] !== undefined) {
        const panelWidth = sizes[1] // Second panel is the side panel
        updateGlobalViewOptions({ sidePanelWidth: panelWidth })
      }
    },
    [updateGlobalViewOptions],
  )

  const handleBottomPanelResize = useCallback((sizes: number[]) => {
    if (sizes.length >= 2 && sizes[1] !== undefined) {
      const panelHeight = sizes[1] // Second panel is the bottom panel
      setBottomPanelHeight(panelHeight)
    }
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

  // Task panel state
  const showTaskPanel = useAtomValue(showTaskPanelAtom)
  const closeTaskPanel = useSetAtom(closeTaskPanelAtom)
  const selectedTask = useAtomValue(selectedTaskAtom)
  const currentViewState = useAtomValue(currentViewStateAtom)
  const { compactView } = currentViewState
  const isMobile = useIsMobile()

  // Calculate side panel margin (same logic as project-sections-view)
  const isPanelOpen = (showTaskPanel || currentViewState.showSidePanel) && Boolean(selectedTask)

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

  const getSelectedDateTasks = () => {
    if (!selectedDate) return []
    return getTasksForDate(selectedDate)
  }

  const getUnscheduledTasks = () => {
    return tasks.filter((task) => !task.dueDate && !task.completed)
  }

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
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1))
  }

  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue)
    setCurrentDate(new Date(year, currentDate.getMonth(), 1))
  }

  // Handle navigation based on view mode
  const handlePrevious = () => {
    if (calendarViewMode === "week") {
      // Navigate to previous week (subtract 7 days)
      setCurrentDate(addDays(currentDate, -7))
    } else {
      // Navigate to previous month
      setCurrentDate(addMonths(currentDate, -1))
    }
  }

  const handleNext = () => {
    if (calendarViewMode === "week") {
      // Navigate to next week (add 7 days)
      setCurrentDate(addDays(currentDate, 7))
    } else {
      // Navigate to next month
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  // Render main calendar content
  const renderCalendarContent = () => (
    <div className="h-full flex flex-col px-2">
      {/* Sticky Calendar Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between px-3 pt-4 pb-3">
          {/* Calendar View Toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={calendarViewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setCalendarViewMode("month")}
            >
              Month
            </Button>
            <Button
              variant={calendarViewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setCalendarViewMode("week")}
            >
              Week
            </Button>
          </div>

          {/* Month/Year Selectors and Navigation Controls */}
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
                onClick={() => setCurrentDate(new Date())}
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
        </div>

        {/* Sticky Day Headers - Only for Month View */}
        {calendarViewMode === "month" && (
          <div className="px-3 pb-2">
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1">
              {/* Month view: Show just weekday names */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-1 lg:p-2 text-center text-xs lg:text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col px-3 py-2 h-full">
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
            />
          ) : (
            // Month View: Traditional Calendar Grid
            <div className="grid grid-cols-7 gap-0.5 lg:gap-1 flex-1">
              {calendarDays.map((day) => {
                const dayTasks = getTasksForDate(day)
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const dayId = format(day, "yyyy-MM-dd")

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
                      className={`
                        flex flex-1 flex-col overflow-hidden p-0.5 lg:p-1 border border-border cursor-pointer hover:bg-muted/50 transition-colors
                        ${isSelected ? "ring-2 ring-foreground" : ""}
                        ${isTodayDate ? "bg-muted" : ""}
                        ${!isCurrentMonth ? "opacity-40" : ""}
                      `}
                      onClick={() => {
                        setSelectedDate(day)
                        onDateClick(day)
                      }}
                    >
                      {/* Month view: Show date number */}
                      <div
                        className={`
                          text-xs lg:text-sm font-medium mb-0.5 lg:mb-1
                          ${
                            isTodayDate
                              ? "text-primary"
                              : isCurrentMonth
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }
                        `}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="flex-1 overflow-hidden space-y-0.5 lg:space-y-1">
                        {isCurrentMonth &&
                          dayTasks.slice(0, 3).map((task, index) => (
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
                        {isCurrentMonth && dayTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayTasks.length - 3}
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

  // Render bottom panel content
  const renderBottomPanel = () => (
    <div className="h-full border-t border-border bg-card overflow-auto">
      {/* Selected Date Tasks */}
      {selectedDate && (
        <div className="border-b border-border">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{format(selectedDate, "EEEE, MMMM d")}</h2>
              <Button size="sm" onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-1" />
                {t("actions.addTask", "Add task")}
              </Button>
            </div>
            <DropTargetWrapper
              dropTargetId={droppableId}
              dropClassName="ring-2 ring-primary/50 bg-primary/5"
              onDrop={({ source }) => {
                if (source.data.type === "draggable-item") {
                  // Transform to calendar-day drop for selected date
                  const calendarDayDrop = {
                    source,
                    location: {
                      current: {
                        dropTargets: [
                          {
                            data: {
                              type: "calendar-day",
                              date: format(selectedDate, "yyyy-MM-dd"),
                            },
                          },
                        ],
                      },
                    },
                  }
                  handleCalendarDrop(calendarDayDrop)
                }
              }}
              getData={() => ({
                type: "task-list",
                sidebarContext: "calendar-bottom",
              })}
              className="space-y-2 min-h-[120px]"
            >
              {/* Tasks scheduled for selected date */}
              {getSelectedDateTasks().length > 0 ? (
                getSelectedDateTasks().map((task, index) => (
                  <DraggableWrapper
                    key={task.id}
                    dragId={task.id}
                    index={index}
                    getData={() => ({
                      type: "draggable-item",
                      dragId: task.id,
                      taskId: task.id,
                      fromBottom: true,
                    })}
                  >
                    <TaskItem
                      taskId={task.id}
                      variant={compactView ? "compact" : "default"}
                      showProjectBadge={false}
                    />
                  </DraggableWrapper>
                ))
              ) : (
                <div className="flex items-center justify-center text-muted-foreground text-sm py-2">
                  No tasks scheduled for this date
                </div>
              )}

              {/* Separator and unscheduled tasks */}
              {getUnscheduledTasks().length > 0 && (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium px-2">
                      Unscheduled
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {getUnscheduledTasks().map((task, index) => (
                    <DraggableWrapper
                      key={task.id}
                      dragId={task.id}
                      index={getSelectedDateTasks().length + index}
                      getData={() => ({
                        type: "draggable-item",
                        dragId: task.id,
                        taskId: task.id,
                        fromUnscheduled: true,
                      })}
                    >
                      <TaskItem
                        taskId={task.id}
                        variant={compactView ? "compact" : "default"}
                        showProjectBadge={true}
                      />
                    </DraggableWrapper>
                  ))}
                </>
              )}
            </DropTargetWrapper>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Selection Toolbar */}
      <div className="flex-shrink-0">
        <SelectionToolbar />
      </div>

      {/* Main Content with Resizable Side Panel */}
      {isPanelOpen && !isMobile ? (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 min-h-0"
          onLayout={handleSidePanelResize}
        >
          <ResizablePanel
            defaultSize={100 - sidePanelWidth}
            minSize={SIDE_PANEL_WIDTH_MIN}
            maxSize={SIDE_PANEL_WIDTH_MAX}
          >
            {/* Calendar and Bottom Panel with Vertical Resizable Layout */}
            <ResizablePanelGroup
              direction="vertical"
              className="h-full"
              onLayout={handleBottomPanelResize}
            >
              <ResizablePanel defaultSize={100 - bottomPanelHeight} minSize={40} maxSize={80}>
                <div className="h-full overflow-auto">{renderCalendarContent()}</div>
              </ResizablePanel>
              <ResizableHandle withHandle={false} />
              <ResizablePanel defaultSize={bottomPanelHeight} minSize={20} maxSize={60}>
                <div className="h-full overflow-auto">{renderBottomPanel()}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle={false} />
          <ResizablePanel
            defaultSize={sidePanelWidth}
            minSize={SIDE_PANEL_WIDTH_MIN}
            maxSize={SIDE_PANEL_WIDTH_MAX}
          >
            <div className="h-full">
              <TaskSidePanel isOpen={isPanelOpen} onClose={closeTaskPanel} variant="resizable" />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 min-h-0">
          {/* Calendar and Bottom Panel with Vertical Resizable Layout */}
          <ResizablePanelGroup
            direction="vertical"
            className="h-full"
            onLayout={handleBottomPanelResize}
          >
            <ResizablePanel defaultSize={100 - bottomPanelHeight} minSize={40} maxSize={80}>
              <div className="h-full overflow-auto">{renderCalendarContent()}</div>
            </ResizablePanel>
            <ResizableHandle withHandle={false} />
            <ResizablePanel defaultSize={bottomPanelHeight} minSize={20} maxSize={60}>
              <div className="h-full overflow-auto">{renderBottomPanel()}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
          {/* Task Side Panel (overlay for mobile or when not resizable) */}
          <TaskSidePanel isOpen={isPanelOpen} onClose={closeTaskPanel} />
        </div>
      )}
    </div>
  )
}
