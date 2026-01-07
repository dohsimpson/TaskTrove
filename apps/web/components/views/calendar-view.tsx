"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { Button } from "@/components/ui/button"
import { ContentPopover } from "@/components/ui/content-popover"
import { Calendar as InlineCalendar } from "@/components/ui/calendar"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { smoothScrollIntoView } from "@tasktrove/dom-utils"
import { isMobileApp } from "@/lib/utils/env"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addDays,
  addMonths,
  getWeek,
} from "date-fns"
import { TaskItem } from "@/components/task/task-item"
import { SelectionToolbar } from "@/components/task/selection-toolbar"
import { AllDaySection } from "@/components/calendar/all-day-section"
import { WeekDayHeaders } from "@/components/calendar/week-day-headers"
import { MonthCellScrollArea } from "@/components/calendar/month-cell-scroll-area"
import { CalendarAddButton } from "@/components/calendar/calendar-add-button"
import { CalendarTimeTask } from "@/components/calendar/calendar-time-task"
import { WeekMonthPicker } from "@/components/calendar/week-month-picker"
import type { CalendarViewMode } from "@tasktrove/types/calendar"
import { updateQuickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import { selectedCalendarDateAtom } from "@tasktrove/atoms/ui/views"
import { TaskViewSidePanelLayout } from "@/components/task/task-view-side-panel-layout"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import type { Task, Project } from "@tasktrove/types/core"
import type { WeekStartsOn } from "@tasktrove/types/settings"
import type { ProjectId, TaskId } from "@tasktrove/types/id"
import { log } from "@/lib/utils/logger"
import type { CalendarTaskPosition } from "@/lib/calendar/types"
import { extractTaskIdsFromDragData } from "@/lib/calendar/types"
import { handleTaskTimeSlotDrop } from "@/lib/calendar/time-slot-drop"
import { cn } from "@/lib/utils"
import type { ProjectViewToolbarProps } from "@/components/task/project-view-toolbar"
import { ProjectViewToolbar } from "@/components/task/project-view-toolbar"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import {
  DEFAULT_TASK_DURATION,
  HOUR_SLOT_HEIGHT,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  MINUTES_PER_SUBSLOT,
  PIXELS_PER_MINUTE,
  SUBSLOTS_PER_HOUR,
  toMinutesFromMidnight,
} from "@/lib/calendar/time-grid"
import {
  formatDayOfMonthLabel,
  formatMonthLabel,
  formatWeekdayLabel,
  formatTimeOfDay,
} from "@/lib/utils/task-date-formatter"
import {
  type CalendarViewExtensionRuntime,
  type CalendarViewExtensions,
  type CalendarViewTimeGridItem,
  useCalendarViewExtensionRuntime,
} from "./calendar-view.extensions"
import { DraggableTaskElement } from "@/components/task/draggable-task-element"
import { draggingEventIdAtom } from "@tasktrove/atoms/ui/drag"

// Constants are defined in lib/calendar/time-grid

type TaskCreationFunction = (projectId?: ProjectId, sectionId?: string) => void
type UpdateQuickAddTaskFunction = (params: { updateRequest: Partial<Task> }) => void

// Unified task creation helper
const performTaskCreation = (
  date: Date,
  project?: Project,
  hour?: number,
  minute: number = 0,
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
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0)
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

const performTaskCreationWithDuration = (
  date: Date,
  startMinutes: number,
  durationMinutes: number,
  project?: Project,
  addTaskToSection?: TaskCreationFunction | undefined,
  updateQuickAddTask?: UpdateQuickAddTaskFunction | undefined,
) => {
  const defaultSectionId = project?.sections[0]?.id
  addTaskToSection?.(project?.id, defaultSectionId)

  const hours = Math.floor(startMinutes / 60)
  const minutes = startMinutes % 60
  const taskDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  )

  updateQuickAddTask?.({
    updateRequest: {
      dueDate: taskDate,
      dueTime: taskDate,
      estimation: Math.round(durationMinutes * 60),
    },
  })
}

// TaskPosition is now imported from @/lib/calendar/types as CalendarTaskPosition

export type CalendarLayoutOptions = {
  showViewToggle?: boolean
  showDateControls?: boolean
  hideHeaderControls?: boolean
  monthMaxVisibleTasksPerDay?: number
  monthFixedCellHeight?: number | string
  showCornerAddButtons?: boolean
  compactHeader?: boolean
}

export interface CalendarViewProps {
  tasks: Task[]
  externalEvents?: unknown[]
  extensions?: CalendarViewExtensions
  onDateClick: (date: Date) => void
  project?: Project
  layoutOptions?: CalendarLayoutOptions
  projectToolbarProps?: ProjectViewToolbarProps | null
  viewMode?: CalendarViewMode
  onViewModeChange?: (mode: CalendarViewMode) => void
  currentDate?: Date
  onCurrentDateChange?: (date: Date) => void
  onMonthDayLongPress?: (date: Date) => void
  onWeekSlotLongPress?: (date: Date, hour: number) => void
  additionalDropTypes?: string[]
  onAdditionalDrop?: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime?: number
  }) => void
  canDropOverride?: (params: {
    source: { data: Record<string, unknown> }
    targetDate: Date
    targetTime?: number
  }) => boolean
  /** When false, caller is responsible for wrapping with TaskViewSidePanelLayout */
  wrapWithSidePanelLayout?: boolean
}

// Shared toggle used by base + pro calendars
type CalendarModeOption = { value: string; label: string }

export interface CalendarModeToggleProps {
  activeMode: string
  modes: CalendarModeOption[]
  onChange: (mode: string) => void
  className?: string
}

export function CalendarModeToggle({
  activeMode,
  modes,
  onChange,
  className,
}: CalendarModeToggleProps) {
  return (
    <div
      className={`inline-flex overflow-hidden rounded-full border border-input/80 bg-muted/40 shadow-sm ${className ?? ""}`.trim()}
    >
      {modes.map((mode, index) => (
        <Button
          key={mode.value}
          variant={activeMode === mode.value ? "default" : "ghost"}
          size="sm"
          className={`rounded-none px-4 ${index > 0 ? "border-l border-input/50" : ""}`.trim()}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </Button>
      ))}
    </div>
  )
}

// =============================================================================
// TIME GRID UTILITIES AND COMPONENTS
// =============================================================================

// Calculate task position within the time grid
const calculateTaskPosition = (task: Task, date: Date): CalendarTaskPosition | null => {
  if (!task.dueTime || !task.dueDate) return null

  // Check if task is for this date
  if (!isSameDay(task.dueDate, date)) return null

  const startMinutes = toMinutesFromMidnight(task.dueTime)
  if (startMinutes === null) {
    return null
  }

  // Calculate position and height based on fixed pixel scale
  const top = startMinutes * PIXELS_PER_MINUTE

  const durationMinutes = task.estimation
    ? Math.max(0, task.estimation / 60)
    : DEFAULT_TASK_DURATION / 60
  const height = Math.max(1, durationMinutes * PIXELS_PER_MINUTE)
  const endMinutes = Math.min(MINUTES_PER_DAY, startMinutes + durationMinutes)

  return {
    top,
    height,
    startMinutes,
    endMinutes,
    task,
    columnIndex: 0,
    columnCount: 1,
    overlaps: 0,
    zIndex: 1,
  }
}

type OverlapLayoutItem = {
  startMinutes: number
  endMinutes: number
  columnIndex: number
  columnCount: number
}

type TimeGridItemPosition = OverlapLayoutItem & {
  item: CalendarViewTimeGridItem
  top: number
  height: number
  zIndex: number
}

const layoutOverlappingItems = <T extends OverlapLayoutItem>(items: T[]): T[] => {
  if (items.length <= 1) return items

  const sorted = [...items].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
    return a.endMinutes - b.endMinutes
  })

  const assignCluster = (cluster: T[]) => {
    if (cluster.length === 0) return

    const columns: number[] = []

    const ordered = [...cluster].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
      return a.endMinutes - b.endMinutes
    })

    ordered.forEach((item) => {
      let columnIndex = columns.findIndex((endMinutes) => endMinutes <= item.startMinutes)
      if (columnIndex === -1) {
        columnIndex = columns.length
        columns.push(item.endMinutes)
      } else {
        columns[columnIndex] = item.endMinutes
      }

      item.columnIndex = columnIndex
    })

    const columnCount = Math.max(1, columns.length)
    cluster.forEach((item) => {
      item.columnCount = columnCount
    })
  }

  let cluster: T[] = []
  let clusterEnd = -1

  sorted.forEach((item) => {
    if (cluster.length === 0) {
      cluster = [item]
      clusterEnd = item.endMinutes
      return
    }

    if (item.startMinutes < clusterEnd) {
      cluster.push(item)
      clusterEnd = Math.max(clusterEnd, item.endMinutes)
      return
    }

    assignCluster(cluster)
    cluster = [item]
    clusterEnd = item.endMinutes
  })

  assignCluster(cluster)

  return items
}

// Current time indicator component
interface CurrentTimeIndicatorProps {
  isToday: boolean
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

function CurrentTimeIndicator({ isToday, slotRefs }: CurrentTimeIndicatorProps) {
  const settings = useAtomValue(settingsAtom)
  const use24HourTime = Boolean(settings.uiSettings.use24HourTime)
  const [currentTimePosition, setCurrentTimePosition] = useState(0)
  const [slotHeights, setSlotHeights] = useState<number[]>(Array(24).fill(HOUR_SLOT_HEIGHT))

  // Update current time position based on actual slot heights
  const updateCurrentTimePosition = useCallback(() => {
    if (!isToday) return

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Calculate position based on accumulated heights
    let accumulatedHeight = 0
    for (let hour = 0; hour < currentHour; hour++) {
      accumulatedHeight += slotHeights[hour] || HOUR_SLOT_HEIGHT
    }

    // Add minutes within the current hour (proportional to the current hour's height)
    const currentHourHeight = slotHeights[currentHour] || HOUR_SLOT_HEIGHT
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
            <div className="absolute -top-5 right-2 text-xs text-red-500 font-medium bg-background px-1 rounded shadow-sm">
              {formatTimeOfDay(new Date(), { use24HourTime })}
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
  onDateSelect?: (date: Date) => void
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
  showCornerAddButtons: boolean
  minWidth?: number
  extension?: CalendarViewExtensionRuntime
  canDropForTarget?: (params: {
    source: { data: Record<string, unknown> }
    targetDate: Date
    targetTime?: number
  }) => boolean
}

export function WeekTimeGrid({
  weekDays,
  selectedDate,
  onDateSelect,
  onDateClick,
  onTaskDrop,
  getTasksForDate,
  project,
  onWeekSlotLongPress,
  showCornerAddButtons,
  minWidth,
  extension,
  canDropForTarget,
}: WeekTimeGridProps) {
  const scrollHeaderRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const settings = useAtomValue(settingsAtom)
  const draggingEventId = useAtomValue(draggingEventIdAtom)
  const use24HourTime = Boolean(settings.uiSettings.use24HourTime)
  // Task creation hooks
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const columnCount = Math.max(weekDays.length, 1)
  const gridColumnClass = columnCount === 7 ? "grid-cols-7" : columnCount === 1 ? "grid-cols-1" : ""
  const gridTemplateColumns = `repeat(${columnCount}, minmax(0,1fr))`
  const showAllDayAddButton = showCornerAddButtons
  const canDropOnCalendar = useCallback(
    ({
      source,
      targetDate,
      targetTime,
    }: {
      source?: { data?: Record<string, unknown> }
      targetDate: Date
      targetTime?: number
    }) => {
      if (!source || !source.data) return false
      const fromTimeSlotValue = source.data.fromTimeSlot
      let fromTimeSlotDate: string | undefined
      let fromTimeSlotTime: number | undefined

      if (fromTimeSlotValue && typeof fromTimeSlotValue === "object") {
        if ("date" in fromTimeSlotValue && typeof fromTimeSlotValue.date === "string") {
          fromTimeSlotDate = fromTimeSlotValue.date
        }
        if ("time" in fromTimeSlotValue && typeof fromTimeSlotValue.time === "number") {
          fromTimeSlotTime = fromTimeSlotValue.time
        }
      }

      const fromTimeSlot =
        fromTimeSlotDate === undefined && fromTimeSlotTime === undefined
          ? null
          : { date: fromTimeSlotDate, time: fromTimeSlotTime }
      if (
        fromTimeSlot?.time !== undefined &&
        targetTime !== undefined &&
        fromTimeSlot.time === targetTime &&
        typeof fromTimeSlot.date === "string" &&
        fromTimeSlot.date === format(targetDate, "yyyy-MM-dd")
      ) {
        return false
      }
      return canDropForTarget
        ? canDropForTarget({ source: { data: source.data }, targetDate, targetTime })
        : source.data.type === "draggable-item" || source.data.type === "list-item"
    },
    [canDropForTarget],
  )

  const [createDraft, setCreateDraft] = useState<{
    dayKey: string
    startMinutes: number
    endMinutes: number
  } | null>(null)

  const getMinutesFromClientY = useCallback((clientY: number) => {
    const grid = gridRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    const rawMinutes = (clientY - rect.top) / PIXELS_PER_MINUTE
    const clamped = Math.min(Math.max(rawMinutes, 0), MINUTES_PER_DAY)
    return Math.floor(clamped / MINUTES_PER_SUBSLOT) * MINUTES_PER_SUBSLOT
  }, [])

  const handleCreatePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = createStateRef.current
      if (!state || state.pointerId !== event.pointerId) return

      const currentMinutes = getMinutesFromClientY(event.clientY)
      const start = Math.min(state.originMinutes, currentMinutes)
      let end = Math.max(state.originMinutes, currentMinutes)

      if (end === start) {
        end = Math.min(start + MINUTES_PER_SUBSLOT, MINUTES_PER_DAY)
      }

      state.startMinutes = start
      state.endMinutes = end
      setCreateDraft({
        dayKey: state.dayKey,
        startMinutes: start,
        endMinutes: end,
      })
    },
    [getMinutesFromClientY],
  )

  const handleCreatePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = createStateRef.current
      if (!state || state.pointerId !== event.pointerId) return

      const durationMinutes = Math.max(MINUTES_PER_SUBSLOT, state.endMinutes - state.startMinutes)

      performTaskCreationWithDuration(
        state.date,
        state.startMinutes,
        durationMinutes,
        project,
        addTaskToSection,
        updateQuickAddTask,
      )

      createStateRef.current = null
      setCreateDraft(null)
    },
    [addTaskToSection, project, updateQuickAddTask],
  )

  useEffect(() => {
    if (!createDraft) return
    window.addEventListener("pointermove", handleCreatePointerMove)
    window.addEventListener("pointerup", handleCreatePointerUp)
    window.addEventListener("pointercancel", handleCreatePointerUp)

    return () => {
      window.removeEventListener("pointermove", handleCreatePointerMove)
      window.removeEventListener("pointerup", handleCreatePointerUp)
      window.removeEventListener("pointercancel", handleCreatePointerUp)
    }
  }, [createDraft, handleCreatePointerMove, handleCreatePointerUp])

  useKeyboardShortcuts(
    {
      Escape: () => {
        if (!createDraft) return false
        createStateRef.current = null
        setCreateDraft(null)
        return true
      },
    },
    { enabled: Boolean(createDraft), priority: 50 },
  )

  const handleCreatePointerDown = useCallback(
    (day: Date) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.pointerType !== "mouse") return
      if (createStateRef.current) return

      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      if (target.closest('button,[role="button"],[data-task-id],[data-testid^="draggable-task"]')) {
        return
      }

      const startMinutes = getMinutesFromClientY(event.clientY)
      const clampedStart = Math.min(
        Math.max(startMinutes, 0),
        MINUTES_PER_DAY - MINUTES_PER_SUBSLOT,
      )
      const endMinutes = Math.min(clampedStart + MINUTES_PER_SUBSLOT, MINUTES_PER_DAY)
      const dayKey = format(day, "yyyy-MM-dd")

      createStateRef.current = {
        pointerId: event.pointerId,
        dayKey,
        date: day,
        originMinutes: clampedStart,
        startMinutes: clampedStart,
        endMinutes,
      }
      setCreateDraft({
        dayKey,
        startMinutes: clampedStart,
        endMinutes,
      })

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [getMinutesFromClientY],
  )

  // Unified task creation handlers
  const handleAllDayClick = useCallback(
    (day: Date) => {
      performTaskCreation(day, project, undefined, 0, addTaskToSection, updateQuickAddTask)
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  // Generate time slots for the week (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: formatTimeOfDay(new Date(2000, 0, 1, i), {
      use24HourTime,
      short: true,
    }),
  }))

  // Refs for time slots to track their actual heights
  const slotRefs = useRef<(HTMLDivElement | null)[]>(Array(24).fill(null))
  const scrollStateRef = useRef<{ key: string; hour: number } | null>(null)
  const scrolledWeekKeysRef = useRef<Set<string>>(new Set())
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const createStateRef = useRef<{
    pointerId: number
    dayKey: string
    date: Date
    originMinutes: number
    startMinutes: number
    endMinutes: number
  } | null>(null)

  // Create ref callbacks for each slot to work with React's ref system
  const getSlotRef = useCallback(
    (hour: number) => (el: HTMLDivElement | null) => {
      slotRefs.current[hour] = el
    },
    [],
  )

  const weekDaysKey = useMemo(
    () => weekDays.map((day) => format(day, "yyyy-MM-dd")).join("|"),
    [weekDays],
  )

  const earliestTaskMinutes = useMemo(() => {
    let earliest: number | null = null

    for (const day of weekDays) {
      const dayTasks = getTasksForDate(day)
      for (const task of dayTasks) {
        if (!task.dueDate || !task.dueTime) continue
        if (!isSameDay(task.dueDate, day)) continue

        const startMinutes = toMinutesFromMidnight(task.dueTime)
        if (startMinutes === null) continue
        if (earliest === null || startMinutes < earliest) earliest = startMinutes
      }
    }

    return earliest
  }, [getTasksForDate, weekDays])

  const earliestExternalMinutes = useMemo(() => {
    const timeGridItems = extension?.timeGridItemsByDate
    if (!timeGridItems) return null

    let earliest: number | null = null
    for (const day of weekDays) {
      const dayKey = format(day, "yyyy-MM-dd")
      const dayItems = timeGridItems[dayKey] ?? []
      for (const item of dayItems) {
        const startMinutes = item.startMinutes
        if (earliest === null || startMinutes < earliest) earliest = startMinutes
      }
    }

    return earliest
  }, [extension?.timeGridItemsByDate, weekDays])

  useEffect(() => {
    if (scrolledWeekKeysRef.current.has(weekDaysKey)) return

    const earliestMinutes =
      earliestTaskMinutes === null
        ? earliestExternalMinutes
        : earliestExternalMinutes === null
          ? earliestTaskMinutes
          : Math.min(earliestTaskMinutes, earliestExternalMinutes)

    if (earliestMinutes === null) return

    const targetHour = Math.max(0, Math.min(23, Math.floor(earliestMinutes / 60)))
    const existing = scrollStateRef.current
    if (existing && existing.key === weekDaysKey && existing.hour === targetHour) return

    scrollStateRef.current = { key: weekDaysKey, hour: targetHour }
    const targetEl = slotRefs.current[targetHour]
    if (!targetEl) return

    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      let node = el?.parentElement ?? null
      while (node) {
        const { overflowY } = getComputedStyle(node)
        const isScrollable = /(auto|scroll|overlay)/.test(overflowY)
        if (isScrollable && node.scrollHeight > node.clientHeight) return node
        node = node.parentElement
      }
      return null
    }

    const scrollParent = findScrollParent(targetEl)
    const headerHeight = scrollHeaderRef.current?.getBoundingClientRect().height ?? 0

    scrolledWeekKeysRef.current.add(weekDaysKey)
    requestAnimationFrame(() => {
      smoothScrollIntoView(targetEl, {
        container: scrollParent ?? undefined,
        block: "start",
        offsetTop: headerHeight,
      })
    })
  }, [earliestExternalMinutes, earliestTaskMinutes, weekDaysKey])

  useEffect(() => {
    const headerEl = scrollHeaderRef.current
    if (!headerEl) return

    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      let node = el?.parentElement ?? null
      while (node) {
        const { overflowY } = getComputedStyle(node)
        const isScrollable = /(auto|scroll|overlay)/.test(overflowY)
        if (isScrollable && node.scrollHeight > node.clientHeight) return node
        node = node.parentElement
      }
      return null
    }

    const scrollParent = findScrollParent(headerEl)
    if (!scrollParent) return

    const updateShadow = () => {
      setIsHeaderScrolled(scrollParent.scrollTop > 0)
    }

    updateShadow()
    scrollParent.addEventListener("scroll", updateShadow, { passive: true })
    return () => scrollParent.removeEventListener("scroll", updateShadow)
  }, [weekDaysKey])

  // Calculate tasks for each day
  const weekTasks = weekDays.map((day) => {
    const dayTasks = getTasksForDate(day)
    const allDayTasks = dayTasks.filter((task) => !task.dueTime)
    const timedTasks = dayTasks.filter((task) => task.dueTime)

    // Calculate positions for timed tasks
    const taskPositions: CalendarTaskPosition[] = timedTasks
      .map((task) => calculateTaskPosition(task, day))
      .filter((task): task is CalendarTaskPosition => task !== null)

    const positionedTasks = layoutOverlappingItems(taskPositions).sort((a, b) => a.top - b.top)

    return {
      date: day,
      allDayTasks,
      positionedTasks,
    }
  })

  const allDaySortedTaskIds = weekTasks.flatMap((entry) => entry.allDayTasks.map((task) => task.id))

  const timeGridTasks = useMemo(
    () => weekTasks.flatMap((entry) => entry.positionedTasks.map((taskPos) => taskPos.task)),
    [weekTasks],
  )
  // Time grid SHIFT+select should follow due date/time order, not visual overlap layout.
  const timeGridSortedTaskIds = useMemo(() => {
    return [...timeGridTasks]
      .sort((a, b) => {
        const aDate = a.dueDate ?? new Date(0)
        const bDate = b.dueDate ?? new Date(0)
        const aMinutes = toMinutesFromMidnight(a.dueTime) ?? 0
        const bMinutes = toMinutesFromMidnight(b.dueTime) ?? 0
        const aTime = new Date(
          aDate.getFullYear(),
          aDate.getMonth(),
          aDate.getDate(),
          Math.floor(aMinutes / 60),
          aMinutes % 60,
        ).getTime()
        const bTime = new Date(
          bDate.getFullYear(),
          bDate.getMonth(),
          bDate.getDate(),
          Math.floor(bMinutes / 60),
          bMinutes % 60,
        ).getTime()
        if (aTime !== bTime) return aTime - bTime
        return String(a.id).localeCompare(String(b.id))
      })
      .map((task) => task.id)
  }, [timeGridTasks])

  const timeGridTasksById = useMemo(
    () => new Map(timeGridTasks.map((task) => [task.id, task])),
    [timeGridTasks],
  )

  const getTimeGridRangeTaskIds = useCallback(
    (startTaskId: TaskId, endTaskId: TaskId) => {
      const startTask = timeGridTasksById.get(startTaskId)
      const endTask = timeGridTasksById.get(endTaskId)
      if (!startTask || !endTask) return null

      const toDueTimestamp = (task: (typeof timeGridTasks)[number]) => {
        const dueDate = task.dueDate
        const dueTime = task.dueTime
        if (!dueDate || !dueTime) return null

        return new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          dueTime.getHours(),
          dueTime.getMinutes(),
        ).getTime()
      }

      const startTimestamp = toDueTimestamp(startTask)
      const endTimestamp = toDueTimestamp(endTask)
      if (startTimestamp === null || endTimestamp === null) return null

      const minTimestamp = Math.min(startTimestamp, endTimestamp)
      const maxTimestamp = Math.max(startTimestamp, endTimestamp)

      return timeGridTasks
        .filter((task) => {
          const timestamp = toDueTimestamp(task)
          if (timestamp === null) return false
          return timestamp >= minTimestamp && timestamp <= maxTimestamp
        })
        .map((task) => task.id)
    },
    [timeGridTasks, timeGridTasksById],
  )

  const allDayExtrasByWeek = weekDays.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd")
    return extension?.allDayEventsByDate?.[dayKey] ?? []
  })

  const weekTasksByDay = useMemo(() => {
    const map = new Map<string, (typeof weekTasks)[number]>()
    weekTasks.forEach((entry) => {
      map.set(format(entry.date, "yyyy-MM-dd"), entry)
    })
    return map
  }, [weekTasks])

  const timeGridItemsByDay = useMemo(() => {
    const map = new Map<string, TimeGridItemPosition[]>()
    const source = extension?.timeGridItemsByDate ?? {}

    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd")
      const items = source[dayKey] ?? []
      if (items.length === 0) {
        map.set(dayKey, [])
        return
      }

      const positions = items.flatMap((item) => {
        const rawStart = item.startMinutes
        const rawEnd = item.endMinutes
        if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) return []

        const safeStart = Math.min(Math.max(rawStart, 0), MINUTES_PER_DAY)
        let safeEnd = Math.min(Math.max(rawEnd, safeStart), MINUTES_PER_DAY)
        if (safeEnd === safeStart) {
          safeEnd = Math.min(safeStart + MINUTES_PER_SUBSLOT, MINUTES_PER_DAY)
        }
        if (safeEnd <= safeStart) return []

        return [
          {
            item,
            startMinutes: safeStart,
            endMinutes: safeEnd,
            top: safeStart * PIXELS_PER_MINUTE,
            height: Math.max(1, (safeEnd - safeStart) * PIXELS_PER_MINUTE),
            columnIndex: 0,
            columnCount: 1,
            zIndex: 5,
          },
        ]
      })

      const positioned = layoutOverlappingItems(positions).sort((a, b) => a.top - b.top)
      map.set(dayKey, positioned)
    })

    return map
  }, [extension?.timeGridItemsByDate, weekDays])

  const subSlotOffsets = useMemo(
    () => Array.from({ length: SUBSLOTS_PER_HOUR }, (_, index) => index * MINUTES_PER_SUBSLOT),
    [],
  )

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-sm">
      {/* Unified horizontal scroller for headers + all-day + time grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: minWidth ?? 504 }}>
          <div ref={scrollHeaderRef} className="sticky top-0 z-40 bg-card/95">
            {/* Day Headers */}
            <WeekDayHeaders
              weekDays={weekDays}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect ?? onDateClick}
              onDateClick={onDateClick}
              showSelectedBorder={weekDays.length > 1}
            />

            {/* All-Day Tasks Row */}
            <AllDaySection
              weekDays={weekDays}
              allDayTasks={weekTasks.map(({ allDayTasks }) => allDayTasks)}
              onTaskDrop={onTaskDrop}
              canDrop={({ source, targetDate, targetTime }) =>
                canDropOnCalendar({ source, targetDate, targetTime })
              }
              onAllDayClick={handleAllDayClick}
              showAddButton={showAllDayAddButton}
              extraItems={allDayExtrasByWeek}
              renderExtras={extension?.renderAllDayExtras}
              maxExtras={extension?.allDayMaxVisibleEventsPerDay}
              sortedTaskIds={allDaySortedTaskIds}
              className={isHeaderScrolled ? "shadow-md" : undefined}
            />
          </div>

          {/* Time Grid - Simplified structure */}
          <div ref={gridRef} className="relative">
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
                className="flex border-b border-border/50 box-border"
                style={{ height: `${HOUR_SLOT_HEIGHT}px` }}
              >
                {/* Time Label */}
                <div className="w-10 sm:w-12 flex-shrink-0 p-1 text-right border-r border-border bg-muted/20">
                  <div className="text-xs font-medium leading-tight text-foreground/80">
                    {slot.label}
                  </div>
                </div>

                {/* Day columns with 15-minute sub-slots */}
                <div className={`flex-1 grid ${gridColumnClass}`} style={{ gridTemplateColumns }}>
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd")
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                        border-r border-border last:border-r-0 relative group outline-none cursor-pointer
                        ${isWeekend && columnCount > 1 ? "bg-muted/15" : ""}
                      `}
                        onPointerDown={(e) => {
                          handleCreatePointerDown(day)(e)
                          if (!onWeekSlotLongPress) return
                          if (createStateRef.current) return
                          // This cell represents a single hour row
                          const timeoutId = window.setTimeout(
                            () => onWeekSlotLongPress(day, slot.hour),
                            450,
                          )
                          const clear = () => window.clearTimeout(timeoutId)
                          e.currentTarget.addEventListener("pointerup", clear, { once: true })
                          e.currentTarget.addEventListener("pointercancel", clear, { once: true })
                          e.currentTarget.addEventListener("pointerleave", clear, { once: true })
                        }}
                      >
                        <div className="absolute inset-0 grid grid-rows-4">
                          {subSlotOffsets.map((minuteOffset, index) => {
                            const targetMinutes = slot.hour * MINUTES_PER_HOUR + minuteOffset
                            return (
                              <DropTargetWrapper
                                key={`${dayKey}-${slot.hour}-${minuteOffset}`}
                                dropTargetId={`time-slot-${dayKey}-${slot.hour}-${minuteOffset}`}
                                dropClassName="ring-2 ring-primary/50 bg-primary/5"
                                onDrop={(params) => {
                                  onTaskDrop({
                                    ...params,
                                    targetDate: day,
                                    targetTime: targetMinutes,
                                  })
                                }}
                                canDrop={({ source }) =>
                                  canDropOnCalendar({
                                    source,
                                    targetDate: day,
                                    targetTime: targetMinutes,
                                  })
                                }
                                getData={() => ({
                                  type: "calendar-time-slot",
                                  date: dayKey,
                                  time: targetMinutes,
                                })}
                                className={`${index < subSlotOffsets.length - 1 ? "border-b border-border/30" : ""} relative h-full cursor-pointer transition-colors hover:bg-muted/20`}
                              >
                                <div className="h-full w-full" />
                              </DropTargetWrapper>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Task overlay layer */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="flex h-full">
                <div className="w-10 sm:w-12 flex-shrink-0" />
                <div className={`flex-1 grid ${gridColumnClass}`} style={{ gridTemplateColumns }}>
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd")
                    const dayData = weekTasksByDay.get(dayKey)
                    const positionedTasks = dayData?.positionedTasks ?? []
                    const positionedItems = timeGridItemsByDay.get(dayKey) ?? []
                    const renderTimeGridItem = extension?.renderTimeGridItem

                    return (
                      <div key={`tasks-${dayKey}`} className="relative h-full">
                        {createDraft && createDraft.dayKey === dayKey ? (
                          <div
                            className="absolute left-0 right-0 rounded-sm bg-primary/15 border border-primary/40 pointer-events-none"
                            style={{
                              top: `${createDraft.startMinutes * PIXELS_PER_MINUTE}px`,
                              height: `${Math.max(
                                1,
                                (createDraft.endMinutes - createDraft.startMinutes) *
                                  PIXELS_PER_MINUTE,
                              )}px`,
                            }}
                          />
                        ) : null}
                        {renderTimeGridItem
                          ? positionedItems.map((itemPosition, index) => {
                              const safeColumnCount = Math.max(1, itemPosition.columnCount)
                              const safeColumnIndex = Math.min(
                                Math.max(0, itemPosition.columnIndex),
                                safeColumnCount - 1,
                              )
                              const columnWidth = 100 / safeColumnCount
                              const columnLeft = safeColumnIndex * columnWidth
                              const content = renderTimeGridItem({
                                date: day,
                                dayKey,
                                item: itemPosition.item,
                                top: itemPosition.top,
                                height: itemPosition.height,
                                columnIndex: safeColumnIndex,
                                columnCount: safeColumnCount,
                                zIndex: itemPosition.zIndex,
                              })
                              if (!content) return null

                              return (
                                <div
                                  key={`${itemPosition.item.id}-${index}`}
                                  className={cn(
                                    "absolute",
                                    draggingEventId ? "pointer-events-none" : "pointer-events-auto",
                                  )}
                                  data-time-grid-item
                                  style={{
                                    top: `${itemPosition.top}px`,
                                    height: `${itemPosition.height}px`,
                                    left: `${columnLeft}%`,
                                    width: `${columnWidth}%`,
                                    zIndex: itemPosition.zIndex,
                                  }}
                                >
                                  {content}
                                </div>
                              )
                            })
                          : null}
                        {positionedTasks.map((taskPos, index) => (
                          <CalendarTimeTask
                            key={`${taskPos.task.id}-${index}`}
                            task={taskPos.task}
                            date={day}
                            dayKey={dayKey}
                            top={taskPos.top}
                            height={taskPos.height}
                            columnIndex={taskPos.columnIndex}
                            columnCount={taskPos.columnCount}
                            zIndex={taskPos.zIndex + 10}
                            sortedTaskIds={timeGridSortedTaskIds}
                            getRangeTaskIds={getTimeGridRangeTaskIds}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalendarView({
  tasks,
  externalEvents,
  extensions,
  onDateClick,
  project,
  layoutOptions,
  projectToolbarProps,
  viewMode,
  onViewModeChange,
  currentDate: controlledCurrentDate,
  onCurrentDateChange,
  onMonthDayLongPress,
  onWeekSlotLongPress,
  additionalDropTypes,
  onAdditionalDrop,
  canDropOverride,
  wrapWithSidePanelLayout = true,
}: CalendarViewProps) {
  const settings = useAtomValue(settingsAtom)
  const showCornerAddButtons =
    (layoutOptions?.showCornerAddButtons ?? !isMobileApp()) && !isMobileApp()
  const [currentDate, setCurrentDate] = useState(controlledCurrentDate ?? new Date())
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>(viewMode ?? "month")
  const [isDayDatePickerOpen, setIsDayDatePickerOpen] = useState(false)
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
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const setSelectedCalendarDate = useSetAtom(selectedCalendarDateAtom)
  const weekStartsOnSetting = settings.uiSettings.weekStartsOn
  const weekStartsOn: WeekStartsOn =
    typeof weekStartsOnSetting === "number" && [0, 1, 2, 3, 4, 5, 6].includes(weekStartsOnSetting)
      ? weekStartsOnSetting
      : 0
  const showWeekNumber = Boolean(settings.uiSettings.showWeekNumber)

  // Task update action
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)
  const updateTasks = useSetAtom(taskAtoms.actions.updateTasks)

  // Helper: update currentDate and notify controller (mobile)
  const setDateAndNotify = (next: Date) => {
    setCurrentDate(next)
    onCurrentDateChange?.(next)
  }

  useEffect(() => {
    setSelectedCalendarDate(currentDate)
  }, [currentDate, setSelectedCalendarDate])

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    // Set the selected task
    // This would integrate with existing task selection logic
    console.log("Task clicked:", task)
  }, [])

  const canDropForTarget = useCallback(
    ({
      source,
      targetDate,
      targetTime,
    }: {
      source?: { data?: Record<string, unknown> }
      targetDate: Date
      targetTime?: number
    }) => {
      if (!source || !source.data) return false
      const type = typeof source.data.type === "string" ? source.data.type : null
      const isTask = type === "draggable-item" || type === "list-item"
      const isAdditional = Boolean(type && additionalDropTypes?.includes(type))
      if (!isTask && !isAdditional) return false
      if (!canDropOverride) return true
      return canDropOverride({
        source: { data: source.data },
        targetDate,
        targetTime,
      })
    },
    [additionalDropTypes, canDropOverride],
  )

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

        const targetDate = typeof destinationData.date === "string" ? destinationData.date : null

        if (!targetDate) {
          log.warn({ targetDate }, "Missing target date in calendar drop")
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

        const taskIds = extractTaskIdsFromDragData(sourceData)

        if (taskIds.length === 0) {
          if (onAdditionalDrop) {
            onAdditionalDrop({ source, location, targetDate: dueDate })
            return
          }
          log.warn({ sourceType: "unknown" }, "Invalid source type for calendar drop")
          return
        }

        taskIds.forEach((id) => {
          updateTask({
            updateRequest: {
              id,
              dueDate: dueDate,
            },
          })
        })

        log.info({ taskIds, dueDate: targetDate }, "Task due date updated via calendar drop")
      } catch (error) {
        log.error(
          { error: error instanceof Error ? error.message : String(error) },
          "Failed to handle calendar drop",
        )
      }
    },
    [onAdditionalDrop, updateTask],
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
        handleTaskTimeSlotDrop({
          source,
          targetDate,
          targetTime,
          taskById,
          updateTasks,
          log,
          onAdditionalDrop,
        })
      } catch (error) {
        log.error(
          { error: error instanceof Error ? error.message : String(error) },
          "Failed to handle time slot drop",
        )
      }
    },
    [onAdditionalDrop, taskById, updateTasks],
  )

  // Generate calendar grid with proper week alignment
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Calculate calendar start based on view mode
  const calendarStart =
    calendarViewMode === "day"
      ? startOfDay(currentDate)
      : calendarViewMode === "week"
        ? startOfWeek(currentDate, { weekStartsOn }) // Start of current week
        : startOfWeek(monthStart, { weekStartsOn }) // Start on preferred day

  // Choose calendar end based on view mode and layout preference
  const calendarEnd =
    calendarViewMode === "day"
      ? startOfDay(currentDate)
      : calendarViewMode === "week"
        ? endOfWeek(currentDate, { weekStartsOn }) // End of current week
        : alwaysShow6Rows
          ? addDays(calendarStart, 41) // Always show exactly 42 days (6 weeks)
          : endOfWeek(monthEnd, { weekStartsOn }) // Dynamic layout based on month

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group days by week for easier rendering when week numbers are shown
  const calendarWeeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7))
  }

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(task.dueDate, date))
  }

  const extension = useCalendarViewExtensionRuntime({
    tasks,
    calendarDays,
    calendarWeeks,
    currentDate,
    viewMode: calendarViewMode,
    externalEvents,
    extensions,
  })

  const handleMonthDayQuickAdd = useCallback(
    (day: Date) => {
      performTaskCreation(day, project, undefined, 0, addTaskToSection, updateQuickAddTask)
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  // Handle navigation based on view mode
  const handlePrevious = () => {
    if (calendarViewMode === "day") {
      setDateAndNotify(addDays(currentDate, -1))
    } else if (calendarViewMode === "week") {
      setDateAndNotify(addDays(currentDate, -7))
    } else {
      setDateAndNotify(addMonths(currentDate, -1))
    }
  }

  const handleNext = () => {
    if (calendarViewMode === "day") {
      setDateAndNotify(addDays(currentDate, 1))
    } else if (calendarViewMode === "week") {
      setDateAndNotify(addDays(currentDate, 7))
    } else {
      setDateAndNotify(addMonths(currentDate, 1))
    }
  }

  const renderCalendarHeader = () => {
    if (layoutOptions?.hideHeaderControls) return null

    const navControlsClass = `flex items-center gap-2 ${
      layoutOptions?.showViewToggle === false ? "flex-1 justify-start" : ""
    }`
    const todayButtonClass = `h-9 px-3 rounded-full border border-input/60 ${
      layoutOptions?.showViewToggle === false ? "ml-auto" : ""
    }`

    const renderDateControls = () => {
      if (calendarViewMode === "day") {
        return (
          <>
            <div className={navControlsClass}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-input/60"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <ContentPopover
                open={isDayDatePickerOpen}
                onOpenChange={setIsDayDatePickerOpen}
                align="end"
                sideOffset={8}
                className="w-auto max-w-fit p-0"
                content={
                  <div className="p-2">
                    <InlineCalendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => {
                        if (!date) return
                        setDateAndNotify(date)
                        setIsDayDatePickerOpen(false)
                      }}
                    />
                  </div>
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-full border border-input/60 bg-muted/40 font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <span>
                      {`${formatWeekdayLabel(currentDate, {
                        short: true,
                      })}, ${formatMonthLabel(currentDate)} ${formatDayOfMonthLabel(
                        currentDate,
                      )}, ${currentDate.getFullYear()}`}
                    </span>
                  </span>
                </Button>
              </ContentPopover>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-input/60"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className={todayButtonClass}
              onClick={() => setDateAndNotify(new Date())}
            >
              Today
            </Button>
          </>
        )
      }

      return (
        <>
          <div className={navControlsClass}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-input/60"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {calendarViewMode === "month" && (
              <WeekMonthPicker
                mode="month"
                currentDate={currentDate}
                weekStartsOn={weekStartsOn}
                onSelectDate={setDateAndNotify}
              />
            )}

            {calendarViewMode === "week" && (
              <WeekMonthPicker
                mode="week"
                currentDate={currentDate}
                weekStartsOn={weekStartsOn}
                onSelectDate={setDateAndNotify}
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-input/60"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className={todayButtonClass}
            onClick={() => setDateAndNotify(new Date())}
          >
            Today
          </Button>
        </>
      )
    }

    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50 flex-shrink-0">
        <div className={`flex flex-col sm:px-3 ${layoutOptions?.compactHeader || "pt-2"}`}>
          <div className="flex flex-wrap items-center px-0">
            {(layoutOptions?.showViewToggle ?? true) ? (
              <CalendarModeToggle
                activeMode={calendarViewMode}
                modes={[
                  { value: "month", label: "Month" },
                  { value: "week", label: "Week" },
                  { value: "day", label: "Day" },
                ]}
                onChange={(mode) => {
                  if (mode !== "month" && mode !== "week" && mode !== "day") {
                    throw new Error(`Invalid calendar mode: ${mode}`)
                  }
                  setCalendarViewMode(mode)
                  onViewModeChange?.(mode)
                }}
              />
            ) : (
              <div className="flex-1" />
            )}

            <div
              className={`flex flex-wrap items-center gap-3 text-sm ${
                layoutOptions?.showViewToggle === false ? "w-full" : "ml-auto"
              }`}
            >
              {(layoutOptions?.showDateControls ?? true) && renderDateControls()}
            </div>
          </div>
          {projectToolbarProps === null ? null : (
            <ProjectViewToolbar
              {...(projectToolbarProps ?? {})}
              extraActions={projectToolbarProps?.extraActions}
            />
          )}
        </div>
      </div>
    )
  }

  // Render main calendar content
  const renderCalendarContent = () => {
    const isTimeGridView = calendarViewMode === "week" || calendarViewMode === "day"
    const timeGridDays = calendarViewMode === "day" ? calendarDays : calendarDays.slice(0, 7)

    return (
      <div className="h-full flex flex-col">
        {/* Sticky Day Headers - Only for Month View */}
        {calendarViewMode === "month" && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50 flex-shrink-0">
            <div
              className={
                showWeekNumber
                  ? "grid [grid-template-columns:52px_repeat(7,minmax(0,1fr))] gap-0"
                  : "grid grid-cols-7 gap-0"
              }
            >
              {showWeekNumber && (
                <div className="p-0.5 md:p-1.5 text-center text-[10px] md:text-xs font-semibold uppercase text-muted-foreground/80">
                  Week
                </div>
              )}
              {/* Month view: weekday labels aligned to weekStartsOn */}
              {(() => {
                const baseHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                const orderedHeaders = [
                  ...baseHeaders.slice(weekStartsOn),
                  ...baseHeaders.slice(0, weekStartsOn),
                ]

                return orderedHeaders.map((label, index) => {
                  const isWeekend = label === "Sun" || label === "Sat"
                  return (
                    <div
                      key={`${label}-${index}`}
                      className={`p-0.5 md:p-1.5 text-center text-[10px] md:text-xs font-semibold tracking-[0.06em] md:tracking-[0.08em] uppercase text-muted-foreground/80 ${
                        isWeekend ? "text-muted-foreground" : ""
                      }`}
                    >
                      {label}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Scrollable Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col h-full">
            {isTimeGridView ? (
              // Time Grid View (Week/Day)
              <WeekTimeGrid
                weekDays={timeGridDays}
                selectedDate={currentDate}
                onDateSelect={(date) => {
                  setDateAndNotify(date)
                }}
                onDateClick={(date) => {
                  setDateAndNotify(date)
                  onDateClick(date)
                }}
                onTaskClick={handleTaskClick}
                onTaskDrop={handleTimeSlotDrop}
                getTasksForDate={getTasksForDate}
                currentDate={currentDate}
                project={project}
                onWeekSlotLongPress={onWeekSlotLongPress}
                showCornerAddButtons={showCornerAddButtons}
                extension={extension}
                canDropForTarget={canDropForTarget}
              />
            ) : (
              // Month View: Traditional Calendar Grid
              <div className="flex-1 grid grid-rows-6 gap-0 min-h-0">
                {calendarWeeks.map((weekDays, weekIndex) => {
                  const weekNumber =
                    showWeekNumber && weekDays[0] ? getWeek(weekDays[0], { weekStartsOn }) : null

                  return (
                    <div
                      key={`week-${weekIndex}`}
                      className={
                        showWeekNumber
                          ? "grid [grid-template-columns:52px_repeat(7,minmax(0,1fr))] gap-0 h-full"
                          : "grid grid-cols-7 gap-0 h-full"
                      }
                    >
                      {showWeekNumber && (
                        <div
                          role="button"
                          tabIndex={0}
                          data-testid={`week-number-${weekIndex}`}
                          className="flex items-center justify-center border border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          aria-label={`Go to week ${weekNumber ?? ""}`.trim()}
                          onClick={() => {
                            if (weekDays[0]) {
                              const weekStartDate = startOfWeek(weekDays[0], { weekStartsOn })
                              setDateAndNotify(weekStartDate)
                              setCalendarViewMode("week")
                              onViewModeChange?.("week")
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              if (weekDays[0]) {
                                const weekStartDate = startOfWeek(weekDays[0], { weekStartsOn })
                                setDateAndNotify(weekStartDate)
                                setCalendarViewMode("week")
                                onViewModeChange?.("week")
                              }
                            }
                          }}
                        >
                          W{weekNumber}
                        </div>
                      )}
                      {weekDays.map((day) => {
                        const dayTasks = getTasksForDate(day)
                        const isSelected = isSameDay(day, currentDate)
                        const isTodayDate = isToday(day)
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6
                        const dayId = format(day, "yyyy-MM-dd")
                        const cellClasses = [
                          "flex flex-1 flex-col min-h-0 min-w-0 border border-border cursor-pointer hover:bg-muted/70 focus-visible:bg-muted/80 transition-colors relative group outline-none",
                          isWeekend ? "bg-muted/20" : "",
                          // Highlight selected day with primary border only (no extra background)
                          isSelected ? "border-2 border-primary" : "",
                          isTodayDate && !isSelected ? "bg-primary/10" : "",
                        ]
                        const dayLabel = `${formatWeekdayLabel(day)}, ${formatMonthLabel(day, {
                          variant: "long",
                        })} ${formatDayOfMonthLabel(day)}`

                        const visibleTasks = dayTasks
                        const dayEvents = extension.monthEventsByDate?.[dayId] ?? []
                        const eventLimit = extension.monthMaxVisibleEventsPerDay
                        const visibleEvents =
                          eventLimit === undefined ? dayEvents : dayEvents.slice(0, eventLimit)
                        const hiddenEventsCount =
                          eventLimit === undefined
                            ? 0
                            : Math.max(0, dayEvents.length - visibleEvents.length)
                        const isRecord = (value: unknown): value is Record<string, unknown> =>
                          Boolean(value && typeof value === "object")
                        const isAllDayExternalEvent = (event: unknown) =>
                          isRecord(event) && event.allDay === true
                        const getExternalEventId = (event: unknown) => {
                          if (!isRecord(event)) return undefined
                          const id = event.id
                          return typeof id === "string" ? id : undefined
                        }
                        const getTimedTaskMinutes = (task: Task) => {
                          if (!task.dueTime) return 0
                          if (task.dueTime instanceof Date) {
                            return task.dueTime.getHours() * 60 + task.dueTime.getMinutes()
                          }
                          return 0
                        }
                        const getTimedEventMinutes = (event: unknown) => {
                          if (!isRecord(event)) return 0
                          const start = event.start
                          if (!(start instanceof Date)) return 0
                          return start.getHours() * 60 + start.getMinutes()
                        }
                        const allDayEvents = visibleEvents.filter(isAllDayExternalEvent)
                        const timedEvents = visibleEvents.filter(
                          (event) => !isAllDayExternalEvent(event),
                        )
                        const allDayTasks = visibleTasks.filter((task) => !task.dueTime)
                        const timedTasks = visibleTasks.filter((task) => task.dueTime)
                        const timedItems = [
                          ...timedEvents.map((event) => ({
                            kind: "event" as const,
                            time: getTimedEventMinutes(event),
                            event,
                          })),
                          ...timedTasks.map((task) => ({
                            kind: "task" as const,
                            time: getTimedTaskMinutes(task),
                            task,
                          })),
                        ].sort((a, b) => {
                          if (a.time !== b.time) return a.time - b.time
                          if (a.kind === b.kind) return 0
                          return a.kind === "event" ? -1 : 1
                        })

                        return (
                          <DropTargetWrapper
                            key={day.toISOString()}
                            dropTargetId={`calendar-day-${dayId}`}
                            dropClassName="ring-2 ring-primary/50 bg-primary/10"
                            onDrop={({ source, location }) => {
                              handleCalendarDrop({ source, location })
                            }}
                            canDrop={({ source }) => canDropForTarget({ source, targetDate: day })}
                            getData={() => ({
                              type: "calendar-day",
                              date: dayId,
                            })}
                            className="flex flex-1 h-full min-h-0"
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
                              onClick={(event) => {
                                const target = event.target
                                if (
                                  target instanceof HTMLElement &&
                                  target.closest('[data-calendar-day-button="true"]')
                                ) {
                                  return
                                }
                                setDateAndNotify(day)
                              }}
                              onPointerDown={(e) => {
                                if (!onMonthDayLongPress) return
                                const target = e.currentTarget
                                const timeoutId = window.setTimeout(
                                  () => onMonthDayLongPress(day),
                                  450,
                                )
                                const clear = () => window.clearTimeout(timeoutId)
                                target.addEventListener("pointerup", clear, { once: true })
                                target.addEventListener("pointercancel", clear, { once: true })
                                target.addEventListener("pointerleave", clear, { once: true })
                              }}
                            >
                              <div
                                className={
                                  isCurrentMonth
                                    ? "flex flex-1 flex-col min-h-0"
                                    : "flex flex-1 flex-col min-h-0 opacity-40"
                                }
                              >
                                {showCornerAddButtons && (
                                  <CalendarAddButton
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleMonthDayQuickAdd(day)
                                    }}
                                    title="Add task to this day"
                                    placement="top-right"
                                  />
                                )}
                                <div className="mb-0.5 text-xs lg:text-sm font-semibold">
                                  <button
                                    type="button"
                                    data-calendar-day-button="true"
                                    className="flex cursor-pointer items-center justify-start rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:underline"
                                    aria-pressed={isSelected}
                                    aria-current={isTodayDate ? "date" : undefined}
                                    aria-label={`${dayLabel}${
                                      isCurrentMonth ? "" : " (adjacent month)"
                                    }`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setDateAndNotify(day)
                                      onDateClick(day)
                                    }}
                                  >
                                    {isTodayDate ? (
                                      <span className="inline-flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                                        {formatDayOfMonthLabel(day)}
                                      </span>
                                    ) : (
                                      <span
                                        className={
                                          isCurrentMonth
                                            ? "text-foreground"
                                            : "text-muted-foreground italic"
                                        }
                                      >
                                        {formatDayOfMonthLabel(day)}
                                      </span>
                                    )}
                                  </button>
                                </div>
                                <MonthCellScrollArea>
                                  {extension.renderMonthCellEvent
                                    ? allDayEvents.map((event, index) => (
                                        <span
                                          key={
                                            getExternalEventId(event) ?? `${dayId}-event-${index}`
                                          }
                                        >
                                          {extension.renderMonthCellEvent?.({
                                            date: day,
                                            event,
                                            isCurrentMonth,
                                          })}
                                        </span>
                                      ))
                                    : extension.renderMonthCellExtras?.({
                                        date: day,
                                        events: allDayEvents,
                                        isCurrentMonth,
                                        hiddenEventsCount: 0,
                                        maxVisibleEvents: eventLimit,
                                      })}
                                  {allDayTasks.map((task) => (
                                    <DraggableTaskElement
                                      key={task.id}
                                      taskId={task.id}
                                      getDragData={() => ({
                                        sourceType: "calendar",
                                        fromCalendarDay: dayId,
                                      })}
                                    >
                                      <TaskItem
                                        taskId={task.id}
                                        variant="calendar"
                                        showProjectBadge={false}
                                      />
                                    </DraggableTaskElement>
                                  ))}
                                  {extension.renderMonthCellEvent ? (
                                    timedItems.map((item, index) =>
                                      item.kind === "event" ? (
                                        <span
                                          key={
                                            getExternalEventId(item.event) ??
                                            `${dayId}-event-${index}`
                                          }
                                        >
                                          {extension.renderMonthCellEvent?.({
                                            date: day,
                                            event: item.event,
                                            isCurrentMonth,
                                          })}
                                        </span>
                                      ) : (
                                        <DraggableTaskElement
                                          key={item.task.id}
                                          taskId={item.task.id}
                                          getDragData={() => ({
                                            sourceType: "calendar",
                                            fromCalendarDay: dayId,
                                          })}
                                        >
                                          <TaskItem
                                            taskId={item.task.id}
                                            variant="calendar"
                                            showProjectBadge={false}
                                          />
                                        </DraggableTaskElement>
                                      ),
                                    )
                                  ) : (
                                    <>
                                      {extension.renderMonthCellExtras?.({
                                        date: day,
                                        events: timedEvents,
                                        isCurrentMonth,
                                        hiddenEventsCount,
                                        maxVisibleEvents: eventLimit,
                                      })}
                                      {timedTasks.map((task) => (
                                        <DraggableTaskElement
                                          key={task.id}
                                          taskId={task.id}
                                          getDragData={() => ({
                                            sourceType: "calendar",
                                            fromCalendarDay: dayId,
                                          })}
                                        >
                                          <TaskItem
                                            taskId={task.id}
                                            variant="calendar"
                                            showProjectBadge={false}
                                          />
                                        </DraggableTaskElement>
                                      ))}
                                    </>
                                  )}
                                  {extension.renderMonthCellEvent &&
                                    extension.renderMonthCellExtras?.({
                                      date: day,
                                      events: [],
                                      isCurrentMonth,
                                      hiddenEventsCount,
                                      maxVisibleEvents: eventLimit,
                                    })}
                                </MonthCellScrollArea>
                              </div>
                            </div>
                          </DropTargetWrapper>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCalendarWithSidePane = () => renderCalendarContent()

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        <SelectionToolbar />
        {renderCalendarHeader()}
      </div>
      <div className="flex-1 min-h-0">{renderCalendarWithSidePane()}</div>
    </div>
  )

  if (!wrapWithSidePanelLayout) {
    return content
  }

  return (
    <TaskViewSidePanelLayout
      rootClassName="bg-background"
      contentWrapperClassName="flex flex-col h-full overflow-hidden"
    >
      {content}
    </TaskViewSidePanelLayout>
  )
}
